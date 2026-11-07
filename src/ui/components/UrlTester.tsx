import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Badge, Text, TextInput } from '@mantine/core';
import { type GroupMatch, matchGroups } from '../../shared/match';
import type { Group, TabSelections } from '../../shared/types';
import { isSecretHeader } from '../headers';
import type { OpenTab } from '../hooks/useOpenTabs';
import fieldClasses from './FieldList.module.css';
import classes from './UrlTester.module.css';

interface Props {
  groups: Group[];
  tabs: OpenTab[];
  tabSelections: TabSelections;
  /** What the field starts with: the active tab's URL, in the side panel. */
  defaultUrl?: string;
}

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

/** Answers "which groups would change a request to this URL?", and which header wins where they overlap. */
export function UrlTester({ groups, tabs, tabSelections, defaultUrl = '' }: Props) {
  const [url, setUrl] = useState(defaultUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mount only: opening the tester puts the caret in its field, with the URL selected so typing replaces it.
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Like the cards' counts: a picked tab that has since closed makes no more requests.
  const pickedTabs = (group: Group) => tabs.filter((tab) => tabSelections[group.id]?.includes(tab.id)).length;
  const result = url.trim()
    ? matchGroups(groups.filter((group) => group.target !== 'tabs' || pickedTabs(group) > 0), url)
    : undefined;

  let status = 'Enter a URL to see which groups would change its requests.';
  if (result === null) status = 'Enter a full URL, like https://example.com/api';
  else if (result) {
    const n = result.byPattern.length;
    status = n ? `Matched by ${count(n, 'group')}` : "No group's patterns match this URL.";
  }

  return (
    <section aria-label="URL tester" className={classes.tester}>
      {/* The status line is the field's description: read with the field, and never empty, so the live region stays
          mounted and announces each new result. */}
      <TextInput
        ref={inputRef}
        type="url"
        variant="unstyled"
        label="Test a URL"
        labelProps={{ fz: 'xs', c: 'dimmed', px: 2, pb: 4 }}
        description={status}
        descriptionProps={{ role: 'status', fz: 'xs', lh: 'xs', px: 2, pt: 4 }}
        inputWrapperOrder={['label', 'input', 'description']}
        classNames={{ wrapper: fieldClasses.box, input: fieldClasses.input }}
        placeholder="https://example.com/api"
        autoComplete="off"
        spellCheck={false}
        value={url}
        onChange={(e) => setUrl(e.currentTarget.value)}
      />

      {!!result?.byPattern.length && (
        <ul aria-label="Matching groups" className={classes.list}>
          {result.byPattern.map(({ group, headers, pattern }) => (
            <Match key={group.id} group={group} headers={headers}>
              <Text span size="xs" ff="monospace" c="dimmed">
                {pattern}
              </Text>
            </Match>
          ))}
        </ul>
      )}

      {!!result?.byTabs.length && (
        <>
          <Text size="xs" fw={500} c="dimmed" px={2} mt={6}>
            In picked tabs, whatever the URL
          </Text>
          <ul aria-label="Groups that target tabs" className={classes.list}>
            {result.byTabs.map(({ group, headers }) => (
              <Match key={group.id} group={group} headers={headers}>
                <Text span size="xs" c="dimmed">
                  {count(pickedTabs(group), 'tab')}
                </Text>
              </Match>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** A group's name, what it matched by, and the headers it sets; values of token-like headers stay hidden. */
function Match({ group, headers, children }: GroupMatch & { children: ReactNode }) {
  return (
    <li>
      <div className={classes.head}>
        <Text span size="sm" fw={600}>
          {group.name || 'Untitled group'}
        </Text>
        {children}
      </div>
      <dl className={classes.headers}>
        {headers.map(({ name, value, wins, overriddenInTabs }, i) => (
          <div key={i} className={classes.header} data-overridden={wins === false || undefined}>
            <dt>{name}</dt>
            <dd>
              {isSecretHeader(name) ? (
                <span role="img" aria-label="Hidden value">
                  ••••••••
                </span>
              ) : (
                value
              )}
              {wins && (
                <Badge size="sm" radius="sm" variant="light" ff="text">
                  wins
                </Badge>
              )}
              {wins === false && (
                <Text span size="xs" ff="text">
                  overridden
                </Text>
              )}
              {overriddenInTabs && (
                <Text span size="xs" ff="text" c="dimmed">
                  overridden in picked tabs
                </Text>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
}
