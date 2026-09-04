import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import chevronDownIcon from './assets/icon-chevron-down.png';
import containerIcon from './assets/icon-container.png';
import editIcon from './assets/icon-edit.png';
import pageIcon from './assets/icon-page.png';
import { CoverageImpactPanel } from './PageCustomize';
import {
  addChildNode,
  canMoveNode,
  childTypeFor,
  createInitialCurriculum,
  createInstructorNode,
  findNode,
  isNodeVisible,
  moveNode,
  NODE_TYPE_LABEL,
  removeFromCourse,
  renameNode,
  restoreOriginal,
  statusDescription,
  statusLabel,
  summarizeCurriculumCustomizations,
  type CurriculumNode,
} from './curriculumData';
import {
  ELSEWHERE_NOTE,
  evaluateCurriculumRemoval,
  friendlyObjectiveName,
  type RemovalImpact,
} from './learningDesign';

const INITIAL_EXPANDED = [
  'unit-electrochemistry',
  'module-foundational',
  'module-galvanic',
  'module-applications',
  'module-e-chem-checkpoint',
];

type BlueprintVisibility = 'only-me' | 'department';

type CourseBlueprint = {
  id: string;
  name: string;
  description: string;
  visibility: BlueprintVisibility;
  customizationSummary: string[];
  savedAt: string;
};

type DialogState =
  | { type: 'add'; parentId: string | null; childType: 'unit' | 'module' | 'page' }
  | { type: 'rename'; id: string }
  | { type: 'view-original'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'remove-limited'; id: string; impact: RemovalImpact }
  | { type: 'remove-orphaned'; id: string; impact: RemovalImpact }
  | { type: 'review-objectives'; objectives: string[] }
  | { type: 'save-blueprint' }
  | { type: 'blueprint-saved'; blueprint: CourseBlueprint }
  | null;

const VISIBILITY_LABEL: Record<BlueprintVisibility, string> = {
  'only-me': 'Only me',
  department: 'My department',
};


