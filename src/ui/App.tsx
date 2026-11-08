import { useRef, useState } from 'react';
import { ActionIcon, Alert, Box, Button, Tooltip, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconExternalLink, IconPlayerPause, IconPlayerPlay, IconPlus } from '@tabler/icons-react';
import { groupFileName } from '../shared/groupsFile';
import type { Group } from '../shared/types';
import classes from './App.module.css';
import { EmptyState } from './components/EmptyState';
import { ExportDialog, type PendingExport, downloadGroups, hasSecretValues } from './components/ExportDialog';
import { type FocusTarget, GroupCard } from './components/GroupCard';
import { HelpPopover } from './components/HelpPopover';
import { ImportExportMenu } from './components/ImportExportMenu';
import { type Deleted, UndoBar } from './components/UndoBar';
import { isFullPage, openFullPage } from './fullPage';
import { useGroups } from './hooks/useGroups';
import { useOpenTabs } from './hooks/useOpenTabs';
import { usePaused } from './hooks/usePaused';
import { useSyncError } from './hooks/useSyncError';

export function App() {
  const { groups, setGroups, tabSelections, setTabSelections, loading } = useGroups();
  const tabs = useOpenTabs();
  const syncError = useSyncError();
  const [paused, setPaused] = usePaused();
  const pauseLabel = paused ? 'Resume all groups' : 'Pause all groups';
  const pauseRef = useRef<HTMLButtonElement>(null);
  const [focus, setFocus] = useState<{ id: string; target: FocusTarget }>();
  const [deleted, setDeleted] = useState<Deleted>();
  const [exporting, setExporting] = useState<PendingExport>();

  const insertAt = (index: number, group: Group, target: FocusTarget) => {
    setFocus({ id: group.id, target });
    setGroups([...groups.slice(0, index), group, ...groups.slice(index)]);
  };
  const addGroup = () => {
    let n = groups.length + 1;
    while (groups.some((g) => g.name === `Group ${n}`)) n++;
    const group = { id: crypto.randomUUID(), name: `Group ${n}`, enabled: true, patterns: [''], headers: [{ name: '', value: '' }] };
    insertAt(groups.length, group, 'pattern');
  };
  const duplicate = (i: number) => {
    const copy = { ...groups[i], id: crypto.randomUUID(), name: `${groups[i].name} copy` };
    const tabIds = tabSelections[groups[i].id];
    if (tabIds) setTabSelections({ ...tabSelections, [copy.id]: tabIds });
    insertAt(i + 1, copy, 'name');
  };
  // List order is rule priority, so moving a group changes which header wins.
  const move = (i: number, delta: -1 | 1) => {
    const next = [...groups];
    [next[i], next[i + delta]] = [next[i + delta], next[i]];
    setGroups(next);
  };
  // The group's tab selection stays in storage, so Undo brings it back too.
  const remove = (i: number, focusUndo: boolean) => {
    setDeleted({ group: groups[i], index: i, focusUndo });
    setGroups(groups.filter((_, j) => j !== i));
  };
  const undo = () => {
    if (!deleted) return;
    setDeleted(undefined);
    insertAt(deleted.index, deleted.group, 'actions');
  };
  const exportGroups = (pending: PendingExport) =>
    hasSecretValues(pending.groups) ? setExporting(pending) : downloadGroups(pending);

  return (
    <div className={classes.app}>
      <header className={classes.bar}>
        {isFullPage && (
          <h1 className={classes.brand}>
            <Box component="img" src="/brand/logo.svg" alt="ReqTune" className={classes.logo} darkHidden />
            <Box component="img" src="/brand/logo-dark.svg" alt="ReqTune" className={classes.logo} lightHidden />
          </h1>
        )}
        {/* Tinted while paused: the banner scrolls away with the list, and this bar never does. */}
        <Tooltip label={pauseLabel}>
          <ActionIcon
            ref={pauseRef}
            size="lg"
            variant={paused ? 'light' : undefined}
            color={paused ? 'tune' : undefined}
            aria-label={pauseLabel}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <IconPlayerPlay size={20} /> : <IconPlayerPause size={20} />}
          </ActionIcon>
        </Tooltip>
        <HelpPopover />
        <ImportExportMenu
          canImport={!loading}
          canExport={groups.length > 0}
          onExport={() => exportGroups({ groups, fileName: 'reqtune-groups.json' })}
          onImport={(imported) => setGroups([...groups, ...imported])}
        />
        {/* Disabled while loading: adding then would overwrite the stored groups with just the new one. */}
        <Button size="compact-sm" variant="light" leftSection={<IconPlus size={14} />} disabled={loading} onClick={addGroup}>
          New group
        </Button>
      </header>

      {/* Only the list scrolls: a sticky header would cover inputs that keyboard focus scrolls to the top edge. */}
      <main className={classes.main}>
        {/* The live region stays mounted so screen readers announce each pause, even one from the shortcut. */}
        <div role="status">
          {paused && (
            // role="none": Mantine's default role="alert" would nest an alert inside the status region.
            <Alert
              m="md"
              variant="light"
              role="none"
              icon={<IconPlayerPause size={16} />}
              classNames={{ message: classes.pausedMessage }}
            >
              Paused: no headers are being changed.
              {/* Resuming removes this button, so focus moves to the header's toggle rather than back to the page. */}
              <Button
                size="compact-sm"
                variant="default"
                flex="none"
                onClick={() => {
                  pauseRef.current?.focus();
                  setPaused(false);
                }}
              >
                Resume
              </Button>
            </Alert>
          )}
        </div>

        {syncError && (
          <Alert
            m="md"
            variant="light"
            color="red"
            icon={<IconAlertTriangle size={16} />}
            title="Some rules aren't active"
            classNames={{ message: classes.alertMessage }}
          >
            {syncError}
          </Alert>
        )}

        {/* Cards wait for the open tabs too, so tab-limited groups don't flash "Inactive" while they load. */}
        {tabs &&
          groups.map((group, i) => (
            <GroupCard
              key={group.id}
              group={group}
              tabs={tabs}
              tabIds={tabSelections[group.id] ?? []}
              autoFocus={focus?.id === group.id ? focus.target : undefined}
              isFirst={i === 0}
              isLast={i === groups.length - 1}
              onChange={(next) => setGroups(groups.map((g, j) => (j === i ? next : g)))}
              onTabIdsChange={(tabIds) => setTabSelections({ ...tabSelections, [group.id]: tabIds })}
              onDuplicate={() => duplicate(i)}
              onExport={() => exportGroups({ groups: [group], fileName: groupFileName(group.name) })}
              onMove={(delta) => move(i, delta)}
              onDelete={(viaKeyboard) => remove(i, viaKeyboard)}
            />
          ))}

        {!loading && groups.length === 0 && <EmptyState onAdd={addGroup} />}
      </main>

      {!isFullPage && (
        <footer className={classes.footer}>
          <UnstyledButton className={classes.pageLink} onClick={() => void openFullPage()}>
            <IconExternalLink size={16} />
            Open in full page
          </UnstyledButton>
        </footer>
      )}

      <UndoBar deleted={deleted} onUndo={undo} onDismiss={() => setDeleted(undefined)} />
      <ExportDialog pending={exporting} onClose={() => setExporting(undefined)} />
    </div>
  );
}
