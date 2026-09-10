import { useEffect, useId, useRef, useState, type DragEvent, type MutableRefObject, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import chevronDownIcon from './assets/icon-chevron-down.png';
import containerIcon from './assets/icon-container.png';
import editIcon from './assets/icon-edit.png';
import pageIcon from './assets/icon-page.png';
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
  renameNode,
  restoreOriginal,
  setNodeHidden,
  statusDescription,
  statusLabel,
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
import { persistPageMeta, persistSavedPageLayout, pageExampleBlock } from './pageCustomization';
import electrolysisImage from './assets/electrolysis.jpg';
import radiationMaterialsImage from './assets/radiation_materials.jpg';
import formulaImage from './assets/formula.png';
import graphImage from './assets/graph.png';

const ROOT_DESTINATION = '__root__';

type DialogState =
  | { type: 'add'; parentId: string | null; childType: StructuralNodeType }
  | { type: 'rename'; id: string }
  | { type: 'view-original'; id: string }
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

function structuralLabel(type: CurriculumNode['type']): string {
  return type === 'block' ? 'Item' : NODE_TYPE_LABEL[type];
}

function seedImportedPage(title: string, scoring: PageScoring, projectName: string, summary: string) {
  persistSavedPageLayout(title, [
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
    pageExampleBlock(title, {
      electrolysis: electrolysisImage,
      radiation: radiationMaterialsImage,
      formula: formulaImage,
      graph: graphImage,
    }, 'instructor'),
  ]);
  persistPageMeta(title, {
    scoring,
    attachedObjectiveCodes: [],
    isInstructorCreated: true,
  });
}

export function CustomizeScreen({ breadcrumbs }: { breadcrumbs: ReactNode }) {
  const navigate = useNavigate();
  const showRemovedId = useId();
  const [units, setUnits] = useState<CurriculumNode[]>(() => loadCurriculum());
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(loadCurriculum()));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [showRemoved, setShowRemoved] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [draftName, setDraftName] = useState('');
  const [draftScoring, setDraftScoring] = useState<PageScoring>('scored');
  const [toast, setToast] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastMenuTriggerRef = useRef<HTMLButtonElement | null>(null);

  const dirty = JSON.stringify(units) !== savedSnapshot;

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
    if (dialog.type === 'add' || dialog.type === 'rename') {
      nameInputRef.current?.focus();
    } else {
      dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    }

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

  const openAdd = (parentId: string | null, childType: StructuralNodeType) => {
    setOpenMenuId(null);
    setDraftName('');
    setDraftScoring('scored');
    setDialog({ type: 'add', parentId, childType });
  };

  const openRename = (id: string) => {
    const node = findNode(units, id);
    if (!node) return;
    setOpenMenuId(null);
    setDraftName(node.title);
    setDialog({ type: 'rename', id });
  };

  const submitDialog = () => {
    if (!dialog) return;
    if (dialog.type === 'add') {
      const name = draftName.trim();
      if (!name) return;
      const child = createInstructorNode(dialog.childType, name, {
        pageScoring: dialog.childType === 'page' ? draftScoring : undefined,
      });
      setUnits((current) => addChildNode(current, dialog.parentId, child));
      setExpandedIds((current) => {
        const next = new Set(current);
        if (dialog.parentId) next.add(dialog.parentId);
        next.add(child.id);
        return next;
      });
      if (dialog.childType === 'page') {
        persistSavedPageLayout(name, [
          pageExampleBlock(name, {
            electrolysis: electrolysisImage,
            radiation: radiationMaterialsImage,
            formula: formulaImage,
            graph: graphImage,
          }, 'instructor'),
        ]);
        persistPageMeta(name, {
          scoring: draftScoring,
          attachedObjectiveCodes: [],
          isInstructorCreated: true,
        });
      }
      announce(`${NODE_TYPE_LABEL[dialog.childType]} “${name}” created.`);
      setDialog(null);
      return;
    }
    if (dialog.type === 'rename') {
      const name = draftName.trim();
      if (!name) return;
      const node = findNode(units, dialog.id);
      setUnits((current) => renameNode(current, dialog.id, name));
      announce(`${node ? structuralLabel(node.type) : 'Item'} renamed to “${name}”.`);
      setDialog(null);
    }
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

  const handleHide = (id: string) => {
    const node = findNode(units, id);
    if (!node || node.status === 'removed') return;
    setOpenMenuId(null);
    const nextHidden = !node.hidden;
    setUnits((current) => setNodeHidden(current, id, nextHidden));
    announce(
      nextHidden
        ? `“${node.title}” hidden from students.`
        : `“${node.title}” shown to students.`,
    );
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    const node = findNode(units, id);
    setOpenMenuId(null);
    setUnits((current) => moveNode(current, id, direction, showRemoved));
    announce(`Moved “${node?.title ?? 'item'}” ${direction}.`);
  };

  const openPage = (node: CurriculumNode) => {
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
          { label: 'Manage', to: '/' },
          { label: 'Customize Content', to: '/customize' },
          { label: node.title },
        ],
      },
    });
  };

  const handleCancel = () => {
    setOpenMenuId(null);
    setDialog(null);
    if (!dirty) return;
    const restored = JSON.parse(savedSnapshot) as CurriculumNode[];
    setUnits(restored);
    persistCurriculum(restored);
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

  const renderRows = (nodes: CurriculumNode[], depth: number): ReactNode[] =>
    nodes.flatMap((node) => {
      if (node.type === 'block' || !isNodeVisible(node, showRemoved)) return [];
      const expanded = expandedIds.has(node.id);
      const nestableChildren = node.children.filter((child) => child.type !== 'block');
      const rows: ReactNode[] = [
        <CurriculumRow
          key={node.id}
          node={node}
          depth={depth}
          expanded={expanded}
          menuOpen={openMenuId === node.id}
          showRemoved={showRemoved}
          units={units}
          draggingId={draggingId}
          draggingIdRef={draggingIdRef}
          dropHint={dropHint}
          onToggleExpand={() => toggleExpanded(node.id)}
          onOpenPage={() => openPage(node)}
          onAddChild={(childType) => openAdd(node.id, childType)}
          onOpenMenu={(trigger) => {
            lastMenuTriggerRef.current = trigger;
            setOpenMenuId((current) => (current === node.id ? null : node.id));
          }}
          onRename={() => openRename(node.id)}
          onMove={(direction) => handleMove(node.id, direction)}
          onRemove={() => openRemove(node.id)}
          onHide={() => handleHide(node.id)}
          onRestore={() => handleRestore(node.id)}
          onViewOriginal={() => {
            setOpenMenuId(null);
            setDialog({ type: 'view-original', id: node.id });
          }}
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
        />,
      ];
      if (isContainerType(node.type)) {
        const visibleNestable = nestableChildren.filter((child) => isNodeVisible(child, showRemoved));
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
    dialog?.type === 'add'
      ? `Create ${dialog.childType}`
      : dialog?.type === 'rename'
        ? 'Rename'
        : dialog?.type === 'view-original'
          ? 'Original version'
          : dialog?.type === 'review-objectives'
            ? 'Review affected objectives'
            : dialog?.type === 'existing-materials'
              ? 'Add existing materials'
              : dialog?.type === 'remove' || dialog?.type === 'remove-limited' || dialog?.type === 'remove-orphaned'
                ? 'Remove from this course'
                : '';
  const dialogNode =
    dialog && dialog.type !== 'add' && dialog.type !== 'review-objectives' && dialog.type !== 'existing-materials'
      ? findNode(units, dialog.id)
      : undefined;
  const removeKindLabel = dialogNode ? structuralLabel(dialogNode.type).toLowerCase() : 'item';

  return (
    <>
      <div className="content-column content-column--wide customize-content">
          {breadcrumbs}
          <div className="page-header">
            <div>
              <h1>Chemistry 101</h1>
              <p>Customize your curriculum by adding, removing and rearranging course materials.</p>
            </div>
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
                Save
              </button>
            </div>
          </div>

          <div className="curriculum-toolbar">
            <p className="curriculum-helper">
              Content from the original course has no extra label. Items you added or edited are marked. Hidden items stay in
              this outline but are not shown to students. Removed items stay restorable and appear only when shown. Drag the
              handle to reorder units, modules, sections, and pages.
            </p>
            <label className="check-row curriculum-show-removed" htmlFor={showRemovedId}>
              <input
                id={showRemovedId}
                type="checkbox"
                checked={showRemoved}
                onChange={(event) => setShowRemoved(event.target.checked)}
              />
              Show removed content
            </label>
          </div>

          <div className="curriculum-tree" role="region" aria-label="Course curriculum">
            <span className="visually-hidden" id="curriculum-drag-help">
              Drag to a new position, or use the up and down arrow keys to reorder.
            </span>
            {renderRows(units, 0)}
          </div>

          <div className="footer-actions footer-actions--row">
            <button type="button" className="button button--primary" onClick={() => openAdd(null, 'unit')}>
              Create unit
            </button>
            <button type="button" className="button button--secondary" onClick={() => openAdd(null, 'page')}>
              Create page
            </button>
            <button type="button" className="button button--secondary" onClick={() => setDialog({ type: 'existing-materials' })}>
              Add existing materials
            </button>
          </div>
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
            {dialog.type === 'add' || dialog.type === 'rename' ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitDialog();
                }}
              >
                <label className="field">
                  <span>Name</span>
                  <input
                    ref={nameInputRef}
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    aria-required="true"
                  />
                </label>
                {dialog.type === 'add' && dialog.childType === 'page' ? (
                  <fieldset className="page-scoring-fieldset">
                    <legend>Page type</legend>
                    <label>
                      <input
                        type="radio"
                        name="page-scoring"
                        checked={draftScoring === 'scored'}
                        onChange={() => setDraftScoring('scored')}
                      />
                      Scored
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="page-scoring"
                        checked={draftScoring === 'practice'}
                        onChange={() => setDraftScoring('practice')}
                      />
                      Practice
                    </label>
                  </fieldset>
                ) : null}
                <div className="modal-actions">
                  <button type="button" className="button button--subtle" onClick={() => setDialog(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="button button--primary" disabled={!draftName.trim()}>
                    {dialog.type === 'add' ? 'Create' : 'Save'}
                  </button>
                </div>
              </form>
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
            {dialog.type === 'view-original' && dialogNode ? (
              <>
                {dialogNode.origin === 'instructor' ? (
                  <p>This item was added for your course. There is no original course version to compare.</p>
                ) : dialogNode.title === dialogNode.originalTitle && dialogNode.status !== 'modified' ? (
                  <p>
                    “{dialogNode.originalTitle}” matches the original course. Unchanged content can continue to receive
                    updates from the original course.
                  </p>
                ) : (
                  <>
                    <p>This item still belongs to your course section. The original course version is shown below.</p>
                    <dl className="curriculum-compare">
                      <div>
                        <dt>Original</dt>
                        <dd>{dialogNode.originalTitle}</dd>
                      </div>
                      <div>
                        <dt>This course</dt>
                        <dd>{dialogNode.title}</dd>
                      </div>
                    </dl>
                  </>
                )}
                <div className="modal-actions">
                  {dialogNode.origin === 'canonical' && (dialogNode.status === 'modified' || dialogNode.status === 'removed') ? (
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={() => {
                        handleRestore(dialogNode.id);
                        setDialog(null);
                      }}
                    >
                      Restore original
                    </button>
                  ) : null}
                  <button type="button" className="button button--primary" onClick={() => setDialog(null)}>
                    Close
                  </button>
                </div>
              </>
            ) : null}
            {dialog.type === 'remove' && dialogNode ? (
              <>
                <p>
                  Remove “{dialogNode.title}” from this course? Students will not see it. You can restore it later from
                  this curriculum view.
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
  menuOpen,
  showRemoved,
  units,
  draggingId,
  draggingIdRef,
  dropHint,
  onToggleExpand,
  onOpenPage,
  onAddChild,
  onOpenMenu,
  onRename,
  onMove,
  onHide,
  onRemove,
  onRestore,
  onViewOriginal,
  onDragStart,
  onDragEnd,
  onDropHint,
  onDropRow,
}: {
  node: CurriculumNode;
  depth: number;
  expanded: boolean;
  menuOpen: boolean;
  showRemoved: boolean;
  units: CurriculumNode[];
  draggingId: string | null;
  draggingIdRef: MutableRefObject<string | null>;
  dropHint: DropHint | null;
  onToggleExpand: () => void;
  onOpenPage: () => void;
  onAddChild: (childType: StructuralNodeType) => void;
  onOpenMenu: (trigger: HTMLButtonElement) => void;
  onRename: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onHide: () => void;
  onRemove: () => void;
  onRestore: () => void;
  onViewOriginal: () => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropHint: (hint: DropHint | null) => void;
  onDropRow: (targetId: string, placement: DropPlacement) => void;
}) {
  const canExpand = isContainerType(node.type);
  const childTypes = node.status === 'removed' ? [] : childTypesFor(node.type);
  const label = statusLabel(node.status);
  const rowLabel = structuralLabel(node.type);
  const icon = node.type === 'page' ? pageIcon : containerIcon;
  const accessibleName = `${rowLabel} ${node.title}, ${statusDescription(node)}`;
  const canMoveUp = canMoveNode(units, node.id, 'up', showRemoved);
  const canMoveDown = canMoveNode(units, node.id, 'down', showRemoved);
  const scoring = node.type === 'page' ? pageScoringOf(node) : null;
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
      style={{ paddingLeft: 12 + depth * 24 }}
      onDragOver={(event) => {
        const id = draggingIdRef.current ?? draggingId;
        if (!id || id === node.id) return;
        const placement = placementForDrag(event, units, id, node);
        if (!placement) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        onDropHint({ id: node.id, placement });
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          onDropHint(null);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        const id = draggingIdRef.current ?? draggingId;
        if (!id || id === node.id) return;
        const placement = placementForDrag(event, units, id, node);
        if (placement) onDropRow(node.id, placement);
      }}
    >
      <div className="curriculum-row__main">
        {node.status !== 'removed' ? (
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
                onMove('up');
              }
              if (event.key === 'ArrowDown' && canMoveDown) {
                event.preventDefault();
                onMove('down');
              }
            }}
          >
            <span className="curriculum-drag__dots" aria-hidden="true">
              <i /><i /><i /><i /><i /><i />
            </span>
          </button>
        ) : (
          <span className="curriculum-drag curriculum-drag--spacer" aria-hidden="true" />
        )}
        {canExpand ? (
          <button
            type="button"
            className="curriculum-expand"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.title}`}
            onClick={onToggleExpand}
          >
            <img
              src={chevronDownIcon}
              alt=""
              aria-hidden="true"
              className={expanded ? 'curriculum-expand__icon is-open' : 'curriculum-expand__icon'}
            />
          </button>
        ) : (
          <span className="curriculum-expand curriculum-expand--spacer" aria-hidden="true" />
        )}
        <img className="material-icon" src={icon} alt="" aria-hidden="true" />
        {node.type === 'page' ? (
          <button
            type="button"
            className="curriculum-title-button curriculum-title-button--link"
            onClick={onOpenPage}
            aria-label={accessibleName}
          >
            <span className={node.status === 'removed' ? 'curriculum-title curriculum-title--removed' : 'curriculum-title'}>
              {node.title}
            </span>
          </button>
        ) : (
          <button type="button" className="curriculum-title-button" onClick={onToggleExpand} aria-label={accessibleName}>
            <span className={node.status === 'removed' ? 'curriculum-title curriculum-title--removed' : 'curriculum-title'}>
              {node.title}
            </span>
          </button>
        )}
        {scoring ? (
          <span className={`curriculum-scoring curriculum-scoring--${scoring}`}>
            {scoring === 'scored' ? 'Scored' : 'Practice'}
          </span>
        ) : null}
        {label ? (
          <span className={`curriculum-status curriculum-status--${node.status}`}>{label}</span>
        ) : (
          <span className="visually-hidden">From original course</span>
        )}
        {node.hidden && node.status !== 'removed' ? (
          <span className="curriculum-status curriculum-status--hidden">Hidden</span>
        ) : null}
      </div>

      <div className="curriculum-row__actions">
          {node.type === 'page' && node.status !== 'removed' ? (
            <button type="button" className="button button--secondary button--small" onClick={onOpenPage}>
              <img src={editIcon} alt="" aria-hidden="true" />
              Edit
            </button>
          ) : null}
          {childTypes.map((childType) => (
            <button
              key={childType}
              type="button"
              className="button button--secondary button--small"
              onClick={() => onAddChild(childType)}
            >
              Create {childType}
            </button>
          ))}
          <div className="curriculum-menu-wrap" data-curriculum-menu>
            <button
              type="button"
              className="curriculum-more"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`Actions for ${node.title}`}
              onClick={(event) => onOpenMenu(event.currentTarget)}
            >
              <span aria-hidden="true">•••</span>
            </button>
            {menuOpen ? (
              <div className="curriculum-menu" role="menu" aria-label={`Actions for ${node.title}`}>
                {node.status !== 'removed' ? (
                  <button type="button" role="menuitem" className="curriculum-menu__item" onClick={onRename}>
                    Rename
                  </button>
                ) : null}
                {node.status !== 'removed' ? (
                  <button type="button" role="menuitem" className="curriculum-menu__item" onClick={onHide}>
                    {node.hidden ? 'Show' : 'Hide'}
                  </button>
                ) : null}
                {node.origin === 'canonical' ? (
                  <button type="button" role="menuitem" className="curriculum-menu__item" onClick={onViewOriginal}>
                    View original version
                  </button>
                ) : null}
                {node.status === 'modified' || node.status === 'removed' ? (
                  <button type="button" role="menuitem" className="curriculum-menu__item" onClick={onRestore}>
                    Restore original
                  </button>
                ) : null}
                {node.status !== 'removed' ? (
                  <button type="button" role="menuitem" className="curriculum-menu__item curriculum-menu__item--danger" onClick={onRemove}>
                    Remove from this course
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
    </div>
  );
}
