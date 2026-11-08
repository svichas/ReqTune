import { type KeyboardEvent, useState } from 'react';
import { ActionIcon, Autocomplete, Checkbox, TextInput, Tooltip } from '@mantine/core';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import type { HeaderEntry } from '../../shared/types';
import { canAppendRequestHeader, isValidHeaderName, isValidHeaderValue } from '../../shared/validation';
import { COMMON_HEADERS, isSecretHeader, valuePresets } from '../headers';
import { FieldList, RemoveButton, useFocusAfterRender } from './FieldList';
import classes from './FieldList.module.css';
import { OperationMenu } from './OperationMenu';

interface Props {
  headers: HeaderEntry[];
  required: boolean;
  onChange: (headers: HeaderEntry[]) => void;
}

const inputClassNames = { input: classes.input, error: classes.error };
const nameClassNames = { ...inputClassNames, option: classes.option };
const presetClassNames = { ...inputClassNames, dropdown: classes.presets };

// Remove sends no value, so its row hides the value field (keeping what was typed, for switching back).
const hasValue = (header: HeaderEntry) => header.operation !== 'remove';

const nameError = (name: string, operation: HeaderEntry['operation']) => {
  if (name === '') return;
  if (!isValidHeaderName(name)) return 'Use letters, digits and - only';
  if (operation === 'append' && !canAppendRequestHeader(name)) return "Chrome can't append to this header";
};

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
  // Focus moves to the end of the previous row (the first row's name when removing the top row), or to "Add".
  const remove = (i: number) => {
    const lastInput = (j: number) => `${hasValue(headers[j]) ? 'value' : 'name'}${j}`;
    focusAfterRender(headers.length === 1 ? 'add' : i > 0 ? lastInput(i - 1) : 'name0', true);
    onChange(headers.filter((_, j) => j !== i));
  };
  // Enter walks name -> value -> new row; Backspace in an empty row removes it (never the last one).
  const onKeyDown = (i: number, field: 'name' | 'value') => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      // A highlighted suggestion owns this Enter; picking a name moves on to the value via onOptionSubmit. Mantine
      // leaves aria-activedescendant on the last option arrowed to after the highlight is gone, so check the option.
      const active = e.currentTarget.getAttribute('aria-activedescendant');
      if (active && document.getElementById(active)?.hasAttribute('data-combobox-selected')) return;
      if (field === 'name' && hasValue(headers[i])) focus(`value${i}`);
      else insert(i + 1);
    } else if (
      e.key === 'Backspace' &&
      headers[i].name === '' &&
      (headers[i].value === '' || !hasValue(headers[i])) &&
      headers.length > 1
    ) {
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
        const on = header.enabled !== false;
        const presets = valuePresets(name);
        const presetLabel = (value: string) => presets.find((preset) => preset.value === value)?.label ?? '';
        const valueProps = {
          ref: ref(`value${i}`),
          variant: 'unstyled',
          className: classes.value,
          display: hasValue(header) ? undefined : 'none',
          'aria-label': `Header ${i + 1} value`,
          placeholder: 'value',
          autoComplete: 'off',
          spellCheck: false,
          value: header.value,
          error: isValidHeaderValue(header.value) ? undefined : "Values can't contain line breaks",
          onKeyDown: onKeyDown(i, 'value'),
        };
        return (
          <div key={i} className={classes.row} data-off={!on || undefined}>
            <Tooltip label="Send header">
              <Checkbox.Card
                className={classes.toggle}
                radius={0}
                withBorder={false}
                aria-label={`Send header ${i + 1}`}
                checked={on}
                onChange={(enabled) => update(i, { enabled })}
              >
                <Checkbox.Indicator size="xs" />
              </Checkbox.Card>
            </Tooltip>
            <OperationMenu
              index={i}
              operation={header.operation ?? 'set'}
              onChange={(operation) => update(i, { operation })}
            />
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
              error={nameError(name, header.operation)}
              onChange={(value) => update(i, { name: value })}
              // After the render, since naming a row User-Agent swaps in a value field with presets.
              onOptionSubmit={() => focusAfterRender(`value${i}`)}
              onKeyDown={onKeyDown(i, 'name')}
            />
            {presets.length ? (
              <Autocomplete
                {...valueProps}
                classNames={presetClassNames}
                // The options are the values, so picking one fills it in; the list shows and matches their labels.
                data={presets.map((preset) => preset.value)}
                renderOption={({ option }) => presetLabel(option.value)}
                filter={({ options, search }) => {
                  // A picked preset lists them all, so switching to another doesn't mean clearing the field first.
                  if (presets.some((preset) => preset.value === search)) return options;
                  const query = search.trim().toLowerCase();
                  return options.filter((option) => 'value' in option && presetLabel(option.value).toLowerCase().includes(query));
                }}
                // Mantine's default scroll area would cut off the last presets.
                withScrollArea={false}
                onChange={(value) => update(i, { value })}
              />
            ) : (
              <TextInput
                {...valueProps}
                classNames={inputClassNames}
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
                onChange={(e) => update(i, { value: e.currentTarget.value })}
              />
            )}
            <RemoveButton label={`Remove header ${i + 1}`} onClick={() => remove(i)} />
          </div>
        );
      })}
    </FieldList>
  );
}
