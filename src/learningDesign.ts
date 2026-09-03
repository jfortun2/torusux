import { findNode, type ContentBlockKind, type CurriculumNode } from './curriculumData';
import type { PageBlock } from './pageCustomization';

export type ContentRole = 'explanation' | 'formative' | 'summative';

export type CoverageCounts = {
  explanations: number;
  formative: number;
  summative: number;
};

export type ObjectiveImpact = {
  objective: string;
  remaining: CoverageCounts;
  proficiencyEvidenceMayBeReduced: boolean;
};

export type RemovalImpactLevel = 'none' | 'limited' | 'none-remaining';

export type RemovalImpact = {
  level: RemovalImpactLevel;
  impacts: ObjectiveImpact[];
};

export const ELSEWHERE_NOTE =
  'This objective may also appear in module introductions, summaries, extra-practice areas, or proficiency reporting.';

export function isCheckpointPage(title?: string): boolean {
  return (title ?? '').toLowerCase().includes('checkpoint');
}

export function classifyContentRole(
  kind: ContentBlockKind | PageBlock['kind'],
  pageTitle?: string,
): ContentRole | null {
  if (kind === 'explanation' || kind === 'example' || kind === 'text' || kind === 'course-resource') {
    return 'explanation';
  }
  if (kind === 'question' || kind === 'bank') {
    return isCheckpointPage(pageTitle) ? 'summative' : 'formative';
  }
  return null;
}

export function friendlyObjectiveName(label: string): string {
  const trimmed = label.trim();
  const stripped = trimmed.replace(/^(LO\s*\d+(?:\.\d+)?|L\d+)\s+/i, '').trim();
  return stripped || trimmed;
}

export function impactHeadline(impact: ObjectiveImpact, scope = 'this module'): string {
  return `Removing this content may leave “${friendlyObjectiveName(impact.objective)}” with limited instructional or practice coverage in ${scope}.`;
}

export function bankObjectivesById(
  selections: { id: string; exampleQuestions: { learningObjective: string }[] }[],
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  selections.forEach((selection) => {
    map[selection.id] = uniqueObjectives(selection.exampleQuestions.map((question) => question.learningObjective));
  });
  return map;
}

export function evaluatePageBlockRemoval({
  blocks,
  removeBlockId,
  pageTitle,
  bankObjectivesById: bankObjectives = {},
}: {
  blocks: PageBlock[];
  removeBlockId: string;
  pageTitle: string;
  bankObjectivesById?: Record<string, string[]>;
}): RemovalImpact {
  const block = blocks.find((item) => item.id === removeBlockId);
  if (!block || block.status === 'removed') return { level: 'none', impacts: [] };

  const affected = objectivesForPageBlock(block, bankObjectives);
  if (affected.length === 0) return { level: 'none', impacts: [] };

  const remainingBlocks = blocks.map((item) =>
    item.id === removeBlockId ? { ...item, status: 'removed' as const } : item,
  );
  return impactsForObjectives(
    affected,
    coverageFromPageBlocks(blocks, pageTitle, bankObjectives),
    coverageFromPageBlocks(remainingBlocks, pageTitle, bankObjectives),
  );
}

export function evaluateCurriculumRemoval(nodes: CurriculumNode[], removeId: string): RemovalImpact {
  const target = findNode(nodes, removeId);
  if (!target || target.status === 'removed') return { level: 'none', impacts: [] };

  const removedIds = new Set(collectNodeIds(target));
  const items = collectCurriculumItems(nodes);
  const affected = uniqueObjectives(
    items.filter((item) => removedIds.has(item.nodeId)).flatMap((item) => item.objectives),
  );
  if (affected.length === 0) return { level: 'none', impacts: [] };

  return impactsForObjectives(
    affected,
    coverageFromItems(items),
    coverageFromItems(items.filter((item) => !removedIds.has(item.nodeId))),
  );
}

function emptyCounts(): CoverageCounts {
  return { explanations: 0, formative: 0, summative: 0 };
}

function addCount(counts: CoverageCounts, role: ContentRole) {
  if (role === 'explanation') counts.explanations += 1;
  else if (role === 'formative') counts.formative += 1;
  else counts.summative += 1;
}

