import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { friendlyObjectiveName, impactHeadline, type ObjectiveImpact } from './learningDesign';
import {
  BLOCK_KIND_LABEL,
  COURSE_RESOURCE_OPTIONS,
  courseResourceBlock,
  editorObjectiveOptions,
  exampleMcqDraft,
  exampleMultiInputDraft,
  exampleTextDraft,
  formatObjectiveTag,
  generateQuestionsWithAi,
  questionBlockFromDraft,
  resolveEditorObjectiveValue,
  sanitizeInstructorHtml,
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
  | { type: 'ai-question'; insertAt: number }
  | { type: 'community-resources'; insertAt: number }
  | { type: 'coming-later'; label: string };

export function PageCustomizeBar({
  summary,
  dirty,
  isCustomized = false,
  onCancel,
  onSave,
  onRestoreOriginal,
}: {
  summary: ChangeSummary;
  dirty: boolean;
  isCustomized?: boolean;
  onCancel: () => void;
  onSave: () => void;
  onRestoreOriginal?: () => void;
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
            'No unsaved changes. Edit, remove, or drag a block. Add content and questions between blocks.'
          )}
        </p>
      </div>
      <div className="page-customize-bar__actions">
        {isCustomized && onRestoreOriginal ? (
          <button type="button" className="button button--secondary" onClick={onRestoreOriginal}>
            Restore original
          </button>
        ) : null}
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

export function RestoreOriginalConfirm({
  onClose,
  onRestore,
  title = 'Restore original version?',
  body = 'This replaces your customized version with the original course version. Content you added will be removed, and original items you changed or removed will be restored.',
}: {
  onClose: () => void;
  onRestore: () => void;
  title?: string;
  body?: string;
}) {
  return (
    <ModalShell title={title} onClose={onClose} wide={false}>
      <p>{body}</p>
      <div className="modal-actions modal-actions--wrap">
        <button type="button" className="button button--subtle" onClick={onClose}>
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

export function AddContentGap({
  onAdd,
  reordering = false,
  dropActive = false,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  onAdd: () => void;
  reordering?: boolean;
  dropActive?: boolean;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (event: DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={['add-content-gap', reordering ? 'is-reordering' : '', dropActive ? 'is-drop-over' : '']
        .filter(Boolean)
        .join(' ')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <button type="button" className="add-content-gap__button" onClick={onAdd}>
        {dropActive ? 'Drop here' : 'Add content and questions'}
      </button>
    </div>
  );
}

export function PageObjectivesAttach({
  allObjectives,
  attachedCodes,
  onChange,
  readOnly = false,
}: {
  allObjectives: PageObjectiveOption[];
  attachedCodes: string[];
  onChange?: (codes: string[]) => void;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const attached = allObjectives.filter((objective) => attachedCodes.includes(objective.code));

  return (
    <section className="page-objectives-attach" aria-label="Learning objectives on this page">
      <div className="page-objectives-attach__head">
        <h2>Learning objectives</h2>
        {!readOnly ? (
          <button type="button" className="button button--secondary button--small" onClick={() => setOpen((current) => !current)}>
            {open ? 'Done' : attached.length > 0 ? 'Edit learning objectives' : 'Attach learning objectives'}
          </button>
        ) : null}
      </div>
      {attached.length === 0 ? (
        <p className="page-objectives-attach__empty">
          {readOnly
            ? 'No learning objectives are attached to this page.'
            : 'Attach learning objectives so they appear at the top of this page.'}
        </p>
      ) : (
        <ul className="page-objectives-attach__list">
          {attached.map((objective) => (
            <li key={objective.code}>
              <span className="page-objectives-attach__code">{objective.code}</span>
              {objective.label}
            </li>
          ))}
        </ul>
      )}
      {!readOnly && open ? (
        <fieldset className="page-objectives-attach__picker">
          <legend>Select objectives for this page</legend>
          {allObjectives.map((objective) => {
            const checked = attachedCodes.includes(objective.code);
            return (
              <label key={objective.code}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? attachedCodes.filter((code) => code !== objective.code)
                      : [...attachedCodes, objective.code];
                    onChange?.(next);
                  }}
                />
                <span>
                  <strong>{objective.code}</strong> {objective.label}
                </span>
              </label>
            );
          })}
        </fieldset>
      ) : null}
    </section>
  );
}

export function PageBlockFrame({
  block,
  htmlId,
  selected,
  canMoveUp,
  canMoveDown,
  canEdit,
  canRestoreOriginal = false,
  dragging = false,
  dropPlacement = null,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  onRestore,
  onRestoreOriginal,
  onEdit,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}: {
  block: PageBlock;
  htmlId?: string;
  selected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canEdit?: boolean;
  canRestoreOriginal?: boolean;
  dragging?: boolean;
  dropPlacement?: 'before' | 'after' | null;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onRestore: () => void;
  onRestoreOriginal?: () => void;
  onEdit?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  children: ReactNode;
}) {
  const removed = block.status === 'removed';
  const className = [
    'page-block',
    selected ? 'is-selected' : '',
    removed ? 'is-removed' : '',
    dragging ? 'is-dragging' : '',
    dropPlacement === 'before' ? 'is-drop-before' : '',
    dropPlacement === 'after' ? 'is-drop-after' : '',
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
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {selected ? (
        <div
          className="page-block__actions"
          onClick={(event) => event.stopPropagation()}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <button
            type="button"
            className="page-block__drag"
            draggable
            aria-label={`Drag to reorder ${block.title}`}
            aria-grabbed={dragging}
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', block.id);
              event.dataTransfer.effectAllowed = 'move';
              const frame = event.currentTarget.closest('.page-block');
              if (frame instanceof HTMLElement) {
                event.dataTransfer.setDragImage(frame, 24, 16);
              }
              onDragStart();
            }}
            onDragEnd={onDragEnd}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp' && canMoveUp) {
                event.preventDefault();
                onMoveUp();
              }
              if (event.key === 'ArrowDown' && canMoveDown) {
                event.preventDefault();
                onMoveDown();
              }
            }}
          >
            <span className="page-block__drag-dots" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          </button>
          <span className="page-block__kind">{BLOCK_KIND_LABEL[block.kind]}</span>
          {removed ? <span className="status-pill">Removed</span> : null}
          {canRestoreOriginal && !removed ? <span className="status-pill status-pill--edited">Edited</span> : null}
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
            <>
              {canRestoreOriginal && onRestoreOriginal ? (
                <button type="button" className="button button--secondary button--small" onClick={onRestoreOriginal}>
                  Restore original
                </button>
              ) : null}
              <button type="button" className="button button--danger button--small" onClick={onRemove}>
                Remove
              </button>
            </>
          )}
        </div>
      ) : null}
      <div className="page-block__body">{children}</div>
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
  pageContext = '',
  onClose,
  onChoose,
  onAddBlocks,
  onEditBlock,
}: {
  dialog: CustomizeDialog | null;
  objectives: PageObjectiveOption[];
  pageContext?: string;
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
        modalTitle="Edit text, explanation, or example"
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
        pageContext={pageContext}
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
          if (kind === 'ai') onChoose({ type: 'ai-question', insertAt: dialog.insertAt });
          if (kind === 'community') onChoose({ type: 'community-resources', insertAt: dialog.insertAt });
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
        pageContext={pageContext}
        onCancel={onClose}
        onAdd={(draft) => {
          onAddBlocks(dialog.insertAt, [questionBlockFromDraft(draft)]);
          onClose();
        }}
      />
    );
  }

  if (dialog.type === 'ai-question') {
    return (
      <AiQuestionForm
        objectives={objectives}
        pageContext={pageContext}
        onCancel={onClose}
        onAdd={(drafts) => {
          onAddBlocks(
            dialog.insertAt,
            drafts.map((draft) => questionBlockFromDraft(draft)),
          );
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

let openModalCount = 0;

function lockPageScroll() {
  openModalCount += 1;
  document.documentElement.classList.add('modal-open');
}

function unlockPageScroll() {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.documentElement.classList.remove('modal-open');
  }
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
    lockPageScroll();
    return () => unlockPageScroll();
  }, []);

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
  onSelect: (kind: 'text' | 'question' | 'ai' | 'community') => void;
}) {
  return (
    <ModalShell title="Add content and questions" onClose={onClose} wide={false}>
      <p>Choose what to add to this page.</p>
      <div className="content-chooser">
        <ChooserOption
          title="Text, explanation, or example"
          description="A heading and short explanation or worked example for students."
          onClick={() => onSelect('text')}
        />
        <ChooserOption
          title="Question"
          description="Write a multiple-choice or multi-input question."
          onClick={() => onSelect('question')}
        />
        <ChooserOption
          title="Generate questions with AI"
          description="Draft one or more questions from a learning objective and optional page context."
          onClick={() => onSelect('ai')}
        />
        <ChooserOption
          title="Community resources"
          description="Browse content shared by other instructors and contributors."
          onClick={() => onSelect('community')}
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
    <button type="button" className="content-chooser__option" onClick={onClick}>
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
  const imageInputId = useId();
  const [draft, setDraft] = useState<TextContent>(() => initialDraft ?? exampleTextDraft(objectives));
  const [preview, setPreview] = useState(false);
  const [imageName, setImageName] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const canAdd = draft.heading.trim().length > 0 && draft.bodyHtml.replace(/<[^>]*>/g, '').trim().length > 0;

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const clearImage = () => {
    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setImageName('');
  };

  return (
    <ModalShell title={modalTitle ?? 'Add text, explanation, or example'} onClose={onCancel} wide>
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
            {imagePreview ? (
              <img className="page-text-block__image" src={imagePreview} alt={imageName || ''} />
            ) : null}
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
            <div className="field">
              <span>Image (optional)</span>
              {imagePreview ? (
                <div className="image-upload image-upload--selected">
                  <img className="image-upload__preview" src={imagePreview} alt="" />
                  <p className="image-upload__name">{imageName}</p>
                  <button type="button" className="button button--subtle button--small" onClick={clearImage}>
                    Remove image
                  </button>
                </div>
              ) : (
                <label className="image-upload" htmlFor={imageInputId}>
                  <input
                    id={imageInputId}
                    className="visually-hidden"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file) return;
                      setImagePreview((current) => {
                        if (current) URL.revokeObjectURL(current);
                        return URL.createObjectURL(file);
                      });
                      setImageName(file.name);
                    }}
                  />
                  <span className="image-upload__title">Upload an image</span>
                  <span className="image-upload__hint">Choose a PNG, JPG, or GIF to include with this content.</span>
                </label>
              )}
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

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function initializeQuestionDraft(objectives: PageObjectiveOption[], initial?: QuestionContent): QuestionContent {
  const base = initial ?? exampleMcqDraft(objectives);
  const learningObjective = resolveEditorObjectiveValue(base.learningObjective, objectives);
  const inputs =
    base.kind === 'multi-input' && base.inputs.length === 0
      ? [
          { id: 'i1', label: 'Part 1', answer: '' },
          { id: 'i2', label: 'Part 2', answer: '' },
        ]
      : base.inputs;
  const choices =
    base.kind === 'mcq' && base.choices.length < 2 ? exampleMcqDraft(objectives).choices : base.choices;
  return { ...base, learningObjective, inputs, choices };
}

