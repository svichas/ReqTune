/** The panel UI in a tab of its own, with room for long patterns and header values. */
const FULL_PAGE_URL = chrome.runtime.getURL('index.html?page');

export const isFullPage = new URLSearchParams(location.search).has('page');

/** Switches to the full page if a tab already shows it, so repeated clicks don't pile up copies; opens it otherwise. */
export async function openFullPage(): Promise<void> {
  const [open] = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [FULL_PAGE_URL] });
  if (!open) {
    await chrome.tabs.create({ url: FULL_PAGE_URL });
    return;
  }
  await chrome.tabs.update(open.tabId, { active: true });
  await chrome.windows.update(open.windowId, { focused: true });
}
