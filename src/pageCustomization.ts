import type { PageScoring } from './curriculumData';

export type PageBlockKind = 'text' | 'example' | 'question' | 'bank' | 'course-resource';
export type PageBlockOrigin = 'canonical' | 'instructor';
export type PageBlockStatus = 'original' | 'added' | 'removed';

export type TextContent = {
  heading: string;
  bodyHtml: string;
  learningObjective: string;
};

export type ExampleContent = {
  heading: string;
  bodyHtml: string;
  imageSrc?: string;
  imageAlt?: string;
};

export type QuestionChoice = {
  id: string;
  text: string;
  correct: boolean;
};

export type QuestionInput = {
  id: string;
  label: string;
  answer: string;
};

export type QuestionContent = {
  kind: 'mcq' | 'multi-input';
  title: string;
  prompt: string;
  points: number;
  learningObjective: string;
  choices: QuestionChoice[];
  inputs: QuestionInput[];
  correctFeedback: string;
  incorrectFeedback: string;
  canonicalKey?: 'nuclearSafety' | 'exitQuestion';
  showGraph?: boolean;
  imageSrc?: string;
  imageAlt?: string;
  generatedByAi?: boolean;
};

export type BankContent = {
  selectionId: string;
};

export type CourseResourceContent = {
  title: string;
  sourceLabel: string;
};

type BlockBase = {
  id: string;
  origin: PageBlockOrigin;
  status: PageBlockStatus;
  title: string;
};

export type PageBlock =
  | (BlockBase & { kind: 'text'; text: TextContent })
  | (BlockBase & { kind: 'example'; example: ExampleContent })
  | (BlockBase & { kind: 'question'; question: QuestionContent })
  | (BlockBase & { kind: 'bank'; bank: BankContent })
  | (BlockBase & { kind: 'course-resource'; courseResource: CourseResourceContent });

export type PageObjectiveOption = {
  code: string;
  label: string;
};

export type PageMeta = {
  scoring: PageScoring;
  attachedObjectiveCodes: string[];
  isInstructorCreated: boolean;
};

export type ChangeSummary = {
  count: number;
  items: string[];
};

export const BLOCK_KIND_LABEL: Record<PageBlockKind, string> = {
  text: 'Text',
  example: 'Example',
  question: 'Question',
  bank: 'Activity bank',
  'course-resource': 'Course resource',
};

export const COURSE_RESOURCE_OPTIONS: CourseResourceContent[] = [
  { title: 'Foundational Concepts of Electrochemistry', sourceLabel: 'Page in this course' },
  { title: 'Galvanic Cells', sourceLabel: 'Activity bank in this course' },
  { title: 'Oxidation and reduction review', sourceLabel: 'Page in this course' },
];

const STORAGE_PREFIX = 'torusux:pageLayout:v2:';
const META_PREFIX = 'torusux:pageMeta:v1:';

type StoredLayout = {
  v: 1;
  blocks: PageBlock[];
};

