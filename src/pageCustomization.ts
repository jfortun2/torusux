import type { PageScoring } from './curriculumData';
import {
  ELECTROCHEMISTRY_BANKS,
  ELECTROCHEMISTRY_PAGES,
  type ImportedPage,
} from './imported/electrochemistry';

export type PageBlockKind = 'text' | 'example' | 'question' | 'bank' | 'course-resource' | 'placeholder';
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
  numberToSelect?: number;
  availableQuestions?: number;
  criteriaTag?: string;
};

export type PlaceholderContent = {
  contentType: string;
  summary?: string;
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
  | (BlockBase & { kind: 'course-resource'; courseResource: CourseResourceContent })
  | (BlockBase & { kind: 'placeholder'; placeholder: PlaceholderContent });

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
  placeholder: 'Unsupported content',
};

export const COURSE_RESOURCE_OPTIONS: CourseResourceContent[] = [
  { title: 'Foundational Concepts of Electrochemistry', sourceLabel: 'Page in this course' },
  { title: 'Galvanic Cells', sourceLabel: 'Activity bank in this course' },
  { title: 'Oxidation and reduction review', sourceLabel: 'Page in this course' },
];

const STORAGE_PREFIX = 'torusux:pageLayout:v5:';
const META_PREFIX = 'torusux:pageMeta:v2:';

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

