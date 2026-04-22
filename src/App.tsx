import { useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import contentImage from './assets/content-image.png';
import formulaImage from './assets/formula.png';
import graphImage from './assets/graph.png';
import hideIcon from './assets/icon-hide.png';
import containerIcon from './assets/icon-container.png';
import deleteIcon from './assets/icon-delete.png';
import editIcon from './assets/icon-edit.png';
import moveItemIcon from './assets/icon-move-item.png';
import pageIcon from './assets/icon-page.png';
import kittenImage from './assets/kitten.png';

type Material = {
  id: string;
  title: string;
  type: 'bank' | 'activity';
  hidden?: boolean;
};

type Question = {
  id: string;
  title: string;
  removed?: boolean;
};

const materials: Material[] = [
  { id: 'm1', title: 'Foundational Concepts of Electrochemistry', type: 'bank' },
  { id: 'm2', title: 'Galvanic Cells', type: 'bank' },
  { id: 'm3', title: 'Other Applications of Electrochemistry', type: 'bank' },
  { id: 'm4', title: 'Other Applications of Electrochemistry', type: 'activity', hidden: true },
  { id: 'm5', title: 'Electrochemistry Unit Checkpoint', type: 'activity' },
];

const questionBank: Question[] = [
  { id: 'q1', title: 'Electron Configuration of Sodium', removed: true },
  { id: 'q2', title: 'Valence Electrons in Oxygen' },
  { id: 'q3', title: 'Electron Configuration of Sodium' },
  { id: 'q4', title: 'The Role of Catalysts in Chemical Reactions' },
  { id: 'q5', title: 'Differences Between Ionic and Covalent Bonds' },
  { id: 'q6', title: 'Understanding pH Levels in Solutions' },
  { id: 'q7', title: 'The Process of Photosynthesis at the Molecular Level' },
  { id: 'q8', title: 'What is the Octet Rule and Its Importance?' },
  { id: 'q9', title: 'How Do Acids and Bases Neutralize Each Other?' },
  { id: 'q10', title: 'The Concept of Molarity in Concentration Calculations' },
  { id: 'q11', title: 'How Do Acids and Bases Neutralize Each Other?' },
  { id: 'q12', title: 'What is the Ideal Gas Law and Its Applications?' , removed: true },
  { id: 'q13', title: 'How Do Acids and Bases Neutralize Each Other?' },
  { id: 'q14', title: 'How Do Acids and Bases Neutralize Each Other?' },
];

function App() {
  return (
    <Routes>
      <Route path="/" element={<ManageScreen />} />
      <Route path="/customize" element={<CustomizeScreen />} />
      <Route path="/assessment-default" element={<AssessmentScreen />} />
      <Route path="/inside-bank" element={<ActivityBankScreen bulkEdit={false} />} />
      <Route path="/bulk-edit" element={<ActivityBankScreen bulkEdit />} />
    </Routes>
  );
}

function AppShell({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="brand-mark" aria-hidden="true" />
          <span>OLI Torus</span>
        </div>
        <nav className="topbar__nav" aria-label="Primary">
          <a href="/">Overview</a>
          <a href="/">Insights</a>
          <a className="is-active" href="/">Manage</a>
          <a href="/">Discussion Activity</a>
        </nav>
        <div className="topbar__actions">
          <button className="icon-circle" aria-label="Notifications">
            A
          </button>
          <button className="icon-ghost" aria-label="Help">
            ?
          </button>
        </div>
      </header>
      <div className="hero">Chemistry 101</div>
      <main className={compact ? 'page page--compact' : 'page'}>
        {children}
      </main>
    </div>
  );
}

function InstructorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="instructor-shell">
      <main className="instructor-page">{children}</main>
    </div>
  );
}

