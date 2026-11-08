import { useState } from 'react';
import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { IconEqual, IconMinus, IconPlus } from '@tabler/icons-react';
import type { HeaderEntry } from '../../shared/types';
import classes from './FieldList.module.css';

type Operation = NonNullable<HeaderEntry['operation']>;

const OPERATIONS = [
  { value: 'set', label: 'Set', Icon: IconEqual },
  { value: 'append', label: 'Append', Icon: IconPlus },
  { value: 'remove', label: 'Remove', Icon: IconMinus },
] as const;

interface Props {
  /** The row's position, for screen-reader labels. */
  index: number;
  operation: Operation;
  onChange: (operation: Operation) => void;
}

/** A header row's Set / Append / Remove choice: an icon button showing the current one, opening a menu of all three. */
export function OperationMenu({ index, operation, onChange }: Props) {
  const [opened, setOpened] = useState(false);
  const { label, Icon } = OPERATIONS.find((op) => op.value === operation) ?? OPERATIONS[0];
  return (
    <Menu opened={opened} onChange={setOpened} position="bottom-start">
      {/* As in GroupMenu: the Tooltip overrides the target's click handler, so the menu is toggled from here. */}
      <Tooltip label={`Operation: ${label}`} disabled={opened} onClick={() => setOpened(!opened)}>
        <Menu.Target>
          <ActionIcon className={classes.operation} size={24} aria-label={`Header ${index + 1} operation: ${label}`}>
            <Icon size={14} />
          </ActionIcon>
        </Menu.Target>
      </Tooltip>
      <Menu.Dropdown>
        {OPERATIONS.map((op) => (
          <Menu.RadioItem
            key={op.value}
            value={op.value}
            checked={op.value === operation}
            closeMenuOnClick
            rightSection={<op.Icon size={14} />}
            onChange={() => onChange(op.value)}
          >
            {op.label}
          </Menu.RadioItem>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
