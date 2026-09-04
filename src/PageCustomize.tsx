import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { friendlyObjectiveName, impactHeadline, type ObjectiveImpact } from './learningDesign';
import {
  BLOCK_KIND_LABEL,
  COURSE_RESOURCE_OPTIONS,
  cannedExampleBlock,
  courseResourceBlock,
  describeBlockForCompare,
  exampleMcqDraft,
  exampleMultiInputDraft,
  exampleTextDraft,
  questionBlockFromDraft,
  sanitizeInstructorHtml,
  summarizeAgainstCanonical,
  textBlockFromDraft,
  type ChangeSummary,
  type CourseResourceContent,
  type PageBlock,
  type PageObjectiveOption,
  type QuestionChoice,
  type QuestionContent,
  type TextContent,
} from './pageCustomization';

export type CustomizeDialog =
  | { type: 'chooser'; insertAt: number }
  | { type: 'text'; insertAt: number }
  | { type: 'question'; insertAt: number }
  | { type: 'course-resource'; insertAt: number }
  | { type: 'edit-text'; block: Extract<PageBlock, { kind: 'text' }> }
  | { type: 'edit-question'; block: Extract<PageBlock, { kind: 'question' }> }
  | { type: 'community-resources'; insertAt: number }
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

export function CanonicalCourseNotice({ onCompare }: { onCompare: () => void }) {
  return (
    <div className="canonical-course-notice" role="status">
      <p>
        You customized this page for your course. Other unchanged course content can continue to receive updates from
        the original course.
      </p>
      <button type="button" className="button button--secondary button--small" onClick={onCompare}>
        Compare with original
      </button>
    </div>
  );
}

