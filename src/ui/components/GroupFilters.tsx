import { useId, useState } from 'react';
import { Chip, Collapse, Text, UnstyledButton } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import type { Group } from '../../shared/types';
import { type FilterOptions, REQUEST_METHODS, RESOURCE_TYPES, filterSummary, labelsFor, valuesFor } from '../filters';
import { FieldHead } from './FieldList';
import classes from './GroupFilters.module.css';

interface Props {
  group: Group;
  onChange: (group: Group) => void;
}

/** Which kinds of requests a group applies to: one summary line that opens into resource type and method chips. */
export function GroupFilters({ group, onChange }: Props) {
  // Closed to start: most groups never need filters, and the summary shows any that are set.
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const summary = filterSummary(group);

  return (
    <div>
      <UnstyledButton
        className={classes.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        data-filtered={summary !== '' || undefined}
        onClick={() => setOpen(!open)}
      >
        {/* Inline text, not flex items: the space after the label stays in the button's accessible name. */}
        <span className={classes.text}>
          <span className={classes.label}>Filters</span>{' '}
          <span className={classes.summary}>{summary || 'All requests'}</span>
        </span>
        <IconChevronDown size={14} className={classes.chevron} />
      </UnstyledButton>
      <Collapse expanded={open} id={panelId} transitionDuration={180} transitionTimingFunction="var(--rt-ease, ease)">
        <div className={classes.panel}>
          <FilterChips
            label="Resource types"
            options={RESOURCE_TYPES}
            values={group.resourceTypes}
            onChange={(resourceTypes) => onChange({ ...group, resourceTypes })}
          />
          <FilterChips
            label="Methods"
            options={REQUEST_METHODS}
            values={group.requestMethods}
            note="Picking a method leaves out requests that aren't HTTP, such as WebSockets."
            onChange={(requestMethods) => onChange({ ...group, requestMethods })}
          />
        </div>
      </Collapse>
    </div>
  );
}

interface FilterChipsProps {
  label: string;
  options: FilterOptions;
  /** Chrome's values picked so far. */
  values?: string[];
  note?: string;
  onChange: (values: string[]) => void;
}

/** One list of options to pick from; with none picked, the group takes all of them. */
function FilterChips({ label, options, values, note, onChange }: FilterChipsProps) {
  const labelId = useId();
  return (
    <div>
      <FieldHead required={false}>
        <Text span id={labelId} size="xs" fw={500} c="dimmed">
          {label}
        </Text>
      </FieldHead>
      <div role="group" aria-labelledby={labelId} className={classes.chips}>
        <Chip.Group
          multiple
          value={labelsFor(options, values)}
          onChange={(labels) => onChange(valuesFor(options, labels))}
        >
          {Object.keys(options).map((option) => (
            <Chip key={option} value={option} radius="sm">
              {option}
            </Chip>
          ))}
        </Chip.Group>
      </div>
      {note && (
        <Text size="xs" c="dimmed" px={2} pt={6}>
          {note}
        </Text>
      )}
    </div>
  );
}
