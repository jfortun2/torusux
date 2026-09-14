import {
  formatObjectiveTag,
  resolveEditorObjectiveValue,
  type PageObjectiveOption,
  type QuestionChoice,
  type QuestionContent,
} from './pageCustomization';

export const QUESTION_CSV_HEADERS = [
  'type',
  'title',
  'objectives',
  'tags',
  'stem',
  'choiceA',
  'choiceB',
  'choiceC',
  'choiceD',
  'choiceE',
  'choiceF',
  'answer',
  'correct_feedback',
  'incorrect_feedback',
  'hint1',
  'hint2',
  'hint3',
  'explanation',
] as const;

export type QuestionCsvIssue = {
  row: number;
  message: string;
};

export type QuestionCsvParseResult = {
  questions: QuestionContent[];
  issues: QuestionCsvIssue[];
};

const CHOICE_KEYS = ['choicea', 'choiceb', 'choicec', 'choiced', 'choicee', 'choicef'] as const;

export function buildSampleQuestionCsv(objectives: PageObjectiveOption[] = []): string {
  const objective = objectives[0] ? `[${formatObjectiveTag(objectives[0])}]` : '';
  const rows = [
    [
      'MCQ',
      'Identify the oxidized species',
      objective,
      '',
      'In Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s), which species is oxidized?',
      'Zn(s)',
      'Cu²⁺(aq)',
      'Zn²⁺(aq)',
      'Cu(s)',
      '',
      '',
      'A',
      'Correct. Zinc loses electrons and is oxidized.',
      'Incorrect. Oxidation is the loss of electrons.',
      '',
      '',
      '',
      'Zinc metal is oxidized to Zn²⁺.',
    ],
    [
      'MCQ',
      'Positive cell potential',
      objective,
      '',
      'Under standard conditions, what does a positive E°cell indicate?',
      'The reaction is nonspontaneous.',
      'Electrons flow from cathode to anode.',
      'The reaction is spontaneous as written.',
      'A salt bridge is unnecessary.',
      '',
      '',
      'C',
      'Correct. E°cell > 0 means the written reaction is spontaneous.',
      'Incorrect. A positive standard cell potential means the reaction as written is spontaneous.',
      '',
      '',
      '',
      '',
    ],
    [
      'TEXT',
      'Oxidation number of manganese',
      objective,
      '',
      'Enter the oxidation number of Mn in MnO₄⁻.',
      '',
      '',
      '',
      '',
      '',
      '',
      '+7',
      'Correct. Oxygen is −2, so Mn is +7.',
      'Incorrect. Assign oxygen as −2 and solve for manganese.',
      '',
      '',
      '',
      '',
    ],
  ];
  return [QUESTION_CSV_HEADERS.join(','), ...rows.map(csvLine)].join('\r\n');
}

export function parseQuestionCsv(text: string, objectives: PageObjectiveOption[] = []): QuestionCsvParseResult {
  const issues: QuestionCsvIssue[] = [];
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { questions: [], issues: [{ row: 1, message: 'The file is empty.' }] };
  }

  const header = rows[0].map(normalizeHeader);
  const columnIndex = new Map(header.map((name, index) => [name, index]));
  const missing = ['type', 'title', 'stem'].filter((name) => !columnIndex.has(name) && !(name === 'stem' && columnIndex.has('prompt')));
  if (missing.length > 0) {
    return {
      questions: [],
      issues: [
        {
          row: 1,
          message: `Missing required column${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}. Download the sample CSV for the expected format.`,
        },
      ],
    };
  }

  const questions: QuestionContent[] = [];
  rows.slice(1).forEach((cells, offset) => {
    const row = offset + 2;
    if (cells.every((cell) => !cell.trim())) return;
    const value = (name: string, fallback = '') => {
      const index = columnIndex.get(name);
      return index === undefined ? fallback : (cells[index] ?? '').trim();
    };
    const parsed = questionFromCsvRow(
      {
        type: value('type'),
        title: value('title'),
        objectives: value('objectives'),
        stem: value('stem') || value('prompt'),
        choices: CHOICE_KEYS.map((key) => value(key)),
        answer: value('answer'),
        correctFeedback: value('correct_feedback'),
        incorrectFeedback: value('incorrect_feedback'),
      },
      objectives,
      row,
    );
    if ('issue' in parsed) {
      issues.push(parsed.issue);
      return;
    }
    questions.push(parsed.question);
  });

  if (questions.length === 0 && issues.length === 0) {
    issues.push({ row: 1, message: 'No question rows were found after the header.' });
  }
  return { questions, issues };
}

