import { useEffect, useState } from 'react';

/** A browser tab, as the tab picker shows it. */
export interface OpenTab {
  id: number;
  /** Url and title are absent for pages ReqTune has no host access to, such as chrome:// pages. */
  url?: string;
  title?: string;
  /** The active tab of the window this panel is in. */
  current: boolean;
}

const usable = (tab: chrome.tabs.Tab): tab is chrome.tabs.Tab & { id: number } =>
  tab.id !== undefined && tab.id !== chrome.tabs.TAB_ID_NONE;

/** Every open tab, this window's first, kept current while the panel is open. Undefined until the first query. */
export function useOpenTabs(): OpenTab[] | undefined {
  const [tabs, setTabs] = useState<OpenTab[]>();

  useEffect(() => {
    // Queries overlap while pages load; only the latest may set state, and none may after unmount.
    let latest = 0;
    const refresh = async () => {
      const call = ++latest;
      const [all, [active]] = await Promise.all([
        chrome.tabs.query({}),
        chrome.tabs.query({ active: true, currentWindow: true }),
      ]);
      if (call !== latest) return;
      const here = (tab: chrome.tabs.Tab) => Number(tab.windowId === active?.windowId);
      setTabs(
        all
          .filter(usable)
          .sort((a, b) => here(b) - here(a))
          .map((tab) => ({ id: tab.id, url: tab.url, title: tab.title, current: tab.id === active?.id })),
      );
    };
    // Status and favicon updates fire constantly while pages load and change nothing the picker shows.
    const onUpdated = (_id: number, change: chrome.tabs.OnUpdatedInfo) => {
      if (change.url !== undefined || change.title !== undefined) void refresh();
    };
    const events = [
      chrome.tabs.onCreated,
      chrome.tabs.onRemoved,
      chrome.tabs.onReplaced,
      chrome.tabs.onActivated,
      chrome.tabs.onMoved,
      chrome.tabs.onAttached,
    ];

    void refresh();
    events.forEach((event) => event.addListener(refresh));
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      latest++;
      events.forEach((event) => event.removeListener(refresh));
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  return tabs;
}
