import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  BLOCK_KIND_LABEL,
  COURSE_RESOURCE_OPTIONS,
  cannedExampleBlock,
  courseResourceBlock,
  exampleMcqDraft,
  exampleMultiInputDraft,
  exampleTextDraft,
  questionBlockFromDraft,
  sanitizeInstructorHtml,
  textBlockFromDraft,
  type ChangeSummary,
  type CourseResourceContent,
  type PageBlock,
  type PageObjectiveOption,
  type QuestionChoice,
  type QuestionContent,
  type QuestionInput,
  type TextContent,
} from './pageCustomization';

export type CustomizeDialog =
  | { type: 'chooser'; insertAt: number }
  | { type: 'text'; insertAt: number }
  | { type: 'question'; insertAt: number }
  | { type: 'course-resource'; insertAt: number }
  | { type: 'coming-later'; label: string };

export function PageCustomizeBar({
  summary,
  dirty,
  onCancel,
  onSave,
}: {
  summary: ChangeSummary;
  dirty: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="page-customize-bar" role="region" aria-label="Page customization">
      <div className="page-customize-bar__copy">
        <p className="page-customize-bar__title">Customize this page</p>
        <p className="page-customize-bar__summary" aria-live="polite">
          {dirty ? (
            <>
              <strong>
                {summary.count} unsaved change{summary.count === 1 ? '' : 's'}
              </strong>
              {summary.items.length > 0 ? ` — ${summary.items.slice(0, 3).join('. ')}.` : ''}
              {summary.items.length > 3 ? ` And ${summary.items.length - 3} more.` : ''}
            </>
          ) : (
            'No unsaved changes. Select a block to move or remove it, or add content between blocks.'
          )}
        </p>
      </div>
      <div className="page-customize-bar__actions">
        <button type="button" className="button button--subtle" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={dirty ? 'button button--primary' : 'button button--disabled'}
          onClick={onSave}
          disabled={!dirty}
        >
          Save changes
        </button>
      </div>
    </div>
  );
}

export function AddContentGap({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="add-content-gap">
      <button type="button" className="add-content-gap__button" onClick={onAdd}>
        Add content
      </button>
    </div>
  );
}