export function QuestionDraftPreview({ draft }: { draft: QuestionContent }) {
  return (
    <div className="question-draft-preview">
      {draft.generatedByAi ? <p className="question-draft-preview__ai">AI-generated draft — review before saving.</p> : null}
      <div className="student-question-card__meta">
        {draft.kind === 'mcq' ? 'Multiple choice' : 'Multi-input'} · {draft.points} point
        {draft.points === 1 ? '' : 's'}
      </div>
      <h3>{draft.title.trim() || 'Untitled question'}</h3>
      <p>{draft.prompt.trim() || 'Question prompt'}</p>
      {draft.imageSrc ? (
        <img className="question-media" src={draft.imageSrc} alt={draft.imageAlt || draft.title} />
      ) : null}
      {draft.kind === 'mcq' ? (
        <div className="student-choice-list">
          {draft.choices
            .filter((choice) => choice.text.trim())
            .map((choice) => (
              <label key={choice.id} className="student-choice-row">
                <input type="radio" name={`preview-${draft.title}`} disabled />
                <span>
                  {choice.text}
                  {choice.correct ? <em className="question-draft-preview__correct"> Correct</em> : null}
                </span>
              </label>
            ))}
        </div>
      ) : (
        <div className="student-input-list">
          {draft.inputs.map((input) => (
            <label key={input.id} className="student-input-row">
              <span>{input.label || 'Input'}</span>
              <input disabled placeholder="Student response" />
              {input.answer ? <span className="page-customize-hint">Expected: {input.answer}</span> : null}
            </label>
          ))}
        </div>
      )}
      {draft.learningObjective ? (
        <p className="learning-objective-footnote">
          <strong>LO</strong> {draft.learningObjective}
        </p>
      ) : null}
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
  pageContext = '',
  showAiGenerate = true,
}: {
  objectives: PageObjectiveOption[];
  onCancel: () => void;
  onAdd: (draft: QuestionContent) => void;
  initialDraft?: QuestionContent;
  modalTitle?: string;
  submitLabel?: string;
  pageContext?: string;
  showAiGenerate?: boolean;
}) {
  const [draft, setDraft] = useState<QuestionContent>(() => initializeQuestionDraft(objectives, initialDraft));
  const [confirmWithoutObjective, setConfirmWithoutObjective] = useState(false);
  const [preview, setPreview] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [imageName, setImageName] = useState(initialDraft?.imageAlt ?? '');
  const titleId = useId();
  const promptId = useId();
  const objectiveId = useId();
  const pointsId = useId();
  const imageInputId = useId();
  const objectiveOptions = editorObjectiveOptions(objectives, draft.learningObjective);
  const objectiveValue = resolveEditorObjectiveValue(draft.learningObjective, objectives);
  const canSave =
    draft.title.trim().length > 0 &&
    draft.prompt.trim().length > 0 &&
    (draft.kind === 'mcq'
      ? draft.choices.filter((choice) => choice.text.trim()).length >= 2 && draft.choices.some((choice) => choice.correct)
      : draft.inputs.some((input) => input.label.trim()));

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
          imageSrc: current.imageSrc,
          imageAlt: current.imageAlt,
          generatedByAi: current.generatedByAi,
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
        imageSrc: current.imageSrc,
        imageAlt: current.imageAlt,
        generatedByAi: current.generatedByAi,
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

  const generateWithAi = () => {
    setAiBusy(true);
    window.setTimeout(() => {
      const [generated] = generateQuestionsWithAi({
        objectives,
        objectiveValue: objectiveValue || formatObjectiveTag(objectives[0] ?? { code: '', label: '' }),
        sourceText: pageContext,
        count: 1,
      });
      if (generated) {
        setDraft((current) => ({
          ...generated,
          imageSrc: current.imageSrc,
          imageAlt: current.imageAlt,
          points: current.points || generated.points,
        }));
        setPreview(true);
      }
      setAiBusy(false);
      setAiOpen(false);
    }, 700);
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
          onAdd({ ...draft, learningObjective: objectiveValue || draft.learningObjective });
        }}
      >
        <div className="page-customize-form__tabs" role="tablist" aria-label="Question editor">
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
            <QuestionDraftPreview draft={{ ...draft, learningObjective: objectiveValue || draft.learningObjective }} />
          </div>
        ) : (
          <div className="page-customize-form__fields" role="tabpanel">
            {showAiGenerate ? (
              <div className="ai-generate-panel">
                <div className="ai-generate-panel__head">
                  <p>
                    <strong>Generate with AI</strong> Draft a question from the learning objectives on this page.
                  </p>
                  <button
                    type="button"
                    className="button button--secondary button--small"
                    onClick={() => setAiOpen((open) => !open)}
                  >
                    {aiOpen ? 'Hide' : 'Generate with AI'}
                  </button>
                </div>
                {aiOpen ? (
                  <div className="ai-generate-panel__body">
                    <p className="page-customize-hint">
                      Uses the selected learning objective
                      {pageContext.trim() ? ' and visible page content as context.' : '.'} You can edit the draft before saving.
                    </p>
                    <button
                      type="button"
                      className="button button--primary button--small"
                      onClick={generateWithAi}
                      disabled={aiBusy || objectives.length === 0}
                    >
                      {aiBusy ? 'Generating…' : 'Generate a question'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

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

            <div className="field">
              <span>Question image (optional)</span>
              {draft.imageSrc ? (
                <div className="image-upload image-upload--selected">
                  <img className="image-upload__preview" src={draft.imageSrc} alt={draft.imageAlt || ''} />
                  <p className="image-upload__name">{imageName || draft.imageAlt || 'Question image'}</p>
                  <button
                    type="button"
                    className="button button--subtle button--small"
                    onClick={() => {
                      setDraft((current) => ({ ...current, imageSrc: undefined, imageAlt: undefined }));
                      setImageName('');
                    }}
                  >
                    Remove image
                  </button>
                </div>
              ) : (
                <label className="image-upload" htmlFor={imageInputId}>
                  <input
                    id={imageInputId}
                    type="file"
                    accept="image/*"
                    className="visually-hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void readImageAsDataUrl(file).then((src) => {
                        setImageName(file.name);
                        setDraft((current) => ({ ...current, imageSrc: src, imageAlt: file.name }));
                      });
                    }}
                  />
                  <span className="image-upload__title">Upload an image</span>
                  <span className="image-upload__hint">Choose a PNG, JPG, or GIF to show with this question.</span>
                </label>
              )}
            </div>

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
                <p className="page-customize-hint">Each row is a blank students fill in. Include the expected answer when you have it.</p>
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
                    value={objectiveValue}
                    onChange={(event) => setDraft((current) => ({ ...current, learningObjective: event.target.value }))}
                  >
                    <option value="">Select a learning objective</option>
                    {objectiveOptions.map((objective) => (
                      <option key={objective.code} value={formatObjectiveTag(objective)}>
                        {formatObjectiveTag(objective)}
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
                These are the learning objectives attached to this page. Aligning the question helps Torus include it in
                proficiency calculations and instructor reporting.
              </p>
            </div>
          </div>
        )}

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

function AiQuestionForm({
  objectives,
  pageContext,
  onCancel,
  onAdd,
}: {
  objectives: PageObjectiveOption[];
  pageContext: string;
  onCancel: () => void;
  onAdd: (drafts: QuestionContent[]) => void;
}) {
  const defaultObjective = objectives[0] ? formatObjectiveTag(objectives[0]) : '';
  const [objectiveValue, setObjectiveValue] = useState(defaultObjective);
  const [count, setCount] = useState(2);
  const [usePageContext, setUsePageContext] = useState(Boolean(pageContext.trim()));
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState<QuestionContent[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const runGenerate = () => {
    setBusy(true);
    window.setTimeout(() => {
      const next = generateQuestionsWithAi({
        objectives,
        objectiveValue,
        sourceText: usePageContext ? pageContext : '',
        count,
      });
      setGenerated(next);
      setSelectedIds(next.map((item) => item.title));
      setPreviewId(next[0]?.title ?? null);
      setBusy(false);
    }, 800);
  };

  const selected = generated.filter((item) => selectedIds.includes(item.title));
  const preview = generated.find((item) => item.title === previewId) ?? selected[0] ?? generated[0];

  return (
    <ModalShell title="Generate questions with AI" onClose={onCancel} wide>
      <div className="page-customize-form">
        <p className="page-customize-hint">
          Draft questions from a learning objective on this page. Review the preview, then add the ones you want.
        </p>
        <div className="page-customize-form__split page-customize-form__split--ai">
          <label className="field">
            <span>Learning objective</span>
            <select
              className="select"
              value={objectiveValue}
              onChange={(event) => setObjectiveValue(event.target.value)}
            >
              {objectives.map((objective) => (
                <option key={objective.code} value={formatObjectiveTag(objective)}>
                  {formatObjectiveTag(objective)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>How many</span>
            <select className="select" value={count} onChange={(event) => setCount(Number(event.target.value))}>
              <option value={1}>1 question</option>
              <option value={2}>2 questions</option>
              <option value={3}>3 questions</option>
            </select>
          </label>
        </div>
        <label className="check-row">
          <input
            type="checkbox"
            checked={usePageContext}
            onChange={(event) => setUsePageContext(event.target.checked)}
            disabled={!pageContext.trim()}
          />
          <span>Use this page’s content as context</span>
        </label>
        <div>
          <button
            type="button"
            className="button button--primary"
            onClick={runGenerate}
            disabled={busy || objectives.length === 0}
          >
            {busy ? 'Generating…' : generated.length > 0 ? 'Regenerate' : 'Generate questions'}
          </button>
        </div>
        {generated.length > 0 ? (
          <div className="ai-question-results">
            <fieldset className="page-customize-choices">
              <legend>Generated questions</legend>
              {generated.map((item) => (
                <label key={item.title} className="ai-question-results__row">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.title)}
                    onChange={() => {
                      setSelectedIds((current) =>
                        current.includes(item.title)
                          ? current.filter((id) => id !== item.title)
                          : [...current, item.title],
                      );
                      setPreviewId(item.title);
                    }}
                  />
                  <button type="button" className="ai-question-results__title" onClick={() => setPreviewId(item.title)}>
                    {item.title}
                  </button>
                </label>
              ))}
            </fieldset>
            {preview ? (
              <div className="page-customize-preview">
                <p className="page-customize-hint">Preview</p>
                <QuestionDraftPreview draft={preview} />
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="button button--subtle" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={selected.length === 0}
            onClick={() => onAdd(selected)}
          >
            Add {selected.length === 1 ? '1 question' : `${selected.length || ''} questions`.trim()} to page
          </button>
        </div>
      </div>
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('#') || /^mailto:/i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}

function saveEditorSelection(editor: HTMLElement | null): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!editor || !editor.contains(range.commonAncestorContainer)) return null;
  return range.cloneRange();
}

function restoreEditorSelection(range: Range | null) {
  if (!range) return;
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = value;
    // Seed once so typing does not reset the caret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitChange = () => onChange(editorRef.current?.innerHTML ?? '');

  const apply = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    emitChange();
  };

  const rememberSelection = () => {
    savedRange.current = saveEditorSelection(editorRef.current);
  };

  const applyLink = () => {
    const url = normalizeLinkUrl(linkUrl);
    if (!url) return;
    editorRef.current?.focus();
    restoreEditorSelection(savedRange.current);
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      document.execCommand('insertHTML', false, `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`);
    } else {
      document.execCommand('createLink', false, url);
    }
    emitChange();
    setLinkOpen(false);
  };

  const applyKeyword = () => {
    editorRef.current?.focus();
    restoreEditorSelection(savedRange.current);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const ancestor = range.commonAncestorContainer;
    const existing = (ancestor instanceof Element ? ancestor : ancestor.parentElement)?.closest('.page-keyword');
    if (existing && editorRef.current?.contains(existing)) {
      const parent = existing.parentNode;
      while (existing.firstChild) parent?.insertBefore(existing.firstChild, existing);
      parent?.removeChild(existing);
      parent?.normalize();
      emitChange();
      return;
    }
    if (range.collapsed) return;
    const span = document.createElement('span');
    span.className = 'page-keyword';
    try {
      range.surroundContents(span);
    } catch {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
    selection.removeAllRanges();
    const next = document.createRange();
    next.selectNodeContents(span);
    selection.addRange(next);
    emitChange();
  };

  return (
    <div className="rich-text">
      <div className="rich-text__toolbar" role="toolbar" aria-label="Text formatting">
        <button
          type="button"
          className="rich-text__btn"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => apply('bold')}
          aria-label="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="rich-text__btn"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => apply('italic')}
          aria-label="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className="rich-text__btn"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => apply('insertUnorderedList')}
        >
          List
        </button>
        <button
          type="button"
          className={linkOpen ? 'rich-text__btn is-active' : 'rich-text__btn'}
          onMouseDown={(event) => {
            event.preventDefault();
            rememberSelection();
          }}
          onClick={() => {
            rememberSelection();
            if (linkOpen) {
              setLinkOpen(false);
              return;
            }
            const ancestor = savedRange.current?.commonAncestorContainer;
            const existing = (ancestor instanceof Element ? ancestor : ancestor?.parentElement)?.closest('a');
            setLinkUrl(existing?.getAttribute('href') || 'https://');
            setLinkOpen(true);
          }}
          aria-expanded={linkOpen}
          aria-label="Link selected text"
        >
          Link
        </button>
        <button
          type="button"
          className="rich-text__btn"
          title="Select text, then mark it as a keyword"
          onMouseDown={(event) => {
            event.preventDefault();
            rememberSelection();
          }}
          onClick={applyKeyword}
        >
          Keyword
        </button>
      </div>
      {linkOpen ? (
        <div className="rich-text__link-row">
          <label className="rich-text__link-label">
            <span className="visually-hidden">Link URL</span>
            <input
              type="text"
              value={linkUrl}
              placeholder="https://"
              onChange={(event) => setLinkUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  applyLink();
                }
              }}
            />
          </label>
          <button type="button" className="button button--primary button--small" onClick={applyLink}>
            Apply
          </button>
          <button type="button" className="button button--subtle button--small" onClick={() => setLinkOpen(false)}>
            Cancel
          </button>
        </div>
      ) : null}
      <div
        ref={editorRef}
        className="rich-text__editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Formatted body content"
        onMouseUp={rememberSelection}
        onKeyUp={rememberSelection}
        onInput={() => emitChange()}
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
      {question.imageSrc ? (
        <img className="question-media" src={question.imageSrc} alt={question.imageAlt || question.title} />
      ) : null}
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
