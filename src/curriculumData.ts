export type CurriculumStatus = 'original' | 'modified' | 'added' | 'removed';
export type CurriculumOrigin = 'canonical' | 'instructor';
export type CurriculumNodeType = 'unit' | 'module' | 'page' | 'block';
export type ContentBlockKind = 'explanation' | 'example' | 'question' | 'bank';

export type CurriculumNode = {
  id: string;
  type: CurriculumNodeType;
  title: string;
  originalTitle: string;
  origin: CurriculumOrigin;
  status: CurriculumStatus;
  children: CurriculumNode[];
  blockKind?: ContentBlockKind;
  assessmentTitle?: string;
  attemptsStarted?: boolean;
  learningObjectives?: string[];
};

const LO_REDOX = 'LO 1.1 Balance redox equations and construct half-reactions.';
const LO_CELL = 'LO 1.2 Predict electrochemical behavior and cell trends.';
const LO_APPS = 'LO 1.3 Evaluate electrochemistry applications in real systems.';
const LO_NOTATION = 'Write and interpret standard cell notation';
const LO_EQUILIBRIUM = 'Explain equilibrium shifts';
const LO_CORROSION = 'Explain electrochemical causes of corrosion';
const LO_RAD = 'LO 1.4 Distinguish alpha, beta, and gamma radiation by interaction with matter.';
const LO_BIO = 'LO 1.5 Explain how pathway and tissue sensitivity influence biological effects.';

export const BLOCK_KIND_LABEL: Record<ContentBlockKind, string> = {
  explanation: 'Explanation',
  example: 'Example',
  question: 'Question',
  bank: 'Activity bank',
};

