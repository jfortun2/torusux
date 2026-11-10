import { useEffect, useId, useMemo, useRef, useState, type DragEvent, type MutableRefObject, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import chevronRightIcon from './assets/icon-chevron-right.svg';
import containerIcon from './assets/icon-container.png';
import deleteMenuIcon from './assets/icon-delete-menu.svg';
import editMenuIcon from './assets/icon-edit-menu.svg';
import expandAllIcon from './assets/icon-expand-all.svg';
import moveItemIcon from './assets/icon-move-item.png';
import pageIcon from './assets/icon-page.png';
import plusIcon from './assets/icon-plus.svg';
import searchCourseIcon from './assets/icon-search-course.svg';
import { CoverageImpactPanel } from './PageCustomize';
import {
  addChildNode,
  canContain,
  canMoveNode,
  childTypesFor,
  createInstructorNode,
  dropNode,
  findNode,
  isContainerType,
  isNodeVisible,
  isValidDrop,
  loadCurriculum,
  moveNode,
  NODE_TYPE_LABEL,
  objectiveCodesFromLabels,
  pageScoringOf,
  persistCurriculum,
  removeFromCourse,
  restoreOriginal,
  statusDescription,
  type CurriculumNode,
  type DropPlacement,
  type PageScoring,
  type StructuralNodeType,
} from './curriculumData';
import { INSTRUCTOR_PROJECTS, type ExistingMaterial } from './existingMaterials';
import {
  ELSEWHERE_NOTE,
  evaluateCurriculumRemoval,
  friendlyObjectiveName,
  type RemovalImpact,
} from './learningDesign';
import { createDefaultPageBlocks, persistPageMeta, persistSavedPageLayout, resolvePageProfile } from './pageCustomization';
import { dismissTour, useTour } from './firstRunTour';

const ROOT_DESTINATION = '__root__';

type DialogState =
  | { type: 'leave-edit' }
  | { type: 'move'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'remove-limited'; id: string; impact: RemovalImpact }
  | { type: 'remove-orphaned'; id: string; impact: RemovalImpact }
  | { type: 'review-objectives'; objectives: string[] }
  | { type: 'existing-materials' }
  | null;

type DropHint = { id: string; placement: DropPlacement };

function listDestinations(
  nodes: CurriculumNode[],
  childType: StructuralNodeType,
): { id: string; label: string }[] {
  const items: { id: string; label: string }[] = [];
  if (childTypesFor(null).includes(childType)) {
    items.push({ id: ROOT_DESTINATION, label: 'Top of course (not in a unit)' });
  }
  const walk = (list: CurriculumNode[], trail: string[]) => {
    list.forEach((node) => {
      if (node.status === 'removed' || node.type === 'block') return;
      const nextTrail = [...trail, node.title];
      if (canContain(node.type, childType)) {
        items.push({ id: node.id, label: nextTrail.join(' / ') });
      }
      walk(node.children, nextTrail);
    });
  };
  walk(nodes, []);
  return items;
}

function emptyChildLabel(parent: CurriculumNode): string {
  const labels = childTypesFor(parent.type).map((type) => `${type}s`);
  if (labels.length === 0) return 'content';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`;
}

function collectExpandableIds(nodes: CurriculumNode[], showRemoved: boolean): string[] {
  const ids: string[] = [];
  const walk = (list: CurriculumNode[]) => {
    list.forEach((node) => {
      if (node.type === 'block' || !isNodeVisible(node, showRemoved)) return;
      if (isContainerType(node.type)) ids.push(node.id);
      walk(node.children);
    });
  };
  walk(nodes);
  return ids;
}

function structuralLabel(type: CurriculumNode['type']): string {
  return type === 'block' ? 'Item' : NODE_TYPE_LABEL[type];
}

function seedImportedPage(title: string, scoring: PageScoring, projectName: string, summary: string) {
  const profile = resolvePageProfile(title);
  persistSavedPageLayout(
    title,
    profile.matched
      ? createDefaultPageBlocks({
          pageTitle: title,
          selectionIds: profile.bankIds,
          removedBanks: [],
          removedEmbedded: {},
          images: {},
          origin: 'instructor',
        })
      : [
          {
            id: `pb-import-${Date.now()}`,
            origin: 'instructor',
            status: 'added',
            kind: 'text',
            title,
            text: {
              heading: title,
              bodyHtml: `<p>Imported from ${projectName}. ${summary}</p>`,
              learningObjective: '',
            },
          },
        ],
  );
  persistPageMeta(title, {
    scoring,
    attachedObjectiveCodes: profile.objectiveCodes,
    isInstructorCreated: true,
  });
}

function firstOpenablePage(nodes: CurriculumNode[]): { pageId: string; ancestorIds: string[] } | null {
  const walk = (list: CurriculumNode[], ancestors: string[]): { pageId: string; ancestorIds: string[] } | null => {
    for (const node of list) {
      if (node.type === 'block' || !isNodeVisible(node, false)) continue;
      if (node.type === 'page') return { pageId: node.id, ancestorIds: ancestors };
      const found = walk(node.children, [...ancestors, node.id]);
      if (found) return found;
    }
    return null;
  };
  return walk(nodes, []);
}

function subtreeMatches(node: CurriculumNode, query: string): boolean {
  if (node.title.toLowerCase().includes(query)) return true;
  return node.children.some((child) => child.type !== 'block' && subtreeMatches(child, query));
}

export function CustomizeScreen({ breadcrumbs }: { breadcrumbs?: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const tour = useTour();
  const fromReleaseNote = Boolean((location.state as { fromReleaseNote?: boolean } | null)?.fromReleaseNote);
  const showRemovedId = useId();
  const [editing, setEditing] = useState(false);
  const [units, setUnits] = useState<CurriculumNode[]>(() => loadCurriculum());
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(loadCurriculum()));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [showRemoved, setShowRemoved] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const expandedForHint = useRef(false);
  const scrolledForHint = useRef(false);

  const dirty = JSON.stringify(units) !== savedSnapshot;
  const openHintTarget = useMemo(
    () => (tour.outline && !editing ? firstOpenablePage(units) : null),
    [tour.outline, editing, units],
  );

  useEffect(() => {
    if (!openHintTarget || expandedForHint.current) return;
    expandedForHint.current = true;
    setExpandedIds((current) => {
      const next = new Set(current);
      openHintTarget.ancestorIds.forEach((id) => next.add(id));
      return next;
    });
  }, [openHintTarget]);

  useEffect(() => {
    if (!openHintTarget || scrolledForHint.current) return undefined;
    const anchor = document.querySelector<HTMLElement>('[data-tour-anchor="open-page"]');
    if (!anchor) return undefined;
    scrolledForHint.current = true;
    anchor.scrollIntoView({ block: 'center' });
    if (fromReleaseNote) {
      anchor.querySelector<HTMLButtonElement>('button')?.focus();
    }
    return undefined;
  }, [openHintTarget, expandedIds, fromReleaseNote]);

  useEffect(() => {
    persistCurriculum(units);
  }, [units]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!dialog) return undefined;
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setDialog(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialog]);

  useEffect(() => {
    if (!openMenuId) return undefined;
    document.querySelector<HTMLButtonElement>('[data-curriculum-menu] [role="menu"] button')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-curriculum-menu]')) return;
      setOpenMenuId(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpenMenuId(null);
        lastMenuTriggerRef.current?.focus();
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenuId]);

  const announce = (message: string) => {
    setAnnouncement(message);
    setToast(message);
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandableIds = collectExpandableIds(units, showRemoved);
  const allExpanded = expandableIds.length > 0 && expandableIds.every((id) => expandedIds.has(id));

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
      announce('Collapsed all units, modules, and sections.');
      return;
    }
    setExpandedIds(new Set(expandableIds));
    announce('Expanded all units, modules, and sections.');
  };

  const confirmRemove = (reviewAffected = false) => {
    if (
      !dialog ||
      (dialog.type !== 'remove' && dialog.type !== 'remove-limited' && dialog.type !== 'remove-orphaned')
    ) {
      return;
    }
    const node = findNode(units, dialog.id);
    const reviewObjectives =
      reviewAffected && dialog.type === 'remove-orphaned'
        ? dialog.impact.impacts.map((impact) => impact.objective)
        : [];
    setUnits((current) => removeFromCourse(current, dialog.id));
    announce(`${node?.title ?? 'Item'} removed from this course.`);
    setDialog(reviewObjectives.length > 0 ? { type: 'review-objectives', objectives: reviewObjectives } : null);
  };

  const openRemove = (id: string) => {
    setOpenMenuId(null);
    const impact = evaluateCurriculumRemoval(units, id);
    if (impact.level === 'none-remaining') {
      setDialog({ type: 'remove-orphaned', id, impact });
      return;
    }
    if (impact.level === 'limited') {
      setDialog({ type: 'remove-limited', id, impact });
      return;
    }
    setDialog({ type: 'remove', id });
  };

  const handleRestore = (id: string) => {
    const node = findNode(units, id);
    setOpenMenuId(null);
    setUnits((current) => restoreOriginal(current, id));
    announce(
      node?.origin === 'instructor'
        ? `“${node.title}” restored to this course.`
        : `Original version of “${node?.originalTitle ?? 'item'}” restored.`,
    );
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    const node = findNode(units, id);
    setOpenMenuId(null);
    setUnits((current) => moveNode(current, id, direction, showRemoved));
    announce(`Moved “${node?.title ?? 'item'}” ${direction}.`);
  };

  const openPage = (node: CurriculumNode) => {
    dismissTour('outline');
    const scoring = pageScoringOf(node);
    navigate('/assessment-default', {
      state: {
        pageId: node.id,
        assessmentTitle: node.assessmentTitle ?? node.title,
        attemptsStarted: node.attemptsStarted ?? false,
        pageScoring: scoring,
        isInstructorCreated: node.origin === 'instructor',
        attachedObjectiveCodes: objectiveCodesFromLabels(node.learningObjectives ?? []),
        breadcrumbTrail: [
          { label: 'Overview', to: '/overview' },
          { label: 'Course Content', to: '/overview' },
          { label: node.title },
        ],
      },
    });
  };

  const discardChanges = () => {
    const restored = JSON.parse(savedSnapshot) as CurriculumNode[];
    setUnits(restored);
    persistCurriculum(restored);
  };

  const enterEditMode = () => {
    setEditing(true);
    announce(
      'Customizing is on. Drag a handle to change the order. Use the more menu to move an item, remove it, or edit a page. Add materials from a project you can access. Show removed content, then restore it.',
    );
  };

  const leaveEditMode = (discard: boolean) => {
    if (discard) discardChanges();
    setOpenMenuId(null);
    setDialog(null);
    setShowRemoved(false);
    setEditing(false);
    announce(discard ? 'Unsaved changes discarded. View only.' : 'View only. Expand the outline or open a page.');
  };

  const showViewMode = () => {
    if (!editing) return;
    if (dirty) {
      setOpenMenuId(null);
      setDialog({ type: 'leave-edit' });
      return;
    }
    leaveEditMode(false);
  };

  const handleCancel = () => {
    setOpenMenuId(null);
    setDialog(null);
    if (!dirty) return;
    discardChanges();
    announce('Unsaved changes discarded.');
  };

  const handleSave = () => {
    if (!dirty) return;
    const snapshot = JSON.stringify(units);
    setSavedSnapshot(snapshot);
    persistCurriculum(units);
    announce('Saved to this course section.');
  };

  const applyDrop = (targetId: string, placement: DropPlacement) => {
    const id = draggingIdRef.current ?? draggingId;
    if (!id) return;
    const dragged = findNode(units, id);
    setUnits((current) => dropNode(current, id, targetId, placement));
    if (placement === 'inside') {
      setExpandedIds((current) => {
        const next = new Set(current);
        next.add(targetId);
        return next;
      });
    }
    announce(`Moved “${dragged?.title ?? 'item'}”.`);
    draggingIdRef.current = null;
    setDraggingId(null);
    setDropHint(null);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const removedVisible = editing && showRemoved;

  const renderRows = (nodes: CurriculumNode[], depth: number): ReactNode[] =>
    nodes.flatMap((node) => {
      if (node.type === 'block' || !isNodeVisible(node, removedVisible)) return [];
      if (normalizedQuery && !subtreeMatches(node, normalizedQuery)) return [];
      const nestableChildren = node.children.filter((child) => child.type !== 'block');
      const childMatch = normalizedQuery
        ? nestableChildren.some((child) => isNodeVisible(child, removedVisible) && subtreeMatches(child, normalizedQuery))
        : false;
      const expanded = childMatch || expandedIds.has(node.id);
      const rows: ReactNode[] = [
        <CurriculumRow
          key={node.id}
          node={node}
          depth={depth}
          expanded={expanded}
          editing={editing}
          menuOpen={editing && openMenuId === node.id}
          showRemoved={removedVisible}
          units={units}
          draggingId={draggingId}
          draggingIdRef={draggingIdRef}
          dropHint={dropHint}
          onToggleExpand={() => toggleExpanded(node.id)}
          onOpenPage={() => openPage(node)}
          onOpenMenu={(trigger) => {
            lastMenuTriggerRef.current = trigger;
            setOpenMenuId((current) => (current === node.id ? null : node.id));
          }}
          onMove={() => {
            setOpenMenuId(null);
            setDialog({ type: 'move', id: node.id });
          }}
          onNudge={(direction) => handleMove(node.id, direction)}
          onRemove={() => openRemove(node.id)}
          onRestore={() => handleRestore(node.id)}
          onDragStart={(id) => {
            setOpenMenuId(null);
            draggingIdRef.current = id;
            setDraggingId(id);
          }}
          onDragEnd={() => {
            draggingIdRef.current = null;
            setDraggingId(null);
            setDropHint(null);
          }}
          onDropHint={setDropHint}
          onDropRow={applyDrop}
          openHint={openHintTarget?.pageId === node.id}
          onDismissOpenHint={() => dismissTour('outline')}
        />,
      ];
      if (isContainerType(node.type)) {
        const visibleNestable = nestableChildren.filter((child) => isNodeVisible(child, removedVisible));
        if (expanded && visibleNestable.length > 0) {
          rows.push(renderRows(nestableChildren, depth + 1));
        } else if (expanded) {
          rows.push(
            <EmptyDropZone
              key={`${node.id}-empty`}
              parent={node}
              depth={depth}
              draggingId={draggingId}
              draggingIdRef={draggingIdRef}
              dropHint={dropHint}
              units={units}
              onDropHint={setDropHint}
              onDropRow={applyDrop}
            />,
          );
        }
      }
      return rows;
    });

  const dialogTitle =
    dialog?.type === 'leave-edit'
      ? 'Leave customize'
      : dialog?.type === 'move'
      ? 'Move'
      : dialog?.type === 'review-objectives'
        ? 'Review affected objectives'
        : dialog?.type === 'existing-materials'
          ? 'Add Materials'
          : dialog?.type === 'remove' || dialog?.type === 'remove-limited' || dialog?.type === 'remove-orphaned'
            ? 'Remove from this course'
            : '';
  const dialogNode = dialog && 'id' in dialog ? findNode(units, dialog.id) : undefined;
  const outlineRows = renderRows(units, 0);
  const countRenderedRows = (nodes: ReactNode[]): number =>
    nodes.reduce<number>((total, node) => total + (Array.isArray(node) ? countRenderedRows(node) : 1), 0);
  const renderedRowCount = countRenderedRows(outlineRows);
  const removeKindLabel = dialogNode ? structuralLabel(dialogNode.type).toLowerCase() : 'item';

  return (
    <>
      <div className="content-column content-column--wide customize-content">
          {breadcrumbs}
          <div className="course-heading">
            <div className="course-heading__top">
              <div>
                <h1>Chemistry 101</h1>
                <p>Browse the course as students will see it, or switch to Customize.</p>
              </div>
              <div className="mode-toggle" role="group" aria-label="View or customize">
                <button
                  type="button"
                  className={editing ? 'mode-toggle__option' : 'mode-toggle__option is-selected'}
                  aria-pressed={!editing}
                  onClick={showViewMode}
                >
                  View
                </button>
                <button
                  type="button"
                  className={editing ? 'mode-toggle__option is-selected' : 'mode-toggle__option'}
                  aria-pressed={editing}
                  onClick={() => {
                    if (!editing) enterEditMode();
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      d="M4.4 4.45H3.69c-.38 0-.74.15-1.01.42-.27.27-.42.63-.42 1.01v6.42c0 .38.15.74.42 1.01.27.27.63.42 1.01.42h6.42c.38 0 .74-.15 1.01-.42.27-.27.42-.63.42-1.01v-.71M10.83 3.03l2.14 2.14M13.96 4.16a1.16 1.16 0 0 0 0-1.64 1.16 1.16 0 0 0-1.64 0L5.84 8.02v2.14h2.14l6-6z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Customize
                </button>
              </div>
            </div>
            {editing ? (
              <div className="edit-status">
                <p className="edit-status__copy">
                  <span className="edit-status__dot" aria-hidden="true" />
                  <span>
                    <strong>Customizing is on.</strong> Drag a handle to change the order. Use the more menu to move
                    an item, remove it, or edit a page. Add materials from a project you can access. Show removed
                    content, then restore it.
                  </span>
                </p>
                <div className="button-row">
                  <button type="button" className="button button--subtle" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={dirty ? 'button button--primary' : 'button button--disabled'}
                    onClick={handleSave}
                    disabled={!dirty}
                  >
                    Save changes
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="curriculum-toolbar">
            <label className="course-search">
              <span className="visually-hidden">Search course</span>
              <img src={searchCourseIcon} alt="" />
              <input
                type="search"
                placeholder="Search course..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <div className="curriculum-toolbar__aside">
              <button
                type="button"
                className="curriculum-expand-all"
                onClick={toggleExpandAll}
                disabled={expandableIds.length === 0}
              >
                <img src={expandAllIcon} alt="" />
                {allExpanded ? 'Collapse all' : 'Expand All'}
              </button>
              {editing ? (
                <label className="check-row curriculum-show-removed" htmlFor={showRemovedId}>
                  <input
                    id={showRemovedId}
                    type="checkbox"
                    checked={showRemoved}
                    onChange={(event) => setShowRemoved(event.target.checked)}
                  />
                  Show removed content
                </label>
              ) : null}
            </div>
          </div>

          <div className="curriculum-tree" role="region" aria-label="Course curriculum">
            {editing ? (
              <span className="visually-hidden" id="curriculum-drag-help">
                Drag to a new position, or use the up and down arrow keys to reorder.
              </span>
            ) : null}
            {outlineRows.length > 0 ? (
              outlineRows
            ) : (
              <p className="curriculum-empty">No course materials match “{searchQuery.trim()}”.</p>
            )}
          </div>
          <p className="visually-hidden" role="status">
            {normalizedQuery ? `${renderedRowCount} matching rows.` : ''}
          </p>

          {editing ? (
            <div className="footer-actions">
              <button type="button" className="button button--primary button--add-materials" onClick={() => setDialog({ type: 'existing-materials' })}>
                <img src={plusIcon} alt="" />
                Add Materials
              </button>
            </div>
          ) : null}
        </div>

      <div className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </div>
      {toast ? (
        <div className="success-toast" role="status">
          {toast}
        </div>
      ) : null}

      {dialog ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setDialog(null)}>
          <div
            className={dialog.type === 'existing-materials' ? 'modal-card modal-card--wide' : 'modal-card'}
            role="dialog"
            aria-modal="true"
            aria-labelledby="curriculum-dialog-title"
            ref={dialogRef}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="curriculum-dialog-title">{dialogTitle}</h3>
            {dialog.type === 'leave-edit' ? (
              <>
                <p>This course has unsaved changes. Discard them to go back to view, or keep customizing.</p>
                <div className="modal-actions">
                  <button type="button" className="button button--subtle" onClick={() => setDialog(null)}>
                    Keep customizing
                  </button>
                  <button type="button" className="button button--danger" onClick={() => leaveEditMode(true)}>
                    Discard and view
                  </button>
                </div>
              </>
            ) : null}
            {dialog.type === 'move' && dialogNode ? (
              <>
                <p>Move “{dialogNode.title}” up or down in this course.</p>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={!canMoveNode(units, dialogNode.id, 'up', showRemoved)}
                    onClick={() => handleMove(dialogNode.id, 'up')}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={!canMoveNode(units, dialogNode.id, 'down', showRemoved)}
                    onClick={() => handleMove(dialogNode.id, 'down')}
                  >
                    Move down
                  </button>
                  <button type="button" className="button button--subtle" onClick={() => setDialog(null)}>
                    Done
                  </button>
                </div>
              </>
            ) : null}
            {dialog.type === 'existing-materials' ? (
              <ExistingMaterialsDialog
                units={units}
                onCancel={() => setDialog(null)}
                onAdd={({ material, projectName, parentId }) => {
                  const child = createInstructorNode(material.type, material.title, {
                    pageScoring: material.type === 'page' ? material.pageScoring ?? 'scored' : undefined,
                  });
                  setUnits((current) => addChildNode(current, parentId, child));
                  setExpandedIds((current) => {
                    const next = new Set(current);
                    if (parentId) next.add(parentId);
                    next.add(child.id);
                    return next;
                  });
                  if (material.type === 'page') {
                    seedImportedPage(
                      material.title,
                      material.pageScoring ?? 'scored',
                      projectName,
                      material.summary,
                    );
                  }
                  announce(`${NODE_TYPE_LABEL[material.type]} “${material.title}” added from ${projectName}.`);
                  setDialog(null);
                }}
              />
            ) : null}
            {dialog.type === 'remove' && dialogNode ? (
              <>
                <p>
                  Remove “{dialogNode.title}” from this course? Students will not see it. Turn on Show removed content
                  to find it again and restore it.
                </p>
                <div className="modal-actions">
                  <button type="button" className="button button--subtle" onClick={() => setDialog(null)}>
                    Cancel
                  </button>
                  <button type="button" className="button button--danger" onClick={() => confirmRemove()}>
                    Remove from this course
                  </button>
                </div>
              </>
            ) : null}
            {dialog.type === 'remove-limited' && dialogNode ? (
              <>
                <CoverageImpactPanel impacts={dialog.impact.impacts} scope="this course" />
                <div className="modal-actions">
                  <button type="button" className="button button--subtle" onClick={() => setDialog(null)}>
                    Cancel
                  </button>
                  <button type="button" className="button button--danger" onClick={() => confirmRemove()}>
                    Continue
                  </button>
                </div>
              </>
            ) : null}
            {dialog.type === 'remove-orphaned' && dialogNode ? (
              <>
                <p>
                  Removing “{dialogNode.title}” would leave{' '}
                  {dialog.impact.impacts.length === 1
                    ? `“${friendlyObjectiveName(dialog.impact.impacts[0].objective)}”`
                    : 'these learning objectives'}{' '}
                  with no supporting content in this course.
                </p>
                {dialog.impact.impacts.length > 1 ? (
                  <ul className="guardrail-objective-list">
                    {dialog.impact.impacts.map((impact) => (
                      <li key={impact.objective}>{friendlyObjectiveName(impact.objective)}</li>
                    ))}
                  </ul>
                ) : null}
                <p>{ELSEWHERE_NOTE}</p>
                <div className="modal-actions modal-actions--stack">
                  <button type="button" className="button button--primary" onClick={() => confirmRemove(true)}>
                    Remove the {removeKindLabel} and review affected objectives
                  </button>
                  <button type="button" className="button button--secondary" onClick={() => confirmRemove()}>
                    Remove only the {removeKindLabel}
                  </button>
                  <button type="button" className="button button--subtle" onClick={() => setDialog(null)}>
                    Cancel
                  </button>
                </div>
              </>
            ) : null}
            {dialog.type === 'review-objectives' ? (
              <>
                <p>These objectives no longer have supporting content in this course.</p>
                <ul className="guardrail-objective-list">
                  {dialog.objectives.map((objective) => (
                    <li key={objective}>{friendlyObjectiveName(objective)}</li>
                  ))}
                </ul>
                <p>{ELSEWHERE_NOTE}</p>
                <div className="modal-actions">
                  <button type="button" className="button button--primary" onClick={() => setDialog(null)}>
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function ExistingMaterialsDialog({
  units,
  onCancel,
  onAdd,
}: {
  units: CurriculumNode[];
  onCancel: () => void;
  onAdd: (payload: { material: ExistingMaterial; projectName: string; parentId: string | null }) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState('');

  const selected = INSTRUCTOR_PROJECTS.flatMap((project) =>
    project.materials.map((material) => ({ material, projectName: project.name })),
  ).find((item) => item.material.id === selectedId);

  const destinationOptions = selected ? listDestinations(units, selected.material.type) : [];
  const destinationPrompt =
    selected?.material.type === 'module'
      ? 'Add to unit'
      : selected?.material.type === 'section'
        ? 'Add to module'
        : 'Add to';

  const canAdd =
    Boolean(selected) &&
    (selected?.material.type === 'unit' || Boolean(destinationId) || destinationOptions.length === 0);

  return (
    <>
      <p>Select a unit, module, section, or page from a project you can access, then add it to this course.</p>
      <div className="existing-materials" role="list">
        {INSTRUCTOR_PROJECTS.map((project) => (
          <section key={project.id} className="existing-project">
            <div className="existing-project__head">
              <h4>{project.name}</h4>
              <span>{project.access}</span>
            </div>
            {project.materials.map((material) => (
              <label key={material.id} className="existing-material">
                <input
                  type="radio"
                  name="existing-material"
                  checked={selectedId === material.id}
                  onChange={() => {
                    setSelectedId(material.id);
                    setDestinationId('');
                  }}
                />
                <span>
                  <strong>{material.title}</strong>
                  <span className="existing-material__meta">
                    {NODE_TYPE_LABEL[material.type]}
                    {material.pageScoring ? ` · ${material.pageScoring}` : ''}
                  </span>
                  <span className="existing-material__summary">{material.summary}</span>
                </span>
              </label>
            ))}
          </section>
        ))}
      </div>
      {selected && selected.material.type !== 'unit' ? (
        <label className="field">
          <span>{destinationPrompt}</span>
          <select
            className="select"
            value={destinationId}
            onChange={(event) => setDestinationId(event.target.value)}
            disabled={destinationOptions.length === 0}
          >
            <option value="">{destinationOptions.length === 0 ? 'No destination available' : 'Select a destination'}</option>
            {destinationOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="modal-actions">
        <button type="button" className="button button--subtle" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={!canAdd}
          onClick={() => {
            if (!selected) return;
            onAdd({
              material: selected.material,
              projectName: selected.projectName,
              parentId:
                selected.material.type === 'unit' || destinationId === ROOT_DESTINATION || !destinationId
                  ? null
                  : destinationId,
            });
          }}
        >
          Add to course
        </button>
      </div>
    </>
  );
}

function placementForDrag(
  event: DragEvent<HTMLElement>,
  units: CurriculumNode[],
  draggedId: string,
  target: CurriculumNode,
): DropPlacement | null {
  const dragged = findNode(units, draggedId);
  if (!dragged) return null;
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = (event.clientY - rect.top) / Math.max(rect.height, 1);
  const canInside = isValidDrop(units, draggedId, target.id, 'inside');
  const canBefore = isValidDrop(units, draggedId, target.id, 'before');
  const canAfter = isValidDrop(units, draggedId, target.id, 'after');

  if (canInside) {
    // Prefer sibling placement on the edges so a page can leave a unit/module.
    const edge = canBefore || canAfter ? 0.4 : 0.5;
    if (ratio < edge && canBefore) return 'before';
    if (ratio > 1 - edge && canAfter) return 'after';
    return 'inside';
  }

  if (ratio < 0.5 && canBefore) return 'before';
  if (ratio >= 0.5 && canAfter) return 'after';
  if (canBefore) return 'before';
  if (canAfter) return 'after';
  return null;
}

function EmptyDropZone({
  parent,
  depth,
  draggingId,
  draggingIdRef,
  dropHint,
  units,
  onDropHint,
  onDropRow,
}: {
  parent: CurriculumNode;
  depth: number;
  draggingId: string | null;
  draggingIdRef: MutableRefObject<string | null>;
  dropHint: DropHint | null;
  units: CurriculumNode[];
  onDropHint: (hint: DropHint | null) => void;
  onDropRow: (targetId: string, placement: DropPlacement) => void;
}) {
  const childLabel = emptyChildLabel(parent);
  const isInside = dropHint?.id === parent.id && dropHint.placement === 'inside';
  const activeId = () => draggingIdRef.current ?? draggingId;
  return (
    <div
      className={isInside ? 'curriculum-empty is-drop-inside' : 'curriculum-empty'}
      style={{ paddingLeft: 28 + depth * 24 }}
      onDragOver={(event) => {
        const id = activeId();
        if (!id) return;
        if (!isValidDrop(units, id, parent.id, 'inside')) return;
        event.preventDefault();
        onDropHint({ id: parent.id, placement: 'inside' });
      }}
      onDragLeave={() => {
        if (isInside) onDropHint(null);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const id = activeId();
        if (id && isValidDrop(units, id, parent.id, 'inside')) {
          onDropRow(parent.id, 'inside');
        }
      }}
    >
      No {childLabel} yet.
    </div>
  );
}

function CurriculumRow({
  node,
  depth,
  expanded,
  editing,
  menuOpen,
  showRemoved,
  units,
  draggingId,
  draggingIdRef,
  dropHint,
  onToggleExpand,
  onOpenPage,
  onOpenMenu,
  onMove,
  onNudge,
  onRemove,
  onRestore,
  onDragStart,
  onDragEnd,
  onDropHint,
  onDropRow,
  openHint = false,
  onDismissOpenHint,
}: {
  node: CurriculumNode;
  depth: number;
  expanded: boolean;
  editing: boolean;
  menuOpen: boolean;
  showRemoved: boolean;
  units: CurriculumNode[];
  draggingId: string | null;
  draggingIdRef: MutableRefObject<string | null>;
  dropHint: DropHint | null;
  onToggleExpand: () => void;
  onOpenPage: () => void;
  onOpenMenu: (trigger: HTMLButtonElement) => void;
  onMove: () => void;
  onNudge: (direction: 'up' | 'down') => void;
  onRemove: () => void;
  onRestore: () => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropHint: (hint: DropHint | null) => void;
  onDropRow: (targetId: string, placement: DropPlacement) => void;
  openHint?: boolean;
  onDismissOpenHint?: () => void;
}) {
  const canExpand = isContainerType(node.type);
  const rowLabel = structuralLabel(node.type);
  const icon = node.type === 'page' ? pageIcon : containerIcon;
  const removed = node.status === 'removed';
  const accessibleName = `${rowLabel} ${node.title}, ${statusDescription(node)}`;
  const canMoveUp = canMoveNode(units, node.id, 'up', showRemoved);
  const canMoveDown = canMoveNode(units, node.id, 'down', showRemoved);
  const isDragging = draggingId === node.id;
  const hint = dropHint?.id === node.id ? dropHint.placement : null;

  const rowClass = [
    'curriculum-row',
    `curriculum-row--${node.type}`,
    node.status === 'removed' ? 'curriculum-row--removed' : '',
    node.hidden && node.status !== 'removed' ? 'curriculum-row--hidden' : '',
    node.status === 'added' ? 'curriculum-row--added' : '',
    node.status === 'modified' ? 'curriculum-row--modified' : '',
    isDragging ? 'is-dragging' : '',
    hint === 'before' ? 'is-drop-before' : '',
    hint === 'after' ? 'is-drop-after' : '',
    hint === 'inside' ? 'is-drop-inside' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rowClass}
      style={{ paddingLeft: 17 + depth * 36 }}
      onDragOver={
        editing
          ? (event) => {
              const id = draggingIdRef.current ?? draggingId;
              if (!id || id === node.id) return;
              const placement = placementForDrag(event, units, id, node);
              if (!placement) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              onDropHint({ id: node.id, placement });
            }
          : undefined
      }
      onDragLeave={
        editing
          ? (event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                onDropHint(null);
              }
            }
          : undefined
      }
      onDrop={
        editing
          ? (event) => {
              event.preventDefault();
              const id = draggingIdRef.current ?? draggingId;
              if (!id || id === node.id) return;
              const placement = placementForDrag(event, units, id, node);
              if (placement) onDropRow(node.id, placement);
            }
          : undefined
      }
    >
      <div className="curriculum-row__main">
        {editing && node.status !== 'removed' ? (
          <button
            type="button"
            className="curriculum-drag"
            draggable
            aria-label={`Drag to reorder ${node.title}`}
            aria-describedby="curriculum-drag-help"
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', node.id);
              event.dataTransfer.effectAllowed = 'move';
              const row = event.currentTarget.closest('.curriculum-row');
              if (row instanceof HTMLElement) {
                event.dataTransfer.setDragImage(row, 24, 16);
              }
              draggingIdRef.current = node.id;
              onDragStart(node.id);
            }}
            onDragEnd={onDragEnd}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp' && canMoveUp) {
                event.preventDefault();
                onNudge('up');
              }
              if (event.key === 'ArrowDown' && canMoveDown) {
                event.preventDefault();
                onNudge('down');
              }
            }}
          >
            <span className="curriculum-drag__dots" aria-hidden="true">
              <i /><i /><i /><i /><i /><i />
            </span>
          </button>
        ) : null}
        {canExpand ? (
          <button
            type="button"
            className="curriculum-expand"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.title}`}
            onClick={onToggleExpand}
          >
            <img
              src={chevronRightIcon}
              alt=""
              className={expanded ? 'curriculum-expand__icon is-open' : 'curriculum-expand__icon'}
            />
          </button>
        ) : (
          <span className="curriculum-expand curriculum-expand--spacer" aria-hidden="true" />
        )}
        <img className="material-icon" src={icon} alt="" aria-hidden="true" />
        {canExpand ? (
          <button type="button" className="curriculum-title-button" onClick={onToggleExpand}>
            <span className="curriculum-title">{node.title}</span>
          </button>
        ) : openHint ? (
          <span className="tour-anchor" data-tour-anchor="open-page">
            <button
              type="button"
              className="curriculum-title-button curriculum-title-button--link is-tour-target"
              onClick={onOpenPage}
              aria-label={`Open ${node.title}`}
              aria-describedby="open-page-hint"
            >
              <span className="curriculum-title">{node.title}</span>
            </button>
            <div className="tour-note" role="note">
              <p id="open-page-hint">Click a page to open it.</p>
              <button type="button" className="tour-note__dismiss" onClick={onDismissOpenHint}>
                Dismiss
              </button>
            </div>
          </span>
        ) : (
          <button
            type="button"
            className="curriculum-title-button curriculum-title-button--link"
            onClick={onOpenPage}
            aria-label={`Open ${node.title}`}
          >
            <span className="curriculum-title">{node.title}</span>
          </button>
        )}
        {removed ? <span className="curriculum-removed-tag">Removed</span> : null}
        <span className="visually-hidden">{accessibleName}</span>
      </div>

      {editing ? (
      <div className="curriculum-row__actions">
          <div className="curriculum-menu-wrap" data-curriculum-menu>
            <button
              type="button"
              className={menuOpen ? 'curriculum-more is-open' : 'curriculum-more'}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`Actions for ${node.title}`}
              onClick={(event) => onOpenMenu(event.currentTarget)}
            >
              <span aria-hidden="true">•••</span>
            </button>
            {menuOpen ? (
              <div className="curriculum-menu" role="menu" aria-label={`Actions for ${node.title}`}>
                {removed ? (
                  <button type="button" role="menuitem" className="curriculum-menu__item" onClick={onRestore}>
                    Restore
                  </button>
                ) : (
                  <>
                    {node.type === 'page' ? (
                      <button type="button" role="menuitem" className="curriculum-menu__item" onClick={onOpenPage}>
                        <img src={editMenuIcon} alt="" />
                        Edit
                      </button>
                    ) : null}
                      <button type="button" role="menuitem" className="curriculum-menu__item" onClick={onMove}>
                      <img className="curriculum-menu__raster" src={moveItemIcon} alt="" />
                      Move
                    </button>
                    <button type="button" role="menuitem" className="curriculum-menu__item curriculum-menu__item--danger" onClick={onRemove}>
                      <img src={deleteMenuIcon} alt="" />
                      Remove from course
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
