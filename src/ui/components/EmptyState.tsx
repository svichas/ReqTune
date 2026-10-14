import { Button, Code, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Stack align="center" gap="sm" ta="center" px="lg" pt="15vh" pb="xl">
      <img src="/icons/icon.svg" width={48} height={48} alt="" />
      <Text fw={600} mt="sm">
        No groups yet
      </Text>
      <Text size="sm" c="dimmed" maw={280}>
        Send custom request headers to the URLs that match your patterns.
      </Text>
      <Button mt="md" leftSection={<IconPlus size={16} />} onClick={onAdd}>
        Create your first group
      </Button>
      <Text size="xs" c="dimmed" mt="md">
        e.g. <Code>*.example.com/api/*</Code> → <Code>X-Debug: 1</Code>
      </Text>
    </Stack>
  );
}