export function newPageBlockId(): string {
  return `pb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function cloneBlocks(blocks: PageBlock[]): PageBlock[] {
  return JSON.parse(JSON.stringify(blocks)) as PageBlock[];
}

export function blocksEqual(a: PageBlock[], b: PageBlock[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const storageKey = (assessmentTitle: string, slot: 'saved' | 'draft') =>
  `${STORAGE_PREFIX}${slot}:${encodeURIComponent(assessmentTitle)}`;

const ORIGINAL_PAGE_EXAMPLE_IDS = new Set(['example-electrolysis', 'example-radiation']);

function stripInjectedLayoutExamples(blocks: PageBlock[]): PageBlock[] {
  return blocks.filter((block) => {
    if (block.kind !== 'example') return true;
    if (ORIGINAL_PAGE_EXAMPLE_IDS.has(block.id)) return true;
    if (block.origin === 'instructor' && !block.id.startsWith('example-')) return true;
    return false;
  });
}

function readLayout(assessmentTitle: string, slot: 'saved' | 'draft'): PageBlock[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(storageKey(assessmentTitle, slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredLayout>;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.blocks)) return null;
    return stripInjectedLayoutExamples(parsed.blocks);
  } catch {
    return null;
  }
}

function writeLayout(assessmentTitle: string, slot: 'saved' | 'draft', blocks: PageBlock[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(storageKey(assessmentTitle, slot), JSON.stringify({ v: 1, blocks }));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadSavedPageLayout(assessmentTitle: string): PageBlock[] | null {
  return readLayout(assessmentTitle, 'saved');
}

export function loadDraftPageLayout(assessmentTitle: string): PageBlock[] | null {
  return readLayout(assessmentTitle, 'draft');
}

export function persistDraftPageLayout(assessmentTitle: string, blocks: PageBlock[]) {
  writeLayout(assessmentTitle, 'draft', blocks);
}

export function persistSavedPageLayout(assessmentTitle: string, blocks: PageBlock[]) {
  writeLayout(assessmentTitle, 'saved', blocks);
  writeLayout(assessmentTitle, 'draft', blocks);
}

const metaKey = (assessmentTitle: string) => `${META_PREFIX}${encodeURIComponent(assessmentTitle)}`;

export function loadPageMeta(assessmentTitle: string): PageMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(metaKey(assessmentTitle));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PageMeta>;
    if (!parsed || (parsed.scoring !== 'scored' && parsed.scoring !== 'practice')) return null;
    return {
      scoring: parsed.scoring,
      attachedObjectiveCodes: Array.isArray(parsed.attachedObjectiveCodes) ? parsed.attachedObjectiveCodes : [],
      isInstructorCreated: Boolean(parsed.isInstructorCreated),
    };
  } catch {
    return null;
  }
}

export function persistPageMeta(assessmentTitle: string, meta: PageMeta) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(metaKey(assessmentTitle), JSON.stringify(meta));
  } catch {
    /* ignore quota / private mode */
  }
}

export function sanitizeInstructorHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const allowed = new Set(['P', 'BR', 'B', 'I', 'EM', 'STRONG', 'UL', 'OL', 'LI', 'A', 'SPAN']);
  const template = document.createElement('template');
  template.innerHTML = html;
  const unwrap = (el: HTMLElement) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    walk(parent);
  };
  const walk = (node: Node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.parentNode?.removeChild(child);
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as HTMLElement;
      if (!allowed.has(el.tagName)) {
        unwrap(el);
        return;
      }
      if (el.tagName === 'A') {
        const href = el.getAttribute('href') ?? '';
        [...el.attributes].forEach((attribute) => el.removeAttribute(attribute.name));
        if (/^(https?:|mailto:|#)/i.test(href)) {
          el.setAttribute('href', href);
        }
      } else if (el.tagName === 'SPAN') {
        const isKeyword = el.classList.contains('page-keyword');
        [...el.attributes].forEach((attribute) => el.removeAttribute(attribute.name));
        if (isKeyword) {
          el.className = 'page-keyword';
        } else {
          unwrap(el);
          return;
        }
      } else {
        [...el.attributes].forEach((attribute) => el.removeAttribute(attribute.name));
      }
      walk(el);
    });
  };
  walk(template.content);
  return template.innerHTML;
}

export function exampleTextDraft(objectives: PageObjectiveOption[]): TextContent {
  return {
    heading: 'Connecting this page to the unit goals',
    bodyHtml:
      '<p>Use this space to add a short explanation students will see on the page. You can <strong>emphasize a key term</strong> or list the takeaways you want them to notice.</p><ul><li>State the idea in one or two sentences.</li><li>Point students to a nearby example or question.</li></ul>',
    learningObjective: objectives[0]?.label ?? '',
  };
}

export function formatObjectiveTag(objective: PageObjectiveOption): string {
  if (!objective.code || objective.label.toLowerCase().startsWith(objective.code.toLowerCase())) {
    return objective.label;
  }
  const detail = objective.label.replace(/^(LO\s*\d+(?:\.\d+)?|L\d+)\s+/i, '').trim();
  return `${objective.code} ${detail}`.trim();
}

export function extractObjectiveCode(text?: string): string | null {
  if (!text) return null;
  const match = text.match(/LO\s*\d+(?:\.\d+)?/i);
  return match ? match[0].replace(/\s+/g, ' ').toUpperCase() : null;
}

export function resolveEditorObjectiveValue(currentValue: string, pageObjectives: PageObjectiveOption[]): string {
  const code = extractObjectiveCode(currentValue);
  if (code) {
    const match = pageObjectives.find((objective) => objective.code.toUpperCase() === code);
    if (match) return formatObjectiveTag(match);
  }
  const match = pageObjectives.find(
    (objective) => objective.label === currentValue || formatObjectiveTag(objective) === currentValue,
  );
  return match ? formatObjectiveTag(match) : currentValue;
}

export function editorObjectiveOptions(
  pageObjectives: PageObjectiveOption[],
  currentValue?: string,
): PageObjectiveOption[] {
  const options = [...pageObjectives];
  if (!currentValue?.trim()) return options;
  const resolved = resolveEditorObjectiveValue(currentValue, pageObjectives);
  const alreadyListed = options.some(
    (objective) => formatObjectiveTag(objective) === resolved || objective.label === currentValue,
  );
  if (alreadyListed) return options;
  const code = extractObjectiveCode(currentValue);
  options.push({
    code: code ?? currentValue,
    label: currentValue,
  });
  return options;
}

function choiceDraft(id: string, text: string, correct: boolean): QuestionChoice {
  return { id, text, correct };
}

export function generateQuestionsWithAi({
  objectives,
  objectiveValue,
  sourceText = '',
  count = 1,
}: {
  objectives: PageObjectiveOption[];
  objectiveValue: string;
  sourceText?: string;
  count?: number;
}): QuestionContent[] {
  const objective =
    objectives.find((item) => formatObjectiveTag(item) === objectiveValue || item.label === objectiveValue) ??
    objectives[0];
  const tag = objective ? formatObjectiveTag(objective) : objectiveValue;
  const code = (objective?.code ?? extractObjectiveCode(objectiveValue) ?? 'LO 1.1').toUpperCase();
  const snippet = sourceText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
  const context = snippet ? ` Use this course context: “${snippet}${sourceText.length > 90 ? '…' : ''}”.` : '';
  const templates: QuestionContent[] = [];

  if (code.includes('1.4') || code.includes('1.5')) {
    templates.push(
      {
        kind: 'mcq',
        title: 'Shielding choice for mixed sources',
        prompt: `A teaching lab stores sealed alpha, beta, and gamma sources.${context} Which control set best reduces exposure while keeping the demonstration visible?`,
        points: 3,
        learningObjective: tag,
        choices: [
          choiceDraft('ai-c1', 'Paper wrapping for every source and open trays for easier viewing.', false),
          choiceDraft('ai-c2', 'Lead only around the alpha source; leave beta and gamma unshielded.', false),
          choiceDraft('ai-c3', 'Keep sources sealed, acrylic for beta, and lead plus distance for gamma.', true),
          choiceDraft('ai-c4', 'Store all emitters together to shorten handling time.', false),
        ],
        inputs: [],
        correctFeedback: 'Correct. Match shielding to radiation type and keep sources sealed.',
        incorrectFeedback: 'Incorrect. Alpha is stopped easily; beta and gamma need different controls and distance.',
        generatedByAi: true,
      },
      {
        kind: 'mcq',
        title: 'Why equal dose is not equal harm',
        prompt: `Two people absorb the same dose from the same radionuclide.${context} Which factor most directly explains different biological outcomes?`,
        points: 3,
        learningObjective: tag,
        choices: [
          choiceDraft('ai-c1', 'All tissues respond identically to ionizing radiation.', false),
          choiceDraft('ai-c2', 'Pathway, dose rate, and tissue radiosensitivity change biological effect.', true),
          choiceDraft('ai-c3', 'Only external exposure can cause tissue damage.', false),
          choiceDraft('ai-c4', 'Shielding type no longer matters once exposure has occurred.', false),
        ],
        inputs: [],
        correctFeedback: 'Correct. Outcome depends on pathway, dose rate, and the tissue involved.',
        incorrectFeedback: 'Incorrect. Equal absorbed dose can still produce different effects across tissues and pathways.',
        generatedByAi: true,
      },
      {
        kind: 'multi-input',
        title: 'Name the dominant control',
        prompt: `For each radiation type, enter the practical control students should use in a teaching lab.${context}`,
        points: 3,
        learningObjective: tag,
        choices: [],
        inputs: [
          { id: 'ai-i1', label: 'Alpha emitters', answer: 'sealed source / gloves' },
          { id: 'ai-i2', label: 'Beta emitters', answer: 'acrylic shielding' },
          { id: 'ai-i3', label: 'Gamma emitters', answer: 'lead shielding and distance' },
        ],
        correctFeedback: 'Correct. Match the barrier to the radiation type.',
        incorrectFeedback: 'Incorrect. Alpha needs containment, beta needs plastic, gamma needs dense shielding and distance.',
        generatedByAi: true,
      },
    );
  } else if (code.includes('1.2')) {
    templates.push(
      {
        kind: 'mcq',
        title: 'What the cell potential is telling you',
        prompt: `A galvanic cell is assembled under standard conditions.${context} Which statement best describes a positive E°cell?`,
        points: 3,
        learningObjective: tag,
        choices: [
          choiceDraft('ai-c1', 'The reaction as written is nonspontaneous.', false),
          choiceDraft('ai-c2', 'Electrons flow from cathode to anode in the external circuit.', false),
          choiceDraft('ai-c3', 'The reaction as written is spontaneous under standard conditions.', true),
          choiceDraft('ai-c4', 'The salt bridge is unnecessary because charge is already balanced.', false),
        ],
        inputs: [],
        correctFeedback: 'Correct. A positive standard cell potential means the written reaction is spontaneous.',
        incorrectFeedback: 'Incorrect. E°cell > 0 means the reaction as written is spontaneous, with electrons leaving the anode.',
        generatedByAi: true,
      },
      {
        kind: 'multi-input',
        title: 'Electrode products in an electrolytic cell',
        prompt: `Aqueous NaCl is electrolyzed with inert electrodes.${context} Identify the dominant product at each electrode.`,
        points: 3,
        learningObjective: tag,
        choices: [],
        inputs: [
          { id: 'ai-i1', label: 'Anode product', answer: 'Cl2 / chlorine' },
          { id: 'ai-i2', label: 'Cathode product', answer: 'H2 / hydrogen' },
        ],
        correctFeedback: 'Correct. Chloride is oxidized at the anode; water is reduced at the cathode in this cell.',
        incorrectFeedback: 'Incorrect. In aqueous NaCl, chlorine typically forms at the anode and hydrogen at the cathode.',
        generatedByAi: true,
      },
      {
        kind: 'mcq',
        title: 'Reading an equivalence point',
        prompt: `A titration curve is collected for a strong acid–strong base titration.${context} At the equivalence point, which statement is true?`,
        points: 3,
        learningObjective: tag,
        choices: [
          choiceDraft('ai-c1', 'Moles of analyte equal moles of titrant.', true),
          choiceDraft('ai-c2', 'The pH must be less than 7.', false),
          choiceDraft('ai-c3', 'No current can flow in a related electrochemical cell.', false),
          choiceDraft('ai-c4', 'The indicator has not yet changed color.', false),
        ],
        inputs: [],
        correctFeedback: 'Correct. Equivalence is defined by equal moles of analyte and titrant.',
        incorrectFeedback: 'Incorrect. Equivalence is the stoichiometric point, not a specific color or pH value alone.',
        generatedByAi: true,
      },
    );
  } else if (code.includes('1.3')) {
    templates.push(
      {
        kind: 'mcq',
        title: 'Choosing a corrosion-control strategy',
        prompt: `An iron structure sits in contact with copper fittings in a wet environment.${context} Which action best slows corrosion of the iron?`,
        points: 3,
        learningObjective: tag,
        choices: [
          choiceDraft('ai-c1', 'Connect a more easily oxidized metal so it corrodes instead of the iron.', true),
          choiceDraft('ai-c2', 'Paint only the copper so the iron remains the cathode.', false),
          choiceDraft('ai-c3', 'Add salt to the water to increase conductivity and even out the cell.', false),
          choiceDraft('ai-c4', 'Electrically connect iron and copper with a thicker wire.', false),
        ],
        inputs: [],
        correctFeedback: 'Correct. A sacrificial anode (more easily oxidized metal) protects the iron.',
        incorrectFeedback: 'Incorrect. Increasing the cell or leaving iron as the anode speeds corrosion.',
        generatedByAi: true,
      },
      {
        kind: 'mcq',
        title: 'Battery type in context',
        prompt: `A device must deliver current for as long as fuel is supplied, not from a stored chemical inventory.${context} Which system matches that requirement?`,
        points: 3,
        learningObjective: tag,
        choices: [
          choiceDraft('ai-c1', 'A primary alkaline cell.', false),
          choiceDraft('ai-c2', 'A rechargeable lead-acid battery.', false),
          choiceDraft('ai-c3', 'A fuel cell.', true),
          choiceDraft('ai-c4', 'A concentration cell with identical electrodes.', false),
        ],
        inputs: [],
        correctFeedback: 'Correct. Fuel cells convert supplied fuel continuously while reactants are available.',
        incorrectFeedback: 'Incorrect. Batteries store a finite inventory of reactants; a fuel cell is fed continuously.',
        generatedByAi: true,
      },
      {
        kind: 'multi-input',
        title: 'Name the application',
        prompt: `Identify the electrochemical application described in each case.${context}`,
        points: 3,
        learningObjective: tag,
        choices: [],
        inputs: [
          { id: 'ai-i1', label: 'Portable, non-rechargeable consumer cell', answer: 'primary battery / alkaline' },
          { id: 'ai-i2', label: 'Rechargeable vehicle starting battery', answer: 'lead-acid / secondary battery' },
        ],
        correctFeedback: 'Correct. Primary cells are not meant to be recharged; lead-acid is a secondary battery.',
        incorrectFeedback: 'Incorrect. Match rechargeability and typical use to the battery class.',
        generatedByAi: true,
      },
    );
  } else {
    templates.push(
      {
        kind: 'mcq',
        title: 'Identify the species oxidized',
        prompt: `In Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s),${context} which species is oxidized?`.replace(/\s+/g, ' '),
        points: 3,
        learningObjective: tag,
        choices: [
          choiceDraft('ai-c1', 'Zn(s)', true),
          choiceDraft('ai-c2', 'Cu²⁺(aq)', false),
          choiceDraft('ai-c3', 'Zn²⁺(aq)', false),
          choiceDraft('ai-c4', 'Cu(s)', false),
        ],
        inputs: [],
        correctFeedback: 'Correct. Zinc loses electrons and is oxidized to Zn²⁺.',
        incorrectFeedback: 'Incorrect. Oxidation is the loss of electrons. Zinc metal is oxidized in this reaction.',
        generatedByAi: true,
      },
      {
        kind: 'multi-input',
        title: 'Oxidation numbers for manganese',
        prompt: `Enter the oxidation number of manganese in each species.${context}`,
        points: 3,
        learningObjective: tag,
        choices: [],
        inputs: [
          { id: 'ai-i1', label: 'Mn in MnO₄⁻', answer: '+7' },
          { id: 'ai-i2', label: 'Mn in Mn²⁺', answer: '+2' },
        ],
        correctFeedback: 'Correct. Oxygen is −2, so Mn is +7 in permanganate and +2 after reduction.',
        incorrectFeedback: 'Incorrect. Assign oxygen as −2 and solve for manganese in each formula.',
        generatedByAi: true,
      },
      {
        kind: 'mcq',
        title: 'Balance in acidic solution',
        prompt: `When MnO₄⁻ is reduced to Mn²⁺ in acid,${context} which statement is true of the balanced half-reaction?`,
        points: 3,
        learningObjective: tag,
        choices: [
          choiceDraft('ai-c1', 'Water appears on the product side and H⁺ on the reactant side.', true),
          choiceDraft('ai-c2', 'OH⁻ must be added to both sides.', false),
          choiceDraft('ai-c3', 'No electrons are transferred.', false),
          choiceDraft('ai-c4', 'Manganese is oxidized from +7 to +2.', false),
        ],
        inputs: [],
        correctFeedback: 'Correct. Acidic medium uses H⁺ and H₂O; MnO₄⁻ is reduced, not oxidized.',
        incorrectFeedback: 'Incorrect. In acid, H⁺ and water balance oxygen and hydrogen; Mn is reduced.',
        generatedByAi: true,
      },
    );
  }

  const n = Math.max(1, Math.min(count, templates.length));
  return templates.slice(0, n).map((question, index) => ({
    ...question,
    title: n === 1 ? question.title : `${question.title} (${index + 1})`,
  }));
}

export function exampleMcqDraft(_objectives: PageObjectiveOption[]): QuestionContent {
  return {
    kind: 'mcq',
    title: 'Identify the species oxidized',
    prompt: 'In the reaction Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s), which species is oxidized?',
    points: 3,
    learningObjective: '',
    choices: [
      { id: 'c1', text: 'Zn(s)', correct: true },
      { id: 'c2', text: 'Cu²⁺(aq)', correct: false },
      { id: 'c3', text: 'Zn²⁺(aq)', correct: false },
      { id: 'c4', text: 'Cu(s)', correct: false },
    ],
    inputs: [],
    correctFeedback: 'Correct. Zinc loses electrons and is oxidized to Zn²⁺.',
    incorrectFeedback: 'Incorrect. Oxidation is the loss of electrons. Zinc metal is oxidized in this reaction.',
  };
}

export function exampleMultiInputDraft(_objectives: PageObjectiveOption[]): QuestionContent {
  return {
    kind: 'multi-input',
    title: 'Oxidation numbers for manganese',
    prompt: 'Enter the oxidation number of manganese in each species.',
    points: 3,
    learningObjective: '',
    choices: [],
    inputs: [
      { id: 'i1', label: 'Mn in MnO₄⁻', answer: '+7' },
      { id: 'i2', label: 'Mn in Mn²⁺', answer: '+2' },
    ],
    correctFeedback: 'Correct. Oxygen is −2, so Mn is +7 in permanganate and +2 after reduction.',
    incorrectFeedback: 'Incorrect. Assign oxygen as −2 and solve for manganese in each formula.',
  };
}

export function cannedExampleBlock(): PageBlock {
  return {
    id: newPageBlockId(),
    kind: 'example',
    origin: 'instructor',
    status: 'added',
    title: 'Worked example: identifying oxidation',
    example: {
      heading: 'Worked example: identifying oxidation',
      bodyHtml:
        '<p>In Zn + Cu<sup>2+</sup> → Zn<sup>2+</sup> + Cu, zinc loses electrons (oxidation) and copper ions gain electrons (reduction). The species that loses electrons is the one that is oxidized.</p>',
    },
  };
}

export function courseResourceBlock(resource: CourseResourceContent): PageBlock {
  return {
    id: newPageBlockId(),
    kind: 'course-resource',
    origin: 'instructor',
    status: 'added',
    title: resource.title,
    courseResource: resource,
  };
}

export function textBlockFromDraft(draft: TextContent): Extract<PageBlock, { kind: 'text' }> {
  const heading = draft.heading.trim() || 'Untitled text';
  return {
    id: newPageBlockId(),
    kind: 'text',
    origin: 'instructor',
    status: 'added',
    title: heading,
    text: {
      heading,
      bodyHtml: draft.bodyHtml,
      learningObjective: draft.learningObjective,
    },
  };
}

export function questionBlockFromDraft(draft: QuestionContent): Extract<PageBlock, { kind: 'question' }> {
  return {
    id: newPageBlockId(),
    kind: 'question',
    origin: 'instructor',
    status: 'added',
    title: draft.title.trim() || 'Untitled question',
    question: {
      ...draft,
      title: draft.title.trim() || 'Untitled question',
      choices: draft.choices.map((choice) => ({ ...choice, text: choice.text.trim() })),
      inputs: draft.inputs.map((input) => ({
        ...input,
        label: input.label.trim(),
        answer: input.answer.trim(),
      })),
    },
  };
}

export function insertBlock(blocks: PageBlock[], insertAt: number, block: PageBlock): PageBlock[] {
  const next = cloneBlocks(blocks);
  const index = Math.max(0, Math.min(insertAt, next.length));
  next.splice(index, 0, block);
  return next;
}

export function moveBlock(blocks: PageBlock[], id: string, direction: 'up' | 'down'): PageBlock[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index < 0) return blocks;
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= blocks.length) return blocks;
  const next = cloneBlocks(blocks);
  [next[index], next[swapWith]] = [next[swapWith], next[index]];
  return next;
}

export function moveBlockToIndex(blocks: PageBlock[], id: string, toIndex: number): PageBlock[] {
  const fromIndex = blocks.findIndex((block) => block.id === id);
  if (fromIndex < 0) return blocks;
  let insertAt = Math.max(0, Math.min(toIndex, blocks.length));
  if (fromIndex < insertAt) insertAt -= 1;
  if (fromIndex === insertAt) return blocks;
  const next = cloneBlocks(blocks);
  const [item] = next.splice(fromIndex, 1);
  next.splice(insertAt, 0, item);
  return next;
}

export function moveBlockRelative(
  blocks: PageBlock[],
  draggedId: string,
  targetId: string,
  placement: 'before' | 'after',
): PageBlock[] {
  const targetIndex = blocks.findIndex((block) => block.id === targetId);
  if (targetIndex < 0) return blocks;
  return moveBlockToIndex(blocks, draggedId, placement === 'before' ? targetIndex : targetIndex + 1);
}

export function canMoveBlock(blocks: PageBlock[], id: string, direction: 'up' | 'down'): boolean {
  const index = blocks.findIndex((block) => block.id === id);
  if (index < 0) return false;
  return direction === 'up' ? index > 0 : index < blocks.length - 1;
}

export function setBlockRemoved(blocks: PageBlock[], id: string, removed: boolean): PageBlock[] {
  return blocks.map((block) => {
    if (block.id !== id) return block;
    if (removed) return { ...block, status: 'removed' };
    return { ...block, status: block.origin === 'instructor' ? 'added' : 'original' };
  });
}

export function removedBankIds(blocks: PageBlock[]): string[] {
  return blocks
    .filter(
      (block): block is Extract<PageBlock, { kind: 'bank' }> =>
        block.kind === 'bank' && block.status === 'removed'
    )
    .map((block) => block.bank.selectionId);
}

export function removedEmbeddedFromBlocks(blocks: PageBlock[]): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  blocks.forEach((block) => {
    if (block.kind !== 'question' || !block.question.canonicalKey) return;
    next[block.question.canonicalKey] = block.status === 'removed';
  });
  return next;
}

export function visibleBlocks(blocks: PageBlock[]): PageBlock[] {
  return blocks.filter((block) => block.status !== 'removed');
}

export function addedQuestionCoverage(blocks: PageBlock[]): { learningObjective: string; points: number }[] {
  return blocks
    .filter((block): block is Extract<PageBlock, { kind: 'question' }> => block.kind === 'question')
    .filter((block) => block.origin === 'instructor' && block.status !== 'removed')
    .map((block) => ({ learningObjective: block.question.learningObjective, points: block.question.points }));
}

export function summarizePageChanges(saved: PageBlock[], draft: PageBlock[]): ChangeSummary {
  const items: string[] = [];
  const savedById = new Map(saved.map((block) => [block.id, block]));
  const draftById = new Map(draft.map((block) => [block.id, block]));

  draft.forEach((block) => {
    if (!savedById.has(block.id) && block.status !== 'removed') {
      items.push(`Added “${block.title}”`);
    }
  });

  draft.forEach((block) => {
    const previous = savedById.get(block.id);
    if (!previous) return;
    if (previous.status !== 'removed' && block.status === 'removed') {
      items.push(`Removed “${block.title}”`);
    }
    if (previous.status === 'removed' && block.status !== 'removed') {
      items.push(`Restored “${block.title}”`);
    }
  });

  saved.forEach((block) => {
    if (!draftById.has(block.id)) {
      items.push(`Removed “${block.title}”`);
    }
  });

  const savedSharedOrder = saved.map((block) => block.id).filter((id) => draftById.has(id));
  const draftSharedOrder = draft.map((block) => block.id).filter((id) => savedById.has(id));
  if (savedSharedOrder.join('|') !== draftSharedOrder.join('|')) {
    items.push('Reordered content');
  }

  return { count: items.length, items };
}

function blockPayload(block: PageBlock): string {
  const { id: _id, status: _status, ...rest } = block;
  return JSON.stringify(rest);
}

export function blockContentDiffers(a: PageBlock, b: PageBlock): boolean {
  return blockPayload(a) !== blockPayload(b);
}

/** Concise list of how this page differs from the original course version. */
export function summarizeAgainstCanonical(canonical: PageBlock[], current: PageBlock[]): ChangeSummary {
  const items: string[] = [];
  const canonicalById = new Map(canonical.map((block) => [block.id, block]));
  const currentById = new Map(current.map((block) => [block.id, block]));

  current.forEach((block) => {
    if (!canonicalById.has(block.id) && block.status !== 'removed') {
      items.push(`Added “${block.title}” (${BLOCK_KIND_LABEL[block.kind]})`);
    }
  });

  current.forEach((block) => {
    const original = canonicalById.get(block.id);
    if (!original) return;
    if (block.status === 'removed') {
      items.push(`Removed “${original.title}”`);
      return;
    }
    if (blockPayload(block) !== blockPayload(original)) {
      items.push(`Edited “${original.title}”`);
    }
  });

  canonical.forEach((block) => {
    if (!currentById.has(block.id)) {
      items.push(`Removed “${block.title}”`);
    }
  });

  const sharedCanonical = canonical.map((block) => block.id).filter((id) => {
    const currentBlock = currentById.get(id);
    return currentBlock && currentBlock.status !== 'removed';
  });
  const sharedCurrent = current
    .filter((block) => block.status !== 'removed' && canonicalById.has(block.id))
    .map((block) => block.id);
  if (sharedCanonical.join('|') !== sharedCurrent.join('|')) {
    items.push('Reordered content relative to the original page');
  }

  return { count: items.length, items };
}

export function pageIsCustomized(canonical: PageBlock[], current: PageBlock[]): boolean {
  return summarizeAgainstCanonical(canonical, current).count > 0;
}

export function describeBlockForCompare(block: PageBlock): string {
  if (block.status === 'removed') return `${block.title} (removed)`;
  if (block.kind === 'text') {
    const excerpt = block.text.bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return excerpt ? `${block.text.heading} — ${excerpt.slice(0, 120)}${excerpt.length > 120 ? '…' : ''}` : block.text.heading;
  }
  if (block.kind === 'example') return block.example.heading;
  if (block.kind === 'question') return `${block.question.title}: ${block.question.prompt.slice(0, 100)}${block.question.prompt.length > 100 ? '…' : ''}`;
  if (block.kind === 'bank') return block.title;
  return `${block.courseResource.title} · ${block.courseResource.sourceLabel}`;
}

const electrochemistryIntroHtml = `
<p>Electrochemistry links electron transfer to chemical change: oxidation is loss of electrons, reduction is gain. In a galvanic cell, a spontaneous reaction drives current through an external circuit; in electrolysis, electrical work drives a nonspontaneous process. Standard reduction potentials help you compare tendencies and predict cell direction under standard conditions.</p>
<p>Beyond lecture-scale cells, electrochemistry shapes everyday technology-alkaline and lithium-ion batteries store portable energy, lead-acid systems support vehicles, and fuel cells convert fuel continuously while reactants are supplied. Corrosion is the same chemistry working against structures: dissimilar metals in contact with an electrolyte can accelerate material loss unless design or coatings interrupt the cell.</p>
<p>This checkpoint draws on those ideas so students connect definitions to graphs, half-reactions, and applications. As you review activity banks below, you are choosing which items best reinforce the learning objectives for this unit on electrochemistry and its real-world uses.</p>
`.trim();

const nuclearIntroHtml = `
<p>Nuclear chemistry explores unstable nuclei, radioactive decay pathways, and how emitted radiation interacts with matter. Students in this checkpoint should distinguish alpha, beta, and gamma behavior in both shielding and biological contexts.</p>
<p>Biological effects are not determined by radiation label alone: exposure pathway, absorbed dose, dose rate, and tissue radiosensitivity all change risk. These ideas are essential when interpreting why identical source strengths can produce different outcomes in real scenarios.</p>
<p>The activity banks below focus on evidence-based reasoning about safety controls, clinical or industrial uses, and risk-benefit decisions tied to radiation applications.</p>
`.trim();

function choice(id: string, text: string, correct: boolean): QuestionChoice {
  return { id, text, correct };
}

export function createDefaultPageBlocks({
  isNuclear,
  selectionIds,
  removedBanks,
  removedEmbedded,
  images,
}: {
  isNuclear: boolean;
  selectionIds: string[];
  removedBanks: string[];
  removedEmbedded: Record<string, boolean>;
  images: { electrolysis: string; radiation: string };
  objectives?: PageObjectiveOption[];
}): PageBlock[] {
  const introObjective = isNuclear
    ? 'Connect exposure pathway to biological outcomes'
    : 'Explain equilibrium shifts';
  const blocks: PageBlock[] = [
    {
      id: 'intro-text',
      kind: 'text',
      origin: 'canonical',
      status: 'original',
      title: isNuclear ? 'Nuclear chemistry in this checkpoint' : 'Electrochemistry in this checkpoint',
      text: {
        heading: isNuclear ? 'Nuclear chemistry in this checkpoint' : 'Electrochemistry in this checkpoint',
        bodyHtml: isNuclear ? nuclearIntroHtml : electrochemistryIntroHtml,
        learningObjective: introObjective,
      },
    },
    ...selectionIds.map((selectionId): PageBlock => ({
      id: `bank-${selectionId}`,
      kind: 'bank',
      origin: 'canonical',
      status: removedBanks.includes(selectionId) ? 'removed' : 'original',
      title: 'Activity bank selection',
      bank: { selectionId },
    })),
  ];

  if (isNuclear) {
    blocks.push({
      id: 'example-radiation',
      kind: 'example',
      origin: 'canonical',
      status: 'original',
      title: 'Radiation materials in the teaching lab',
      example: {
        heading: 'Radiation materials in the teaching lab',
        bodyHtml: '<p>Sealed sources, shielding, and handling controls used when students observe alpha, beta, and gamma emitters.</p>',
        imageSrc: images.radiation,
        imageAlt: 'Nuclear chemistry lab and radiation safety materials',
      },
    });
    blocks.push({
      id: 'nuclearSafety',
      kind: 'question',
      origin: 'canonical',
      status: removedEmbedded.nuclearSafety ? 'removed' : 'original',
      title: 'Radiation Materials Safety Check',
      question: {
        kind: 'mcq',
        title: 'Radiation Materials Safety Check',
        prompt:
          'A lab stores alpha, beta, and gamma emitters for demonstrations. Which setup best reduces exposure risk while preserving visibility for students?',
        points: 3,
        learningObjective: 'LO 1.4 Compare shielding and handling strategies for common radiation types.',
        choices: [
          choice('ns-1', 'Use paper shielding for all sources and keep all containers open for easier viewing.', false),
          choice('ns-2', 'Use thick lead shielding for alpha sources only and remove barriers for beta and gamma sources.', false),
          choice(
            'ns-3',
            'Keep sealed containers, use acrylic shielding for beta sources, and place gamma sources behind lead shielding at distance.',
            true,
          ),
          choice('ns-4', 'Store all emitters together in one tray to simplify transport between lab benches.', false),
        ],
        inputs: [],
        correctFeedback: 'Correct. Match shielding to radiation type and keep sources sealed.',
        incorrectFeedback: 'Incorrect. Alpha, beta, and gamma require different shielding and handling controls.',
        canonicalKey: 'nuclearSafety',
      },
    });
  } else {
    blocks.push({
      id: 'example-electrolysis',
      kind: 'example',
      origin: 'canonical',
      status: 'original',
      title: 'Electrolysis cell diagram',
      example: {
        heading: 'Electrolysis cell diagram',
        bodyHtml: '<p>An electrolytic cell uses electrical work to drive a nonspontaneous redox process at the electrodes.</p>',
        imageSrc: images.electrolysis,
        imageAlt: 'Electrolysis setup with electrodes and ion movement',
      },
    });
  }

  blocks.push({
    id: 'exitQuestion',
    kind: 'question',
    origin: 'canonical',
    status: removedEmbedded.exitQuestion ? 'removed' : 'original',
    title: isNuclear ? 'Biological Effects Exit Question' : 'Electrochemistry Exit Question',
    question: {
      kind: 'mcq',
      title: isNuclear ? 'Biological Effects Exit Question' : 'Electrochemistry Exit Question',
      prompt: isNuclear
        ? 'Which factor most directly explains why equal absorbed doses can lead to different biological outcomes?'
        : 'Which statement best explains why a galvanic cell potential decreases as reactants are consumed?',
      points: 3,
      learningObjective: isNuclear
        ? 'Connect exposure pathway to biological outcomes'
        : 'Explain equilibrium shifts',
      choices: isNuclear
        ? [
            choice('ex-1', 'All tissues respond identically to ionizing radiation.', false),
            choice('ex-2', 'Biological effect varies with tissue radiosensitivity, dose rate, and exposure pathway.', true),
            choice('ex-3', 'Only external exposure affects biological outcome.', false),
            choice('ex-4', 'Shielding type has no impact once exposure begins.', false),
          ]
        : [
            choice('ex-1', 'The anode starts reducing instead of oxidizing.', false),
            choice('ex-2', 'Reaction quotient shifts and lowers the driving force toward equilibrium.', true),
            choice('ex-3', 'Electrons are no longer transferred through the external circuit.', false),
            choice('ex-4', 'The salt bridge blocks ion movement once products form.', false),
          ],
      inputs: [],
      correctFeedback: isNuclear
        ? 'Correct. Biological outcome depends on pathway, dose rate, and tissue sensitivity, not label alone.'
        : 'Correct. As reactants are consumed, Q increases and the cell potential falls toward equilibrium.',
      incorrectFeedback: isNuclear
        ? 'Incorrect. Equal absorbed dose can still produce different effects across tissues and pathways.'
        : 'Incorrect. The cell still transfers electrons; the driving force changes as concentrations change.',
      canonicalKey: 'exitQuestion',
    },
  });

  return blocks;
}