function totalCounts(counts: CoverageCounts): number {
  return counts.explanations + counts.formative + counts.summative;
}

function practiceCounts(counts: CoverageCounts): number {
  return counts.formative + counts.summative;
}

function uniqueObjectives(labels: string[]): string[] {
  return [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
}

function objectivesForPageBlock(block: PageBlock, bankObjectives: Record<string, string[]>): string[] {
  if (block.kind === 'text') return uniqueObjectives([block.text.learningObjective]);
  if (block.kind === 'question') return uniqueObjectives([block.question.learningObjective]);
  if (block.kind === 'bank') return uniqueObjectives(bankObjectives[block.bank.selectionId] ?? []);
  return [];
}

function coverageFromPageBlocks(
  blocks: PageBlock[],
  pageTitle: string,
  bankObjectives: Record<string, string[]>,
): Map<string, CoverageCounts> {
  const items = blocks.flatMap((block) => {
    if (block.status === 'removed') return [];
    const role = classifyContentRole(block.kind, pageTitle);
    const objectives = objectivesForPageBlock(block, bankObjectives);
    if (!role || objectives.length === 0) return [];
    return [{ nodeId: block.id, objectives, role }];
  });
  return coverageFromItems(items);
}

type CoverageItem = {
  nodeId: string;
  objectives: string[];
  role: ContentRole;
};

function coverageFromItems(items: CoverageItem[]): Map<string, CoverageCounts> {
  const map = new Map<string, CoverageCounts>();
  items.forEach((item) => {
    uniqueObjectives(item.objectives).forEach((objective) => {
      const current = map.get(objective) ?? emptyCounts();
      addCount(current, item.role);
      map.set(objective, current);
    });
  });
  return map;
}

function isLimitedCoverage(before: CoverageCounts, after: CoverageCounts): boolean {
  const remaining = totalCounts(after);
  if (remaining <= 1) return true;
  if (before.explanations > 0 && after.explanations === 0) return true;
  if (practiceCounts(before) > 0 && practiceCounts(after) === 0) return true;
  return false;
}

function impactsForObjectives(
  affected: string[],
  before: Map<string, CoverageCounts>,
  after: Map<string, CoverageCounts>,
): RemovalImpact {
  const impacts = affected.flatMap((objective) => {
    const remaining = after.get(objective) ?? emptyCounts();
    const previous = before.get(objective) ?? emptyCounts();
    if (!isLimitedCoverage(previous, remaining)) return [];
    return [
      {
        objective,
        remaining,
        proficiencyEvidenceMayBeReduced: practiceCounts(remaining) === 0,
      },
    ];
  });
  if (impacts.length === 0) return { level: 'none', impacts: [] };
  const noneRemaining = impacts.every((impact) => totalCounts(impact.remaining) === 0);
  return { level: noneRemaining ? 'none-remaining' : 'limited', impacts };
}

function collectNodeIds(node: CurriculumNode): string[] {
  return [node.id, ...node.children.flatMap(collectNodeIds)];
}

function collectCurriculumItems(nodes: CurriculumNode[], pageTitle?: string): CoverageItem[] {
  return nodes.flatMap((node) => {
    if (node.status === 'removed') return [];
    const nextTitle = node.type === 'page' ? (node.assessmentTitle ?? node.title) : pageTitle;
    if (node.type === 'block') {
      if (!node.blockKind) return [];
      const role = classifyContentRole(node.blockKind, nextTitle);
      const objectives = node.learningObjectives ?? [];
      if (!role || objectives.length === 0) return [];
      return [{ nodeId: node.id, objectives, role }];
    }
    if (node.type === 'page') {
      const pageObjectives = node.learningObjectives ?? [];
      const fromBlocks = node.children.flatMap((child) => {
        if (child.type !== 'block' || child.status === 'removed' || !child.blockKind) return [];
        const role = classifyContentRole(child.blockKind, nextTitle);
        const objectives = child.learningObjectives?.length ? child.learningObjectives : pageObjectives;
        if (!role || objectives.length === 0) return [];
        return [{ nodeId: child.id, objectives, role }];
      });
      return [...fromBlocks, ...collectCurriculumItems(node.children.filter((child) => child.type !== 'block'), nextTitle)];
    }
    return collectCurriculumItems(node.children, nextTitle);
  });
}
