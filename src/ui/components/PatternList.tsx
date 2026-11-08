import { useEffect, useState } from 'react';
import { TextInput } from '@mantine/core';
import { isRegexPattern, patternToRegex } from '../../shared/pattern';
import { FieldList, RemoveButton, useFocusAfterRender } from './FieldList';
import classes from './FieldList.module.css';

interface Props {
  patterns: string[];
  /** Focus the first pattern input on mount (a brand-new group). */
  autoFocus: boolean;
  onChange: (patterns: string[]) => void;
}

/** The pattern rows alone: GroupTarget draws the label row, with its URL patterns / Tabs switch. */
export function PatternList({ patterns, autoFocus, onChange }: Props) {
  const { ref, focusAfterRender } = useFocusAfterRender(autoFocus ? '0' : undefined);
  // Patterns Chrome can't compile, over its regex size limit or (from `regex:`) not RE2; the worker skips them. Only
  // Chrome can tell, asynchronously.
  const [unsupported, setUnsupported] = useState<string[]>([]);
  // The text of the row being typed, saved when focus leaves it: a half-typed pattern can match more URLs than the
  // finished one (`*` or `regex:^` alone matches all), and the group's headers would go there meanwhile.
  const [draft, setDraft] = useState<{ i: number; value: string }>();
  // The rows as shown, with the draft: Enter and Backspace edit these, so neither drops or misplaces unsaved text.
  const shown = draft ? patterns.map((p, j) => (j === draft.i ? draft.value : p)) : patterns;

  useEffect(() => {
    let current = true;
    void Promise.all(
      patterns.map(async (pattern) => {
        const regex = patternToRegex(pattern);
        if (!regex) return false;
        return !(await chrome.declarativeNetRequest.isRegexSupported({ regex, isCaseSensitive: false })).isSupported;
      }),
    ).then((flags) => {
      if (current) setUnsupported(patterns.filter((_, i) => flags[i]));
    });
    return () => {
      current = false;
    };
  }, [patterns]);

  const save = (i: number, value: string) => onChange(patterns.map((p, j) => (j === i ? value : p)));
  const commit = () => {
    if (!draft) return;
    setDraft(undefined);
    save(draft.i, draft.value);
  };
  // Closing the panel or the page needn't blur the field first.
  useEffect(() => {
    if (!draft) return;
    window.addEventListener('pagehide', commit);
    return () => window.removeEventListener('pagehide', commit);
  });

  const errorFor = (pattern: string) => {
    const isRegex = isRegexPattern(pattern);
    if (pattern.trim() !== '' && patternToRegex(pattern) === null) {
      return isRegex
        ? 'Invalid regex; Chrome takes ASCII-only RE2, with no lookarounds or backreferences'
        : 'Invalid pattern; see Help for the syntax';
    }
    if (unsupported.includes(pattern)) {
      return isRegex
        ? 'Not valid RE2, or too long or complex for Chrome'
        : 'Too long or complex for Chrome: shorten it or use fewer *';
    }
  };

  const insert = (i: number) => {
    focusAfterRender(String(i));
    setDraft(undefined);
    onChange([...shown.slice(0, i), '', ...shown.slice(i)]);
  };
  // Focus moves to the previous row (the first one when removing the top row), or to "Add" when none remain.
  const remove = (i: number) => {
    focusAfterRender(shown.length > 1 ? String(Math.max(i - 1, 0)) : 'add', true);
    setDraft(undefined);
    onChange(shown.filter((_, j) => j !== i));
  };

  return (
    <FieldList
      addLabel="Add pattern"
      addRef={ref('add')}
      onAdd={() => insert(patterns.length)}
    >
      {shown.map((pattern, i) => (
        <div key={i} className={classes.row}>
          <TextInput
            ref={ref(String(i))}
            variant="unstyled"
            className={classes.cell}
            classNames={{ input: classes.input, error: classes.error }}
            aria-label={`URL pattern ${i + 1}`}
            placeholder="*.example.com/api/*"
            autoComplete="off"
            spellCheck={false}
            value={pattern}
            error={errorFor(pattern)}
            onChange={(e) => setDraft({ i, value: e.currentTarget.value })}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') insert(i + 1);
              else if (e.key === 'Backspace' && pattern === '' && shown.length > 1) {
                e.preventDefault();
                remove(i);
              }
            }}
          />
          <RemoveButton label={`Remove pattern ${i + 1}`} onClick={() => remove(i)} />
        </div>
      ))}
    </FieldList>
  );
}
