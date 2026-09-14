import { ELECTROCHEMISTRY_LEARNING_OBJECTIVES, ELECTROCHEMISTRY_UNIT } from './imported/electrochemistry';

export type CurriculumStatus = 'original' | 'modified' | 'added' | 'removed';
export type CurriculumOrigin = 'canonical' | 'instructor';
export type CurriculumNodeType = 'unit' | 'module' | 'section' | 'page' | 'block';
export type StructuralNodeType = Exclude<CurriculumNodeType, 'block'>;
export type ContentBlockKind = 'explanation' | 'example' | 'question' | 'bank';
export type PageScoring = 'scored' | 'practice';
export type DropPlacement = 'before' | 'after' | 'inside';

export type CourseLearningObjective = {
  code: string;
  label: string;
};

export type CurriculumNode = {
  id: string;
  type: CurriculumNodeType;
  title: string;
  originalTitle: string;
  origin: CurriculumOrigin;
  status: CurriculumStatus;
  children: CurriculumNode[];
  hidden?: boolean;
  blockKind?: ContentBlockKind;
  assessmentTitle?: string;
  attemptsStarted?: boolean;
  learningObjectives?: string[];
  pageScoring?: PageScoring;
};

const LO_CELL = 'LO 1.13 Describe the basic components of galvanic cells.';
const LO_APPS = 'LO 1.7 Describe batteries and fuel cells.';
const LO_RAD = 'LO 1.4 Distinguish alpha, beta, and gamma radiation by interaction with matter.';
const LO_BIO = 'LO 1.5 Explain how pathway and tissue sensitivity influence biological effects.';

export const BLOCK_KIND_LABEL: Record<ContentBlockKind, string> = {
  explanation: 'Explanation',
  example: 'Example',
  question: 'Question',
  bank: 'Activity bank',
};

export const NODE_TYPE_LABEL: Record<StructuralNodeType, string> = {
  unit: 'Unit',
  module: 'Module',
  section: 'Section',
  page: 'Page',
};

export const COURSE_LEARNING_OBJECTIVES: CourseLearningObjective[] = [
  ...ELECTROCHEMISTRY_LEARNING_OBJECTIVES.map((objective) => ({
    code: objective.code,
    label: objective.label,
  })),
  { code: 'LO 1.4', label: 'Distinguish alpha, beta, and gamma radiation by interaction with matter.' },
  { code: 'LO 1.5', label: 'Explain how pathway and tissue sensitivity influence biological effects.' },
];

const CURRICULUM_STORAGE_KEY = 'torusux:curriculum:v4';

const item = (
  node: Omit<CurriculumNode, 'children' | 'originalTitle' | 'origin' | 'status'> &
    Partial<Pick<CurriculumNode, 'children' | 'originalTitle' | 'origin' | 'status'>>,
): CurriculumNode => ({
  ...node,
  originalTitle: node.originalTitle ?? node.title,
  origin: node.origin ?? 'canonical',
  status: node.status ?? 'original',
  children: node.children ?? [],
  assessmentTitle: node.type === 'page' ? node.assessmentTitle ?? node.title : node.assessmentTitle,
});

