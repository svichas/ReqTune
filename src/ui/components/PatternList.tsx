import { useEffect, useState } from 'react';
import { TextInput } from '@mantine/core';
import { patternToRegex } from '../../shared/pattern';
import { FieldList, RemoveButton, useFocusAfterRender } from './FieldList';
import classes from './FieldList.module.css';

interface Props {
  patterns: string[];
  /** Focus the first pattern input on mount (a brand-new group). */
  autoFocus: boolean;
  required: boolean;
  onChange: (patterns: string[]) => void;
}

export function PatternList({ patterns, autoFocus, required, onChange }: Props) {
  const { ref, focusAfterRender } = useFocusAfterRender(autoFocus ? '0' : undefined);
  // Patterns over Chrome's regex compile-size limit (the worker skips them); only Chrome can tell, asynchronously.
  const [tooComplex, setTooComplex] = useState<string[]>([]);

  useEffect(() => {
    let current = true;
    void Promise.all(
      patterns.map(async (pattern) => {
        const regex = patternToRegex(pattern);
        if (!regex) return false;
        return !(await chrome.declarativeNetRequest.isRegexSupported({ regex, isCaseSensitive: false })).isSupported;
      }),
    ).then((flags) => {
      if (current) setTooComplex(patterns.filter((_, i) => flags[i]));
    });
    return () => {
      current = false;
    };
  }, [patterns]);

  const errorFor = (pattern: string) => {
    if (pattern.trim() !== '' && patternToRegex(pattern) === null) return 'Invalid pattern; see Help for the syntax';
    if (tooComplex.includes(pattern)) return 'Too long or complex for Chrome: shorten it or use fewer *';
  };

  const insert = (i: number) => {
    focusAfterRender(String(i));
    onChange([...patterns.slice(0, i), '', ...patterns.slice(i)]);
  };
  // Focus moves to the previous row (the first one when removing the top row), or to "Add" when none remain.
  const remove = (i: number) => {
    focusAfterRender(patterns.length > 1 ? String(Math.max(i - 1, 0)) : 'add', true);
    onChange(patterns.filter((_, j) => j !== i));
  };

  return (
    <FieldList
      label="URL patterns"
      required={required}
      addLabel="Add pattern"
      addRef={ref('add')}
      onAdd={() => insert(patterns.length)}
    >
      {patterns.map((pattern, i) => (
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
            onChange={(e) => onChange(patterns.map((p, j) => (j === i ? e.currentTarget.value : p)))}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter') insert(i + 1);
              else if (e.key === 'Backspace' && pattern === '' && patterns.length > 1) {
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
