import { useRef, useState } from 'react';
import { ActionIcon, Button, FileButton, Flex, Menu, Modal, Text, Tooltip } from '@mantine/core';
import { IconDotsVertical, IconFileExport, IconFileImport } from '@tabler/icons-react';
import { parseGroupsFile } from '../../shared/groupsFile';
import type { Group } from '../../shared/types';

interface Props {
  /** False while the stored groups load: importing then would overwrite them with just the imported ones. */
  canImport: boolean;
  canExport: boolean;
  onExport: () => void;
  /** The picked file's groups, once the user confirms adding them. */
  onImport: (groups: Group[]) => void;
}

export function ImportExportMenu({ canImport, canExport, onExport, onImport }: Props) {
  const [opened, setOpened] = useState(false);
  // The picked file's groups, or why it can't be imported; kept while the dialog closes, so its text doesn't change.
  const [picked, setPicked] = useState<Group[] | string>();
  const [dialogOpened, setDialogOpened] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const resetRef = useRef<() => void>(null);

  const read = async (file: File | null) => {
    // Picking the same file again, say after fixing it, must still count as a change.
    resetRef.current?.();
    if (!file) return;
    try {
      setPicked(await parseGroupsFile(file));
    } catch (error) {
      setPicked(error instanceof Error ? error.message : String(error));
    }
    setDialogOpened(true);
  };
  const close = () => setDialogOpened(false);
  // The closing dialog still takes clicks; a double click must not add the groups twice.
  const add = () => {
    if (dialogOpened && Array.isArray(picked)) onImport(picked);
    close();
  };
  const n = Array.isArray(picked) ? picked.length : 0;

  return (
    <>
      {/* Wraps the menu so its hidden file input outlives the dropdown, which unmounts on close. */}
      <FileButton resetRef={resetRef} accept="application/json,.json" onChange={(file) => void read(file)}>
        {({ onClick }) => (
          // Tooltip and controlled menu as in GroupMenu.
          <Menu opened={opened} onChange={setOpened} position="bottom-end" width={180}>
            <Tooltip label="Import and export" disabled={opened} onClick={() => setOpened(!opened)}>
              <Menu.Target>
                <ActionIcon ref={triggerRef} size="lg" aria-label="Import and export">
                  <IconDotsVertical size={20} />
                </ActionIcon>
              </Menu.Target>
            </Tooltip>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconFileImport size={16} />} disabled={!canImport} onClick={onClick}>
                Import groups…
              </Menu.Item>
              {/* Focus moves to the trigger first, as in GroupMenu's Export. */}
              <Menu.Item
                leftSection={<IconFileExport size={16} />}
                disabled={!canExport}
                onClick={() => {
                  triggerRef.current?.focus();
                  onExport();
                }}
              >
                Export all groups
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </FileButton>

      <Modal
        opened={dialogOpened}
        onClose={close}
        centered
        size="sm"
        title={Array.isArray(picked) ? `Add ${n} group${n === 1 ? '' : 's'}?` : "Couldn't import the file"}
      >
        {Array.isArray(picked) ? (
          <>
            <Text size="sm">
              They go to the end of the list. Groups saved without the secret values they send come in switched off.
            </Text>
            <Flex justify="flex-end" gap="sm" mt="lg">
              <Button variant="default" onClick={close}>
                Cancel
              </Button>
              <Button data-autofocus onClick={add}>
                Add
              </Button>
            </Flex>
          </>
        ) : (
          <>
            <Text size="sm">{picked}</Text>
            <Flex justify="flex-end" mt="lg">
              <Button data-autofocus onClick={close}>
                OK
              </Button>
            </Flex>
          </>
        )}
      </Modal>
    </>
  );
}
