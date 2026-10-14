import { getGroups, setSyncError, watchKey } from '../shared/storage';
import { buildRules } from './rules';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

async function applyRules(): Promise<void> {
  try {
    // Every type must be listed: without resourceTypes Chrome skips main_frame requests.
    const rules = buildRules(await getGroups(), Object.values(chrome.declarativeNetRequest.ResourceType));
    // One regex over Chrome's compile-size limit would fail the whole update, so those rules are left out.
    const checks = await Promise.all(
      rules.map(({ condition }) =>
        chrome.declarativeNetRequest.isRegexSupported({ regex: condition.regexFilter!, isCaseSensitive: false }),
      ),
    );
    const addRules = rules.filter((_, i) => checks[i].isSupported);
    const removeRuleIds = (await chrome.declarativeNetRequest.getDynamicRules()).map((rule) => rule.id);
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
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

chrome.runtime.onInstalled.addListener(sync);
chrome.runtime.onStartup.addListener(sync);
watchKey('groups', sync);
