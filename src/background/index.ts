import { getGroups, getTabSelections, setSyncError, watchKey } from '../shared/storage';
import { buildRules } from './rules';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

const ids = (rules: chrome.declarativeNetRequest.Rule[]) => rules.map((rule) => rule.id);

async function applyRules(): Promise<void> {
  const dnr = chrome.declarativeNetRequest;
  try {
    const [groups, tabSelections] = await Promise.all([getGroups(), getTabSelections()]);
    // Every type must be listed: without resourceTypes Chrome skips main_frame requests.
    const rules = buildRules(groups, tabSelections, Object.values(dnr.ResourceType));
    // One regex over Chrome's compile-size limit would fail the whole update, so those rules are left out.
    const checks = await Promise.all(
      rules.map(({ condition }) => dnr.isRegexSupported({ regex: condition.regexFilter!, isCaseSensitive: false })),
    );
    const addRules = rules.filter((_, i) => checks[i].isSupported);
    // Chrome only matches tabIds in session rules, which, like tab ids, don't outlive the browser session.
    await dnr.updateDynamicRules({
      removeRuleIds: ids(await dnr.getDynamicRules()),
      addRules: addRules.filter((rule) => !rule.condition.tabIds),
    });
    await dnr.updateSessionRules({
      removeRuleIds: ids(await dnr.getSessionRules()),
      addRules: addRules.filter((rule) => rule.condition.tabIds),
    });
    const skipped = rules.length - addRules.length;
    await setSyncError(skipped ? `${skipped} pattern(s) too long or complex for Chrome were skipped; see below.` : undefined);
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
watchKey('session', 'tabSelections', sync);