export const NODE_TYPE_LABEL: Record<Exclude<CurriculumNodeType, 'block'>, string> = {
  unit: 'Unit',
  module: 'Module',
  page: 'Page',
};

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
    item({
      id: 'unit-electrochemistry',
      type: 'unit',
      title: 'Electrochemistry',
      children: [
        item({
          id: 'module-foundational',
          type: 'module',
          title: 'Foundational Concepts of Electrochemistry',
          children: [
            item({
              id: 'page-foundational',
              type: 'page',
              title: 'Foundational Concepts of Electrochemistry',
              children: [
                item({
                  id: 'block-foundational-expl',
                  type: 'block',
                  blockKind: 'explanation',
                  title: 'What is electrochemistry?',
                  learningObjectives: [LO_REDOX],
                }),
                item({
                  id: 'block-foundational-example',
                  type: 'block',
                  blockKind: 'example',
                  title: 'Identifying oxidation and reduction',
                  learningObjectives: [LO_REDOX],
                }),
                item({
                  id: 'block-foundational-q',
                  type: 'block',
                  blockKind: 'question',
                  title: 'Assign oxidation states',
                  learningObjectives: [LO_REDOX],
                }),
                item({
                  id: 'block-foundational-bank',
                  type: 'block',
                  blockKind: 'bank',
                  title: 'Foundational Concepts of Electrochemistry',
                  learningObjectives: [LO_REDOX],
                }),
              ],
            }),
            item({
              id: 'page-redox-review',
              type: 'page',
              title: 'Oxidation and reduction review',
              originalTitle: 'Redox review',
              status: 'modified',
              children: [
                item({
                  id: 'block-redox-expl',
                  type: 'block',
                  blockKind: 'explanation',
                  title: 'Review of oxidation states',
                  learningObjectives: [LO_REDOX],
                }),
                item({
                  id: 'block-redox-q',
                  type: 'block',
                  blockKind: 'question',
                  title: 'Practice: balance a simple redox pair',
                  origin: 'instructor',
                  status: 'added',
                  learningObjectives: [LO_REDOX],
                }),
              ],
            }),
          ],
        }),
        item({
          id: 'module-galvanic',
          type: 'module',
          title: 'Galvanic Cells',
          children: [
            item({
              id: 'page-galvanic',
              type: 'page',
              title: 'Galvanic Cells',
              children: [
                item({
                  id: 'block-galvanic-expl',
                  type: 'block',
                  blockKind: 'explanation',
                  title: 'How galvanic cells produce current',
                  learningObjectives: [LO_CELL],
                }),
                item({
                  id: 'block-galvanic-example',
                  type: 'block',
                  blockKind: 'example',
                  title: 'Zinc–copper cell',
                  learningObjectives: [LO_CELL],
                }),
                item({
                  id: 'block-galvanic-q',
                  type: 'block',
                  blockKind: 'question',
                  title: 'Predict cell potential',
                  learningObjectives: [LO_CELL],
                }),
                item({
                  id: 'block-galvanic-bank',
                  type: 'block',
                  blockKind: 'bank',
                  title: 'Galvanic Cells',
                  learningObjectives: [LO_CELL],
                }),
              ],
            }),
            item({
              id: 'page-cell-notation',
              type: 'page',
              title: 'Cell notation',
              learningObjectives: [LO_NOTATION],
              children: [
                item({
                  id: 'block-notation-expl',
                  type: 'block',
                  blockKind: 'explanation',
                  title: 'Reading and writing cell diagrams',
                  learningObjectives: [LO_NOTATION],
                }),
                item({
                  id: 'block-notation-example',
                  type: 'block',
                  blockKind: 'example',
                  title: 'Standard cell notation',
                  learningObjectives: [LO_NOTATION],
                }),
              ],
            }),
          ],
        }),
        item({
          id: 'module-applications',
          type: 'module',
          title: 'Other Applications of Electrochemistry',
          children: [
            item({
              id: 'page-applications',
              type: 'page',
              title: 'Other Applications of Electrochemistry',
              children: [
                item({
                  id: 'block-app-expl',
                  type: 'block',
                  blockKind: 'explanation',
                  title: 'Batteries, corrosion, and electrolysis',
                  learningObjectives: [LO_APPS, LO_CORROSION],
                }),
                item({
                  id: 'block-app-bank',
                  type: 'block',
                  blockKind: 'bank',
                  title: 'Other Applications of Electrochemistry',
                  learningObjectives: [LO_APPS],
                }),
              ],
            }),
            item({
              id: 'page-corrosion-case',
              type: 'page',
              title: 'Corrosion case study',
              origin: 'instructor',
              status: 'added',
              children: [
                item({
                  id: 'block-corrosion-expl',
                  type: 'block',
                  blockKind: 'explanation',
                  title: 'Local water-pipe example',
                  origin: 'instructor',
                  status: 'added',
                  learningObjectives: [LO_CORROSION],
                }),
              ],
            }),
            item({
              id: 'page-batteries-consumer',
              type: 'page',
              title: 'Batteries in consumer products',
              status: 'removed',
              children: [
                item({
                  id: 'block-batteries-expl',
                  type: 'block',
                  blockKind: 'explanation',
                  title: 'Household battery types',
                }),
              ],
            }),
          ],
        }),
        item({
          id: 'module-e-chem-checkpoint',
          type: 'module',
          title: 'Unit checkpoint',
          children: [
            item({
              id: 'page-e-chem-checkpoint',
              type: 'page',
              title: 'Electrochemistry Unit Checkpoint',
              assessmentTitle: 'Electrochemistry Unit Checkpoint',
              children: [
                item({
                  id: 'block-e-check-expl',
                  type: 'block',
                  blockKind: 'explanation',
                  title: 'Unit review',
                  learningObjectives: [LO_REDOX, LO_CELL, LO_APPS, LO_EQUILIBRIUM],
                }),
                item({
                  id: 'block-e-check-bank-1',
                  type: 'block',
                  blockKind: 'bank',
                  title: 'Foundational Concepts of Electrochemistry',
                  learningObjectives: [LO_REDOX],
                }),
                item({
                  id: 'block-e-check-bank-2',
                  type: 'block',
                  blockKind: 'bank',
                  title: 'Galvanic Cells',
                  learningObjectives: [LO_CELL],
                }),
                item({
                  id: 'block-e-check-bank-3',
                  type: 'block',
                  blockKind: 'bank',
                  title: 'Other Applications of Electrochemistry',
                  learningObjectives: [LO_APPS],
                }),
                item({
                  id: 'block-e-check-q',
                  type: 'block',
                  blockKind: 'question',
                  title: 'Embedded checkpoint question',
                  learningObjectives: [LO_EQUILIBRIUM],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
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
              type: 'page',
              title: 'Practice set: local examples',
              origin: 'instructor',
              status: 'added',
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

export function createInstructorNode(type: Exclude<CurriculumNodeType, 'block'>, title: string): CurriculumNode {
  return item({
    id: newCurriculumId(),
    type,
    title,
    origin: 'instructor',
    status: 'added',
    children: [],
    assessmentTitle: type === 'page' ? title : undefined,
  });
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
  if (node.status === 'added') return 'added by you';
  if (node.status === 'modified') return 'edited for this course';
  if (node.status === 'removed') return 'removed from this course';
  return 'from the original course';
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
      const kind = NODE_TYPE_LABEL[node.type as 'unit' | 'module' | 'page'];
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
      walk(node.children);
    });
  };
  walk(nodes);
  return items;
}

export function childTypeFor(type: CurriculumNodeType): 'module' | 'page' | null {
  if (type === 'unit') return 'module';
  if (type === 'module') return 'page';
  return null;
}