export function CompareWithOriginalDialog({
  originalBlocks,
  currentBlocks,
  onClose,
  onRestore,
}: {
  originalBlocks: PageBlock[];
  currentBlocks: PageBlock[];
  onClose: () => void;
  onRestore: () => void;
}) {
  const [confirmRestore, setConfirmRestore] = useState(false);
  const changes = summarizeAgainstCanonical(originalBlocks, currentBlocks);
  const originalVisible = originalBlocks.filter((block) => block.status !== 'removed');
  const currentVisible = currentBlocks.filter((block) => block.status !== 'removed');
  const removedCurrent = currentBlocks.filter((block) => block.status === 'removed');

  if (confirmRestore) {
    return (
      <ModalShell title="Restore original version?" onClose={onClose} wide={false}>
        <p>
          This replaces your customized page with the original course version. Content you added for this course will be
          removed, and removed original items will be restored.
        </p>
        <div className="modal-actions modal-actions--wrap">
          <button type="button" className="button button--subtle" onClick={() => setConfirmRestore(false)}>
            Keep my version
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={() => {
              onRestore();
              onClose();
            }}
          >
            Restore original
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Compare with original" onClose={onClose} wide>
      <p className="canonical-compare__intro">
        Local changes apply to your course section. Unchanged content stays connected to the original course.
      </p>

      <div className="canonical-compare__columns">
        <section className="canonical-compare__column" aria-labelledby="canonical-original-heading">
          <h4 id="canonical-original-heading">Original content</h4>
          <ol className="canonical-compare__list">
            {originalVisible.map((block) => (
              <li key={block.id}>
                <span className="canonical-compare__kind">{BLOCK_KIND_LABEL[block.kind]}</span>
                <span>{describeBlockForCompare(block)}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="canonical-compare__column" aria-labelledby="canonical-current-heading">
          <h4 id="canonical-current-heading">Your customized content</h4>
          <ol className="canonical-compare__list">
            {currentVisible.map((block) => (
              <li key={block.id}>
                <span className="canonical-compare__kind">
                  {BLOCK_KIND_LABEL[block.kind]}
                  {block.origin === 'instructor' ? ' · added' : ''}
                </span>
                <span>{describeBlockForCompare(block)}</span>
              </li>
            ))}
            {removedCurrent.map((block) => (
              <li key={block.id} className="canonical-compare__removed">
                <span className="canonical-compare__kind">{BLOCK_KIND_LABEL[block.kind]} · removed</span>
                <span>{block.title}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="canonical-compare__changes" aria-labelledby="canonical-changes-heading">
        <h4 id="canonical-changes-heading">Changes on this page</h4>
        {changes.count === 0 ? (
          <p className="canonical-compare__empty">This page matches the original course version.</p>
        ) : (
          <ul>
            {changes.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="modal-actions modal-actions--wrap">
        <button type="button" className="button button--secondary" onClick={() => setConfirmRestore(true)} disabled={changes.count === 0}>
          Restore original version
        </button>
        <button type="button" className="button button--primary" onClick={onClose}>
          Close
        </button>
      </div>
    </ModalShell>
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
  canEdit,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  onRestore,
  onEdit,
  children,
}: {
  block: PageBlock;
  htmlId?: string;
  selected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canEdit?: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onRestore: () => void;
  onEdit?: () => void;
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
          {canEdit && !removed ? (
            <button type="button" className="button button--secondary button--small" onClick={onEdit} disabled={!onEdit}>
              Edit
            </button>
          ) : null}
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
  onEditBlock,
}: {
  dialog: CustomizeDialog | null;
  objectives: PageObjectiveOption[];
  onClose: () => void;
  onChoose: (next: CustomizeDialog) => void;
  onAddBlocks: (insertAt: number, blocks: PageBlock[]) => void;
  onEditBlock: (blockId: string, nextBlock: PageBlock) => void;
}) {
  if (!dialog) return null;

  if (dialog.type === 'edit-text') {
    return (
      <TextBlockForm
        objectives={objectives}
        initialDraft={{
          heading: dialog.block.text.heading,
          bodyHtml: dialog.block.text.bodyHtml,
          learningObjective: dialog.block.text.learningObjective,
        }}
        modalTitle="Edit text or explanation"
        submitLabel="Save changes"
        onCancel={onClose}
        onAdd={(draft) => {
          const updated = textBlockFromDraft(draft);
          onEditBlock(dialog.block.id, {
            ...dialog.block,
            title: updated.title,
            text: updated.text,
          });
          onClose();
        }}
      />
    );
  }

  if (dialog.type === 'edit-question') {
    return (
      <QuestionBlockForm
        objectives={objectives}
        initialDraft={dialog.block.question}
        modalTitle="Edit a question"
        submitLabel="Save changes"
        onCancel={onClose}
        onAdd={(draft) => {
          const updated = questionBlockFromDraft(draft);
          onEditBlock(dialog.block.id, {
            ...dialog.block,
            title: updated.title,
            question: updated.question,
          });
          onClose();
        }}
      />
    );
  }

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
          if (kind === 'community') onChoose({ type: 'community-resources', insertAt: dialog.insertAt });
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

  if (dialog.type === 'community-resources') {
    return (
      <CommunityResourcesPanel
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
  onSelect: (kind: 'text' | 'example' | 'question' | 'course-resource' | 'community' | 'external') => void;
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
          title="Community resources"
          description="Browse content shared by other instructors and contributors."
          onClick={() => onSelect('community')}
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
  initialDraft,
  modalTitle,
  submitLabel,
}: {
  objectives: PageObjectiveOption[];
  onCancel: () => void;
  onAdd: (draft: TextContent) => void;
  initialDraft?: TextContent;
  modalTitle?: string;
  submitLabel?: string;
}) {
  const headingId = useId();
  const objectiveId = useId();
  const [draft, setDraft] = useState<TextContent>(() => initialDraft ?? exampleTextDraft(objectives));
  const [preview, setPreview] = useState(false);
  const canAdd = draft.heading.trim().length > 0 && draft.bodyHtml.replace(/<[^>]*>/g, '').trim().length > 0;

  return (
    <ModalShell title={modalTitle ?? 'Add text or explanation'} onClose={onCancel} wide>
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
            {submitLabel ?? 'Add to page'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function CoverageImpactPanel({
  impacts,
  scope = 'this module',
}: {
  impacts: ObjectiveImpact[];
  scope?: string;
}) {
  if (impacts.length === 0) return null;
  return (
    <div className="guardrail-callout">
      <p>{impactHeadline(impacts[0], scope)}</p>
      {impacts.map((impact) => (
        <dl key={impact.objective} className="guardrail-summary">
          <div>
            <dt>Learning objective affected</dt>
            <dd>{friendlyObjectiveName(impact.objective)}</dd>
          </div>
          <div>
            <dt>Remaining explanations</dt>
            <dd>{impact.remaining.explanations}</dd>
          </div>
          <div>
            <dt>Remaining formative activities</dt>
            <dd>{impact.remaining.formative}</dd>
          </div>
          <div>
            <dt>Remaining summative activities</dt>
            <dd>{impact.remaining.summative}</dd>
          </div>
          <div>
            <dt>Proficiency evidence may be reduced</dt>
            <dd>{impact.proficiencyEvidenceMayBeReduced ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      ))}
    </div>
  );
}

export function QuestionBlockForm({
  objectives,
  onCancel,
  onAdd,
  initialDraft,
  modalTitle,
  submitLabel,
}: {
  objectives: PageObjectiveOption[];
  onCancel: () => void;
  onAdd: (draft: QuestionContent) => void;
  initialDraft?: QuestionContent;
  modalTitle?: string;
  submitLabel?: string;
}) {
  const [draft, setDraft] = useState<QuestionContent>(() => initialDraft ?? exampleMcqDraft(objectives));
  const [confirmWithoutObjective, setConfirmWithoutObjective] = useState(false);
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

  if (confirmWithoutObjective) {
    return (
      <ModalShell title="Learning objective not selected" onClose={onCancel} wide={false}>
        <div className="guardrail-callout">
          <p>
            This question is not associated with a learning objective. It can still be added, but it will not
            contribute to learning proficiency calculations or objective-level reporting.
          </p>
        </div>
        <div className="modal-actions modal-actions--wrap">
          <button type="button" className="button button--primary" onClick={() => setConfirmWithoutObjective(false)}>
            Go back and select an objective
          </button>
          <button type="button" className="button button--secondary" onClick={() => onAdd(draft)}>
            Add without an objective
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title={modalTitle ?? 'Add a question'} onClose={onCancel} wide>
      <form
        className="page-customize-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          if (!draft.learningObjective.trim()) {
            setConfirmWithoutObjective(true);
            return;
          }
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
        <div>
          <div className="page-customize-form__split">
            <label className="field" htmlFor={objectiveId}>
              <span>Learning objective</span>
              <select
                id={objectiveId}
                className="select"
                value={draft.learningObjective}
                onChange={(event) => setDraft((current) => ({ ...current, learningObjective: event.target.value }))}
              >
                <option value="">Select a learning objective</option>
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
          <p className="page-customize-hint">
            Strongly recommended. Aligning this question with a learning objective helps Torus include the activity in
            proficiency calculations and instructor reporting.
          </p>
        </div>
        <div className="modal-actions">
          <button type="button" className="button button--subtle" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={!canSave}>
            {submitLabel ?? 'Save to page'}
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

type CommunityResource = {
  title: string;
  contributor: string;
  type: string;
  learningObjective: string;
  sectionsUsing: number;
  evidenceSignal: string | null;
  oliReviewed: boolean;
};

const COMMUNITY_RESOURCES: CommunityResource[] = [
  {
    title: 'Shielding Material Selection Activity',
    contributor: 'Dr. Maria Chen, Penn State',
    type: 'Formative activity',
    learningObjective: 'Evaluate shielding strategies for common gamma sources',
    sectionsUsing: 14,
    evidenceSignal: 'Promising student performance',
    oliReviewed: true,
  },
  {
    title: 'Inverse Square Law Worked Example',
    contributor: 'James Kowalski, University of Michigan',
    type: 'Worked example',
    learningObjective: 'Apply the inverse square law to estimate dose at varying distances',
    sectionsUsing: 8,
    evidenceSignal: null,
    oliReviewed: true,
  },
  {
    title: 'Contamination vs. Exposure Explanation',
    contributor: 'Dr. Anika Patel, Carnegie Mellon',
    type: 'Text explanation',
    learningObjective: 'Distinguish between contamination and exposure in incident response',
    sectionsUsing: 3,
    evidenceSignal: 'Promising student performance',
    oliReviewed: false,
  },
];

function CommunityResourcesPanel({
  onCancel,
  onAdd,
}: {
  onCancel: () => void;
  onAdd: (resource: CourseResourceContent) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <ModalShell title="Community resources" onClose={onCancel} wide>
      <p className="community-resources__intro">
        Content shared by other instructors and contributors. Preview before adding to your page.
      </p>
      <div className="community-resources__list">
        {COMMUNITY_RESOURCES.map((resource) => (
          <div key={resource.title} className="community-resource-card">
            <div className="community-resource-card__header">
              <span className="community-resource-card__type">{resource.type}</span>
              {resource.oliReviewed ? (
                <span className="community-resource-card__oli-badge">Reviewed by OLI learning engineering</span>
              ) : null}
            </div>
            <h4 className="community-resource-card__title">{resource.title}</h4>
            <p className="community-resource-card__contributor">Contributed by {resource.contributor}</p>
            <dl className="community-resource-card__meta">
              <div>
                <dt>Learning objective</dt>
                <dd>{resource.learningObjective}</dd>
              </div>
              <div>
                <dt>Course sections using this</dt>
                <dd>{resource.sectionsUsing}</dd>
              </div>
              {resource.evidenceSignal ? (
                <div>
                  <dt>Evidence</dt>
                  <dd>{resource.evidenceSignal}</dd>
                </div>
              ) : null}
            </dl>

            {preview === resource.title ? (
              <div className="community-resource-card__preview">
                <p className="community-resource-card__preview-note">
                  Preview: this is a simplified representation. Full content would load in context.
                </p>
                <button
                  type="button"
                  className="button button--subtle button--small"
                  onClick={() => setPreview(null)}
                >
                  Close preview
                </button>
              </div>
            ) : null}

            <div className="community-resource-card__actions">
              <button
                type="button"
                className="button button--secondary button--small"
                onClick={() => setPreview(preview === resource.title ? null : resource.title)}
              >
                {preview === resource.title ? 'Close preview' : 'Preview'}
              </button>
              <button
                type="button"
                className="button button--primary button--small"
                onClick={() =>
                  onAdd({
                    title: resource.title,
                    sourceLabel: `Community · ${resource.contributor}`,
                  })
                }
              >
                Add to page
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <button type="button" className="button button--subtle" onClick={onCancel}>
          Cancel
        </button>
      </div>
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
