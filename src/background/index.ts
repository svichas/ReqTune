import { chromeTakes } from '../shared/pattern';
import { getGroups, getPaused, getTabSelections, setPaused, setSyncError, watchKey } from '../shared/storage';
import { supportedRules, withinRegexLimit } from './rules';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

const ids = (rules: chrome.declarativeNetRequest.Rule[]) => rules.map((rule) => rule.id);
// setTitle has no way back to the manifest's tooltip, so resuming sets it from here.
const defaultTitle = (chrome.runtime.getManifest() as chrome.runtime.ManifestV3).action?.default_title ?? '';

async function applyRules(): Promise<void> {
  const dnr = chrome.declarativeNetRequest;
  try {
    const [groups, tabSelections, paused] = await Promise.all([getGroups(), getTabSelections(), getPaused()]);
    await Promise.all([
      chrome.action.setBadgeText({ text: paused ? 'OFF' : '' }),
      chrome.action.setTitle({ title: paused ? 'ReqTune is paused' : defaultTitle }),
    ]);
    // Every type must be listed: without resourceTypes Chrome skips main_frame requests.
    const { rules, skipped, repeats } = paused
      ? { rules: [], skipped: 0, repeats: [] }
      : await supportedRules(groups, tabSelections, Object.values(dnr.ResourceType), chromeTakes);
    const addRules = withinRegexLimit(rules, dnr.MAX_NUMBER_OF_REGEX_RULES);
    // Chrome only matches tabIds in session rules, which, like tab ids, don't outlive the browser session.
    await dnr.updateDynamicRules({
      removeRuleIds: ids(await dnr.getDynamicRules()),
      addRules: addRules.filter((rule) => !rule.condition.tabIds),
    });
    await dnr.updateSessionRules({
      removeRuleIds: ids(await dnr.getSessionRules()),
      addRules: addRules.filter((rule) => rule.condition.tabIds),
    });
    const overLimit = rules.length - addRules.length;
    const names = repeats.map((group) => group.name || 'Untitled group').join(', ');
    const notes = [
      skipped && `${skipped} pattern(s) Chrome can't use were skipped; see below.`,
      repeats.length &&
        `In ${names}, a URL that two of its patterns match may get each append twice: ` +
          "Chrome can't take those patterns as one regex.",
      overLimit &&
        `Chrome takes at most ${dnr.MAX_NUMBER_OF_REGEX_RULES} rules for patterns, ` +
          `so the ${overLimit} lowest in the list were left out.`,
    ];
    await setSyncError(notes.filter(Boolean).join(' ') || undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await setSyncError(`Chrome rejected the update, so your latest changes aren't applied: ${message}`);
  }
}

// Syncs run one at a time: interleaved get/update pairs would add duplicate rule ids.
let queue = Promise.resolve();
function sync(): void {
  queue = queue.then(applyRules).catch(console.error);
}

// Also on every worker start: re-enabling the extension fires no event, yet Chrome clears session storage then and
// keeps session rules, which would go on sending headers to tabs the panel no longer shows as picked.
sync();
chrome.runtime.onInstalled.addListener(sync);
chrome.runtime.onStartup.addListener(sync);
watchKey('local', 'groups', sync);
watchKey('local', 'paused', sync);
watchKey('session', 'tabSelections', sync);
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-pause') await setPaused(!(await getPaused()));
});
