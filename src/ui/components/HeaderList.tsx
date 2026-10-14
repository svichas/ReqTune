import { type KeyboardEvent, useState } from 'react';
import { ActionIcon, Autocomplete, TextInput, Tooltip } from '@mantine/core';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import type { HeaderEntry } from '../../shared/types';
import { isValidHeaderName, isValidHeaderValue } from '../../shared/validation';
import { COMMON_HEADERS, isSecretHeader } from '../headers';
import { FieldList, RemoveButton, useFocusAfterRender } from './FieldList';
import classes from './FieldList.module.css';

interface Props {
  headers: HeaderEntry[];
  required: boolean;
  onChange: (headers: HeaderEntry[]) => void;
}

const inputClassNames = { input: classes.input, error: classes.error };
const nameClassNames = { ...inputClassNames, option: classes.option };

export function HeaderList({ headers, required, onChange }: Props) {
  const { ref, focus, focusAfterRender } = useFocusAfterRender();
  // Row index -> the header name its value was revealed for, so renaming or shifting rows hides it again.
  const [revealed, setRevealed] = useState<Record<number, string | undefined>>({});

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
      // A highlighted suggestion owns this Enter; picking it moves on to the value via onOptionSubmit.
      if (e.currentTarget.getAttribute('aria-activedescendant')) return;
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
        const secret = isSecretHeader(name);
        const shown = revealed[i] === header.name;
        return (
          <div key={i} className={classes.row}>
            <Autocomplete
              ref={ref(`name${i}`)}
              variant="unstyled"
              className={classes.name}
              classNames={nameClassNames}
              aria-label={`Header ${i + 1} name`}
              placeholder="Header-Name"
              autoComplete="off"
              spellCheck={false}
              data={COMMON_HEADERS}
              limit={8}
              openOnFocus={false}
              value={header.name}
              error={name !== '' && !isValidHeaderName(name) ? 'Use letters, digits and - only' : undefined}
              onChange={(value) => update(i, { name: value })}
              onOptionSubmit={() => focus(`value${i}`)}
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
              data-masked={(secret && !shown) || undefined}
              rightSectionWidth={32}
              rightSectionPointerEvents="all"
              rightSection={
                secret ? (
                  <Tooltip label={shown ? 'Hide value' : 'Show value'}>
                    <ActionIcon
                      size={24}
                      aria-label={`${shown ? 'Hide' : 'Show'} header ${i + 1} value`}
                      onClick={() => setRevealed({ ...revealed, [i]: shown ? undefined : header.name })}
                    >
                      {shown ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                    </ActionIcon>
                  </Tooltip>
                ) : undefined
              }
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
