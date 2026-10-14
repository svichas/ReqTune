import type { KeyboardEvent } from 'react';
import { TextInput } from '@mantine/core';
import type { HeaderEntry } from '../../shared/types';
import { isValidHeaderName, isValidHeaderValue } from '../../shared/validation';
import { FieldList, RemoveButton, useFocusAfterRender } from './FieldList';
import classes from './FieldList.module.css';

interface Props {
  headers: HeaderEntry[];
  required: boolean;
  onChange: (headers: HeaderEntry[]) => void;
}

const inputClassNames = { input: classes.input, error: classes.error };

export function HeaderList({ headers, required, onChange }: Props) {
  const { ref, focus, focusAfterRender } = useFocusAfterRender();

  const update = (i: number, patch: Partial<HeaderEntry>) =>
    onChange(headers.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  const insert = (i: number) => {
    focusAfterRender(`name${i}`);
    onChange([...headers.slice(0, i), { name: '', value: '' }, ...headers.slice(i)]);
  };
  // Focus moves to the previous row's value (the first row's name when removing the top row), or to "Add".
  const remove = (i: number) => {
    focusAfterRender(headers.length === 1 ? 'add' : i > 0 ? `value${i - 1}` : 'name0', true);
    onChange(headers.filter((_, j) => j !== i));
  };
  // Enter walks name -> value -> new row; Backspace in an empty row removes it (never the last one).
  const onKeyDown = (i: number, field: 'name' | 'value') => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      if (field === 'name') focus(`value${i}`);
      else insert(i + 1);
    } else if (e.key === 'Backspace' && headers[i].name === '' && headers[i].value === '' && headers.length > 1) {
      e.preventDefault();
      remove(i);
    }
  };

  return (
    <FieldList
      label="Request headers"
      required={required}
      addLabel="Add header"
      addRef={ref('add')}
      onAdd={() => insert(headers.length)}
    >
      {headers.map((header, i) => {
        const name = header.name.trim();
        return (
          <div key={i} className={classes.row}>
            <TextInput
              ref={ref(`name${i}`)}
              variant="unstyled"
              className={classes.name}
              classNames={inputClassNames}
              aria-label={`Header ${i + 1} name`}
              placeholder="Header-Name"
              autoComplete="off"
              spellCheck={false}
              value={header.name}
              error={name !== '' && !isValidHeaderName(name) ? 'Use letters, digits and - only' : undefined}
              onChange={(e) => update(i, { name: e.currentTarget.value })}
              onKeyDown={onKeyDown(i, 'name')}
            />
            <TextInput
              ref={ref(`value${i}`)}
              variant="unstyled"
              className={classes.value}
              classNames={inputClassNames}
              aria-label={`Header ${i + 1} value`}
              placeholder="value"
              autoComplete="off"
              spellCheck={false}
              value={header.value}
              error={isValidHeaderValue(header.value) ? undefined : "Values can't contain line breaks"}
              onChange={(e) => update(i, { value: e.currentTarget.value })}
              onKeyDown={onKeyDown(i, 'value')}
            />
            <RemoveButton label={`Remove header ${i + 1}`} onClick={() => remove(i)} />
          </div>
        );
      })}
    </FieldList>
  );
}
