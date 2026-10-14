import { type Ref, useState } from 'react';
import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconCopy, IconDots, IconTrash } from '@tabler/icons-react';

export interface GroupActions {
  isFirst: boolean;
  isLast: boolean;
  onDuplicate: () => void;
  onMove: (delta: -1 | 1) => void;
  /** `viaKeyboard`: focus should follow to the undo bar, since the menu item it was on is gone. */
  onDelete: (viaKeyboard: boolean) => void;
}

export function GroupMenu({ ref, isFirst, isLast, onDuplicate, onMove, onDelete }: GroupActions & { ref: Ref<HTMLButtonElement> }) {
  const [opened, setOpened] = useState(false);
  return (
    <Menu opened={opened} onChange={setOpened} position="bottom-end" width={160}>
      {/* Tooltip sits outside Menu.Target so the menu's aria attributes reach the button; it overrides the target's
          click handler, hence the controlled menu toggled from here. */}
      <Tooltip label="Group actions" disabled={opened} onClick={() => setOpened(!opened)}>
        <Menu.Target>
          <ActionIcon ref={ref} aria-label="Group actions">
            <IconDots size={18} />
          </ActionIcon>
        </Menu.Target>
      </Tooltip>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconCopy size={16} />} onClick={onDuplicate}>
          Duplicate
        </Menu.Item>
        <Menu.Item leftSection={<IconArrowUp size={16} />} disabled={isFirst} onClick={() => onMove(-1)}>
          Move up
        </Menu.Item>
        <Menu.Item leftSection={<IconArrowDown size={16} />} disabled={isLast} onClick={() => onMove(1)}>
          Move down
        </Menu.Item>
        <Menu.Divider />
        {/* red-text, not color="red": Mantine's red.6 is too dark on the dark menu. A keyboard click has detail 0. */}
        <Menu.Item
          c="var(--mantine-color-red-text)"
          leftSection={<IconTrash size={16} />}
          onClick={(e) => onDelete(e.detail === 0)}
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
