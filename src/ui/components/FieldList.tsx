import { type ReactNode, type Ref, useEffect, useRef } from 'react';
import { ActionIcon, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';
import classes from './FieldList.module.css';

interface Props {
  /** Omitted when the parent draws the label row itself, as GroupTarget does with its tabs. */
  label?: string;
  /** The group is on but does nothing until this list has a valid entry. */
  required?: boolean;
  addLabel: string;
  onAdd: () => void;
  addRef: Ref<HTMLButtonElement>;
  children: ReactNode;
}

/** A list's label row: the label on the left, and "Required" on the right while the group needs an entry here. */
export function FieldHead({ required, children }: { required: boolean; children: ReactNode }) {
  return (
    <div className={classes.head}>
      {children}
      {required && (
        <Text span size="xs" c="orange">
          Required
        </Text>
      )}
    </div>
  );
}

/** A quiet filled container: one row per entry, hairlines between rows, an "Add" row at the bottom. */
export function FieldList({ label, required = false, addLabel, onAdd, addRef, children }: Props) {
  return (
    <div>
      {label !== undefined && (
        <FieldHead required={required}>
          <Text span size="xs" fw={500} c="dimmed">
            {label}
          </Text>
        </FieldHead>
      )}
      <div className={classes.box}>
        {children}
        <UnstyledButton ref={addRef} className={classes.add} onClick={onAdd}>
          <IconPlus size={14} />
          {addLabel}
        </UnstyledButton>
      </div>
    </div>
  );
}

export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Tooltip label="Remove">
      <ActionIcon className={classes.remove} size={28} aria-label={label} onClick={onClick}>
        <IconX size={14} />
      </ActionIcon>
    </Tooltip>
  );
}

/**
 * Focuses an element by key after the next render. Rows only change when the parent re-renders with new
 * props, so focusing a just-inserted (or neighbouring) row has to wait for that commit.
 */
export function useFocusAfterRender(initialKey?: string) {
  const elements = useRef(new Map<string, HTMLElement | null>());
  const pending = useRef(initialKey === undefined ? undefined : { key: initialKey, end: false });

  useEffect(() => {
    if (!pending.current) return;
    const { key, end } = pending.current;
    pending.current = undefined;
    const el = elements.current.get(key);
    el?.focus();
    if (end && el instanceof HTMLInputElement) el.setSelectionRange(el.value.length, el.value.length);
  });

  return {
    ref: (key: string) => (el: HTMLElement | null) => {
      elements.current.set(key, el);
    },
    focus: (key: string) => elements.current.get(key)?.focus(),
    /** `end` puts the caret after the existing text. */
    focusAfterRender: (key: string, end = false) => {
      pending.current = { key, end };
    },
  };
}