function questionFromCsvRow(
  row: {
    type: string;
    title: string;
    objectives: string;
    stem: string;
    choices: string[];
    answer: string;
    correctFeedback: string;
    incorrectFeedback: string;
  },
  objectives: PageObjectiveOption[],
  rowNumber: number,
): { question: QuestionContent } | { issue: QuestionCsvIssue } {
  if (!row.title) return { issue: { row: rowNumber, message: 'Title is required.' } };
  if (!row.stem) return { issue: { row: rowNumber, message: 'Question stem is required.' } };

  const type = row.type.trim().toUpperCase();
  const stamp = `csv-${rowNumber}-${Math.random().toString(36).slice(2, 6)}`;
  const learningObjective = resolveCsvObjective(row.objectives, objectives);
  const base = {
    title: row.title,
    prompt: row.stem,
    points: 3,
    learningObjective,
    correctFeedback: row.correctFeedback,
    incorrectFeedback: row.incorrectFeedback,
  };

  if (!type) return { issue: { row: rowNumber, message: 'Question type is required.' } };

  if (type === 'MCQ') {
    const filled = row.choices
      .map((text, index) => ({ letter: String.fromCharCode(65 + index), text: text.trim() }))
      .filter((choice) => choice.text.length > 0);
    if (filled.length < 2) {
      return { issue: { row: rowNumber, message: 'Multiple-choice questions need at least two choices.' } };
    }
    const correctIndex = findCorrectChoiceIndex(filled, row.answer);
    if (correctIndex < 0) {
      return { issue: { row: rowNumber, message: 'Could not match the answer to a choice. Use A–F or the choice text.' } };
    }
    const choices: QuestionChoice[] = filled.map((choice, index) => ({
      id: `c-${stamp}-${index}`,
      text: choice.text,
      correct: index === correctIndex,
    }));
    return {
      question: {
        ...base,
        kind: 'mcq',
        choices,
        inputs: [],
      },
    };
  }

  if (type === 'TEXT' || type === 'NUMBER' || type === 'PARAGRAPH') {
    if (!row.answer) {
      return { issue: { row: rowNumber, message: `${type} questions need an answer.` } };
    }
    return {
      question: {
        ...base,
        kind: 'multi-input',
        choices: [],
        inputs: [{ id: `i-${stamp}-0`, label: 'Answer', answer: row.answer }],
      },
    };
  }

  return {
    issue: {
      row: rowNumber,
      message: `${type} is not supported on this page. Use MCQ, TEXT, NUMBER, or PARAGRAPH.`,
    },
  };
}

function findCorrectChoiceIndex(choices: { letter: string; text: string }[], answer: string): number {
  const normalized = answer.trim();
  if (!normalized) return -1;
  const letterMatch = normalized.match(/^choice\s*([A-F])$/i) ?? normalized.match(/^([A-F])$/i);
  if (letterMatch) {
    const letter = letterMatch[1].toUpperCase();
    return choices.findIndex((choice) => choice.letter === letter);
  }
  const lower = normalized.toLowerCase();
  return choices.findIndex((choice) => choice.text.toLowerCase() === lower);
}

function resolveCsvObjective(raw: string, objectives: PageObjectiveOption[]): string {
  const tags = parseTaggedList(raw);
  for (const tag of tags) {
    const resolved = resolveEditorObjectiveValue(tag, objectives);
    if (resolved) return resolved;
  }
  return tags[0] ?? '';
}

function parseTaggedList(value: string): string[] {
  const tagged = [...value.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1].trim()).filter(Boolean);
  if (tagged.length) return tagged;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeHeader(value: string): string {
  return value.trim().replace(/^\uFEFF/, '').replace(/\s+/g, '_').toLowerCase();
}

function csvLine(fields: string[]): string {
  return fields.map(escapeCsvField).join(',');
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }
  return rows;
}
