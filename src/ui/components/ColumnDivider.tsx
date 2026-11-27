import type { PointerEvent } from 'react';
import { getNameShare, setNameShare, watchKey } from '../../shared/storage';
import classes from './FieldList.module.css';

// The name's share of a header row's name and value, in percent. The styles read it from the page root, so a drag moves
// the line in every header row at once, without a render.
let nameShare: number | undefined;
const show = (share: number | undefined) => {
  nameShare = share;
  // No share yet (null removes the property) leaves the styles' own split.
  document.documentElement.style.setProperty('--rt-name-share', share === undefined ? null : String(share));
};
void getNameShare().then(show);
// A drag in another open page, say the side panel beside the full page, moves the line here too.
watchKey('local', 'nameShare', show);

/** The hairline between a header's name and its value. Dragging it resizes the two, in every header row. */
export function ColumnDivider() {
  const drag = (e: PointerEvent<HTMLDivElement>) => {
    const line = e.currentTarget;
    if (!line.hasPointerCapture(e.pointerId)) return;
    const { left } = line.previousElementSibling!.getBoundingClientRect();
    const { right } = line.nextElementSibling!.getBoundingClientRect();
    // Never 0: the name of a Remove row, alone in its row, only fills it with a share of 1 or more.
    show(Math.min(Math.max(((e.clientX - left) / (right - left)) * 100, 1), 99));
  };
  return (
    <div
      className={classes.divider}
      onPointerDown={(e) => {
        // Only the main button drags; the others keep doing what they do anywhere else.
        if (e.button !== 0) return;
        // Keeps the field being edited focused, and the drag from selecting text.
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={drag}
      // Saved once, when the drag ends, however it ends.
      onLostPointerCapture={() => nameShare !== undefined && void setNameShare(nameShare)}
    />
  );
}
