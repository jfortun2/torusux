import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import chevronDownIcon from './assets/icon-chevron-down.png';
import containerIcon from './assets/icon-container.png';
import editIcon from './assets/icon-edit.png';
import pageIcon from './assets/icon-page.png';
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
  type CurriculumNode,
} from './curriculumData';

const INITIAL_EXPANDED = [
  'unit-electrochemistry',
  'module-foundational',
  'module-e-chem-checkpoint',
];

type DialogState =
  | { type: 'add'; parentId: string | null; childType: 'unit' | 'module' | 'page' }
  | { type: 'rename'; id: string }
  | { type: 'view-original'; id: string }
  | { type: 'remove'; id: string }
  | null;


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
  const [toast, setToast] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastMenuTriggerRef = useRef<HTMLButtonElement | null>(null);

  const dirty = useMemo(() => JSON.stringify(units) !== savedSnapshot, [units, savedSnapshot]);

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

  const confirmRemove = () => {
    if (dialog?.type !== 'remove') return;
    const node = findNode(units, dialog.id);
    setUnits((current) => removeFromCourse(current, dialog.id));
    announce(`${node?.title ?? 'Item'} removed from this course.`);
    setDialog(null);
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
          onRemove={() => {
            setOpenMenuId(null);
            setDialog({ type: 'remove', id: node.id });
          }}
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
          : dialog?.type === 'remove'
            ? 'Remove from this course'
            : '';
  const dialogNode = dialog && dialog.type !== 'add' ? findNode(units, dialog.id) : undefined;

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
            className="modal-card"
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
                  <button type="button" className="button button--danger" onClick={confirmRemove}>
                    Remove from this course
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