function stripInjectedLayoutExamples(blocks: PageBlock[]): PageBlock[] {
  return blocks;
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
  const allowed = new Set([
    'P', 'BR', 'B', 'I', 'EM', 'STRONG', 'U', 'UL', 'OL', 'LI', 'A', 'SPAN', 'SUP', 'SUB',
    'H1', 'H2', 'H3', 'H4', 'H5', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'CAPTION',
    'FIGURE', 'FIGCAPTION', 'ASIDE', 'DIV', 'DL', 'DT', 'DD', 'HR', 'BLOCKQUOTE', 'CODE', 'PRE',
  ]);
  const allowedClasses = new Set([
    'page-keyword', 'page-popup', 'page-formula', 'page-formula--block', 'page-frac', 'page-frac-num',
    'page-frac-den', 'page-figure', 'page-table', 'page-table-wrap', 'page-callout', 'page-placeholder',
    'page-placeholder__type', 'page-placeholder__note', 'page-placeholder__detail', 'page-internal-link',
    'page-dl', 'page-input-ref', 'page-overbar',
  ]);
  const template = document.createElement('template');
  template.innerHTML = html;
  const unwrap = (el: HTMLElement) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    walk(parent);
  };
  const keepClass = (el: HTMLElement) => {
    const next = [...el.classList].filter((name) => allowedClasses.has(name));
    [...el.attributes].forEach((attribute) => el.removeAttribute(attribute.name));
    if (next.length) el.className = next.join(' ');
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
        const className = [...el.classList].filter((name) => allowedClasses.has(name)).join(' ');
        [...el.attributes].forEach((attribute) => el.removeAttribute(attribute.name));
        if (/^(https?:|mailto:|#)/i.test(href)) el.setAttribute('href', href);
        if (className) el.className = className;
      } else if (el.tagName === 'IMG') {
        const src = el.getAttribute('src') ?? '';
        const alt = el.getAttribute('alt') ?? '';
        [...el.attributes].forEach((attribute) => el.removeAttribute(attribute.name));
        if (/^https:\/\//i.test(src) && !/javascript:/i.test(src)) {
          el.setAttribute('src', src);
          el.setAttribute('alt', alt);
        } else {
          unwrap(el);
          return;
        }
      } else if (el.tagName === 'SPAN' || el.tagName === 'DIV' || el.tagName === 'ASIDE' || el.tagName === 'FIGURE') {
        keepClass(el);
      } else {
        const className = [...el.classList].filter((name) => allowedClasses.has(name)).join(' ');
        [...el.attributes].forEach((attribute) => el.removeAttribute(attribute.name));
        if (className) el.className = className;
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
  if (block.kind === 'placeholder') return `${block.placeholder.contentType}${block.placeholder.summary ? `: ${block.placeholder.summary}` : ''}`;
  return `${block.courseResource.title} · ${block.courseResource.sourceLabel}`;
}

export const ACTIVITY_BANK_TITLES: Record<string, string> = {
  'ab-1': 'Redox in acidic media',
  'ab-2': 'Titration curves',
  'ab-3': 'Electrolysis products',
  'ab-4': 'Corrosion and prevention',
  'ab-5': 'Electroplating',
  'ab-6': 'Batteries and fuel cells',
  'ab-7': 'Discharge curves',
  'ab-8': 'Half-reactions',
  'ab-9': 'Galvanic cell behavior',
  'ab-10': 'Environmental electrochemistry',
  'n-ab-1': 'Radiation types and penetration',
  'n-ab-2': 'Biological effects and pathways',
  'n-ab-3': 'Radiation safety controls',
  'n-ab-4': 'Risk–benefit of radiation uses',
};

export const ELECTROCHEMISTRY_BANK_IDS = ['ab-1', 'ab-2', 'ab-3', 'ab-4', 'ab-5', 'ab-6', 'ab-7', 'ab-8', 'ab-9', 'ab-10'];
export const NUCLEAR_BANK_IDS = ['n-ab-1', 'n-ab-2', 'n-ab-3', 'n-ab-4'];

export type PageExampleImageKey = 'electrolysis' | 'radiation' | 'formula' | 'welding';
export type PageLayoutKind = 'lesson' | 'checkpoint';

export type PageContentProfile = {
  key: string;
  matched: boolean;
  layout: PageLayoutKind;
  objectiveCodes: string[];
  bankIds: string[];
  intro: { heading: string; bodyHtml: string; learningObjective: string };
  example?: {
    id: string;
    heading: string;
    bodyHtml: string;
    image?: PageExampleImageKey;
    imageAlt?: string;
  };
  questions: Array<{ id: string; question: QuestionContent }>;
  extraTextBlocks?: Array<{
    id: string;
    heading: string;
    bodyHtml: string;
    learningObjective: string;
    beforeQuestionIndex?: number;
  }>;
  blocks?: PageBlock[];
};

function choice(id: string, text: string, correct: boolean): QuestionChoice {
  return { id, text, correct };
}

function mcq(partial: Omit<QuestionContent, 'kind' | 'choices' | 'inputs'> & { choices: QuestionChoice[] }): QuestionContent {
  return { kind: 'mcq', inputs: [], ...partial };
}

function multiInput(
  partial: Omit<QuestionContent, 'kind' | 'choices' | 'inputs'> & { inputs: QuestionInput[] },
): QuestionContent {
  return { kind: 'multi-input', choices: [], ...partial };
}

function html(paragraphs: string[]): string {
  return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('');
}

function normalizePageTitle(title: string): string {
  return title.toLowerCase().replace(/^\d+[.)]\s*/, '').replace(/\s+/g, ' ').trim();
}

const EMPTY_PROFILE: PageContentProfile = {
  key: 'empty',
  matched: false,
  layout: 'lesson',
  objectiveCodes: [],
  bankIds: [],
  intro: {
    heading: 'Page overview',
    bodyHtml: html(['Use this page to add an explanation, example, or question that matches the topic you assigned in the curriculum.']),
    learningObjective: '',
  },
  questions: [],
};

function foundationalProfile(): PageContentProfile {
  return {
    key: 'foundational',
    matched: true,
    layout: 'lesson',
    objectiveCodes: ['LO 1.1'],
    bankIds: ['ab-1', 'ab-8'],
    intro: {
      heading: 'What is electrochemistry?',
      bodyHtml: html([
        'Electrochemistry studies chemical change that moves electrons. <span class="page-keyword">Oxidation</span> is loss of electrons; <span class="page-keyword">reduction</span> is gain. You will track that transfer with oxidation numbers and half-reactions before assembling full cells later in the unit.',
        'A useful first test is a familiar metal displacement: zinc metal in contact with copper(II) ions. Zinc is oxidized to Zn<sup>2+</sup> while Cu<sup>2+</sup> is reduced to copper metal. The same bookkeeping applies in batteries, corrosion, and electrolysis.',
        'On this page, assign oxidation states, identify what is oxidized and reduced, and practice balancing simple redox processes in acidic solution.',
      ]),
      learningObjective: 'LO 1.1 Balance redox equations and construct half-reactions.',
    },
    example: {
      id: 'example-foundational',
      heading: 'Identifying oxidation and reduction',
      bodyHtml:
        '<p>In Zn(s) + Cu<sup>2+</sup>(aq) → Zn<sup>2+</sup>(aq) + Cu(s), zinc loses electrons (oxidation) and copper(II) ions gain electrons (reduction). The reducing agent is the species oxidized: Zn(s).</p>',
      image: 'formula',
      imageAlt: 'Oxidation-number bookkeeping for a simple redox reaction',
    },
    questions: [
      {
        id: 'foundational-q',
        question: multiInput({
          title: 'Assign oxidation states',
          prompt: 'Enter the oxidation number of manganese in each species.',
          points: 3,
          learningObjective: 'LO 1.1 Balance redox equations and construct half-reactions.',
          inputs: [
            { id: 'fn-i1', label: 'Mn in MnO₄⁻', answer: '+7' },
            { id: 'fn-i2', label: 'Mn in Mn²⁺', answer: '+2' },
          ],
          correctFeedback: 'Correct. Oxygen is −2, so Mn is +7 in permanganate and +2 after reduction.',
          incorrectFeedback: 'Incorrect. Assign oxygen as −2 and solve for manganese in each formula.',
        }),
      },
    ],
  };
}

function redoxReviewProfile(): PageContentProfile {
  return {
    key: 'redox-review',
    matched: true,
    layout: 'lesson',
    objectiveCodes: ['LO 1.1'],
    bankIds: ['ab-8'],
    intro: {
      heading: 'Review of oxidation states',
      bodyHtml: html([
        'This short review returns to oxidation-number rules before you move into cells. Elements in elemental form are 0; oxygen is usually −2; hydrogen is usually +1; the sum of oxidation numbers equals the charge on the species.',
        'Once the numbers are assigned, the species whose oxidation number increases is oxidized, and the species whose number decreases is reduced. Balancing then adds H<sup>+</sup>, H<sub>2</sub>O, and electrons in acidic solution.',
        'Use the practice item and the half-reaction bank to confirm you can still assign states and complete a simple balanced pair.',
      ]),
      learningObjective: 'LO 1.1 Balance redox equations and construct half-reactions.',
    },
    questions: [
      {
        id: 'redox-q',
        question: mcq({
          title: 'Practice: balance a simple redox pair',
          prompt: 'In Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s), which species is oxidized?',
          points: 3,
          learningObjective: 'LO 1.1 Balance redox equations and construct half-reactions.',
          choices: [
            choice('rd-1', 'Zn(s)', true),
            choice('rd-2', 'Cu²⁺(aq)', false),
            choice('rd-3', 'Zn²⁺(aq)', false),
            choice('rd-4', 'Cu(s)', false),
          ],
          correctFeedback: 'Correct. Zinc loses electrons and is oxidized to Zn²⁺.',
          incorrectFeedback: 'Incorrect. Oxidation is the loss of electrons. Zinc metal is oxidized in this reaction.',
        }),
      },
    ],
  };
}

function galvanicProfile(): PageContentProfile {
  return {
    key: 'galvanic',
    matched: true,
    layout: 'lesson',
    objectiveCodes: ['LO 1.2'],
    bankIds: ['ab-9'],
    intro: {
      heading: 'How galvanic cells produce current',
      bodyHtml: html([
        'A <span class="page-keyword">galvanic cell</span> (voltaic cell) uses a spontaneous redox reaction to drive electron flow through an external circuit. Oxidation occurs at the anode; reduction occurs at the cathode. A salt bridge maintains charge balance as ions migrate.',
        'Under standard conditions, E°<sub>cell</sub> = E°<sub>cathode</sub> − E°<sub>anode</sub> (using standard reduction potentials). A positive E°<sub>cell</sub> means the reaction as written is spontaneous. As reactants are consumed, Q increases and the cell potential falls toward zero at equilibrium.',
        'The zinc–copper cell is the working example on this page: zinc metal is oxidized, copper(II) is reduced, and electrons travel from the zinc electrode to the copper electrode in the wire.',
      ]),
      learningObjective: 'LO 1.2 Predict electrochemical behavior and cell trends.',
    },
    example: {
      id: 'example-galvanic',
      heading: 'Zinc–copper cell',
      bodyHtml:
        '<p>In the Daniell cell, a zinc anode stands in ZnSO<sub>4</sub> and a copper cathode stands in CuSO<sub>4</sub>. Electrons leave zinc, travel through the wire, and reduce Cu<sup>2+</sup> at the copper strip. Sulfate ions and cations move in the salt bridge so neither half-cell builds up net charge.</p>',
      image: 'electrolysis',
      imageAlt: 'Two-electrode cell with ion movement between half-cells',
    },
    questions: [
      {
        id: 'galvanic-q',
        question: mcq({
          title: 'Predict cell potential',
          prompt: 'A galvanic cell is assembled under standard conditions. Which statement best describes a positive E°cell?',
          points: 3,
          learningObjective: 'LO 1.2 Predict electrochemical behavior and cell trends.',
          choices: [
            choice('gv-1', 'The reaction as written is nonspontaneous.', false),
            choice('gv-2', 'Electrons flow from cathode to anode in the external circuit.', false),
            choice('gv-3', 'The reaction as written is spontaneous under standard conditions.', true),
            choice('gv-4', 'The salt bridge is unnecessary because charge is already balanced.', false),
          ],
          correctFeedback: 'Correct. A positive standard cell potential means the written reaction is spontaneous.',
          incorrectFeedback: 'Incorrect. E°cell > 0 means the reaction as written is spontaneous, with electrons leaving the anode.',
        }),
      },
    ],
  };
}

const CELL_NOTATION_LO = 'LO 1.2 Use cell notation to describe galvanic cells.';

function cellNotationProfile(): PageContentProfile {
  return {
    key: 'cell-notation',
    matched: true,
    layout: 'lesson',
    objectiveCodes: ['LO 1.2'],
    bankIds: [],
    intro: {
      heading: 'Cell notation',
      bodyHtml:
        '<p>Chemists often use a compact notation to efficiently describe the composition of electrochemical cells. This <span class="page-keyword">cell notation</span> (also called a <em>cell diagram</em>) provides information about the species involved in the reaction and how the cell is constructed. In this representation:</p><ul><li>Species involved in the oxidation half-reaction are written on the left, and species in the reduction half-reaction are on the right.</li><li>The anode is written farthest to the left and the cathode is written farthest to the right.</li><li>A vertical line, │, denotes a phase boundary and a double line, ║, indicates the salt bridge (and separates the two half-reactions).</li><li>If reactants and products of a half-reaction are in the same phase, we use a comma to separate them.</li></ul><p>The cell notation for the galvanic cell described on the previous page is shown here:</p><p>Cu(s)│Cu<sup>2+</sup>(aq, 1 M)║Ag<sup>+</sup>(aq, 1 M)│Ag(s)</p>',
      learningObjective: CELL_NOTATION_LO,
    },
    example: {
      id: 'example-notation',
      heading: 'Example',
      bodyHtml:
        '<p>Consider a galvanic cell that uses the reaction:</p><p>2 Cr(s) + 3 Cu<sup>2+</sup>(aq) → 2 Cr<sup>3+</sup>(aq) + 3 Cu(s)</p><p>Write the oxidation and reduction half-reactions. Which reaction occurs at the anode? Which occurs at the cathode? Write the shorthand notation for this galvanic cell.</p><p>By inspection, Cr is oxidized when three electrons are lost to form Cr<sup>3+</sup>, and Cu<sup>2+</sup> is reduced as it gains two electrons to form Cu. Balancing the charge gives:</p><p>Oxidation: 2 Cr(s) → 2 Cr<sup>3+</sup>(aq) + 6 e<sup>−</sup></p><p>Reduction: 3 Cu<sup>2+</sup>(aq) + 6 e<sup>−</sup> → 3 Cu(s)</p><p>Overall: 2 Cr(s) + 3 Cu<sup>2+</sup>(aq) → 2 Cr<sup>3+</sup>(aq) + 3 Cu(s)</p><p>We start on the left with information about the oxidation half-reaction. The anode, Cr(<em>s</em>), is written farthest to the left. Next is a single line, │, representing the phase boundary, followed by the Cr<sup>3+</sup>(<em>aq</em>) ions in the solution.</p><p>Next, we write a double line, ║, to indicate the salt bridge and separate the two half-reactions.</p><p>Finally, we state the information about the reduction half-reaction. First, we write the Cu<sup>2+</sup>(<em>aq</em>) ions in the solution. Next is a single line, │, representing the phase boundary. The cathode, Cu(<em>s</em>), is written farthest to the right.</p><p>The cell notation is therefore:</p><p>Cr(s)│Cr<sup>3+</sup>(aq)║Cu<sup>2+</sup>(aq)│Cu(s)</p><p>Note that this notation provides information about the reactants and products of the redox reaction that occurs in the cell, but it does not explicitly state the stoichiometric coefficients for the reaction. (These coefficients can be determined relatively easily from the information given in the cell notation.)</p>',
    },
    extraTextBlocks: [
      {
        id: 'notation-lbd',
        heading: 'Learn by Doing',
        beforeQuestionIndex: 0,
        learningObjective: CELL_NOTATION_LO,
        bodyHtml:
          '<p>Use the following description of a galvanic cell to answer the questions that follow.</p><p>One half-cell consists of a gold electrode in a 1.0 M Au(NO<sub>3</sub>)<sub>3</sub> solution, and the other half-cell is a magnesium electrode in a 1.0 M Mg(NO<sub>3</sub>)<sub>2</sub> solution. The salt bridge contains NaNO<sub>3</sub>. NO<sub>3</sub><sup>−</sup> ions from the salt bridge flow toward the cell containing the Mg(NO<sub>3</sub>)<sub>2</sub> solution, and Na<sup>+</sup> ions flow toward the cell containing the Au(NO<sub>3</sub>)<sub>3</sub> solution.</p>',
      },
      {
        id: 'notation-digt',
        heading: 'Did I Get This',
        beforeQuestionIndex: 4,
        learningObjective: CELL_NOTATION_LO,
        bodyHtml:
          '<p>Use the following description of a galvanic cell to answer the questions that follow.</p><p>One half-cell consists of a piece of Pt metal submerged in a solution of Pt(NO<sub>3</sub>)<sub>2</sub>, and the other half-cell consists of a piece of Cu metal submerged in a solution of Cu(NO<sub>3</sub>)<sub>2</sub>. When the cell operates, Pt is formed and Cu is consumed.</p>',
      },
      {
        id: 'notation-source',
        heading: 'Source',
        learningObjective: CELL_NOTATION_LO,
        bodyHtml:
          '<p>Adapted from <a href="https://cnx.org/contents/havxkyvS@9.422:b39avmGq@29/Preface">Openstax Chemistry</a> under a <a href="https://creativecommons.org/licenses/by/4.0">Creative Commons Attribution 4.0 License</a>.</p><p>Download for free at <a href="http://cnx.org/contents/85abf193-2bd2-4908-8563-90b8a7ac8df6@9.312">http://cnx.org/contents/85abf193-2bd2-4908-8563-90b8a7ac8df6@9.312</a>.</p>',
      },
    ],
    questions: [
      {
        id: 'notation-lbd-q1',
        question: multiInput({
          title: 'Choose the oxidation and reduction half-reactions',
          prompt:
            'Choose the oxidation and reduction half-reactions. Options: Au(s) + 3 e⁻ → Au³⁺(aq); Au(s) → Au³⁺(aq) + 3 e⁻; Au³⁺(aq) + 3 e⁻ → Au(s); Au³⁺(aq) → Au(s) + 3 e⁻; Mg(s) + 2 e⁻ → Mg²⁺(aq); Mg(s) → Mg²⁺(aq) + 2 e⁻; Mg²⁺(aq) + 2 e⁻ → Mg(s); Mg²⁺(aq) → Mg(s) + 2 e⁻.',
          points: 2,
          learningObjective: CELL_NOTATION_LO,
          inputs: [
            { id: 'notation-lbd-q1-ox', label: 'Oxidation', answer: 'Mg(s) → Mg²⁺(aq) + 2 e⁻' },
            { id: 'notation-lbd-q1-red', label: 'Reduction', answer: 'Au³⁺(aq) + 3 e⁻ → Au(s)' },
          ],
          correctFeedback: 'Correct. Mg(s) is oxidized to form Mg²⁺(aq). Au³⁺(aq) is reduced to form Au(s).',
          incorrectFeedback:
            'Incorrect. Check whether each half-reaction is oxidation or reduction, and whether it is balanced. Hint: In the cell where oxidation occurs, atoms from the solid electrode are converted into positive ions and flow into the solution. Negative ions from the salt bridge will therefore flow here to balance charge. In the cell where reduction occurs, positive ions from the solution are converted into atoms and are added to the solid electrode. Positive ions from the salt bridge will therefore flow here to balance charge.',
        }),
      },
      {
        id: 'notation-lbd-q2',
        question: multiInput({
          title: 'Fill in the correct coefficients for the balanced overall reaction',
          prompt:
            'Fill in the correct coefficients for the balanced overall reaction. Hint: Multiply each half-reaction by the factor that makes the number of electrons gained equal to the number of electrons lost, and then add the half-reactions together. __ Au³⁺(aq) + __ Mg(s) → __ Au(s) + __ Mg²⁺(aq)',
          points: 4,
          learningObjective: CELL_NOTATION_LO,
          inputs: [
            { id: 'notation-lbd-q2-au3', label: 'Coefficient of Au³⁺(aq)', answer: '2' },
            { id: 'notation-lbd-q2-mg', label: 'Coefficient of Mg(s)', answer: '3' },
            { id: 'notation-lbd-q2-au', label: 'Coefficient of Au(s)', answer: '2' },
            { id: 'notation-lbd-q2-mg2', label: 'Coefficient of Mg²⁺(aq)', answer: '3' },
          ],
          correctFeedback: 'Correct. 2 Au³⁺(aq) + 3 Mg(s) → 2 Au(s) + 3 Mg²⁺(aq).',
          incorrectFeedback:
            'Incorrect. Multiply the gold half-reaction by 2 and the magnesium half-reaction by 3 so that six electrons are gained and lost, then add.',
        }),
      },
      {
        id: 'notation-lbd-q3',
        question: multiInput({
          title: 'Which half-reaction occurs at the anode and the cathode?',
          prompt:
            'Which half-reaction occurs at the anode? Which half-reaction occurs at the cathode? Options: Au³⁺(aq) + 3 e⁻ → Au(s); Mg(s) → Mg²⁺(aq) + 2 e⁻.',
          points: 2,
          learningObjective: CELL_NOTATION_LO,
          inputs: [
            { id: 'notation-lbd-q3-anode', label: 'Anode', answer: 'Mg(s) → Mg²⁺(aq) + 2 e⁻' },
            { id: 'notation-lbd-q3-cathode', label: 'Cathode', answer: 'Au³⁺(aq) + 3 e⁻ → Au(s)' },
          ],
          correctFeedback:
            'Correct. The oxidation half-reaction occurs at the anode. The reduction half-reaction occurs at the cathode.',
          incorrectFeedback:
            'Incorrect. Hint: Which process occurs at the anode, oxidation or reduction? Which process occurs at the cathode, oxidation or reduction?',
        }),
      },
      {
        id: 'notation-lbd-q4',
        question: mcq({
          title: 'Which is the correct cell notation?',
          prompt: 'Which is the correct cell notation?',
          points: 1,
          learningObjective: CELL_NOTATION_LO,
          choices: [
            choice('notation-lbd-q4-a', 'Mg(s)│Mg²⁺(aq)║Au³⁺(aq)│Au(s)', true),
            choice('notation-lbd-q4-b', 'Au(s)│Au³⁺(aq)║Mg²⁺(aq)│Mg(s)', false),
          ],
          correctFeedback:
            'Correct. In cell notation, the oxidation information is written on the left and the reduction information is written on the right.',
          incorrectFeedback:
            'Incorrect. In cell notation, the oxidation information is written on the left and the reduction information is written on the right.',
        }),
      },
      {
        id: 'notation-digt-q1',
        question: multiInput({
          title: 'The oxidation and reduction half-reactions',
          prompt:
            'The oxidation half-reaction is: The reduction half-reaction is: Options: Cu(s) + 2 e⁻ → Cu²⁺(aq); Cu(s) → Cu²⁺(aq) + 2 e⁻; Cu²⁺(aq) + 2 e⁻ → Cu(s); Cu²⁺(aq) → Cu(s) + 2 e⁻; Pt(s) + 2 e⁻ → Pt²⁺(aq); Pt(s) → Pt²⁺(aq) + 2 e⁻; Pt²⁺(aq) + 2 e⁻ → Pt(s); Pt²⁺(aq) → Pt(s) + 2 e⁻.',
          points: 2,
          learningObjective: CELL_NOTATION_LO,
          inputs: [
            { id: 'notation-digt-q1-ox', label: 'Oxidation', answer: 'Cu(s) → Cu²⁺(aq) + 2 e⁻' },
            { id: 'notation-digt-q1-red', label: 'Reduction', answer: 'Pt²⁺(aq) + 2 e⁻ → Pt(s)' },
          ],
          correctFeedback: 'Correct. The Cu is oxidized. The Pt is reduced.',
          incorrectFeedback: 'Incorrect. Cu is consumed (oxidized) and Pt is formed (reduced). Check that each half-reaction is balanced.',
        }),
      },
      {
        id: 'notation-digt-q2',
        question: multiInput({
          title: 'Which reaction occurs at the anode and the cathode?',
          prompt:
            'Oxidation: Cu(s) → Cu²⁺(aq) + 2 e⁻. Reduction: Pt²⁺(aq) + 2 e⁻ → Pt(s). Which reaction occurs at the anode and the cathode? Options: Cu(s) → Cu²⁺(aq) + 2 e⁻; Pt²⁺(aq) + 2 e⁻ → Pt(s).',
          points: 2,
          learningObjective: CELL_NOTATION_LO,
          inputs: [
            { id: 'notation-digt-q2-anode', label: 'Anode', answer: 'Cu(s) → Cu²⁺(aq) + 2 e⁻' },
            { id: 'notation-digt-q2-cathode', label: 'Cathode', answer: 'Pt²⁺(aq) + 2 e⁻ → Pt(s)' },
          ],
          correctFeedback: 'Correct. Oxidation occurs at the anode. Reduction occurs at the cathode.',
          incorrectFeedback: 'Incorrect. Oxidation occurs at the anode. Reduction occurs at the cathode.',
        }),
      },
      {
        id: 'notation-digt-q3',
        question: mcq({
          title: 'Which is the correct cell notation?',
          prompt: 'Which is the correct cell notation?',
          points: 1,
          learningObjective: CELL_NOTATION_LO,
          choices: [
            choice('notation-digt-q3-a', 'Cu(s)│Cu²⁺(aq)║Pt²⁺(aq)│Pt(s)', true),
            choice('notation-digt-q3-b', 'Pt(s)│Pt²⁺(aq)║Cu²⁺(aq)│Cu(s)', false),
          ],
          correctFeedback:
            'Correct. In the cell notation, the anode and its solution are written to the left of the symbol for the salt bridge.',
          incorrectFeedback:
            'Incorrect. In the cell notation, the anode and its solution are written to the left of the symbol for the salt bridge.',
        }),
      },
    ],
  };
}

function applicationsProfile(): PageContentProfile {
  return {
    key: 'applications',
    matched: true,
    layout: 'lesson',
    objectiveCodes: ['LO 1.3'],
    bankIds: ['ab-4', 'ab-6', 'ab-5'],
    intro: {
      heading: 'Batteries, corrosion, and electrolysis',
      bodyHtml: html([
        'The same redox ideas that describe a lecture cell also describe devices and damage in the field. <span class="page-keyword">Primary batteries</span> are not meant to be recharged; <span class="page-keyword">secondary batteries</span> are. Fuel cells convert a continuously supplied fuel rather than a stored inventory of reactants.',
        'Corrosion is a galvanic process working against a structure: dissimilar metals plus an electrolyte can make one metal the anode. Electrolysis and electroplating reverse the logic—you apply a potential to force a nonspontaneous change, such as depositing copper on a workpiece.',
        'Use the banks below to connect electrode roles, mitigation choices, and device types to real operating conditions.',
      ]),
      learningObjective: 'LO 1.3 Evaluate electrochemistry applications in real systems.',
    },
    example: {
      id: 'example-applications',
      heading: 'Electrolysis cell diagram',
      bodyHtml:
        '<p>An electrolytic cell uses electrical work to drive a nonspontaneous redox process. In aqueous NaCl, chloride is typically oxidized to Cl<sub>2</sub> at the anode while water is reduced to H<sub>2</sub> at the cathode. The same electrode-role thinking applies to electroplating, where the workpiece is the cathode.</p>',
      image: 'electrolysis',
      imageAlt: 'Electrolysis setup with electrodes and ion movement',
    },
    questions: [
      {
        id: 'applications-q',
        question: mcq({
          title: 'Battery type in context',
          prompt: 'A device must deliver current for as long as fuel is supplied, not from a stored chemical inventory. Which system matches that requirement?',
          points: 3,
          learningObjective: 'LO 1.3 Evaluate electrochemistry applications in real systems.',
          choices: [
            choice('ap-1', 'A primary alkaline cell.', false),
            choice('ap-2', 'A rechargeable lead-acid battery.', false),
            choice('ap-3', 'A fuel cell.', true),
            choice('ap-4', 'A concentration cell with identical electrodes.', false),
          ],
          correctFeedback: 'Correct. Fuel cells convert supplied fuel continuously while reactants are available.',
          incorrectFeedback: 'Incorrect. Batteries store a finite inventory of reactants; a fuel cell is fed continuously.',
        }),
      },
    ],
  };
}

function corrosionProfile(): PageContentProfile {
  return {
    key: 'corrosion',
    matched: true,
    layout: 'lesson',
    objectiveCodes: ['LO 1.3'],
    bankIds: ['ab-4'],
    intro: {
      heading: 'Local water-pipe example',
      bodyHtml: html([
        'The city replaced a section of iron main with copper fittings last year. Where the two metals remain in contact and stay wet, a galvanic cell forms: iron is more readily oxidized, so it becomes the anode and corrodes faster than it would alone.',
        'Dissolved oxygen and chloride in the water complete the circuit. Painting only the copper, or electrically bonding the metals with a thicker jumper, can make the iron even more anodic. A more easily oxidized metal (a sacrificial anode) or interrupting the metal-to-metal contact slows the attack.',
        'This case study asks students to name the anode, choose a control, and inspect the same chemistry they will see in the corrosion bank.',
      ]),
      learningObjective: 'LO 1.3 Evaluate electrochemistry applications in real systems.',
    },
    example: {
      id: 'example-corrosion',
      heading: 'Galvanic couple on a service line',
      bodyHtml:
        '<p>An iron pipe joined to a copper fitting in aerated water behaves like a shorted galvanic cell. Iron oxidizes (Fe → Fe<sup>2+</sup> + 2e<sup>−</sup>) while oxygen is reduced on the copper surface. A zinc anode clamped to the iron can reverse which metal is sacrificed.</p>',
      image: 'welding',
      imageAlt: 'Metal joint illustrating a galvanic couple in a wet environment',
    },
    questions: [
      {
        id: 'corrosion-q',
        question: mcq({
          title: 'Choosing a corrosion-control strategy',
          prompt: 'An iron structure sits in contact with copper fittings in a wet environment. Which action best slows corrosion of the iron?',
          points: 3,
          learningObjective: 'LO 1.3 Evaluate electrochemistry applications in real systems.',
          choices: [
            choice('cr-1', 'Connect a more easily oxidized metal so it corrodes instead of the iron.', true),
            choice('cr-2', 'Paint only the copper so the iron remains the cathode.', false),
            choice('cr-3', 'Add salt to the water to increase conductivity and even out the cell.', false),
            choice('cr-4', 'Electrically connect iron and copper with a thicker wire.', false),
          ],
          correctFeedback: 'Correct. A sacrificial anode (more easily oxidized metal) protects the iron.',
          incorrectFeedback: 'Incorrect. Increasing the cell or leaving iron as the anode speeds corrosion.',
        }),
      },
    ],
  };
}

function batteriesProfile(): PageContentProfile {
  return {
    key: 'batteries',
    matched: true,
    layout: 'lesson',
    objectiveCodes: ['LO 1.3'],
    bankIds: ['ab-6', 'ab-7'],
    intro: {
      heading: 'Household battery types',
      bodyHtml: html([
        'Consumer devices pack galvanic cells into standard cases. Alkaline AA cells are primary batteries: they are discarded after discharge. Lithium-ion packs in phones and laptops are secondary batteries designed for many charge–discharge cycles. Lead-acid batteries in vehicles are also secondary, optimized for high current rather than light weight.',
        'A discharge curve shows how voltage holds up as capacity is used. A steep drop near end-of-life is a design signal, not a failure of the underlying redox chemistry. Fuel cells sit outside this family—they are not a stored inventory of reactants.',
        'Compare device type, rechargeability, and what a voltage–time plot is telling you before you leave this page.',
      ]),
      learningObjective: 'LO 1.3 Evaluate electrochemistry applications in real systems.',
    },
    questions: [
      {
        id: 'batteries-q',
        question: mcq({
          title: 'Primary versus secondary cells',
          prompt: 'Which statement correctly describes a typical alkaline AA cell used in a remote control?',
          points: 3,
          learningObjective: 'LO 1.3 Evaluate electrochemistry applications in real systems.',
          choices: [
            choice('bt-1', 'It is a primary cell, not designed for recharge cycles.', true),
            choice('bt-2', 'It is a fuel cell that runs as long as the case is closed.', false),
            choice('bt-3', 'It is a secondary cell intended for daily grid charging.', false),
            choice('bt-4', 'It stores no chemical reactants; current comes from an external supply.', false),
          ],
          correctFeedback: 'Correct. Alkaline consumer cells are primary batteries.',
          incorrectFeedback: 'Incorrect. Alkaline AA cells are primary: they are not meant to be recharged.',
        }),
      },
    ],
  };
}

function electrochemistryCheckpointProfile(): PageContentProfile {
  return {
    key: 'electrochemistry-checkpoint',
    matched: true,
    layout: 'checkpoint',
    objectiveCodes: ['LO 1.1', 'LO 1.2', 'LO 1.3'],
    bankIds: ELECTROCHEMISTRY_BANK_IDS,
    intro: {
      heading: 'Electrochemistry in this checkpoint',
      bodyHtml: html([
        'Electrochemistry links electron transfer to chemical change: oxidation is loss of electrons, reduction is gain. In a galvanic cell, a spontaneous reaction drives current through an external circuit; in electrolysis, electrical work drives a nonspontaneous process. Standard reduction potentials help you compare tendencies and predict cell direction under standard conditions.',
        'Beyond lecture-scale cells, electrochemistry shapes everyday technology—alkaline and lithium-ion batteries store portable energy, lead-acid systems support vehicles, and fuel cells convert fuel continuously while reactants are supplied. Corrosion is the same chemistry working against structures: dissimilar metals in contact with an electrolyte can accelerate material loss unless design or coatings interrupt the cell.',
        'This checkpoint draws on those ideas so students connect definitions to graphs, half-reactions, and applications. As you review activity banks below, you are choosing which items best reinforce the learning objectives for this unit on electrochemistry and its real-world uses.',
      ]),
      learningObjective: 'LO 1.2 Predict electrochemical behavior and cell trends.',
    },
    example: {
      id: 'example-electrolysis',
      heading: 'Electrolysis cell diagram',
      bodyHtml: '<p>An electrolytic cell uses electrical work to drive a nonspontaneous redox process at the electrodes.</p>',
      image: 'electrolysis',
      imageAlt: 'Electrolysis setup with electrodes and ion movement',
    },
    questions: [
      {
        id: 'exitQuestion',
        question: mcq({
          title: 'Electrochemistry Exit Question',
          prompt: 'Which statement best explains why a galvanic cell potential decreases as reactants are consumed?',
          points: 3,
          learningObjective: 'LO 1.2 Predict electrochemical behavior and cell trends.',
          choices: [
            choice('ex-1', 'The anode starts reducing instead of oxidizing.', false),
            choice('ex-2', 'Reaction quotient shifts and lowers the driving force toward equilibrium.', true),
            choice('ex-3', 'Electrons are no longer transferred through the external circuit.', false),
            choice('ex-4', 'The salt bridge blocks ion movement once products form.', false),
          ],
          correctFeedback: 'Correct. As reactants are consumed, Q increases and the cell potential falls toward equilibrium.',
          incorrectFeedback: 'Incorrect. The cell still transfers electrons; the driving force changes as concentrations change.',
          canonicalKey: 'exitQuestion',
        }),
      },
    ],
  };
}

function radiationProfile(): PageContentProfile {
  return {
    key: 'radiation',
    matched: true,
    layout: 'lesson',
    objectiveCodes: ['LO 1.4'],
    bankIds: ['n-ab-1', 'n-ab-3'],
    intro: {
      heading: 'Alpha, beta, and gamma radiation',
      bodyHtml: html([
        'Radioactive decay emits different particles and photons, and they do not interact with matter in the same way. <span class="page-keyword">Alpha</span> particles are massive and highly ionizing but stop in paper or the outer skin. <span class="page-keyword">Beta</span> particles penetrate farther and are typically shielded with plastic or acrylic. <span class="page-keyword">Gamma</span> rays are photons: they require dense shielding such as lead and are reduced by distance.',
        'In a teaching lab, the practical control is to keep sources sealed, match the barrier to the emission, and spend as little time as possible next to an unshielded gamma source.',
        'This page asks you to rank penetration, choose shielding, and apply those choices to a demonstration setup.',
      ]),
      learningObjective: 'LO 1.4 Distinguish alpha, beta, and gamma radiation by interaction with matter.',
    },
    example: {
      id: 'example-radiation',
      heading: 'Choosing shielding materials',
      bodyHtml:
        '<p>Sealed sources, acrylic for beta, and lead plus distance for gamma are the default controls when students observe mixed emitters. Paper wrapping is enough for external alpha but does nothing useful for gamma.</p>',
      image: 'radiation',
      imageAlt: 'Nuclear chemistry lab and radiation safety materials',
    },
    questions: [
      {
        id: 'radiation-q',
        question: mcq({
          title: 'Match radiation type to shielding',
          prompt: 'Which pairing of radiation type and practical shielding is correct for a teaching-lab demonstration?',
          points: 3,
          learningObjective: 'LO 1.4 Distinguish alpha, beta, and gamma radiation by interaction with matter.',
          choices: [
            choice('rad-1', 'Alpha: lead bricks only; beta: paper; gamma: no shielding if the source is labeled.', false),
            choice('rad-2', 'Alpha: sealed source or gloves; beta: acrylic; gamma: lead and distance.', true),
            choice('rad-3', 'Alpha, beta, and gamma can all be stopped by a single sheet of paper.', false),
            choice('rad-4', 'Gamma is stopped by acrylic; beta requires lead; alpha requires no controls.', false),
          ],
          correctFeedback: 'Correct. Match a light barrier to alpha, plastic to beta, and dense shielding plus distance to gamma.',
          incorrectFeedback: 'Incorrect. Alpha is stopped easily; beta needs plastic; gamma needs dense shielding and distance.',
        }),
      },
    ],
  };
}

function nuclearCheckpointProfile(): PageContentProfile {
  return {
    key: 'nuclear-checkpoint',
    matched: true,
    layout: 'checkpoint',
    objectiveCodes: ['LO 1.4', 'LO 1.5'],
    bankIds: NUCLEAR_BANK_IDS,
    intro: {
      heading: 'Nuclear chemistry in this checkpoint',
      bodyHtml: html([
        'Nuclear chemistry explores unstable nuclei, radioactive decay pathways, and how emitted radiation interacts with matter. Students in this checkpoint should distinguish alpha, beta, and gamma behavior in both shielding and biological contexts.',
        'Biological effects are not determined by radiation label alone: exposure pathway, absorbed dose, dose rate, and tissue radiosensitivity all change risk. These ideas are essential when interpreting why identical source strengths can produce different outcomes in real scenarios.',
        'The activity banks below focus on evidence-based reasoning about safety controls, clinical or industrial uses, and risk-benefit decisions tied to radiation applications.',
      ]),
      learningObjective: 'LO 1.5 Explain how pathway and tissue sensitivity influence biological effects.',
    },
    example: {
      id: 'example-radiation',
      heading: 'Radiation materials in the teaching lab',
      bodyHtml: '<p>Sealed sources, shielding, and handling controls used when students observe alpha, beta, and gamma emitters.</p>',
      image: 'radiation',
      imageAlt: 'Nuclear chemistry lab and radiation safety materials',
    },
    questions: [
      {
        id: 'nuclearSafety',
        question: mcq({
          title: 'Radiation Materials Safety Check',
          prompt:
            'A lab stores alpha, beta, and gamma emitters for demonstrations. Which setup best reduces exposure risk while preserving visibility for students?',
          points: 3,
          learningObjective: 'LO 1.4 Distinguish alpha, beta, and gamma radiation by interaction with matter.',
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
          correctFeedback: 'Correct. Match shielding to radiation type and keep sources sealed.',
          incorrectFeedback: 'Incorrect. Alpha, beta, and gamma require different shielding and handling controls.',
          canonicalKey: 'nuclearSafety',
        }),
      },
      {
        id: 'exitQuestion',
        question: mcq({
          title: 'Biological Effects Exit Question',
          prompt: 'Which factor most directly explains why equal absorbed doses can lead to different biological outcomes?',
          points: 3,
          learningObjective: 'LO 1.5 Explain how pathway and tissue sensitivity influence biological effects.',
          choices: [
            choice('ex-1', 'All tissues respond identically to ionizing radiation.', false),
            choice('ex-2', 'Biological effect varies with tissue radiosensitivity, dose rate, and exposure pathway.', true),
            choice('ex-3', 'Only external exposure affects biological outcome.', false),
            choice('ex-4', 'Shielding type has no impact once exposure begins.', false),
          ],
          correctFeedback: 'Correct. Biological outcome depends on pathway, dose rate, and tissue sensitivity, not label alone.',
          incorrectFeedback: 'Incorrect. Equal absorbed dose can still produce different effects across tissues and pathways.',
          canonicalKey: 'exitQuestion',
        }),
      },
    ],
  };
}

function recitationProfile(): PageContentProfile {
  return {
    key: 'recitation',
    matched: true,
    layout: 'lesson',
    objectiveCodes: ['LO 1.2', 'LO 1.3'],
    bankIds: [],
    intro: {
      heading: 'Problems drawn from this term’s lab',
      bodyHtml: html([
        'This practice set uses measurements from recitation this week: a zinc–copper cell you assembled, and a corroded iron coupon that sat in aerated salt water with a copper clip.',
        'You are not being scored for proficiency here. Use the items to check that you can still name the anode, predict the direction of electron flow, and recommend a control that would have slowed the coupon’s mass loss.',
        'Bring questions on notation or Nernst estimates to the next recitation; the unit checkpoint will sample the same ideas under scored conditions.',
      ]),
      learningObjective: 'LO 1.2 Predict electrochemical behavior and cell trends.',
    },
    questions: [
      {
        id: 'recitation-q',
        question: mcq({
          title: 'Lab cell polarity',
          prompt: 'In this week’s Zn–Cu lab cell, which statement matches the observations (copper mass increased; zinc mass decreased)?',
          points: 2,
          learningObjective: 'LO 1.2 Predict electrochemical behavior and cell trends.',
          choices: [
            choice('rc-1', 'Zinc is the cathode and copper ions are oxidized.', false),
            choice('rc-2', 'Zinc is the anode; electrons travel through the wire toward the copper electrode.', true),
            choice('rc-3', 'Both metals are reduced because the salt bridge supplies electrons.', false),
            choice('rc-4', 'The cell is electrolytic because a battery was not attached.', false),
          ],
          correctFeedback: 'Correct. Zinc is oxidized (anode) and electrons flow to the copper cathode, where Cu²⁺ is reduced.',
          incorrectFeedback: 'Incorrect. Mass loss at zinc and mass gain at copper mean zinc is oxidized and copper ions are reduced.',
        }),
      },
    ],
  };
}

function calorimetryProfile(): PageContentProfile {
  return {
    key: 'calorimetry',
    matched: true,
    layout: 'lesson',
    objectiveCodes: [],
    bankIds: [],
    intro: {
      heading: 'Calorimetry worked examples',
      bodyHtml: html([
        'A coffee-cup calorimeter treats the solution as the surroundings for a constant-pressure process. Heat exchanged with the solution is q = m c ΔT, and for an exothermic reaction the solution temperature rises.',
        'These worked examples walk through sign conventions, limiting reagent effects on q, and how to report ΔH per mole of reaction from a single run.',
      ]),
      learningObjective: '',
    },
    example: {
      id: 'example-calorimetry',
      heading: 'q = m c ΔT for a neutralization',
      bodyHtml:
        '<p>50.0 g of solution warms from 22.1 °C to 28.4 °C. With c = 4.18 J g<sup>−1</sup> °C<sup>−1</sup>, q<sub>soln</sub> = 50.0 × 4.18 × 6.3 ≈ 1.32 × 10<sup>3</sup> J. The reaction is exothermic, so q<sub>rxn</sub> ≈ −1.32 kJ for the mixture in the cup.</p>',
      image: 'formula',
      imageAlt: 'Worked calorimetry calculation',
    },
    questions: [
      {
        id: 'calorimetry-q',
        question: mcq({
          title: 'Sign of q for the reaction',
          prompt: 'If the solution in a coffee-cup calorimeter gets warmer, which statement is true of the chemical reaction?',
          points: 2,
          learningObjective: '',
          choices: [
            choice('cal-1', 'The reaction is endothermic and q_rxn is positive.', false),
            choice('cal-2', 'The reaction is exothermic and q_rxn is negative.', true),
            choice('cal-3', 'No heat was transferred; the thermometer drifted.', false),
            choice('cal-4', 'q_rxn equals q_soln, including the sign.', false),
          ],
          correctFeedback: 'Correct. Heat released by the reaction warms the solution, so q_rxn is negative.',
          incorrectFeedback: 'Incorrect. A temperature rise means the reaction released heat into the solution.',
        }),
      },
    ],
  };
}

function equilibriumProfile(): PageContentProfile {
  return {
    key: 'equilibrium',
    matched: true,
    layout: 'checkpoint',
    objectiveCodes: [],
    bankIds: [],
    intro: {
      heading: 'Le Châtelier checkpoint',
      bodyHtml: html([
        'Le Châtelier’s principle predicts how an equilibrium mixture responds to a change in concentration, pressure, or temperature. The system shifts to partially counteract the disturbance.',
        'This scored checkpoint asks you to name the shift and the observable that would change, not to compute a new K unless the temperature changes.',
      ]),
      learningObjective: '',
    },
    questions: [
      {
        id: 'equilibrium-q',
        question: mcq({
          title: 'Adding product to a gaseous equilibrium',
          prompt: 'For N₂(g) + 3 H₂(g) ⇌ 2 NH₃(g) at constant T, extra NH₃ is injected. Which immediate shift occurs?',
          points: 3,
          learningObjective: '',
          choices: [
            choice('eq-1', 'The system shifts right to make more NH₃.', false),
            choice('eq-2', 'The system shifts left to consume some NH₃.', true),
            choice('eq-3', 'K increases because Q increased.', false),
            choice('eq-4', 'No shift occurs because catalysts are absent.', false),
          ],
          correctFeedback: 'Correct. Adding product makes Q > K, so the reverse reaction is favored until Q returns to K.',
          incorrectFeedback: 'Incorrect. Adding product drives the reverse reaction; K is unchanged at constant temperature.',
        }),
      },
    ],
  };
}

function energyLabProfile(): PageContentProfile {
  return {
    key: 'energy-lab',
    matched: true,
    layout: 'lesson',
    objectiveCodes: [],
    bankIds: [],
    intro: {
      heading: 'Conservation of energy lab',
      bodyHtml: html([
        'Mechanical energy is conserved when nonconservative work is negligible. In this lab you compare gravitational potential energy lost to kinetic energy gained, then account for the difference with thermal energy from friction.',
        'Record height, speed at the bottom, and a qualitative friction note. The practice items check that you can assign which term grew and which shrank.',
      ]),
      learningObjective: '',
    },
    questions: [
      {
        id: 'energy-q',
        question: mcq({
          title: 'Where the missing energy went',
          prompt: 'A cart loses more gravitational potential energy than it gains in kinetic energy. Which explanation is consistent with conservation of energy?',
          points: 2,
          learningObjective: '',
          choices: [
            choice('en-1', 'Energy was destroyed at the bottom of the track.', false),
            choice('en-2', 'Some mechanical energy was transferred to thermal energy by friction.', true),
            choice('en-3', 'Kinetic energy is not a form of energy in this experiment.', false),
            choice('en-4', 'Mass cancelled, so energy accounting is optional.', false),
          ],
          correctFeedback: 'Correct. Total energy is conserved; friction converts mechanical energy to thermal energy.',
          incorrectFeedback: 'Incorrect. The “missing” mechanical energy shows up as thermal energy from friction.',
        }),
      },
    ],
  };
}

function importedPageProfile(page: ImportedPage): PageContentProfile {
  const introBlock = page.blocks.find((block) => (block as PageBlock).kind === 'text') as Extract<PageBlock, { kind: 'text' }> | undefined;
  return {
    key: `imported-${page.id}`,
    matched: true,
    layout: page.layout,
    objectiveCodes: [...page.objectiveCodes],
    bankIds: [...page.bankIds],
    intro: introBlock?.text ?? {
      heading: page.title,
      bodyHtml: '',
      learningObjective: page.objectiveLabels[0] ?? '',
    },
    questions: [],
    blocks: page.blocks as PageBlock[],
  };
}

export function resourceIdFromPageId(pageId?: string): string {
  return (pageId ?? '').replace(/^page-/, '');
}

export function resolvePageProfile(title?: string, pageId?: string): PageContentProfile {
  const resourceId = resourceIdFromPageId(pageId);
  if (resourceId && ELECTROCHEMISTRY_PAGES[resourceId]) {
    return importedPageProfile(ELECTROCHEMISTRY_PAGES[resourceId]);
  }
  const normalized = normalizePageTitle(title ?? '');
  if (normalized) {
    const imported = Object.values(ELECTROCHEMISTRY_PAGES).find(
      (page) => normalizePageTitle(page.title) === normalized,
    );
    if (imported) return importedPageProfile(imported);
  }
  if (!normalized) return EMPTY_PROFILE;
  if (normalized.includes('cell notation') || normalized.includes('cell diagram')) return cellNotationProfile();
  if (normalized.includes('galvanic')) return galvanicProfile();
  if (normalized.includes('oxidation') || normalized.includes('redox')) return redoxReviewProfile();
  if (normalized.includes('corrosion')) return corrosionProfile();
  if (normalized.includes('batter')) return batteriesProfile();
  if (normalized.includes('application')) return applicationsProfile();
  if (normalized.includes('foundational') || normalized.includes('what is electrochemistry')) return foundationalProfile();
  if (normalized.includes('radiation') || normalized.includes('shielding')) return radiationProfile();
  if (normalized.includes('calorimetr')) return calorimetryProfile();
  if (normalized.includes('chatelier') || normalized.includes('châtelier') || normalized.includes('equilibrium')) {
    return equilibriumProfile();
  }
  if (normalized.includes('conservation of energy') || normalized.includes('energy lab')) return energyLabProfile();
  if (normalized.includes('practice') || normalized.includes('recitation') || normalized.includes('local example')) {
    return recitationProfile();
  }
  if (normalized.includes('nuclear')) return nuclearCheckpointProfile();
  if (normalized.includes('checkpoint') && normalized.includes('electrochem')) return electrochemistryCheckpointProfile();
  if (normalized.includes('electrochem')) return electrochemistryCheckpointProfile();
  return EMPTY_PROFILE;
}

export function isUnitCheckpointPage(title?: string, pageId?: string): boolean {
  const profile = resolvePageProfile(title, pageId);
  return profile.layout === 'checkpoint' || profile.key === 'nuclear-checkpoint' || profile.key === 'equilibrium';
}

export function importedBankSelection(selectionId: string) {
  return ELECTROCHEMISTRY_BANKS[selectionId] ?? null;
}

export function createDefaultPageBlocks({
  pageTitle,
  pageId,
  selectionIds,
  removedBanks,
  removedEmbedded,
  images,
  origin = 'canonical',
}: {
  pageTitle: string;
  pageId?: string;
  selectionIds: string[];
  removedBanks: string[];
  removedEmbedded: Record<string, boolean>;
  images: Partial<Record<PageExampleImageKey, string>>;
  origin?: PageBlockOrigin;
  objectives?: PageObjectiveOption[];
}): PageBlock[] {
  const profile = resolvePageProfile(pageTitle, pageId);
  const status: PageBlockStatus = origin === 'instructor' ? 'added' : 'original';
  if (profile.blocks) {
    return cloneBlocks(profile.blocks).map((block) => {
      if (block.kind === 'bank') {
        return {
          ...block,
          origin,
          status: removedBanks.includes(block.bank.selectionId) ? 'removed' : status,
        };
      }
      if (block.kind === 'question') {
        const canonicalKey = block.question.canonicalKey;
        const removed = Boolean(canonicalKey && removedEmbedded[canonicalKey]);
        return { ...block, origin, status: removed ? 'removed' : status };
      }
      return { ...block, origin, status };
    });
  }
  const intro: PageBlock = {
    id: 'intro-text',
    kind: 'text',
    origin,
    status,
    title: profile.intro.heading,
    text: profile.intro,
  };
  const banks: PageBlock[] = selectionIds.map((selectionId) => ({
    id: `bank-${selectionId}`,
    kind: 'bank',
    origin,
    status: removedBanks.includes(selectionId) ? 'removed' : status,
    title: ACTIVITY_BANK_TITLES[selectionId] ?? 'Activity bank selection',
    bank: { selectionId },
  }));
  const example: PageBlock | null = profile.example
    ? {
        id: profile.example.id,
        kind: 'example',
        origin,
        status,
        title: profile.example.heading,
        example: {
          heading: profile.example.heading,
          bodyHtml: profile.example.bodyHtml,
          imageSrc: profile.example.image ? images[profile.example.image] : undefined,
          imageAlt: profile.example.imageAlt,
        },
      }
    : null;
  const questions: PageBlock[] = profile.questions.map((item) => {
    const canonicalKey = item.question.canonicalKey;
    const removed = Boolean(canonicalKey && removedEmbedded[canonicalKey]);
    return {
      id: item.id,
      kind: 'question',
      origin,
      status: removed ? 'removed' : status,
      title: item.question.title,
      question: item.question,
    };
  });

  const extraToBlock = (extra: NonNullable<PageContentProfile['extraTextBlocks']>[number]): PageBlock => ({
    id: extra.id,
    kind: 'text',
    origin,
    status,
    title: extra.heading,
    text: {
      heading: extra.heading,
      bodyHtml: extra.bodyHtml,
      learningObjective: extra.learningObjective,
    },
  });

  const extras = profile.extraTextBlocks ?? [];
  const extrasByIndex = new Map<number, PageBlock[]>();
  const trailingExtras: PageBlock[] = [];
  extras.forEach((extra) => {
    if (typeof extra.beforeQuestionIndex === 'number') {
      const list = extrasByIndex.get(extra.beforeQuestionIndex) ?? [];
      list.push(extraToBlock(extra));
      extrasByIndex.set(extra.beforeQuestionIndex, list);
    } else {
      trailingExtras.push(extraToBlock(extra));
    }
  });

  const sequencedQuestions: PageBlock[] = [];
  questions.forEach((question, index) => {
    sequencedQuestions.push(...(extrasByIndex.get(index) ?? []));
    sequencedQuestions.push(question);
  });
  sequencedQuestions.push(...trailingExtras);

  if (profile.layout === 'checkpoint') {
    return example ? [intro, ...banks, example, ...sequencedQuestions] : [intro, ...banks, ...sequencedQuestions];
  }
  return example ? [intro, example, ...sequencedQuestions, ...banks] : [intro, ...sequencedQuestions, ...banks];
}
