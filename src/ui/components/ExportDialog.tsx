import { Button, Flex, Modal, Text } from '@mantine/core';
import { serializeGroups } from '../../shared/groupsFile';
import type { Group } from '../../shared/types';
import { isSecretHeader } from '../headers';

export interface PendingExport {
  groups: Group[];
  fileName: string;
}

/** Whether exporting would leave a value out, so the user is asked first. */
export const hasSecretValues = (groups: Group[]): boolean =>
  groups.some((group) => group.headers.some((h) => h.value !== '' && isSecretHeader(h.name.trim())));

/** Saves the file through a link to it, which needs no downloads permission. Secret values stay out by default. */
export function downloadGroups({ groups, fileName }: PendingExport, withSecrets = false): void {
  const text = serializeGroups(groups, withSecrets ? undefined : isSecretHeader);
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // The download may read the blob only after this returns, so the URL can't be revoked right away.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

interface Props {
  /** Groups that hold secret values, waiting on the answer. */
  pending?: PendingExport;
  onClose: () => void;
}

export function ExportDialog({ pending, onClose }: Props) {
  const save = (withSecrets: boolean) => {
    // Gone while the dialog closes, which still takes clicks: a double click saves one file.
    if (pending) downloadGroups(pending, withSecrets);
    onClose();
  };
  return (
    <Modal opened={pending !== undefined} onClose={onClose} centered size="sm" title="Include secret values?">
      <Text size="sm">
        Some header values look like credentials. Left out, they export empty; included, anyone with the file can read
        them.
      </Text>
      <Flex justify="flex-end" gap="sm" mt="lg">
        <Button variant="default" onClick={() => save(true)}>
          Include
        </Button>
        <Button data-autofocus onClick={() => save(false)}>
          Leave out
        </Button>
      </Flex>
    </Modal>
  );
}
