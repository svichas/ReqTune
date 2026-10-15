import { useEffect, useState } from 'react';
import { Button, Checkbox, Text, TextInput } from '@mantine/core';
import { IconSearch, IconWorld } from '@tabler/icons-react';
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
  const [search, setSearch] = useState('');
  // Tabs without a url are pages ReqTune can't reach (chrome://, the new tab page); listed only if already picked.
  const listed = tabs.filter((tab) => tab.url || selected.includes(tab.id));
  const showSearch = listed.length > 10;
  const query = showSearch ? search.trim().toLowerCase() : '';
  const visible = listed.filter((tab) =>
    [tab.title, tab.url].some((value) => value?.toLowerCase().includes(query)) || !query,
  );
  const allSelected = listed.length > 0 && listed.every((tab) => selected.includes(tab.id));

  useEffect(() => {
    if (!showSearch) setSearch('');
  }, [showSearch]);

  // Rebuilt from the open tabs, which also drops picks whose tab has closed.
  const toggle = (id: number, checked: boolean) =>
    onSelectedChange(tabs.filter((tab) => (tab.id === id ? checked : selected.includes(tab.id))).map((tab) => tab.id));

  return (
    <>
      {showSearch && (
        <TextInput
          type="search"
          size="xs"
          variant="filled"
          mb={6}
          aria-label="Search tabs"
          placeholder="Search tabs…"
          leftSection={<IconSearch size={14} aria-hidden="true" />}
          leftSectionPointerEvents="none"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
      )}
      <div role="group" aria-label="Tabs to apply in" className={classes.list}>
        {visible.map((tab) => (
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
        {!visible.length && (
          <Text size="xs" c="dimmed" className={classes.empty}>
            {listed.length ? 'No tabs match your search.' : 'No tabs with a website are open.'}
          </Text>
        )}
      </div>
      <Button
        variant="subtle"
        color="gray"
        size="compact-xs"
        h={28}
        mt={4}
        px={10}
        disabled={!listed.length}
        onClick={() => onSelectedChange(allSelected ? [] : listed.map((tab) => tab.id))}
      >
        {allSelected ? 'Unselect all' : 'Select all'}
      </Button>
      <Text size="xs" c="dimmed" px={2} pt={6}>
        Every request these tabs make gets the headers, whatever its URL. Picks reset when Chrome restarts.
      </Text>
    </>
  );
}
