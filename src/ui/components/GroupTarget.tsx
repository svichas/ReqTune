import { Tabs } from '@mantine/core';
import type { Group } from '../../shared/types';
import type { OpenTab } from '../hooks/useOpenTabs';
import { FieldHead } from './FieldList';
import classes from './GroupTarget.module.css';
import { PatternList } from './PatternList';
import { TabPicker } from './TabPicker';

interface Props {
  group: Group;
  tabs: OpenTab[];
  /** The tabs picked for this group. */
  tabIds: number[];
  /** Focus the first pattern on mount (a brand-new group). */
  autoFocus: boolean;
  /** The group is on, and its target has nothing usable yet: no valid pattern, or no picked tab still open. */
  required: boolean;
  onChange: (group: Group) => void;
  onTabIdsChange: (tabIds: number[]) => void;
}

/**
 * Which requests a group's headers go to: those matching its URL patterns (the default), or every request from the
 * tabs picked for it. One or the other, switched by the two tabs in the label row.
 */
export function GroupTarget({ group, tabs, tabIds, autoFocus, required, onChange, onTabIdsChange }: Props) {
  const setTarget = (target: string | null) => {
    if (target !== 'patterns' && target !== 'tabs') return;
    // Usually the point is "only in this tab", so start from there rather than an empty, inactive pick.
    const current = tabs.find((tab) => tab.current && tab.url);
    if (target === 'tabs' && current && !tabs.some((tab) => tabIds.includes(tab.id))) onTabIdsChange([current.id]);
    onChange({ ...group, target });
  };

  return (
    <Tabs
      unstyled
      value={group.target ?? 'patterns'}
      onChange={setTarget}
      classNames={{ list: classes.list, tab: classes.tab }}
    >
      <FieldHead required={required}>
        <Tabs.List aria-label="Apply to">
          <Tabs.Tab value="patterns">URL patterns</Tabs.Tab>
          <Tabs.Tab value="tabs">Tabs</Tabs.Tab>
        </Tabs.List>
      </FieldHead>
      <Tabs.Panel value="patterns">
        <PatternList
          patterns={group.patterns}
          autoFocus={autoFocus}
          onChange={(patterns) => onChange({ ...group, patterns })}
        />
      </Tabs.Panel>
      {/* Rendered only while chosen: hidden, it would still load a favicon per open tab for every group. The pattern
          panel stays mounted, so coming back to it doesn't replay a new group's autofocus. */}
      <Tabs.Panel value="tabs">
        {group.target === 'tabs' && <TabPicker tabs={tabs} selected={tabIds} onSelectedChange={onTabIdsChange} />}
      </Tabs.Panel>
    </Tabs>
  );
}
