import { useEffect, useRef, useState } from 'react';
import { Button, Text } from '@mantine/core';
import type { Group } from '../../shared/types';
import classes from './UndoBar.module.css';

export interface Deleted {
  group: Group;
  index: number;
  focusUndo: boolean;
}

interface Props {
  deleted?: Deleted;
  onUndo: () => void;
  onDismiss: () => void;
}

/** The live region stays mounted so screen readers announce each deletion; the bar inside comes and goes. */
export function UndoBar({ deleted, onUndo, onDismiss }: Props) {
  return (
    <div role="status" className={classes.region}>
      {/* Keyed so every deletion gets a fresh timer, animation and focus. */}
      {deleted && <Bar key={deleted.group.id} deleted={deleted} onUndo={onUndo} onDismiss={onDismiss} />}
    </div>
  );
}

function Bar({ deleted, onUndo, onDismiss }: Required<Props>) {
  const undoRef = useRef<HTMLButtonElement>(null);
  // The clock pauses while the bar is pointed at or focused, so nobody loses the undo mid-reach; it restarts in full.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (deleted.focusUndo) undoRef.current?.focus();
  }, [deleted]);

  // Not keyed on onDismiss: the parent passes a fresh closure every render, which would restart the clock.
  useEffect(() => {
    if (hovered || focused) return;
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [hovered, focused]);

  return (
    <div
      className={classes.bar}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <Text size="sm" truncate>
        Deleted “{deleted.group.name || 'Untitled group'}”
      </Text>
      {/* Link colour: the subtle variant's dark-mode text is a near-white tint that stops reading as an action. */}
      <Button ref={undoRef} size="compact-sm" variant="subtle" c="var(--mantine-color-anchor)" onClick={onUndo}>
        Undo
      </Button>
    </div>
  );
}