export function PageBlockFrame({
  block,
  htmlId,
  selected,
  canMoveUp,
  canMoveDown,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  onRestore,
  children,
}: {
  block: PageBlock;
  htmlId?: string;
  selected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onRestore: () => void;
  children: ReactNode;
}) {
  const removed = block.status === 'removed';
  const className = [
    'page-block',
    selected ? 'is-selected' : '',
    removed ? 'is-removed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      id={htmlId}
      className={className}
      aria-selected={selected}
      aria-label={`${BLOCK_KIND_LABEL[block.kind]}: ${block.title}${removed ? ', removed' : ''}`}
      onClick={onSelect}
    >
      <div className="page-block__body">{children}</div>
      {selected ? (
        <div className="page-block__actions" onClick={(event) => event.stopPropagation()}>
          <span className="page-block__kind">{BLOCK_KIND_LABEL[block.kind]}</span>
          {removed ? <span className="status-pill">Removed</span> : null}
          <button type="button" className="button button--secondary button--small" onClick={onMoveUp} disabled={!canMoveUp}>
            Move up
          </button>
          <button type="button" className="button button--secondary button--small" onClick={onMoveDown} disabled={!canMoveDown}>
            Move down
          </button>
          {removed ? (
            <button type="button" className="button button--secondary button--small" onClick={onRestore}>
              Restore
            </button>
          ) : (
            <button type="button" className="button button--danger button--small" onClick={onRemove}>
              Remove
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function TextBlockView({
  block,
  showObjective = false,
}: {
  block: Extract<PageBlock, { kind: 'text' }>;
  showObjective?: boolean;
}) {
  return (
    <section className="assessment-intro page-text-block">
      {block.text.heading ? <h2 className="page-text-block__heading">{block.text.heading}</h2> : null}
      <div dangerouslySetInnerHTML={{ __html: sanitizeInstructorHtml(block.text.bodyHtml) }} />
      {showObjective && block.text.learningObjective ? (
        <p className="learning-objective-footnote">
          <strong>LO</strong> {block.text.learningObjective}
        </p>
      ) : null}
    </section>
  );
}

export function ExampleBlockView({ block }: { block: Extract<PageBlock, { kind: 'example' }> }) {
  return (
    <section className="page-example-block" aria-label={block.example.heading}>
      <h2 className="page-example-block__heading">{block.example.heading}</h2>
      <div dangerouslySetInnerHTML={{ __html: sanitizeInstructorHtml(block.example.bodyHtml) }} />
      {block.example.imageSrc ? (
        <img className="page-example-block__image" src={block.example.imageSrc} alt={block.example.imageAlt ?? ''} />
      ) : null}
    </section>
  );
}

export function CourseResourceView({ block }: { block: Extract<PageBlock, { kind: 'course-resource' }> }) {
  return (
    <section className="page-resource-card">
      <p className="page-resource-card__eyebrow">{block.courseResource.sourceLabel}</p>
      <h2>{block.courseResource.title}</h2>
      <p>Students can open this existing course resource from the page.</p>
    </section>
  );
}

export function PageCustomizeDialogs({
  dialog,
  objectives,
  onClose,
  onChoose,
  onAddBlocks,
}: {
  dialog: CustomizeDialog | null;
  objectives: PageObjectiveOption[];
  onClose: () => void;
  onChoose: (next: CustomizeDialog) => void;
  onAddBlocks: (insertAt: number, blocks: PageBlock[]) => void;
}) {
  if (!dialog) return null;

  if (dialog.type === 'chooser') {
    return (
      <ChooserDialog
        onClose={onClose}
        onSelect={(kind) => {
          if (kind === 'text') onChoose({ type: 'text', insertAt: dialog.insertAt });
          if (kind === 'question') onChoose({ type: 'question', insertAt: dialog.insertAt });
          if (kind === 'course-resource') onChoose({ type: 'course-resource', insertAt: dialog.insertAt });
          if (kind === 'example') {
            onAddBlocks(dialog.insertAt, [cannedExampleBlock()]);
            onClose();
          }
          if (kind === 'external') onChoose({ type: 'coming-later', label: 'External resource' });
        }}
      />
    );
  }

  if (dialog.type === 'text') {
    return (
      <TextBlockForm
        objectives={objectives}
        onCancel={onClose}
        onAdd={(draft) => {
          onAddBlocks(dialog.insertAt, [textBlockFromDraft(draft)]);
          onClose();
        }}
      />
    );
  }

  if (dialog.type === 'question') {
    return (
      <QuestionBlockForm
        objectives={objectives}
        onCancel={onClose}
        onAdd={(draft) => {
          onAddBlocks(dialog.insertAt, [questionBlockFromDraft(draft)]);
          onClose();
        }}
      />
    );
  }

  if (dialog.type === 'course-resource') {
    return (
      <CourseResourceForm
        onCancel={onClose}
        onAdd={(resource) => {
          onAddBlocks(dialog.insertAt, [courseResourceBlock(resource)]);
          onClose();
        }}
      />
    );
  }

  return (
    <ModalShell title="Coming later" onClose={onClose} wide={false}>
      <p>{dialog.label} will be available in a later prototype. The other add-content options can be used now.</p>
      <div className="modal-actions">
        <button type="button" className="button button--primary" onClick={onClose}>
          Close
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  wide: boolean;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = dialogRef.current;
    const focusable = root?.querySelector<HTMLElement>('input, textarea, select, button, [contenteditable="true"]');
    focusable?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={wide ? 'modal-card modal-card--wide' : 'modal-card'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-customize-dialog-title"
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="page-customize-dialog-title">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ChooserDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (kind: 'text' | 'example' | 'question' | 'course-resource' | 'external') => void;
}) {
  return (
    <ModalShell title="Add content" onClose={onClose} wide={false}>
      <p>Choose what to add to this page.</p>
      <div className="content-chooser" role="list">
        <ChooserOption
          title="Text or explanation"
          description="A heading and short explanation for students."
          onClick={() => onSelect('text')}
        />
        <ChooserOption
          title="Example"
          description="Adds a short worked example with sample content."
          onClick={() => onSelect('example')}
        />
        <ChooserOption
          title="Question"
          description="A multiple-choice or multi-input question."
          onClick={() => onSelect('question')}
        />
        <ChooserOption
          title="Existing course resource"
          description="Insert a page or bank already in this course."
          onClick={() => onSelect('course-resource')}
        />
        <ChooserOption
          title="External resource"
          description="Link to a source outside this course."
          comingLater
          onClick={() => onSelect('external')}
        />
      </div>
      <div className="modal-actions">
        <button type="button" className="button button--subtle" onClick={onClose}>
          Cancel
        </button>
      </div>
    </ModalShell>
  );
}

function ChooserOption({
  title,
  description,
  comingLater = false,
  onClick,
}: {
  title: string;
  description: string;
  comingLater?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="content-chooser__option" role="listitem" onClick={onClick}>
      <span className="content-chooser__option-title">
        {title}
        {comingLater ? <span className="content-chooser__later">Coming later</span> : null}
      </span>
      <span className="content-chooser__option-desc">{description}</span>
    </button>
  );
}

function TextBlockForm({
  objectives,
  onCancel,
  onAdd,
}: {
  objectives: PageObjectiveOption[];
  onCancel: () => void;
  onAdd: (draft: TextContent) => void;
}) {
  const headingId = useId();
  const objectiveId = useId();
  const [draft, setDraft] = useState<TextContent>(() => exampleTextDraft(objectives));
  const [preview, setPreview] = useState(false);
  const canAdd = draft.heading.trim().length > 0 && draft.bodyHtml.replace(/<[^>]*>/g, '').trim().length > 0;

  return (
    <ModalShell title="Add text or explanation" onClose={onCancel} wide>
      <form
        className="page-customize-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canAdd) return;
          onAdd(draft);
        }}
      >
        <div className="page-customize-form__tabs" role="tablist" aria-label="Text editor">
          <button
            type="button"
            role="tab"
            aria-selected={!preview}
            className={!preview ? 'tab-strip__tab is-active' : 'tab-strip__tab'}
            onClick={() => setPreview(false)}
          >
            Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={preview}
            className={preview ? 'tab-strip__tab is-active' : 'tab-strip__tab'}
            onClick={() => setPreview(true)}
          >
            Preview
          </button>
        </div>

        {preview ? (
          <div className="page-customize-preview" role="tabpanel">
            <TextBlockView
              showObjective
              block={{
                id: 'preview',
                kind: 'text',
                origin: 'instructor',
                status: 'added',
                title: draft.heading,
                text: draft,
              }}
            />
          </div>
        ) : (
          <div className="page-customize-form__fields" role="tabpanel">
            <label className="field" htmlFor={headingId}>
              <span>Heading</span>
              <input
                id={headingId}
                value={draft.heading}
                onChange={(event) => setDraft((current) => ({ ...current, heading: event.target.value }))}
              />
            </label>
            <div className="field">
              <span>Body</span>
              <RichTextEditor
                value={draft.bodyHtml}
                onChange={(bodyHtml) => setDraft((current) => ({ ...current, bodyHtml }))}
              />
            </div>
            <label className="field" htmlFor={objectiveId}>
              <span>Learning objective</span>
              <select
                id={objectiveId}
                className="select"
                value={draft.learningObjective}
                onChange={(event) => setDraft((current) => ({ ...current, learningObjective: event.target.value }))}
              >
                {objectives.map((objective) => (
                  <option key={objective.code} value={objective.label}>
                    {objective.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="button button--subtle" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={!canAdd}>
            Add to page
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function QuestionBlockForm({
  objectives,
  onCancel,
  onAdd,
}: {
  objectives: PageObjectiveOption[];
  onCancel: () => void;
  onAdd: (draft: QuestionContent) => void;
}) {
  const [draft, setDraft] = useState<QuestionContent>(() => exampleMcqDraft(objectives));
  const titleId = useId();
  const promptId = useId();
  const objectiveId = useId();
  const pointsId = useId();
  const canSave =
    draft.title.trim().length > 0 &&
    draft.prompt.trim().length > 0 &&
    (draft.kind === 'mcq'
      ? draft.choices.filter((choice) => choice.text.trim()).length >= 2 && draft.choices.some((choice) => choice.correct)
      : draft.inputs.some((input) => input.label.trim() && input.answer.trim()));

  const setKind = (kind: 'mcq' | 'multi-input') => {
    setDraft((current) => {
      if (kind === current.kind) return current;
      if (kind === 'mcq') {
        const next = exampleMcqDraft(objectives);
        return {
          ...next,
          title: current.title,
          prompt: current.prompt,
          points: current.points,
          learningObjective: current.learningObjective,
          correctFeedback: current.correctFeedback,
          incorrectFeedback: current.incorrectFeedback,
        };
      }
      const next = exampleMultiInputDraft(objectives);
      return {
        ...next,
        title: current.title,
        prompt: current.prompt,
        points: current.points,
        learningObjective: current.learningObjective,
        correctFeedback: current.correctFeedback,
        incorrectFeedback: current.incorrectFeedback,
      };
    });
  };

  const updateChoice = (id: string, patch: Partial<QuestionChoice>) => {
    setDraft((current) => ({
      ...current,
      choices: current.choices.map((choice) => {
        if (choice.id !== id) {
          return patch.correct ? { ...choice, correct: false } : choice;
        }
        return { ...choice, ...patch };
      }),
    }));
  };

  return (
    <ModalShell title="Add a question" onClose={onCancel} wide>
      <form
        className="page-customize-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          onAdd(draft);
        }}
      >
        <fieldset className="page-customize-kind">
          <legend>Question type</legend>
          <label>
            <input type="radio" name="question-kind" checked={draft.kind === 'mcq'} onChange={() => setKind('mcq')} />
            Multiple choice
          </label>
          <label>
            <input
              type="radio"
              name="question-kind"
              checked={draft.kind === 'multi-input'}
              onChange={() => setKind('multi-input')}
            />
            Multi-input
          </label>
        </fieldset>

        <label className="field" htmlFor={titleId}>
          <span>Title</span>
          <input
            id={titleId}
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          />
        </label>
        <label className="field" htmlFor={promptId}>
          <span>Question</span>
          <textarea
            id={promptId}
            rows={3}
            value={draft.prompt}
            onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))}
          />
        </label>

        {draft.kind === 'mcq' ? (
          <fieldset className="page-customize-choices">
            <legend>Answer choices</legend>
            <p className="page-customize-hint">Mark one correct answer. You can add or remove choices.</p>
            {draft.choices.map((choice, index) => (
              <div key={choice.id} className="page-customize-choice-row">
                <label className="page-customize-choice-row__correct">
                  <input
                    type="radio"
                    name="correct-choice"
                    checked={choice.correct}
                    onChange={() => updateChoice(choice.id, { correct: true })}
                  />
                  <span className="visually-hidden">Correct answer</span>
                </label>
                <input
                  aria-label={`Choice ${index + 1}`}
                  value={choice.text}
                  onChange={(event) => updateChoice(choice.id, { text: event.target.value })}
                />
                <button
                  type="button"
                  className="button button--subtle button--small"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      choices: current.choices.filter((item) => item.id !== choice.id),
                    }))
                  }
                  disabled={draft.choices.length <= 2}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  choices: [
                    ...current.choices,
                    { id: `c-${Date.now()}`, text: `Choice ${current.choices.length + 1}`, correct: false },
                  ],
                }))
              }
            >
              Add choice
            </button>
          </fieldset>
        ) : (
          <fieldset className="page-customize-choices">
            <legend>Student inputs</legend>
            <p className="page-customize-hint">Each row is a blank students fill in. Include the expected answer.</p>
            {draft.inputs.map((input, index) => (
              <div key={input.id} className="page-customize-input-row">
                <input
                  aria-label={`Input ${index + 1} label`}
                  placeholder="Label"
                  value={input.label}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      inputs: current.inputs.map((item) =>
                        item.id === input.id ? { ...item, label: event.target.value } : item,
                      ),
                    }))
                  }
                />
                <input
                  aria-label={`Input ${index + 1} correct answer`}
                  placeholder="Correct answer"
                  value={input.answer}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      inputs: current.inputs.map((item) =>
                        item.id === input.id ? { ...item, answer: event.target.value } : item,
                      ),
                    }))
                  }
                />
                <button
                  type="button"
                  className="button button--subtle button--small"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      inputs: current.inputs.filter((item) => item.id !== input.id),
                    }))
                  }
                  disabled={draft.inputs.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  inputs: [...current.inputs, { id: `i-${Date.now()}`, label: `Part ${current.inputs.length + 1}`, answer: '' }],
                }))
              }
            >
              Add input
            </button>
          </fieldset>
        )}

        <label className="field">
          <span>Feedback for correct answer (optional)</span>
          <textarea
            rows={2}
            value={draft.correctFeedback}
            onChange={(event) => setDraft((current) => ({ ...current, correctFeedback: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Feedback for incorrect answer (optional)</span>
          <textarea
            rows={2}
            value={draft.incorrectFeedback}
            onChange={(event) => setDraft((current) => ({ ...current, incorrectFeedback: event.target.value }))}
          />
        </label>
        <div className="page-customize-form__split">
          <label className="field" htmlFor={objectiveId}>
            <span>Learning objective</span>
            <select
              id={objectiveId}
              className="select"
              value={draft.learningObjective}
              onChange={(event) => setDraft((current) => ({ ...current, learningObjective: event.target.value }))}
            >
              {objectives.map((objective) => (
                <option key={objective.code} value={objective.label}>
                  {objective.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor={pointsId}>
            <span>Points</span>
            <input
              id={pointsId}
              type="number"
              min={1}
              max={10}
              value={draft.points}
              onChange={(event) =>
                setDraft((current) => ({ ...current, points: Math.max(1, Number(event.target.value) || 1) }))
              }
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="button button--subtle" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={!canSave}>
            Save to page
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function CourseResourceForm({
  onCancel,
  onAdd,
}: {
  onCancel: () => void;
  onAdd: (resource: CourseResourceContent) => void;
}) {
  const [selected, setSelected] = useState(COURSE_RESOURCE_OPTIONS[0].title);
  return (
    <ModalShell title="Add an existing course resource" onClose={onCancel} wide={false}>
      <form
        className="page-customize-form"
        onSubmit={(event) => {
          event.preventDefault();
          const resource = COURSE_RESOURCE_OPTIONS.find((item) => item.title === selected) ?? COURSE_RESOURCE_OPTIONS[0];
          onAdd(resource);
        }}
      >
        <fieldset className="page-customize-kind">
          <legend>Choose a resource from this course</legend>
          {COURSE_RESOURCE_OPTIONS.map((resource) => (
            <label key={resource.title}>
              <input
                type="radio"
                name="course-resource"
                checked={selected === resource.title}
                onChange={() => setSelected(resource.title)}
              />
              <span>
                <strong>{resource.title}</strong>
                <span className="page-customize-hint"> {resource.sourceLabel}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="modal-actions">
          <button type="button" className="button button--subtle" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="button button--primary">
            Add to page
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = value;
    // Seed once so typing does not reset the caret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    onChange(editorRef.current?.innerHTML ?? '');
  };

  return (
    <div className="rich-text">
      <div className="rich-text__toolbar" role="toolbar" aria-label="Text formatting">
        <button type="button" className="rich-text__btn" onClick={() => apply('bold')} aria-label="Bold">
          <strong>B</strong>
        </button>
        <button type="button" className="rich-text__btn" onClick={() => apply('italic')} aria-label="Italic">
          <em>I</em>
        </button>
        <button type="button" className="rich-text__btn" onClick={() => apply('insertUnorderedList')}>
          List
        </button>
      </div>
      <div
        ref={editorRef}
        className="rich-text__editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Formatted body content"
        onInput={() => onChange(editorRef.current?.innerHTML ?? '')}
      />
    </div>
  );
}

export function StudentQuestionView({
  block,
  name,
}: {
  block: Extract<PageBlock, { kind: 'question' }>;
  name: string;
}) {
  const question = block.question;
  return (
    <article className="student-question-card">
      <div className="student-question-card__meta">
        {question.kind === 'mcq' ? 'Multiple choice' : 'Multi-input'} · {question.points} point
        {question.points === 1 ? '' : 's'}
      </div>
      <h3>{question.title}</h3>
      <p>{question.prompt}</p>
      {question.kind === 'mcq' ? (
        <div className="student-choice-list">
          {question.choices.map((choice) => (
            <label key={choice.id} className="student-choice-row">
              <input type="radio" name={name} disabled />
              <span>{choice.text}</span>
            </label>
          ))}
        </div>
      ) : (
        <div className="student-input-list">
          {question.inputs.map((input) => (
            <label key={input.id} className="student-input-row">
              <span>{input.label}</span>
              <input disabled placeholder="Student response" />
            </label>
          ))}
        </div>
      )}
    </article>
  );
}
