import { type MouseEvent, useEffect, useId, useRef, useState } from 'react';
import { ActionIcon, Collapse, Switch, Text, TextInput, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconChevronDown } from '@tabler/icons-react';
import { patternToRegex } from '../../shared/pattern';
import type { Group } from '../../shared/types';
import { isValidHeaderName, isValidHeaderValue } from '../../shared/validation';
import classes from './GroupCard.module.css';
import { type GroupActions, GroupMenu } from './GroupMenu';
import { HeaderList } from './HeaderList';
import { PatternList } from './PatternList';

/** Where focus goes when a card mounts: a new group's first pattern, a duplicate's name, a restored group's menu. */
export type FocusTarget = 'pattern' | 'name' | 'actions';

interface Props extends GroupActions {
  group: Group;
  autoFocus?: FocusTarget;
  onChange: (group: Group) => void;
}

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

export function GroupCard({ group, autoFocus, onChange, ...actions }: Props) {
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLButtonElement>(null);

  // Mount only: autoFocus describes how the card came to exist, not something to re-apply on later renders.
  useEffect(() => {
    if (autoFocus === 'name') {
      nameRef.current?.focus();
      nameRef.current?.select();
    }
    if (autoFocus === 'actions') actionsRef.current?.focus();
  }, []);

  // Same filters as the worker's buildRules: without a usable pattern and header the group sends nothing.
  const urls = group.patterns.filter((p) => patternToRegex(p) !== null).length;
  const headers = group.headers.filter((h) => isValidHeaderName(h.name.trim()) && isValidHeaderValue(h.value)).length;
  const inactive = group.enabled && (urls === 0 || headers === 0);

  // Bare header space toggles; controls keep their clicks, and menu items (portaled) bubble here through React.
  const onHeaderClick = (e: MouseEvent<HTMLElement>) => {
    const target = e.target as Element;
    if (e.currentTarget.contains(target) && !target.closest('button, input, label')) setOpen(!open);
  };

  return (
    <div
      role="group"
      aria-label={group.name || 'Untitled group'}
      className={classes.card}
      data-off={!group.enabled || undefined}
    >
      <header className={classes.header} onClick={onHeaderClick}>
        <Switch
          aria-label="Enable group"
          checked={group.enabled}
          onChange={(e) => onChange({ ...group, enabled: e.currentTarget.checked })}
        />
        <div className={classes.title}>
          <TextInput
            ref={nameRef}
            variant="unstyled"
            miw={0}
            classNames={{ input: classes.name }}
            aria-label="Group name"
            placeholder="Untitled group"
            autoComplete="off"
            spellCheck={false}
            value={group.name}
            onChange={(e) => onChange({ ...group, name: e.currentTarget.value })}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </div>
        {/* Always rendered, one line in both states, so collapsing never changes the header's height. */}
        <Text span size="xs" c={inactive ? 'orange' : 'dimmed'} className={classes.meta}>
          {inactive ? (
            <>
              <IconAlertTriangle size={14} />
              Inactive
            </>
          ) : (
            `${count(urls, 'URL')} · ${count(headers, 'header')}`
          )}
        </Text>
        <Tooltip label="Show or hide details">
          <ActionIcon
            aria-label="Show or hide details"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen(!open)}
          >
            <IconChevronDown size={18} className={classes.chevron} />
          </ActionIcon>
        </Tooltip>
        <GroupMenu ref={actionsRef} {...actions} />
      </header>

      <Collapse expanded={open} id={bodyId} transitionDuration={180} transitionTimingFunction="var(--rt-ease, ease)">
        <div className={classes.body}>
          <PatternList
            patterns={group.patterns}
            autoFocus={autoFocus === 'pattern'}
            required={group.enabled && urls === 0}
            onChange={(next) => onChange({ ...group, patterns: next })}
          />
          <HeaderList
            headers={group.headers}
            required={group.enabled && headers === 0}
            onChange={(next) => onChange({ ...group, headers: next })}
          />
        </div>
      </Collapse>
    </div>
  );
}
