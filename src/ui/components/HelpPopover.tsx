import { Fragment } from 'react';
import { ActionIcon, Code, Divider, Popover, Text, Tooltip } from '@mantine/core';
import { IconAppWindow, IconArrowBarToUp, IconCloudCheck, IconHelp, IconKeyboard } from '@tabler/icons-react';
import classes from './HelpPopover.module.css';

const SYNTAX = [
  ['*.example.com/api/*', '* is a wildcard'],
  ['*.example.com', 'and example.com'],
  ['example.com', 'every path'],
  ['/api/*', 'on any host'],
  ['localhost:3000', 'that port only'],
];

export function HelpPopover() {
  return (
    // trapFocus: Escape only closes a popover while focus is inside it.
    <Popover width={300} position="bottom-end" trapFocus returnFocus>
      <Tooltip label="Help">
        <Popover.Target>
          <ActionIcon size="lg" aria-label="Help">
            <IconHelp size={20} />
          </ActionIcon>
        </Popover.Target>
      </Tooltip>
      <Popover.Dropdown p="md">
        <Text size="xs" fw={600} mb="sm">
          URL patterns
        </Text>
        <dl className={classes.syntax}>
          {SYNTAX.map(([pattern, meaning]) => (
            <Fragment key={pattern}>
              <dt>
                <Code>{pattern}</Code>
              </dt>
              <dd>{meaning}</dd>
            </Fragment>
          ))}
        </dl>
        <Text size="xs" c="dimmed" mt="sm">
          Add <Code>?</Code> to match the query string too; otherwise it is ignored.
        </Text>
        <Divider my="md" />
        <Text size="xs" className={classes.fact}>
          <IconArrowBarToUp size={14} />
          When two groups set the same header, the one higher in the list wins.
        </Text>
        <Text size="xs" className={classes.fact} mt="sm">
          <IconAppWindow size={14} />
          To apply a group in some tabs only, open Tabs at the bottom of the group.
        </Text>
        <Text size="xs" className={classes.fact} mt="sm">
          <IconKeyboard size={14} />
          Enter adds a row; Backspace in an empty row removes it.
        </Text>
        <Text size="xs" className={classes.fact} mt="sm">
          <IconCloudCheck size={14} />
          Changes save automatically.
        </Text>
      </Popover.Dropdown>
    </Popover>
  );
}