export function CustomizeScreen({ breadcrumbs }: { breadcrumbs: ReactNode }) {
  const navigate = useNavigate();
  const showRemovedId = useId();
  const [units, setUnits] = useState<CurriculumNode[]>(() => createInitialCurriculum());
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(createInitialCurriculum()));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(INITIAL_EXPANDED));
  const [showRemoved, setShowRemoved] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [draftName, setDraftName] = useState('');
  const [blueprintDescription, setBlueprintDescription] = useState('');
  const [blueprintVisibility, setBlueprintVisibility] = useState<BlueprintVisibility>('only-me');
  const [blueprints, setBlueprints] = useState<CourseBlueprint[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastMenuTriggerRef = useRef<HTMLButtonElement | null>(null);

  const dirty = useMemo(() => JSON.stringify(units) !== savedSnapshot, [units, savedSnapshot]);
  const customizationSummary = useMemo(() => summarizeCurriculumCustomizations(units), [units]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!dialog) return undefined;
    if (dialog.type === 'add' || dialog.type === 'rename' || dialog.type === 'save-blueprint') {
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

  const openAdd = (parentId: string | null, childType: 'unit' | 'module' | 'page') => {
    setOpenMenuId(null);
    setDraftName('');
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
      const child = createInstructorNode(dialog.childType, name);
      setUnits((current) => addChildNode(current, dialog.parentId, child));
      setExpandedIds((current) => {
        const next = new Set(current);
        if (dialog.parentId) next.add(dialog.parentId);
        next.add(child.id);
        return next;
      });
      announce(`${NODE_TYPE_LABEL[dialog.childType]} “${name}” added.`);
      setDialog(null);
      return;
    }
    if (dialog.type === 'rename') {
      const name = draftName.trim();
      if (!name) return;
      const node = findNode(units, dialog.id);
      setUnits((current) => renameNode(current, dialog.id, name));
      announce(`${node ? NODE_TYPE_LABEL[node.type as 'unit' | 'module' | 'page'] : 'Item'} renamed to “${name}”.`);
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

  const handleMove = (id: string, direction: 'up' | 'down') => {
    const node = findNode(units, id);
    setOpenMenuId(null);
    setUnits((current) => moveNode(current, id, direction, showRemoved));
    announce(`Moved “${node?.title ?? 'item'}” ${direction}.`);
  };

  const openPage = (node: CurriculumNode) => {
    navigate('/assessment-default', {
      state: {
        assessmentTitle: node.assessmentTitle ?? node.title,
        attemptsStarted: node.attemptsStarted ?? false,
        breadcrumbTrail: [
          { label: 'Manage', to: '/' },
          { label: 'Customize Content', to: '/customize' },
          { label: node.title },
        ],
      },
    });
  };

  const handleCancel = () => {
    setUnits(JSON.parse(savedSnapshot) as CurriculumNode[]);
    setOpenMenuId(null);
    setDialog(null);
    navigate('/');
  };

  const handleSave = () => {
    if (!dirty) return;
    setSavedSnapshot(JSON.stringify(units));
    announce('Saved to this course section.');
  };

  const openSaveBlueprint = () => {
    setOpenMenuId(null);
    setDraftName('Chemistry 101 — customized structure');
    setBlueprintDescription('');
    setBlueprintVisibility('only-me');
    setDialog({ type: 'save-blueprint' });
  };

  const saveBlueprint = () => {
    const name = draftName.trim();
    if (!name) return;
    const blueprint: CourseBlueprint = {
      id: `bp-${Date.now()}`,
      name,
      description: blueprintDescription.trim(),
      visibility: blueprintVisibility,
      customizationSummary: [...customizationSummary],
      savedAt: new Date().toLocaleString(),
    };
    setBlueprints((current) => [blueprint, ...current]);
    setDialog({ type: 'blueprint-saved', blueprint });
    announce(`Blueprint “${name}” saved.`);
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
          onRestore={() => handleRestore(node.id)}
          onViewOriginal={() => {
            setOpenMenuId(null);
            setDialog({ type: 'view-original', id: node.id });
          }}
        />,
      ];
      if (node.type === 'unit' || node.type === 'module') {
        const visibleNestable = nestableChildren.filter((child) => isNodeVisible(child, showRemoved));
        if (expanded && visibleNestable.length > 0) {
          rows.push(renderRows(nestableChildren, depth + 1));
        } else if (expanded) {
          rows.push(
            <div
              key={`${node.id}-empty`}
              className="curriculum-empty"
              style={{ paddingLeft: 28 + depth * 24 }}
            >
              No {node.type === 'unit' ? 'modules' : 'pages'} yet.
            </div>,
          );
        }
      }
      return rows;
    });

  const dialogTitle =
    dialog?.type === 'add'
      ? `Add ${dialog.childType}`
      : dialog?.type === 'rename'
        ? 'Rename'
        : dialog?.type === 'view-original'
          ? 'Original version'
          : dialog?.type === 'review-objectives'
            ? 'Review affected objectives'
            : dialog?.type === 'save-blueprint'
              ? 'Save as reusable blueprint'
              : dialog?.type === 'blueprint-saved'
                ? 'Blueprint saved'
                : dialog?.type === 'remove' || dialog?.type === 'remove-limited' || dialog?.type === 'remove-orphaned'
                  ? 'Remove from this course'
                  : '';
  const dialogNode =
    dialog &&
    dialog.type !== 'add' &&
    dialog.type !== 'review-objectives' &&
    dialog.type !== 'save-blueprint' &&
    dialog.type !== 'blueprint-saved'
      ? findNode(units, dialog.id)
      : undefined;
  const removeKindLabel = dialogNode ? NODE_TYPE_LABEL[dialogNode.type as 'unit' | 'module' | 'page'].toLowerCase() : 'item';

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
              <button type="button" className="button button--secondary" onClick={openSaveBlueprint}>
                Save as reusable blueprint
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
              Content from the original course has no extra label. Items you added or edited are marked. Removed items stay
              restorable and appear only when shown.
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
            {renderRows(units, 0)}
          </div>

          <div className="footer-actions">
            <button type="button" className="button button--primary" onClick={() => openAdd(null, 'unit')}>
              Add unit
            </button>
          </div>

          <section className="blueprint-list" aria-labelledby="my-blueprints-heading">
            <div className="blueprint-list__header">
              <h2 id="my-blueprints-heading">My blueprints</h2>
              <p>
                Saved course structures you can reuse as a starting point for future sections. This prototype keeps them
                locally in this session.
              </p>
            </div>
            {blueprints.length === 0 ? (
              <p className="blueprint-list__empty">No blueprints yet. Save this customized course structure to create one.</p>
            ) : (
              <ul className="blueprint-list__items">
                {blueprints.map((blueprint) => (
                  <li key={blueprint.id} className="blueprint-card">
                    <div className="blueprint-card__top">
                      <h3>{blueprint.name}</h3>
                      <span className="blueprint-card__visibility">{VISIBILITY_LABEL[blueprint.visibility]}</span>
                    </div>
                    {blueprint.description ? <p className="blueprint-card__description">{blueprint.description}</p> : null}
                    <p className="blueprint-card__meta">
                      Saved {blueprint.savedAt}
                      {blueprint.customizationSummary.length > 0
                        ? ` · ${blueprint.customizationSummary.length} customization${
                            blueprint.customizationSummary.length === 1 ? '' : 's'
                          }`
                        : ' · Structure matches the original course'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
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
            className={
              dialog.type === 'save-blueprint' || dialog.type === 'blueprint-saved'
                ? 'modal-card modal-card--wide'
                : 'modal-card'
            }
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
                <div className="modal-actions">
                  <button type="button" className="button button--subtle" onClick={() => setDialog(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="button button--primary" disabled={!draftName.trim()}>
                    {dialog.type === 'add' ? 'Add' : 'Save'}
                  </button>
                </div>
              </form>
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
            {dialog.type === 'save-blueprint' ? (
              <form
                className="blueprint-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveBlueprint();
                }}
              >
                <p className="blueprint-form__intro">
                  Save this customized course structure so you or your department can use it as a starting point for
                  future course sections.
                </p>
                <label className="field">
                  <span>Blueprint name</span>
                  <input
                    ref={nameInputRef}
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    aria-required="true"
                  />
                </label>
                <label className="field">
                  <span>Description</span>
                  <textarea
                    rows={3}
                    value={blueprintDescription}
                    onChange={(event) => setBlueprintDescription(event.target.value)}
                    placeholder="Optional. Note who this is for or what was customized."
                  />
                </label>
                <fieldset className="blueprint-form__visibility">
                  <legend>Visibility</legend>
                  <label>
                    <input
                      type="radio"
                      name="blueprint-visibility"
                      checked={blueprintVisibility === 'only-me'}
                      onChange={() => setBlueprintVisibility('only-me')}
                    />
                    Only me
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="blueprint-visibility"
                      checked={blueprintVisibility === 'department'}
                      onChange={() => setBlueprintVisibility('department')}
                    />
                    My department
                  </label>
                </fieldset>
                <div className="blueprint-form__summary">
                  <h4>Customizations included</h4>
                  {customizationSummary.length === 0 ? (
                    <p className="blueprint-form__summary-empty">
                      No structural customizations yet. The blueprint will still save the current course structure.
                    </p>
                  ) : (
                    <ul>
                      {customizationSummary.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="modal-actions">
                  <button type="button" className="button button--subtle" onClick={() => setDialog(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="button button--primary" disabled={!draftName.trim()}>
                    Save blueprint
                  </button>
                </div>
              </form>
            ) : null}
            {dialog.type === 'blueprint-saved' ? (
              <>
                <div className="blueprint-success" role="status">
                  <p>
                    <strong>“{dialog.blueprint.name}”</strong> is saved and available in My blueprints.
                  </p>
                  <p>
                    Visibility: {VISIBILITY_LABEL[dialog.blueprint.visibility]}. You can use this structure as a starting
                    point for future course sections.
                  </p>
                </div>
                <div className="modal-actions">
                  <button type="button" className="button button--primary" onClick={() => setDialog(null)}>
                    Done
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

function CurriculumRow({
  node,
  depth,
  expanded,
  menuOpen,
  showRemoved,
  units,
  onToggleExpand,
  onOpenPage,
  onAddChild,
  onOpenMenu,
  onRename,
  onMove,
  onRemove,
  onRestore,
  onViewOriginal,
}: {
  node: CurriculumNode;
  depth: number;
  expanded: boolean;
  menuOpen: boolean;
  showRemoved: boolean;
  units: CurriculumNode[];
  onToggleExpand: () => void;
  onOpenPage: () => void;
  onAddChild: (childType: 'module' | 'page') => void;
  onOpenMenu: (trigger: HTMLButtonElement) => void;
  onRename: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onRemove: () => void;
  onRestore: () => void;
  onViewOriginal: () => void;
}) {
  const canExpand = node.type === 'unit' || node.type === 'module';
  const childType = childTypeFor(node.type);
  const label = statusLabel(node.status);
  const rowLabel = NODE_TYPE_LABEL[node.type as 'unit' | 'module' | 'page'];
  const icon = node.type === 'page' ? pageIcon : containerIcon;
  const accessibleName = `${rowLabel} ${node.title}, ${statusDescription(node)}`;
  const canMoveUp = canMoveNode(units, node.id, 'up', showRemoved);
  const canMoveDown = canMoveNode(units, node.id, 'down', showRemoved);

  const rowClass = [
    'curriculum-row',
    `curriculum-row--${node.type}`,
    node.status === 'removed' ? 'curriculum-row--removed' : '',
    node.status === 'added' ? 'curriculum-row--added' : '',
    node.status === 'modified' ? 'curriculum-row--modified' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rowClass}
      style={{ paddingLeft: 12 + depth * 24 }}
    >
      <div className="curriculum-row__main">
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
        {label ? (
          <span className={`curriculum-status curriculum-status--${node.status}`}>{label}</span>
        ) : (
          <span className="visually-hidden">From original course</span>
        )}
      </div>

      <div className="curriculum-row__actions">
          {node.type === 'page' && node.status !== 'removed' ? (
            <button type="button" className="button button--secondary button--small" onClick={onOpenPage}>
              <img src={editIcon} alt="" aria-hidden="true" />
              Edit
            </button>
          ) : null}
          {childType && node.status !== 'removed' ? (
            <button type="button" className="button button--secondary button--small" onClick={() => onAddChild(childType)}>
              Add {childType}
            </button>
          ) : null}
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
                {childType && node.status !== 'removed' ? (
                  <button type="button" role="menuitem" className="curriculum-menu__item" onClick={() => onAddChild(childType)}>
                    Add {childType}
                  </button>
                ) : null}
                {node.status !== 'removed' ? (
                  <button type="button" role="menuitem" className="curriculum-menu__item" onClick={onRename}>
                    Rename
                  </button>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  className="curriculum-menu__item"
                  onClick={() => onMove('up')}
                  disabled={!canMoveUp}
                >
                  Move up
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="curriculum-menu__item"
                  onClick={() => onMove('down')}
                  disabled={!canMoveDown}
                >
                  Move down
                </button>
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