export function createInitialCurriculum(): CurriculumNode[] {
  return [
    ELECTROCHEMISTRY_UNIT as CurriculumNode,
    item({
      id: 'unit-nuclear',
      type: 'unit',
      title: 'Nuclear Chemistry',
      children: [
        item({
          id: 'module-radiation',
          type: 'module',
          title: 'Radioactivity and matter',
          children: [
            item({
              id: 'page-radiation',
              type: 'page',
              title: 'Radiation types and shielding',
              learningObjectives: [LO_RAD],
              children: [
                item({
                  id: 'block-rad-expl',
                  type: 'block',
                  blockKind: 'explanation',
                  title: 'Alpha, beta, and gamma radiation',
                  learningObjectives: [LO_RAD],
                }),
                item({
                  id: 'block-rad-example',
                  type: 'block',
                  blockKind: 'example',
                  title: 'Choosing shielding materials',
                  learningObjectives: [LO_RAD],
                }),
                item({
                  id: 'block-rad-q',
                  type: 'block',
                  blockKind: 'question',
                  title: 'Match radiation type to shielding',
                  status: 'removed',
                  learningObjectives: [LO_RAD],
                }),
              ],
            }),
          ],
        }),
        item({
          id: 'module-nuclear-checkpoint',
          type: 'module',
          title: 'Unit checkpoint',
          children: [
            item({
              id: 'page-nuclear-checkpoint',
              type: 'page',
              title: 'Nuclear Chemistry Unit Checkpoint',
              assessmentTitle: 'Nuclear Chemistry Unit Checkpoint',
              attemptsStarted: true,
              learningObjectives: [LO_RAD, LO_BIO],
              children: [
                item({
                  id: 'block-n-check-expl',
                  type: 'block',
                  blockKind: 'explanation',
                  title: 'Unit review',
                  learningObjectives: [LO_RAD, LO_BIO],
                }),
                item({
                  id: 'block-n-check-bank',
                  type: 'block',
                  blockKind: 'bank',
                  title: 'Radiation applications',
                  learningObjectives: [LO_RAD, LO_BIO],
                }),
                item({
                  id: 'block-n-check-q',
                  type: 'block',
                  blockKind: 'question',
                  title: 'Embedded checkpoint question',
                  learningObjectives: [LO_BIO],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    item({
      id: 'unit-recitation',
      type: 'unit',
      title: 'Weekly recitation',
      origin: 'instructor',
      status: 'added',
      children: [
        item({
          id: 'module-recitation-1',
          type: 'module',
          title: 'Recitation 1',
          origin: 'instructor',
          status: 'added',
          children: [
            item({
              id: 'page-recitation-practice',
              pageScoring: 'practice',
              type: 'page',
              title: 'Practice set: local examples',
              origin: 'instructor',
              status: 'added',
              learningObjectives: [LO_CELL, LO_APPS],
              children: [
                item({
                  id: 'block-recitation-expl',
                  type: 'block',
                  blockKind: 'explanation',
                  title: 'Problems drawn from this term’s lab',
                  origin: 'instructor',
                  status: 'added',
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];
}

export function newCurriculumId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const INJECTED_PAGE_EXAMPLE_IDS = new Set([
  'block-redox-example',
  'block-app-example',
  'block-corrosion-example',
  'block-batteries-example',
  'block-e-check-example',
  'block-n-check-example',
  'block-recitation-example',
]);

function stripInjectedPageExamples(nodes: CurriculumNode[]): CurriculumNode[] {
  return nodes.map((node) => {
    const children = stripInjectedPageExamples(node.children).filter((child) => {
      if (INJECTED_PAGE_EXAMPLE_IDS.has(child.id)) return false;
      if (node.type === 'page' && child.id === `${node.id}-example`) return false;
      return true;
    });
    return { ...node, children };
  });
}

export function createInstructorNode(
  type: StructuralNodeType,
  title: string,
  options?: { pageScoring?: PageScoring; learningObjectives?: string[] },
): CurriculumNode {
  return item({
    id: newCurriculumId(),
    type,
    title,
    origin: 'instructor',
    status: 'added',
    children: [],
    assessmentTitle: type === 'page' ? title : undefined,
    pageScoring: type === 'page' ? options?.pageScoring ?? 'scored' : undefined,
    learningObjectives: options?.learningObjectives,
  });
}

export function pageScoringOf(node: CurriculumNode): PageScoring {
  if (node.pageScoring) return node.pageScoring;
  return (node.title ?? '').toLowerCase().includes('practice') ? 'practice' : 'scored';
}

export function loadCurriculum(): CurriculumNode[] {
  if (typeof window === 'undefined') return createInitialCurriculum();
  try {
    const raw = sessionStorage.getItem(CURRICULUM_STORAGE_KEY);
    if (!raw) return createInitialCurriculum();
    const parsed = JSON.parse(raw) as CurriculumNode[];
    if (!Array.isArray(parsed)) return createInitialCurriculum();
    return stripInjectedPageExamples(parsed);
  } catch {
    return createInitialCurriculum();
  }
}

export function persistCurriculum(nodes: CurriculumNode[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CURRICULUM_STORAGE_KEY, JSON.stringify(nodes));
  } catch {
    /* ignore quota / private mode */
  }
}

export function cloneCurriculum(nodes: CurriculumNode[]): CurriculumNode[] {
  return JSON.parse(JSON.stringify(nodes)) as CurriculumNode[];
}

export function findNode(nodes: CurriculumNode[], id: string): CurriculumNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = findNode(node.children, id);
    if (nested) return nested;
  }
  return undefined;
}

export function updateNodeById(
  nodes: CurriculumNode[],
  id: string,
  updater: (node: CurriculumNode) => CurriculumNode,
): CurriculumNode[] {
  return nodes.map((node) => {
    if (node.id === id) return updater(node);
    return { ...node, children: updateNodeById(node.children, id, updater) };
  });
}

type SiblingContext = {
  parentId: string | null;
  siblings: CurriculumNode[];
  index: number;
};

function findSiblingContext(
  nodes: CurriculumNode[],
  id: string,
  parentId: string | null = null,
): SiblingContext | undefined {
  const index = nodes.findIndex((node) => node.id === id);
  if (index >= 0) return { parentId, siblings: nodes, index };
  for (const node of nodes) {
    const nested = findSiblingContext(node.children, id, node.id);
    if (nested) return nested;
  }
  return undefined;
}

function replaceChildren(
  nodes: CurriculumNode[],
  parentId: string | null,
  children: CurriculumNode[],
): CurriculumNode[] {
  if (parentId === null) return children;
  return updateNodeById(nodes, parentId, (node) => ({ ...node, children }));
}

export function addChildNode(
  nodes: CurriculumNode[],
  parentId: string | null,
  child: CurriculumNode,
): CurriculumNode[] {
  if (parentId === null) return [...nodes, child];
  return updateNodeById(nodes, parentId, (node) => ({ ...node, children: [...node.children, child] }));
}

export function isNodeVisible(node: CurriculumNode, showRemoved: boolean): boolean {
  return node.status !== 'removed' || showRemoved;
}

export function moveNode(
  nodes: CurriculumNode[],
  id: string,
  direction: 'up' | 'down',
  showRemoved: boolean,
): CurriculumNode[] {
  const context = findSiblingContext(nodes, id);
  if (!context) return nodes;
  const visibleIndexes = context.siblings
    .map((sibling, index) => ({ sibling, index }))
    .filter(({ sibling }) => isNodeVisible(sibling, showRemoved))
    .map(({ index }) => index);
  const position = visibleIndexes.indexOf(context.index);
  const nextPosition = direction === 'up' ? position - 1 : position + 1;
  if (position < 0 || nextPosition < 0 || nextPosition >= visibleIndexes.length) return nodes;
  const swapWith = visibleIndexes[nextPosition];
  const nextSiblings = [...context.siblings];
  [nextSiblings[context.index], nextSiblings[swapWith]] = [nextSiblings[swapWith], nextSiblings[context.index]];
  return replaceChildren(nodes, context.parentId, nextSiblings);
}

export function canMoveNode(
  nodes: CurriculumNode[],
  id: string,
  direction: 'up' | 'down',
  showRemoved: boolean,
): boolean {
  const context = findSiblingContext(nodes, id);
  if (!context) return false;
  const visibleIndexes = context.siblings
    .map((sibling, index) => ({ sibling, index }))
    .filter(({ sibling }) => isNodeVisible(sibling, showRemoved))
    .map(({ index }) => index);
  const position = visibleIndexes.indexOf(context.index);
  if (position < 0) return false;
  return direction === 'up' ? position > 0 : position < visibleIndexes.length - 1;
}

function isDescendant(node: CurriculumNode, id: string): boolean {
  return node.children.some((child) => child.id === id || isDescendant(child, id));
}

function extractNode(
  nodes: CurriculumNode[],
  id: string,
): { nodes: CurriculumNode[]; removed: CurriculumNode | undefined } {
  const index = nodes.findIndex((node) => node.id === id);
  if (index >= 0) {
    return { nodes: [...nodes.slice(0, index), ...nodes.slice(index + 1)], removed: nodes[index] };
  }
  let removed: CurriculumNode | undefined;
  const next = nodes.map((node) => {
    if (removed) return node;
    const result = extractNode(node.children, id);
    if (result.removed) {
      removed = result.removed;
      return { ...node, children: result.nodes };
    }
    return node;
  });
  return { nodes: removed ? next : nodes, removed };
}

export function isValidDrop(
  nodes: CurriculumNode[],
  draggedId: string,
  targetId: string,
  placement: DropPlacement,
): boolean {
  if (draggedId === targetId) return false;
  const dragged = findNode(nodes, draggedId);
  const target = findNode(nodes, targetId);
  if (!dragged || !target) return false;
  if (dragged.type === 'block' || target.type === 'block') return false;
  if (dragged.status === 'removed' || target.status === 'removed') return false;
  if (isDescendant(dragged, targetId)) return false;
  if (placement === 'inside') return canContain(target.type, dragged.type);
  const context = findSiblingContext(nodes, targetId);
  if (!context) return false;
  if (context.parentId === null) return canContain(null, dragged.type);
  const parent = findNode(nodes, context.parentId);
  return parent ? canContain(parent.type, dragged.type) : false;
}

export function dropNode(
  nodes: CurriculumNode[],
  draggedId: string,
  targetId: string,
  placement: DropPlacement,
): CurriculumNode[] {
  if (!isValidDrop(nodes, draggedId, targetId, placement)) return nodes;
  const { nodes: without, removed } = extractNode(nodes, draggedId);
  if (!removed) return nodes;
  if (placement === 'inside') {
    return updateNodeById(without, targetId, (parent) => ({
      ...parent,
      children: [...parent.children, removed],
    }));
  }
  const context = findSiblingContext(without, targetId);
  if (!context) return nodes;
  const insertAt = context.index + (placement === 'after' ? 1 : 0);
  const nextSiblings = [...context.siblings];
  nextSiblings.splice(insertAt, 0, removed);
  return replaceChildren(without, context.parentId, nextSiblings);
}

export function setPageObjectives(nodes: CurriculumNode[], id: string, learningObjectives: string[]): CurriculumNode[] {
  return updateNodeById(nodes, id, (node) => ({
    ...node,
    learningObjectives,
    status: node.origin === 'instructor' ? (node.status === 'removed' ? 'removed' : 'added') : node.status === 'removed' ? 'removed' : 'modified',
  }));
}

export function renameNode(nodes: CurriculumNode[], id: string, title: string): CurriculumNode[] {
  const trimmed = title.trim();
  if (!trimmed) return nodes;
  return updateNodeById(nodes, id, (node) => {
    const nextTitle = trimmed;
    if (node.origin === 'instructor') {
      return {
        ...node,
        title: nextTitle,
        status: node.status === 'removed' ? 'removed' : 'added',
        assessmentTitle: node.type === 'page' ? nextTitle : node.assessmentTitle,
      };
    }
    const matchesOriginal = nextTitle === node.originalTitle;
    return {
      ...node,
      title: nextTitle,
      status: node.status === 'removed' ? 'removed' : matchesOriginal ? 'original' : 'modified',
      assessmentTitle: node.type === 'page' ? (node.assessmentTitle ?? nextTitle) : node.assessmentTitle,
    };
  });
}

export function removeFromCourse(nodes: CurriculumNode[], id: string): CurriculumNode[] {
  return updateNodeById(nodes, id, (node) => ({ ...node, status: 'removed' }));
}

export function setNodeHidden(nodes: CurriculumNode[], id: string, hidden: boolean): CurriculumNode[] {
  return updateNodeById(nodes, id, (node) => ({ ...node, hidden }));
}

export function restoreOriginal(nodes: CurriculumNode[], id: string): CurriculumNode[] {
  return updateNodeById(nodes, id, (node) => {
    if (node.origin === 'instructor') {
      return { ...node, status: 'added' };
    }
    return {
      ...node,
      title: node.originalTitle,
      status: 'original',
    };
  });
}

export function statusLabel(status: CurriculumStatus): string | null {
  if (status === 'added') return 'Added';
  if (status === 'modified') return 'Edited';
  if (status === 'removed') return 'Removed';
  return null;
}

export function statusDescription(node: CurriculumNode): string {
  const visibility = node.hidden && node.status !== 'removed' ? ', hidden from students' : '';
  if (node.status === 'added') return `added by you${visibility}`;
  if (node.status === 'modified') return `edited for this course${visibility}`;
  if (node.status === 'removed') return 'removed from this course';
  return `from the original course${visibility}`;
}

/** Concise list of structural customizations for blueprint / review summaries. */
export function summarizeCurriculumCustomizations(nodes: CurriculumNode[]): string[] {
  const items: string[] = [];
  const walk = (list: CurriculumNode[]) => {
    list.forEach((node) => {
      if (node.type === 'block') {
        walk(node.children);
        return;
      }
      const kind = NODE_TYPE_LABEL[node.type as StructuralNodeType];
      if (node.status === 'added') {
        items.push(`Added ${kind.toLowerCase()} “${node.title}”`);
      } else if (node.status === 'modified') {
        items.push(
          node.title !== node.originalTitle
            ? `Renamed ${kind.toLowerCase()} “${node.originalTitle}” to “${node.title}”`
            : `Edited ${kind.toLowerCase()} “${node.title}”`,
        );
      } else if (node.status === 'removed') {
        items.push(`Removed ${kind.toLowerCase()} “${node.title}”`);
      }
      if (node.hidden && node.status !== 'removed') {
        items.push(`Hid ${kind.toLowerCase()} “${node.title}” from students`);
      }
      walk(node.children);
    });
  };
  walk(nodes);
  return items;
}

export function isContainerType(type: CurriculumNodeType): boolean {
  return type === 'unit' || type === 'module' || type === 'section';
}

export function childTypesFor(parentType: CurriculumNodeType | null): StructuralNodeType[] {
  if (parentType === null) return ['unit', 'page'];
  if (parentType === 'unit') return ['module', 'page'];
  if (parentType === 'module') return ['section', 'page'];
  if (parentType === 'section') return ['page'];
  return [];
}

export function canContain(parentType: CurriculumNodeType | null, childType: CurriculumNodeType): boolean {
  return (childTypesFor(parentType) as CurriculumNodeType[]).includes(childType);
}

export function objectiveCodesFromLabels(labels: string[]): string[] {
  return COURSE_LEARNING_OBJECTIVES.filter((objective) =>
    labels.some((label) => {
      const match = label.match(/LO\s*\d+(?:\.\d+)?/i);
      const extracted = match ? match[0].replace(/\s+/g, ' ').toUpperCase() : null;
      if (extracted) return extracted === objective.code.toUpperCase();
      const normalized = label.toLowerCase();
      return normalized.includes(objective.label.replace(/^(LO\s*\d+(?:\.\d+)?|L\d+)\s+/i, '').toLowerCase());
    }),
  ).map((objective) => objective.code);
}

export function labelsFromObjectiveCodes(codes: string[]): string[] {
  return COURSE_LEARNING_OBJECTIVES.filter((objective) => codes.includes(objective.code)).map(
    (objective) => `${objective.code} ${objective.label.replace(/^L\d+\s+/i, '')}`,
  );
}
