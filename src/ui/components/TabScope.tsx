import { useId, useState } from 'react';
import { Checkbox, Collapse, SegmentedControl, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconWorld } from '@tabler/icons-react';
import type { OpenTab } from '../hooks/useOpenTabs';
import classes from './TabScope.module.css';

interface Props {
  limited: boolean;
  tabs: OpenTab[];
  /** Ids of the picked tabs; some may since have closed. */
  selected: number[];
  /** The group is on, limited, and none of its picked tabs is open. */
  required: boolean;
  onLimitedChange: (limited: boolean) => void;
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

/** A collapsed-by-default "Tabs" row under a group's headers; opens to limit the group to tabs the user picks. */
export function TabScope({ limited, tabs, selected, required, onLimitedChange, onSelectedChange }: Props) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const picked = tabs.filter((tab) => selected.includes(tab.id));
  // Tabs without a url are pages ReqTune can't reach (chrome://, the new tab page); listed only if already picked.
  const listed = tabs.filter((tab) => tab.url || selected.includes(tab.id));

  const summary = !limited ? 'All tabs' : picked.length ? `${picked.length} selected` : 'None selected';

  const setLimited = (next: boolean) => {
    // Usually the point is "only in this tab", so start from there rather than an empty, inactive pick.
    const current = tabs.find((tab) => tab.current && tab.url);
    if (next && !picked.length && current) onSelectedChange([current.id]);
    onLimitedChange(next);
  };
  // Rebuilt from the open tabs, which also drops picks whose tab has closed.
  const toggle = (id: number, checked: boolean) =>
    onSelectedChange(tabs.filter((tab) => (tab.id === id ? checked : selected.includes(tab.id))).map((tab) => tab.id));

  return (
    <div>
      <UnstyledButton
        className={classes.toggle}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(!open)}
      >
        <span className={classes.label}>Tabs</span>
        <Text span size="xs" c={required ? 'orange' : undefined}>
          {summary}
        </Text>
        <IconChevronDown size={14} className={classes.chevron} />
      </UnstyledButton>

      <Collapse expanded={open} id={bodyId} transitionDuration={180} transitionTimingFunction="var(--rt-ease, ease)">
        <div className={classes.body}>
          <SegmentedControl
            size="xs"
            fullWidth
            aria-label="Apply in"
            data={[
              { value: 'all', label: 'All tabs' },
              { value: 'selected', label: 'Selected tabs' },
            ]}
            value={limited ? 'selected' : 'all'}
            onChange={(value) => setLimited(value === 'selected')}
          />
          {limited && (
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
              <Text size="xs" c="dimmed" px={2}>
                Selections reset when Chrome restarts or ReqTune updates.
              </Text>
            </>
          )}
        </div>
      </Collapse>
    </div>
  );
}
