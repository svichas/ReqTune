import { Checkbox, Text } from '@mantine/core';
import { IconWorld } from '@tabler/icons-react';
import type { OpenTab } from '../hooks/useOpenTabs';
import classes from './TabPicker.module.css';

interface Props {
  tabs: OpenTab[];
  /** Ids of the picked tabs; some may since have closed. */
  selected: number[];
  onSelectedChange: (tabIds: number[]) => void;
}

// Chrome's favicon cache, so showing icons makes no network requests.
const faviconUrl = (pageUrl: string) => {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', '32');
  return url.toString();
};

const hostOf = (url?: string) => {
  try {
    return url ? new URL(url).host : undefined;
  } catch {
    return undefined;
  }
};

/** The open tabs as a checklist, for a group that targets tabs instead of URL patterns. */
export function TabPicker({ tabs, selected, onSelectedChange }: Props) {
  // Tabs without a url are pages ReqTune can't reach (chrome://, the new tab page); listed only if already picked.
  const listed = tabs.filter((tab) => tab.url || selected.includes(tab.id));
  // Rebuilt from the open tabs, which also drops picks whose tab has closed.
  const toggle = (id: number, checked: boolean) =>
    onSelectedChange(tabs.filter((tab) => (tab.id === id ? checked : selected.includes(tab.id))).map((tab) => tab.id));

  return (
    <>
      <div role="group" aria-label="Tabs to apply in" className={classes.list}>
        {listed.map((tab) => (
          <Checkbox.Card
            key={tab.id}
            className={classes.tab}
            radius={0}
            withBorder={false}
            title={tab.url}
            checked={selected.includes(tab.id)}
            onChange={(checked) => toggle(tab.id, checked)}
          >
            <Checkbox.Indicator size="xs" />
            {tab.url ? (
              <img className={classes.favicon} src={faviconUrl(tab.url)} alt="" />
            ) : (
              <IconWorld size={16} className={classes.favicon} />
            )}
            <span className={classes.title}>{tab.title || hostOf(tab.url) || 'Untitled tab'}</span>
            {tab.current && (
              <Text span size="xs" c="dimmed" className={classes.here}>
                This tab
              </Text>
            )}
          </Checkbox.Card>
        ))}
        {!listed.length && (
          <Text size="xs" c="dimmed" className={classes.empty}>
            No tabs with a website are open.
          </Text>
        )}
      </div>
      <Text size="xs" c="dimmed" px={2} pt={6}>
        Every request these tabs make gets the headers, whatever its URL. Picks reset when Chrome restarts.
      </Text>
    </>
  );
}