function ManageScreen() {
  const sections = [
    {
      title: 'Details',
      description: 'Overview of course section details',
      content: (
        <div className="form-grid">
          <Field label="Course Section ID" value="chem_101_section_a" />
          <Field label="Title" value="Course Section" />
          <Field label="Course Section Type" value="Direct Delivery" />
          <Field label="URL" value="https://tokamak.oli.cmu.edu/sections/heather_course_section_real_ch" action="Copy" />
          <LinkSet
            label="Base Project"
            items={["Heather's REAL Chem Course"]}
          />
        </div>
      ),
    },
    {
      title: 'Instructors',
      description: 'Manage users with instructor level access',
      content: <ListBlock items={['Argos, Instructor', 'Fortunato, Jessica', 'Instructor, Torus']} />,
    },
    {
      title: 'Curriculum',
      description: 'Manage content delivered to students',
      content: (
        <LinkSet
          items={[
            'Preview Course as Student',
            'Customize Content',
            'LTI 1.3 External Tools',
            'Scheduling and Assessment Settings',
            'Manage Source Materials',
          ]}
        />
      ),
    },
    {
      title: 'Certificate Settings',
      description: 'Design and deliver digital credentials to students that complete this course.',
      content: <p className="muted-body">This section does not currently produce a certificate.</p>,
    },
    {
      title: 'Manage',
      description: 'Manage all aspects of course delivery',
      content: <LinkSet items={['Invite Students', 'Edit Section Details', 'Browse Collaborative Spaces']} danger="Delete Section" />,
    },
    {
      title: 'Required Survey',
      description: 'Show a required survey to students who access the course for the first time',
      content: <p className="muted-body">You are not allowed to have student surveys in this resource. Please contact the admin to be granted that permission.</p>,
    },
    {
      title: 'Notes',
      description: 'Enable students to annotate content for saving and sharing within the data community.',
      content: <ToggleRow label="Enable Notes for all pages in the course" enabled />,
    },
    {
      title: 'Course Discussions',
      description: 'Give students a course discussion board',
      content: (
        <div className="stack-sm">
          <ToggleRow label="Enable Course Discussions" enabled />
          <label className="check-row"><input type="checkbox" /> Allow posts to be visible without approval</label>
          <label className="check-row"><input type="checkbox" /> Allow anonymous posts</label>
        </div>
      ),
    },
    {
      title: 'Scoring',
      description: 'View and manage student scores and progress',
      content: <LinkSet items={['Manual Scoring', 'Assessment Scores']} />,
    },
    {
      title: 'Cover Image',
      description: 'Manage the cover image for this section. Max file size is 5 MB.',
      content: (
        <div className="cover-upload">
          <button className="button button--primary">Browse</button>
          <span className="muted-caption">or drag and drop here</span>
          <img className="course-image-preview" src={kittenImage} alt="Course page cover image" />
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="content-column">
        <div className="section-list manage-section-list">
          {sections.map((section) => (
            <SectionRow key={section.title} title={section.title} description={section.description}>
              {section.content}
            </SectionRow>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function CustomizeScreen() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="content-column content-column--wide customize-content">
        <Breadcrumbs items={['Manage', 'Customize Content']} />
        <div className="page-header">
          <div>
            <h1>Chemistry 101</h1>
            <p>Customize your curriculum by adding, removing and rearranging course materials.</p>
          </div>
          <div className="button-row">
            <button className="button button--subtle">Cancel</button>
            <button className="button button--disabled">Save</button>
          </div>
        </div>
        <div className="pill-row">
          <button className="pill pill--active">Curriculum</button>
          <button className="pill">Electrochemistry</button>
        </div>
        <div className="stack-md">
          {materials.map((material) => (
            <MaterialRow key={material.id} material={material} onEdit={() => navigate('/assessment-default')} />
          ))}
        </div>
        <div className="footer-actions">
          <button className="button button--primary">Add Materials</button>
        </div>
      </div>
    </AppShell>
  );
}

function AssessmentScreen() {
  const [bankRemoved, setBankRemoved] = useState(false);

  return (
    <InstructorShell>
      <div className="assessment-layout">
        <AssessmentHeader />
        <div className="assessment-content">
          <div className="assessment-main">
            <WarningBanner />
            <ActivityBankCard
              removed={bankRemoved}
              onRemove={() => setBankRemoved(true)}
              image={contentImage}
              imageAlt="Content image"
              imageCaption="A short context paragraph accompanies this content image to help students answer the question."
              showCriteriaSelector
            />
            <QuestionCard variant="essay" title="Short Response" />
            <ActivityBankCard
              image={graphImage}
              imageAlt="Titration graph"
              imageCaption="A titration curve is shown. Select the point where equivalence is best represented."
              inlineImage={formulaImage}
              inlineImageAlt="Formula reference"
            />
          </div>
          <div className="assessment-footer">
            <button className="button button--subtle">Previous</button>
            <span>All pages auto-saving now.</span>
            <span>Lasts Media edit at 4:48 PM</span>
            <button className="button button--primary">Next</button>
          </div>
        </div>
      </div>
    </InstructorShell>
  );
}

function ActivityBankScreen({ bulkEdit }: { bulkEdit: boolean }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(
    bulkEdit ? questionBank.filter((question) => !question.removed).slice(1, 13).map((question) => question.id) : [],
  );
  const currentQuestion = useMemo(
    () => questionBank.find((question) => question.id === 'q2') ?? questionBank[0],
    [],
  );

  const toggleSelected = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <InstructorShell>
      <div className="bank-screen">
        <button className="back-link" type="button" onClick={() => navigate('/assessment-default')}>
          ← Back
        </button>
        <div className="bank-header">
          <h1>Activity Bank Selection</h1>
          <p>20 questions available</p>
        </div>
        <div className="bank-meta">
          <TagStat label="Number to select" value="1" />
          <TagStat label="Points per question" value="1" />
        </div>
        <div className="criteria-block">
          <div className="criteria-label">Criteria for selection:</div>
          <div className="criteria-tag">Legacy Pool: po1_frequency_wavelength_energy_pool</div>
        </div>
        <div className="toolbar">
          <div className="button-row">
            <button className="button button--tab is-active">Show All</button>
            <button className="button button--tab">Show Included</button>
            <button className="button button--tab">Show Removed</button>
          </div>
          <div className="toolbar__filters">
            <input aria-label="Search questions" className="input" placeholder="Search" />
            <select className="select" aria-label="Learning objectives">
              <option>Learning Objectives</option>
            </select>
            <select className="select" aria-label="Question type">
              <option>Question Type</option>
            </select>
            <select className="select" aria-label="Difficulty">
              <option>Medium</option>
            </select>
            <button className="clear-link">Clear All Filters</button>
          </div>
        </div>
        {bulkEdit ? (
          <button className="button button--danger-light">Remove Selected ({selected.length})</button>
        ) : null}
        <div className="split-pane">
          <div className="question-list-panel">
            <div className="question-list-header">
              <label className="check-row">
                <input type="checkbox" checked={bulkEdit && selected.length > 0} readOnly />
                <span>Question</span>
              </label>
            </div>
            <div className="question-list" role="listbox" aria-label="Questions">
              {questionBank.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  className={
                    selected.includes(question.id)
                      ? 'question-row is-selected'
                      : question.id === currentQuestion.id
                        ? 'question-row is-active'
                        : 'question-row'
                  }
                  onClick={() => (bulkEdit ? toggleSelected(question.id) : undefined)}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(question.id)}
                    onChange={() => toggleSelected(question.id)}
                    aria-label={`Select ${question.title}`}
                  />
                  <div className="question-row__title">
                    <span>{question.title}</span>
                    {question.removed ? <span className="status-pill">Removed</span> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="question-detail">
            <div className="question-detail__header">
              <div>
                <div className="eyebrow">Multiple Choice · 1 point</div>
                <h2>Valence Electrons in Oxygen</h2>
                <p>How many valence electrons does oxygen have?</p>
              </div>
              <button className={bulkEdit ? 'button button--disabled button--small' : 'button button--danger button--small'}>Remove</button>
            </div>
            <AnswerList />
            <button className="detail-link">Hide Feedback</button>
            <div className="tab-strip">
              <button className="tab-strip__tab is-active">Feedback</button>
              <button className="tab-strip__tab">Hints</button>
              <button className="tab-strip__tab">Explanation</button>
            </div>
            <div className="stack-sm">
              <Field label="Feedback for correct answer:" value="Text" multiline />
              <Field label="Feedback for incorrect answer:" value="Text" multiline />
              <Field label="Targeted feedback" value="Text" multiline />
              <p className="muted-caption">L1 Explain how the second law of thermodynamics can be used to determine spontaneity.</p>
            </div>
          </div>
        </div>
      </div>
    </InstructorShell>
  );
}

function AssessmentHeader() {
  return (
    <>
      <div className="instructor-bar">
        <span>Instructor view</span>
      </div>
      <div className="assessment-topbar">
        <div className="brand-mark brand-mark--small" aria-hidden="true" />
        <div className="course-name">THE REALIZATION OF REAL CHEM</div>
        <button className="avatar-badge" aria-label="Profile">
          J
        </button>
      </div>
      <div className="assessment-nav">
        <div className="breadcrumbs-line">Unit 2 / Electrochemistry / Activity Bank Selection / Assessment</div>
        <h1>12. Electrochemistry Unit Checkpoint</h1>
        <p className="muted-body">Customize your assessment by selecting example questions and providing guidance.</p>
      </div>
    </>
  );
}

function ActivityBankCard({
  removed = false,
  onRemove,
  image,
  imageAlt,
  imageCaption,
  showCriteriaSelector = false,
  inlineImage,
  inlineImageAlt,
}: {
  removed?: boolean;
  onRemove?: () => void;
  image?: string;
  imageAlt?: string;
  imageCaption?: string;
  showCriteriaSelector?: boolean;
  inlineImage?: string;
  inlineImageAlt?: string;
}) {
  const navigate = useNavigate();

  return (
    <section className={removed ? 'bank-card bank-card--removed' : 'bank-card'}>
      <div className="bank-card__header">
        <div>
          <div className="muted-caption">20 questions available</div>
          <div className="bank-card__title-row">
            <h2>Activity Bank Selection</h2>
            {removed ? <span className="status-pill">Removed</span> : null}
          </div>
        </div>
        <button className="button button--danger button--small" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="bank-card__stats">
        <TagStat label="Number to select" value="1" />
        <TagStat label="Points per question" value="1" />
      </div>
      <div className="criteria-block">
        <div className="criteria-label">Criteria for selection:</div>
        <div className="criteria-tag">Legacy Pool: po1_frequency_wavelength_energy_pool</div>
      </div>
      {showCriteriaSelector ? (
        <label className="criteria-select-wrap">
          <span className="criteria-select-label">Criteria to select</span>
          <select className="select criteria-select" aria-label="Criteria to select">
            <option>No options available</option>
          </select>
        </label>
      ) : null}
      <div className="example-block">
        <div className="example-header">
          <div>
            <div className="eyebrow">Example question</div>
            <h3>Title of Questions</h3>
          </div>
          <div className="eyebrow">Multiple Choice · 1 point</div>
        </div>
        <p>Below the following metals react with acid solutions:</p>
        <ul className="answer-preview">
          <li>Aluminum</li>
          <li>Magnesium</li>
          <li>Calcium</li>
          <li>Silver</li>
        </ul>
      </div>
      {image ? <img className="question-media" src={image} alt={imageAlt ?? 'Question media'} /> : null}
      {imageCaption ? <p className="question-media-caption">{imageCaption}</p> : null}
      {showCriteriaSelector ? (
        <div className="question-inline-shot-wrap">
          <img className="question-media question-media--small" src={formulaImage} alt="Inline formula reference" />
        </div>
      ) : null}
      {inlineImage ? (
        <div className="question-inline-shot-wrap">
          <img className="question-media question-media--small" src={inlineImage} alt={inlineImageAlt ?? 'Inline reference'} />
        </div>
      ) : null}
      <button className="button button--primary" onClick={() => navigate('/inside-bank')}>
        View more questions
      </button>
    </section>
  );
}

function QuestionCard({ variant, title }: { variant: 'essay'; title: string }) {
  return (
    <section className="question-card">
      <div className="question-card__header">
        <div>
          <div className="eyebrow">Example question</div>
          <h2>{title}</h2>
        </div>
        <div className="button-row">
          <button className="button button--secondary button--small">Edit</button>
          <button className="button button--secondary button--small">Hide</button>
          <button className="button button--danger button--small">Remove</button>
        </div>
      </div>
      <p>A short verbal response. Answers can include text and formula snippets.</p>
      {variant === 'essay' ? <div className="essay-box">Student answer area</div> : null}
    </section>
  );
}

function WarningBanner() {
  return (
    <div className="warning-banner" role="status">
      <strong>Warning:</strong> assessment attempts already exist for this activity. Changes to included questions will only affect future attempts.
    </div>
  );
}

function MaterialRow({ material, onEdit }: { material: Material; onEdit: () => void }) {
  const titleIsLink = material.type === 'bank';
  const rowIcon = material.type === 'bank' ? containerIcon : pageIcon;

  return (
    <div className="material-row">
      <div className="material-row__title">
        <img className="material-icon" src={rowIcon} alt="" aria-hidden="true" />
        {titleIsLink ? (
          <button className="material-link" type="button">
            {material.title}
          </button>
        ) : (
          <span className="material-title">{material.title}</span>
        )}
      </div>
      <div className="button-row">
        {material.type === 'activity' ? (
          <>
            <button className="button button--secondary button--small" onClick={onEdit}>
              <img src={editIcon} alt="" aria-hidden="true" />
              Edit
            </button>
            <button className="button button--secondary button--small">
              <img src={hideIcon} alt="" aria-hidden="true" />
              Hide
            </button>
          </>
        ) : null}
        <button className="button button--secondary button--small">
          <img src={moveItemIcon} alt="" aria-hidden="true" />
          Move
        </button>
        <button className="button button--danger button--small">
          <img src={deleteIcon} alt="" aria-hidden="true" />
          Remove
        </button>
      </div>
    </div>
  );
}

function Breadcrumbs({ items }: { items: string[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={item}>
          {index < items.length - 1 ? <Link to={index === 0 ? '/' : '#'}>{item}</Link> : <span>{item}</span>}
          {index < items.length - 1 ? <span className="breadcrumbs__sep">›</span> : null}
        </span>
      ))}
    </nav>
  );
}

function SectionRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section-row">
      <div className="section-row__label">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="section-row__content">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  action,
  multiline = false,
}: {
  label: string;
  value: string;
  action?: string;
  multiline?: boolean;
}) {
  return (
    <label className={multiline ? 'field field--multiline' : 'field'}>
      <span>{label}</span>
      <div className="field__control">
        {multiline ? <textarea readOnly value={value} rows={3} /> : <input readOnly value={value} />}
        {action ? <button className="button button--subtle button--small">{action}</button> : null}
      </div>
    </label>
  );
}

function LinkSet({ label, items, danger }: { label?: string; items: string[]; danger?: string }) {
  return (
    <div className="link-set">
      {label ? <div className="field-label">{label}</div> : null}
      {items.map((item) => (
        item === 'Customize Content' ? (
          <Link to="/customize" key={item}>
            {item}
          </Link>
        ) : (
          <a href="/" key={item}>
            {item}
          </a>
        )
      ))}
      {danger ? <button className="text-button">{danger}</button> : null}
    </div>
  );
}

function ListBlock({ items }: { items: string[] }) {
  return (
    <div className="stack-xs">
      {items.map((item) => (
        <div key={item}>{item}</div>
      ))}
    </div>
  );
}

function ToggleRow({ label, enabled }: { label: string; enabled?: boolean }) {
  return (
    <div className="toggle-row">
      <span>{label}</span>
      <button className={enabled ? 'toggle is-enabled' : 'toggle'} aria-pressed={enabled}>
        <span />
      </button>
    </div>
  );
}

function TagStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="tag-stat">
      <span>{label}:</span>
      <strong>{value}</strong>
    </div>
  );
}

function AnswerList() {
  return (
    <div className="answer-list">
      {['A. 4', 'B. 6', 'C. 8', 'D. 2'].map((answer, index) => (
        <div key={answer} className={index === 1 ? 'answer-row is-correct' : 'answer-row'}>
          {answer}
        </div>
      ))}
    </div>
  );
}

export default App;
