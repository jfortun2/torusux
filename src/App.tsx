import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import formulaImage from './assets/formula.png';
import graphImage from './assets/graph.png';
import hideIcon from './assets/icon-hide.png';
import checkIcon from './assets/icon-check.png';
import chevronDownIcon from './assets/icon-chevron-down.png';
import resetIcon from './assets/icon-reset.png';
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

type BreadcrumbItem = string | { label: string; to?: string };
type QuestionKind = 'mcq' | 'multi-input' | 'cata' | 'short-answer';
type ExampleQuestion = {
  kind: QuestionKind;
  points: number;
  title: string;
  prompt: string;
  learningObjective: string;
  choices?: string[];
  cataStatements?: string[];
  showGraph?: boolean;
};
type AssessmentSelection = {
  id: string;
  availableQuestions: number;
  numberToSelect: number;
  criteriaTag: string;
  exampleQuestions: ExampleQuestion[];
};
type BankQuestionRow = {
  id: string;
  title: string;
  prompt: string;
  kind: QuestionKind;
  points: number;
  learningObjective: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  choices?: string[];
  cataStatements?: string[];
  removed?: boolean;
};

const materials: Material[] = [
  { id: 'm1', title: 'Foundational Concepts of Electrochemistry', type: 'bank' },
  { id: 'm2', title: 'Galvanic Cells', type: 'bank' },
  { id: 'm3', title: 'Other Applications of Electrochemistry', type: 'bank' },
  { id: 'm4', title: 'Other Applications of Electrochemistry', type: 'activity', hidden: true },
  { id: 'm5', title: 'Electrochemistry Unit Checkpoint', type: 'activity' },
];

const assessmentSelections: AssessmentSelection[] = [
  {
    id: 'ab-1',
    availableQuestions: 24,
    numberToSelect: 3,
    criteriaTag: 'LO focus: balancing redox reactions in acidic media',
    exampleQuestions: [
      {
        kind: 'multi-input',
        points: 8,
        title: 'Redox Balancing Practice',
        prompt: 'Balance the following reaction in acidic solution.',
        learningObjective: 'LO 1.1 Balance redox equations in acidic conditions.',
      },
      {
        kind: 'short-answer',
        points: 6,
        title: 'Balancing Rationale',
        prompt: 'In 2-3 sentences, explain how you verified atom and charge balance after assigning coefficients.',
        learningObjective: 'LO 1.1 Balance redox equations in acidic conditions.',
      },
      {
        kind: 'mcq',
        points: 8,
        title: 'Coefficient Checkpoint',
        prompt: 'Which coefficient set correctly balances the reaction in acidic solution?',
        learningObjective: 'LO 1.1 Balance redox equations in acidic conditions.',
        choices: ['Set A', 'Set B', 'Set C', 'Set D'],
      },
    ],
  },
  {
    id: 'ab-2',
    availableQuestions: 18,
    numberToSelect: 1,
    criteriaTag: 'Skill target: interpret titration curve equivalence regions',
    exampleQuestions: [
      {
        kind: 'mcq',
        points: 10,
        title: 'Titration Interpretation',
        prompt: 'At which point in the titration is the number of moles of analyte and titrant the same?',
        learningObjective: 'LO 1.2 Identify equivalence points from titration curves.',
        choices: ['Point A', 'Point B', 'Point C', 'Point D'],
        showGraph: true,
      },
    ],
  },
  {
    id: 'ab-3',
    availableQuestions: 12,
    numberToSelect: 2,
    criteriaTag: 'Concept set: battery chemistry and fuel-cell fundamentals',
    exampleQuestions: [
      {
        kind: 'cata',
        points: 5,
        title: 'Battery Concepts',
        prompt: 'Which of the following statements are true?',
        learningObjective: 'LO 2.1 Evaluate electrochemical cell statements for accuracy.',
        cataStatements: [
          'Alkaline batteries generally have worse performance than dry cells.',
          'The lead acid battery is a type of secondary battery.',
          'Fuel cells are galvanic cells that convert chemical energy into electrical energy.',
          'Fuel cells produce electricity continuously as long as fuel is available.',
          'Primary and secondary batteries may or may not be rechargeable, depending on battery materials.',
        ],
      },
    ],
  },
  {
    id: 'ab-4',
    availableQuestions: 16,
    numberToSelect: 2,
    criteriaTag: 'Reasoning: compare endpoint and equivalence behavior',
    exampleQuestions: [
      {
        kind: 'short-answer',
        points: 7,
        title: 'Acid-Base Equivalence Reasoning',
        prompt: 'Explain why the equivalence point does not always occur at pH 7 for weak acid-strong base titrations.',
        learningObjective: 'LO 1.3 Distinguish pre-equivalence, equivalence, and post-equivalence stages.',
      },
    ],
  },
  {
    id: 'ab-5',
    availableQuestions: 22,
    numberToSelect: 4,
    criteriaTag: 'Procedural: complete balanced ionic equation terms',
    exampleQuestions: [
      {
        kind: 'multi-input',
        points: 8,
        title: 'Reaction Coefficients',
        prompt: 'Complete the coefficient and species dropdowns for the balanced equation.',
        learningObjective: 'LO 2.2 Select correct coefficients for balanced ionic reactions.',
      },
    ],
  },
  {
    id: 'ab-6',
    availableQuestions: 14,
    numberToSelect: 2,
    criteriaTag: 'Concept check: spontaneity and entropy claims',
    exampleQuestions: [
      {
        kind: 'cata',
        points: 5,
        title: 'Thermodynamics Claims',
        prompt: 'Select every statement that aligns with the second law of thermodynamics.',
        learningObjective: 'LO 3.1 Connect entropy trends to spontaneity decisions.',
        cataStatements: [
          'A process can be spontaneous even if its rate is very slow.',
          'A positive total entropy change favors spontaneity.',
          'Spontaneous reactions always release heat.',
          'A reaction may be nonspontaneous under one temperature and spontaneous at another.',
          'Thermodynamic favorability guarantees completion in practical time.',
        ],
      },
    ],
  },
  {
    id: 'ab-7',
    availableQuestions: 11,
    numberToSelect: 1,
    criteriaTag: 'Data interpretation: identify buffering transitions',
    exampleQuestions: [
      {
        kind: 'mcq',
        points: 10,
        title: 'Graph Reading',
        prompt: 'Which option best identifies where the slope indicates the strongest buffering transition?',
        learningObjective: 'LO 1.4 Interpret slope behavior and buffering regions on pH curves.',
        choices: ['Region A', 'Region B', 'Region C', 'Region D'],
      },
    ],
  },
  {
    id: 'ab-8',
    availableQuestions: 19,
    numberToSelect: 3,
    criteriaTag: 'Mechanics: construct oxidation half-reactions',
    exampleQuestions: [
      {
        kind: 'multi-input',
        points: 8,
        title: 'Half-Reaction Setup',
        prompt: 'Choose each dropdown to complete the oxidation half-reaction in acidic medium.',
        learningObjective: 'LO 2.3 Construct oxidation and reduction half-reactions.',
      },
    ],
  },
  {
    id: 'ab-9',
    availableQuestions: 15,
    numberToSelect: 2,
    criteriaTag: 'Core principles: galvanic cell directionality and sign',
    exampleQuestions: [
      {
        kind: 'cata',
        points: 5,
        title: 'Electrochemistry Checks',
        prompt: 'Mark all statements that are consistent with galvanic cell behavior.',
        learningObjective: 'LO 2.4 Compare galvanic and electrolytic cell properties.',
        cataStatements: [
          'Electrons flow from anode to cathode through the external circuit.',
          'Salt bridges help maintain charge neutrality in each half-cell.',
          'The cathode is always negatively charged in every electrochemical cell.',
          'Oxidation occurs at the anode.',
          'A positive cell potential indicates a spontaneous galvanic reaction.',
        ],
      },
    ],
  },
  {
    id: 'ab-10',
    availableQuestions: 13,
    numberToSelect: 1,
    criteriaTag: 'Experimental interpretation: endpoint vs equivalence',
    exampleQuestions: [
      {
        kind: 'short-answer',
        points: 7,
        title: 'Endpoint Identification',
        prompt: 'Describe one experimental reason an indicator endpoint can differ from the true equivalence point.',
        learningObjective: 'LO 1.5 Differentiate indicator endpoints from equivalence points.',
      },
    ],
  },
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
            <MaterialRow
              key={material.id}
              material={material}
              onEdit={(assessmentTitle) =>
                navigate('/assessment-default', {
                  state: {
                    assessmentTitle,
                    breadcrumbTrail: [
                      { label: 'Manage', to: '/' },
                      { label: 'Customize Content', to: '/customize' },
                      { label: assessmentTitle },
                    ],
                  },
                })
              }
            />
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
  const [removedBanks, setRemovedBanks] = useState<string[]>([]);
  const [showBankShortcuts, setShowBankShortcuts] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const toggleRemoved = (id: string, label: string) => {
    setRemovedBanks((current) => {
      const willRestore = current.includes(id);
      setToastMessage(willRestore ? `${label} restored.` : `${label} removed.`);
      return willRestore ? current.filter((bankId) => bankId !== id) : [...current, id];
    });
  };

  const jumpTo = (targetId: string) => {
    const node = document.getElementById(targetId);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowBankShortcuts(false);
    }
  };

  return (
    <InstructorShell>
      <div className="assessment-layout">
        <AssessmentHeader />
        <div className="assessment-content">
          <div className="assessment-main">
            <div className="assessment-shortcuts-sticky">
              <div className="assessment-counts">
                <button className="assessment-counts__trigger" onClick={() => setShowBankShortcuts((current) => !current)}>
                  Jump to section
                  <img
                    src={chevronDownIcon}
                    alt=""
                    aria-hidden="true"
                    className={showBankShortcuts ? 'assessment-counts__chevron is-open' : 'assessment-counts__chevron'}
                  />
                </button>
                <span className="assessment-counts__meta">{assessmentSelections.length} Activity Banks · 1 Embedded Question</span>
              </div>
              {showBankShortcuts ? (
                <div className="assessment-shortcuts-wrap">
                  <p className="assessment-shortcuts__label">Jump to section</p>
                  <div className="assessment-shortcuts" role="navigation" aria-label="Activity bank shortcuts">
                    {assessmentSelections.map((selection, index) => (
                      <button key={selection.id} className="shortcut-chip" onClick={() => jumpTo(`bank-${selection.id}`)}>
                        Bank {index + 1}
                      </button>
                    ))}
                    <button className="shortcut-chip shortcut-chip--embedded" onClick={() => jumpTo('embedded-question')}>
                      Embedded Question
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            {assessmentSelections.map((selection) => (
              <ActivityBankSelectionCard
                key={selection.id}
                selection={selection}
                removed={removedBanks.includes(selection.id)}
                onToggleRemove={() => toggleRemoved(selection.id, 'Activity bank')}
              />
            ))}
            <section className="embedded-question" id="embedded-question">
              <QuestionTypeCard
                kind="mcq"
                points={6}
                title="Electrochemistry Exit Question"
                prompt="Which statement best explains why a galvanic cell potential decreases as reactants are consumed?"
                learningObjective="LO 2.5 Explain how concentration changes affect cell potential."
                choices={[
                  'The anode starts reducing instead of oxidizing.',
                  'Reaction quotient shifts and lowers the driving force toward equilibrium.',
                  'Electrons are no longer transferred through the external circuit.',
                  'The salt bridge blocks ion movement once products form.',
                ]}
                embedded
              />
            </section>
          </div>
          <div className="assessment-footer">
            <button className="button button--secondary">Previous</button>
            <span>All pages auto-saving now.</span>
            <span>Lasts Media edit at 4:48 PM</span>
            <button className="button button--primary">Next</button>
          </div>
        </div>
      </div>
      {toastMessage ? <SuccessToast message={toastMessage} /> : null}
    </InstructorShell>
  );
}

function ActivityBankScreen({ bulkEdit }: { bulkEdit: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { bankId?: string } | null;
  const selectedBank = assessmentSelections.find((bank) => bank.id === state?.bankId) ?? assessmentSelections[0];
  const generatedQuestionCount = selectedBank.availableQuestions;
  const baseQuestions: BankQuestionRow[] = Array.from({ length: generatedQuestionCount }).map((_, index) => {
    const seeded = selectedBank.exampleQuestions[index % selectedBank.exampleQuestions.length];
    const difficulty = index % 3 === 0 ? 'Easy' : index % 3 === 1 ? 'Medium' : 'Hard';
    return {
      id: `${selectedBank.id}-q-${index + 1}`,
      title: index < selectedBank.exampleQuestions.length ? seeded.title : `${seeded.title} Variant ${index + 1}`,
      prompt: seeded.prompt,
      kind: seeded.kind,
      points: seeded.points,
      learningObjective: seeded.learningObjective,
      choices: seeded.choices,
      cataStatements: seeded.cataStatements,
      difficulty,
      removed: index % 7 === 0,
    };
  });
  const [questionRows, setQuestionRows] = useState<BankQuestionRow[]>(baseQuestions);
  const [filterMode, setFilterMode] = useState<'all' | 'included' | 'removed'>('all');
  const [searchText, setSearchText] = useState('');
  const [learningObjectiveFilter, setLearningObjectiveFilter] = useState('all');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const availableQuestionCount = questionRows.filter((question) => !question.removed).length;
  const filteredQuestions = questionRows.filter((question) => {
    if (filterMode === 'included' && question.removed) return false;
    if (filterMode === 'removed' && !question.removed) return false;
    if (learningObjectiveFilter !== 'all' && question.learningObjective !== learningObjectiveFilter) return false;
    if (questionTypeFilter !== 'all' && question.kind !== questionTypeFilter) return false;
    if (difficultyFilter !== 'all' && question.difficulty !== difficultyFilter) return false;
    if (searchText && !`${question.title} ${question.prompt}`.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });
  const [selected, setSelected] = useState<string[]>(
    bulkEdit ? filteredQuestions.filter((question) => !question.removed).slice(0, 6).map((question) => question.id) : [],
  );
  const [activeQuestionId, setActiveQuestionId] = useState(filteredQuestions[0]?.id ?? baseQuestions[0]?.id ?? '');
  const currentQuestion = filteredQuestions.find((question) => question.id === activeQuestionId) ?? filteredQuestions[0] ?? baseQuestions[0];
  const allVisibleSelected = filteredQuestions.length > 0 && filteredQuestions.every((question) => selected.includes(question.id));

  const toggleSelected = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelected((current) => current.filter((id) => !filteredQuestions.some((question) => question.id === id)));
      return;
    }
    setSelected((current) => Array.from(new Set([...current, ...filteredQuestions.map((question) => question.id)])));
  };

  const clearFilters = () => {
    setFilterMode('all');
    setSearchText('');
    setLearningObjectiveFilter('all');
    setQuestionTypeFilter('all');
    setDifficultyFilter('all');
  };

  const questionTypeLabel = (kind: QuestionKind) =>
    kind === 'mcq' ? 'Multiple Choice' : kind === 'multi-input' ? 'Multi Input' : kind === 'cata' ? 'Check All That Apply' : 'Short Answer';

  const learningObjectiveOptions = Array.from(new Set(questionRows.map((question) => question.learningObjective)));
  const questionTypeOptions = Array.from(new Set(questionRows.map((question) => question.kind)));

  useEffect(() => {
    setQuestionRows(baseQuestions);
    setFilterMode('all');
    setSearchText('');
    setLearningObjectiveFilter('all');
    setQuestionTypeFilter('all');
    setDifficultyFilter('all');
    setSelected(bulkEdit ? baseQuestions.filter((question) => !question.removed).slice(0, 6).map((question) => question.id) : []);
    setActiveQuestionId(baseQuestions[0]?.id ?? '');
  }, [selectedBank.id, bulkEdit]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const toggleQuestionRemoved = (id: string) => {
    setQuestionRows((current) =>
      current.map((question) => {
        if (question.id !== id) return question;
        const nextRemoved = !question.removed;
        setToastMessage(nextRemoved ? 'Question removed.' : 'Question restored.');
        return { ...question, removed: nextRemoved };
      }),
    );
  };

  return (
    <InstructorShell>
      <div className="bank-screen">
        <button className="back-link" type="button" onClick={() => navigate('/assessment-default')}>
          ← Back
        </button>
        <div className="bank-screen__summary">
          <div className="bank-header">
            <h1>Activity Bank Selection</h1>
            <p>{availableQuestionCount} questions available</p>
          </div>
          <div className="bank-meta">
            <TagStat label="Number to select" value={String(selectedBank.numberToSelect)} />
            <TagStat label="Points per question" value={String(selectedBank.exampleQuestions[0]?.points ?? 1)} />
          </div>
          <div className="criteria-block">
            <div className="criteria-label">Criteria for selection:</div>
            <div className="criteria-tag">{selectedBank.criteriaTag}</div>
          </div>
        </div>
        <div className="toolbar toolbar--bank">
          <div className="filter-tabs" role="tablist" aria-label="Question visibility filters">
            <button className={filterMode === 'all' ? 'filter-tab is-active' : 'filter-tab'} onClick={() => setFilterMode('all')}>
              Show All
            </button>
            <button className={filterMode === 'included' ? 'filter-tab is-active' : 'filter-tab'} onClick={() => setFilterMode('included')}>
              Show Included
            </button>
            <button className={filterMode === 'removed' ? 'filter-tab is-active' : 'filter-tab'} onClick={() => setFilterMode('removed')}>
              Show Removed
            </button>
          </div>
          <div className="toolbar__filters toolbar__filters--search">
            <div className="search-field">
              <span aria-hidden="true" className="search-field__icon">⌕</span>
              <input aria-label="Search questions" className="input input--search" placeholder="Search" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
            </div>
            <select className="select filter-select" aria-label="Learning objectives" value={learningObjectiveFilter} onChange={(event) => setLearningObjectiveFilter(event.target.value)}>
              <option value="all">Learning Objectives</option>
              {learningObjectiveOptions.map((objective) => (
                <option key={objective} value={objective}>
                  {objective}
                </option>
              ))}
            </select>
            <select className="select filter-select" aria-label="Question type" value={questionTypeFilter} onChange={(event) => setQuestionTypeFilter(event.target.value)}>
              <option value="all">Question Type</option>
              {questionTypeOptions.map((kind) => (
                <option key={kind} value={kind}>
                  {questionTypeLabel(kind)}
                </option>
              ))}
            </select>
            <select className="select filter-select" aria-label="Difficulty" value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}>
              <option value="all">Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <button className="clear-link clear-link--toolbar" onClick={clearFilters}>
              <img src={deleteIcon} alt="" aria-hidden="true" />
              Clear All Filters
            </button>
          </div>
        </div>
        {bulkEdit ? (
          <button className="button button--danger-light">Remove Selected ({selected.length})</button>
        ) : null}
        {toastMessage ? <SuccessToast message={toastMessage} inline /> : null}
        <div className="split-pane">
          <div className="question-list-panel">
            <div className="question-list-header">
              <div className="muted-caption">Showing {filteredQuestions.length} of {availableQuestionCount} available questions</div>
              <label className="check-row">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                <span>Question</span>
              </label>
            </div>
            <div className="question-list" role="listbox" aria-label="Questions">
              {filteredQuestions.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  className={[
                    'question-row',
                    selected.includes(question.id) ? 'is-selected' : '',
                    question.removed ? 'is-removed' : '',
                    question.id === currentQuestion?.id ? 'is-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    setActiveQuestionId(question.id);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(question.id)}
                    onChange={() => toggleSelected(question.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Select ${question.title}`}
                  />
                  <div className="question-row__title">
                    <span>{question.title}</span>
                    {question.removed ? <span className="removed-pill">Removed</span> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="question-detail">
            <div className="question-detail__header">
              <div>
                <div className="eyebrow">{questionTypeLabel(currentQuestion?.kind ?? 'mcq')} · {currentQuestion?.points ?? 1} point{(currentQuestion?.points ?? 1) > 1 ? 's' : ''}</div>
                <h2>{currentQuestion?.title ?? 'Question'}</h2>
                <p>{currentQuestion?.prompt ?? 'Question prompt'}</p>
              </div>
              {bulkEdit ? (
                <button className="button button--disabled button--small">Remove</button>
              ) : (
                <button
                  className={currentQuestion?.removed ? 'button button--secondary button--small' : 'button button--danger button--small'}
                  onClick={() => {
                    if (!currentQuestion) return;
                    toggleQuestionRemoved(currentQuestion.id);
                  }}
                >
                  {currentQuestion?.removed ? <img src={resetIcon} alt="" aria-hidden="true" /> : null}
                  {currentQuestion?.removed ? 'Restore' : 'Remove'}
                </button>
              )}
            </div>
            {currentQuestion ? <BankQuestionPreview question={currentQuestion} /> : null}
          </div>
        </div>
      </div>
    </InstructorShell>
  );
}

function SuccessToast({ message, inline = false }: { message: string; inline?: boolean }) {
  return <div className={inline ? 'success-toast success-toast--inline' : 'success-toast'}>{message}</div>;
}

function BankQuestionPreview({ question }: { question: BankQuestionRow }) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'answer' | 'hints' | 'explanation'>('answer');
  const [selectedDropdownPart, setSelectedDropdownPart] = useState(1);
  useEffect(() => {
    setExpanded(true);
  }, [question.id]);

  return (
    <div className="bank-question-preview">
      {question.kind === 'mcq' ? <img className="question-media" src={graphImage} alt="Titration graph" /> : null}
      {question.kind === 'mcq' ? (
        <div className="question-answer-list">
          {(question.choices ?? ['Option A', 'Option B', 'Option C', 'Option D']).map((choice) => (
            <div key={choice} className="answer-chip">
              {choice}
            </div>
          ))}
        </div>
      ) : null}
      {question.kind === 'multi-input' ? (
        <div className="multi-input-row">
          <button className={selectedDropdownPart === 1 ? 'dropdown-chip is-selected' : 'dropdown-chip'} onClick={() => setSelectedDropdownPart(1)}>
            Dropdown
          </button>
          <span>Cu +</span>
          <button className={selectedDropdownPart === 2 ? 'dropdown-chip is-selected' : 'dropdown-chip'} onClick={() => setSelectedDropdownPart(2)}>
            Dropdown
          </button>
          <span>NO3 +</span>
          <button className={selectedDropdownPart === 3 ? 'dropdown-chip is-selected' : 'dropdown-chip'} onClick={() => setSelectedDropdownPart(3)}>
            Dropdown
          </button>
        </div>
      ) : null}
      {question.kind === 'cata' ? (
        <div className="question-answer-list">
          {(question.cataStatements ?? ['Statement A', 'Statement B', 'Statement C']).map((statement) => (
            <label key={statement} className="cata-option">
              <input type="checkbox" readOnly />
              <span>{statement}</span>
            </label>
          ))}
        </div>
      ) : null}
      {question.kind === 'short-answer' ? <div className="short-answer-box">Student response area</div> : null}
      <button className="detail-toggle" onClick={() => setExpanded((current) => !current)}>
        {expanded ? 'Hide Details' : 'View Details'}
        <img src={chevronDownIcon} alt="" aria-hidden="true" className={expanded ? 'chevron-icon is-open' : 'chevron-icon'} />
      </button>
      {expanded ? (
        <div className="question-details">
          <div className="tab-strip">
            <button className={activeTab === 'answer' ? 'tab-strip__tab is-active' : 'tab-strip__tab'} onClick={() => setActiveTab('answer')}>
              Answer Key
            </button>
            <button className={activeTab === 'hints' ? 'tab-strip__tab is-active' : 'tab-strip__tab'} onClick={() => setActiveTab('hints')}>
              Hints
            </button>
            <button className={activeTab === 'explanation' ? 'tab-strip__tab is-active' : 'tab-strip__tab'} onClick={() => setActiveTab('explanation')}>
              Explanation
            </button>
          </div>
          <div className="tab-panel">
            {activeTab === 'answer' ? (
              <div className="answer-key-section">
                {question.kind === 'mcq' ? (
                  <>
                    {(question.choices ?? ['Option A', 'Option B', 'Option C', 'Option D']).map((choice, idx) => (
                      <label key={choice} className="mcq-choice-row">
                        <span className={idx === 1 ? 'fake-radio is-selected' : 'fake-radio'} />
                        <span>{choice}</span>
                      </label>
                    ))}
                    <div className="feedback-block">
                      <p>Feedback for correct answer:</p>
                      <div className="muted-input">Correct. This choice aligns with the expected concept and the most accurate interpretation of the prompt.</div>
                    </div>
                    <div className="feedback-block">
                      <p>Feedback for incorrect answer:</p>
                      <div className="muted-input">Incorrect. Revisit the key relationship tested in this item and compare each option against that rule.</div>
                    </div>
                    <div className="feedback-block">
                      <p>Activity scoring method:</p>
                      <label className="check-row">
                        <input type="checkbox" />
                        <span>Use default scoring</span>
                      </label>
                    </div>
                    <div className="feedback-block">
                      <p>Scoring:</p>
                      <div className="scoring-grid">
                        <span>Correct answer score:</span>
                        <span className="score-pill">{question.points}</span>
                        <span>Incorrect answer score:</span>
                        <span className="score-pill">0</span>
                      </div>
                    </div>
                  </>
                ) : null}
                {question.kind === 'multi-input' ? (
                  <>
                    <p className="part-heading">Part {selectedDropdownPart}: Dropdown</p>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                      <label key={value} className="mcq-choice-row">
                        <span className={value === selectedDropdownPart + 2 ? 'fake-radio is-selected' : 'fake-radio'} />
                        <span>{value}</span>
                      </label>
                    ))}
                    <div className="feedback-block">
                      <p>Feedback for correct answer:</p>
                      <div className="muted-input">Correct for part {selectedDropdownPart}. This value preserves atom and charge balance.</div>
                    </div>
                    <div className="feedback-block">
                      <p>Feedback for incorrect answer:</p>
                      <div className="muted-input">Incorrect for part {selectedDropdownPart}. Re-evaluate the balancing constraints for this position.</div>
                    </div>
                    <div className="feedback-block">
                      <p>Activity scoring method:</p>
                      <label className="check-row">
                        <input type="checkbox" />
                        <span>Use default scoring</span>
                      </label>
                    </div>
                    <div className="feedback-block">
                      <div className="scoring-grid">
                        <span>Scoring strategy</span>
                        <span className="strategy-select">Total</span>
                      </div>
                    </div>
                    <div className="feedback-block">
                      <p>Scoring:</p>
                      <div className="scoring-grid">
                        <span>Correct answer score:</span>
                        <span className="score-pill">2</span>
                        <span>Incorrect answer score:</span>
                        <span className="score-pill">0</span>
                      </div>
                    </div>
                  </>
                ) : null}
                {question.kind === 'cata' ? (
                  <>
                    {(question.cataStatements ?? ['Statement A', 'Statement B', 'Statement C']).map((statement, idx) => (
                      <label key={statement} className="cata-answer-row">
                        <span className={idx === 0 || idx === 2 ? 'fake-checkbox is-selected' : 'fake-checkbox'} />
                        <span>{statement}</span>
                      </label>
                    ))}
                    <div className="feedback-block">
                      <p>Feedback for correct answer:</p>
                      <div className="muted-input">Correct. The selected statements match the conceptually valid conditions.</div>
                    </div>
                    <div className="feedback-block">
                      <p>Feedback for incorrect answer:</p>
                      <div className="muted-input">Incorrect. One or more selected statements conflict with the core concept.</div>
                    </div>
                    <div className="feedback-block">
                      <p>Activity scoring method:</p>
                      <label className="check-row">
                        <input type="checkbox" />
                        <span>Use default scoring</span>
                      </label>
                    </div>
                    <div className="feedback-block">
                      <div className="scoring-grid">
                        <span>Scoring strategy</span>
                        <span className="strategy-select">Total</span>
                      </div>
                    </div>
                    <div className="feedback-block">
                      <p>Scoring:</p>
                      <div className="scoring-grid">
                        <span>Correct answer score:</span>
                        <span className="score-pill">{question.points}</span>
                        <span>Incorrect answer score:</span>
                        <span className="score-pill">0</span>
                      </div>
                    </div>
                  </>
                ) : null}
                {question.kind === 'short-answer' ? (
                  <>
                    <div className="feedback-block">
                      <p>Expected response:</p>
                      <div className="muted-input">A complete response should include the core concept, a justification step, and correct scientific terminology.</div>
                    </div>
                    <div className="feedback-block">
                      <p>Activity scoring method:</p>
                      <label className="check-row">
                        <input type="checkbox" />
                        <span>Use rubric scoring</span>
                      </label>
                    </div>
                    <div className="feedback-block">
                      <p>Scoring:</p>
                      <div className="scoring-grid">
                        <span>Maximum score:</span>
                        <span className="score-pill">{question.points}</span>
                        <span>Minimum score:</span>
                        <span className="score-pill">0</span>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
            {activeTab === 'hints' ? (
              <div className="tab-stack">
                <p>Hint 1 for this question type appears here.</p>
                <p>Hint 2 for this question type appears here.</p>
              </div>
            ) : null}
            {activeTab === 'explanation' ? (
              <div className="tab-stack">
                <p>Explanation content follows the same format as the assessment-default page.</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="bank-question-preview__objective">
        <strong>LO</strong> {question.learningObjective}
      </div>
    </div>
  );
}

function AssessmentHeader() {
  const location = useLocation();
  const state = location.state as { breadcrumbTrail?: BreadcrumbItem[]; assessmentTitle?: string } | null;
  const breadcrumbTrail = state?.breadcrumbTrail ?? [
    { label: 'Customize Content', to: '/customize' },
    { label: 'Assessment' },
  ];
  const assessmentTitle = state?.assessmentTitle ?? '12. Electrochemistry Unit Checkpoint';

  return (
    <>
      <div className="instructor-bar">
        <div className="instructor-pill">
          <span className="instructor-pill__icon" aria-hidden="true">
            ▥
          </span>
          <span>Instructor view</span>
        </div>
      </div>
      <div className="assessment-topbar">
        <div className="assessment-topbar__logo">
          <div className="brand-mark brand-mark--small" aria-hidden="true" />
          <span>OLI Torus</span>
        </div>
        <div className="course-name">THE REALIZATION OF REAL CHEM</div>
        <button className="assessment-profile" aria-label="Profile">
          J
        </button>
      </div>
      <div className="assessment-nav">
        <Breadcrumbs items={breadcrumbTrail} />
        <h1 className="assessment-title">{assessmentTitle}</h1>
        <div className="learning-objectives">
          <div className="learning-objectives__label">Learning Objectives</div>
          <div className="learning-objective-item">
            <img src={checkIcon} alt="" aria-hidden="true" />
            <span>LO 1.1 Calculate the concentration of ions in solution.</span>
          </div>
          <div className="learning-objective-item">
            <img src={checkIcon} alt="" aria-hidden="true" />
            <span>LO 1.2 Distinguish between oxidation and reduction processes.</span>
          </div>
        </div>
      </div>
    </>
  );
}

function ActivityBankSelectionCard({
  selection,
  removed,
  onToggleRemove,
}: {
  selection: AssessmentSelection;
  removed: boolean;
  onToggleRemove: () => void;
}) {
  const navigate = useNavigate();
  const [exampleIndex, setExampleIndex] = useState(0);
  const exampleQuestion = selection.exampleQuestions[exampleIndex] ?? selection.exampleQuestions[0];

  return (
    <section id={`bank-${selection.id}`} className={removed ? 'bank-card bank-card--removed' : 'bank-card'}>
      <div className="bank-card__header">
        <div>
          <div className="muted-caption">{selection.availableQuestions} questions available</div>
          <div className="bank-card__title-row">
            <h2>Activity Bank Selection</h2>
            {removed ? <span className="status-pill">Removed</span> : null}
          </div>
        </div>
        <button className={removed ? 'button button--secondary button--small' : 'button button--danger button--small'} onClick={onToggleRemove}>
          {removed ? 'Restore' : 'Remove'}
        </button>
      </div>
      <div className="bank-card__stats">
        <TagStat label="Number to select" value={String(selection.numberToSelect)} />
        <TagStat label="Points per question" value={String(exampleQuestion.points)} />
      </div>
      <div className="criteria-block">
        <div className="criteria-label">Criteria for selection:</div>
        <div className="criteria-tag">{selection.criteriaTag}</div>
      </div>
      <button
        className="button button--primary button--small bank-card__action"
        onClick={() =>
          navigate('/inside-bank', {
            state: { bankId: selection.id },
          })
        }
      >
        View more questions
      </button>
      <div className="example-block">
        <div className="example-header">
          <p className="example-label">Example selection:</p>
          {selection.exampleQuestions.length > 1 ? (
            <div className="example-pagination">
              <button
                className="button button--secondary button--small pagination-nav-btn"
                onClick={() => setExampleIndex((current) => (current === 0 ? selection.exampleQuestions.length - 1 : current - 1))}
              >
                Previous
              </button>
              <span>
                {exampleIndex + 1} / {selection.exampleQuestions.length}
              </span>
              <div className="example-shortcuts" role="tablist" aria-label="Example question shortcuts">
                {selection.exampleQuestions.map((_, index) => (
                  <button
                    key={index}
                    className={exampleIndex === index ? 'example-shortcut is-active' : 'example-shortcut'}
                    onClick={() => setExampleIndex(index)}
                  >
                    Q{index + 1}
                  </button>
                ))}
              </div>
              <button
                className="button button--secondary button--small pagination-nav-btn"
                onClick={() => setExampleIndex((current) => (current + 1) % selection.exampleQuestions.length)}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
        <QuestionTypeCard
          kind={exampleQuestion.kind}
          points={exampleQuestion.points}
          title={exampleQuestion.title}
          prompt={exampleQuestion.prompt}
          learningObjective={exampleQuestion.learningObjective}
          choices={exampleQuestion.choices}
          cataStatements={exampleQuestion.cataStatements}
          showGraph={exampleQuestion.showGraph}
        />
      </div>
    </section>
  );
}

function QuestionTypeCard({
  kind,
  points,
  title = 'Title of Question',
  prompt,
  learningObjective,
  choices,
  cataStatements,
  showGraph = false,
  embedded = false,
}: {
  kind: QuestionKind;
  points: number;
  title?: string;
  prompt: string;
  learningObjective: string;
  choices?: string[];
  cataStatements?: string[];
  showGraph?: boolean;
  embedded?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'answer' | 'hints' | 'explanation'>('answer');
  const [selectedDropdownPart, setSelectedDropdownPart] = useState(1);

  const questionTypeLabel =
    kind === 'mcq' ? 'Multiple Choice' : kind === 'multi-input' ? 'Multi Input' : kind === 'cata' ? 'Check All That Apply' : 'Short Answer';

  const renderAnswerKey = () => {
    if (kind === 'mcq') {
      return (
        <div className="answer-key-section">
          {(choices ?? ['Point A', 'Point B', 'Point C', 'Point D']).map((option, idx) => (
            <label key={option} className="mcq-choice-row">
              <span className={idx === 2 ? 'fake-radio is-selected' : 'fake-radio'} />
              <span>{option}</span>
            </label>
          ))}
          <div className="feedback-block">
            <p>Feedback for correct answer:</p>
            <div className="muted-input">Correct. If there are equal moles of acid and base in a titration, then the solution is at the equivalence point, identified by a mid-range pH and extreme changes in pH around the equivalence point.</div>
          </div>
          <div className="feedback-block">
            <p>Feedback for incorrect answer:</p>
            <div className="muted-input">Incorrect. Consider the stage where moles of analyte equal moles of titrant and the pH curve changes most rapidly around the equivalence region.</div>
          </div>
          <div className="feedback-block">
            <p>Activity scoring method:</p>
            <label className="check-row">
              <input type="checkbox" />
              <span>Use default scoring</span>
            </label>
          </div>
          <div className="feedback-block">
            <p>Scoring:</p>
            <div className="scoring-grid">
              <span>Correct answer score:</span>
              <span className="score-pill">10</span>
              <span>Incorrect answer score:</span>
              <span className="score-pill">0</span>
            </div>
          </div>
        </div>
      );
    }

    if (kind === 'multi-input') {
      return (
        <div className="answer-key-section">
          <p className="part-heading">Part {selectedDropdownPart}: Dropdown</p>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <label key={value} className="mcq-choice-row">
              <span className={value === selectedDropdownPart + 2 ? 'fake-radio is-selected' : 'fake-radio'} />
              <span>{value}</span>
            </label>
          ))}
          <div className="feedback-block">
            <p>Feedback for correct answer:</p>
            <div className="muted-input">Correct for Part {selectedDropdownPart}.</div>
          </div>
          <div className="feedback-block">
            <p>Feedback for incorrect answer:</p>
            <div className="muted-input">Incorrect for Part {selectedDropdownPart}.</div>
          </div>
          <div className="feedback-block">
            <p>Activity scoring method:</p>
            <label className="check-row">
              <input type="checkbox" />
              <span>Use default scoring</span>
            </label>
          </div>
          <div className="feedback-block">
            <div className="scoring-grid">
              <span>Scoring strategy</span>
              <span className="strategy-select">Total</span>
            </div>
          </div>
          <div className="feedback-block">
            <p>Scoring:</p>
            <div className="scoring-grid">
              <span>Correct answer score:</span>
              <span className="score-pill">2</span>
              <span>Incorrect answer score:</span>
              <span className="score-pill">0</span>
            </div>
          </div>
        </div>
      );
    }

    if (kind === 'short-answer') {
      return (
        <div className="answer-key-section">
          <div className="feedback-block">
            <p>Expected response:</p>
            <div className="muted-input">A complete explanation should reference atom balance, charge balance, and justification of species added in acidic conditions.</div>
          </div>
          <div className="feedback-block">
            <p>Activity scoring method:</p>
            <label className="check-row">
              <input type="checkbox" />
              <span>Use rubric scoring</span>
            </label>
          </div>
        </div>
      );
    }

    const cataAnswerStatements =
      cataStatements ?? [
        'Alkaline batteries generally have worse performance than dry cells.',
        'The lead acid battery is a type of secondary battery.',
        'Fuel cells are galvanic cells that convert chemical energy into electrical energy.',
        'Fuel cells produce electricity continuously as long as fuel is available.',
        'Primary and secondary batteries may or may not be rechargeable, depending on battery materials.',
      ];
    return (
      <div className="answer-key-section">
        {cataAnswerStatements.map((statement, idx) => {
          const checked = idx === 1 || idx === 2 || idx === 3;
          return (
          <label key={String(statement)} className="cata-answer-row">
            <span className={checked ? 'fake-checkbox is-selected' : 'fake-checkbox'} />
            <span>{statement}</span>
          </label>
        );
        })}
        <div className="feedback-block">
          <p>Feedback for correct answer:</p>
          <div className="muted-input">Correct.</div>
        </div>
        <div className="feedback-block">
          <p>Feedback for incorrect answer:</p>
          <div className="muted-input">Incorrect.</div>
        </div>
        <div className="feedback-block">
          <p>Activity scoring method:</p>
          <label className="check-row">
            <input type="checkbox" />
            <span>Use default scoring</span>
          </label>
        </div>
        <div className="feedback-block">
          <div className="scoring-grid">
            <span>Scoring strategy</span>
            <span className="strategy-select">Total</span>
          </div>
        </div>
        <div className="feedback-block">
          <p>Scoring:</p>
          <div className="scoring-grid">
            <span>Correct answer score:</span>
            <span className="score-pill">5</span>
            <span>Incorrect answer score:</span>
            <span className="score-pill">0</span>
          </div>
        </div>
      </div>
    );
  };

  const renderHints = () => (
    <div className="tab-stack">
      {kind === 'mcq' ? (
        <>
          <p>Hint 1: Locate the steepest region of the titration curve.</p>
          <p>Hint 2: The equivalence point is where analyte and titrant moles are equal.</p>
        </>
      ) : null}
      {kind === 'multi-input' ? (
        <>
          <p>Hint 1: Balance non-hydrogen and non-oxygen atoms first for part {selectedDropdownPart}.</p>
          <p>Hint 2: Use H<sub>2</sub>O and H<sup>+</sup> to complete acidic balancing.</p>
        </>
      ) : null}
      {kind === 'cata' ? (
        <>
          <p>Hint 1: Focus on statements describing standard battery and fuel-cell behavior.</p>
          <p>Hint 2: Eliminate statements that are too broad or absolute.</p>
        </>
      ) : null}
      {kind === 'short-answer' ? (
        <>
          <p>Hint 1: Name the balancing constraints before describing your steps.</p>
          <p>Hint 2: Include why H<sup>+</sup> and H<sub>2</sub>O were introduced for acidic media.</p>
        </>
      ) : null}
    </div>
  );

  const renderExplanation = () => (
    <div className="tab-stack">
      {kind === 'mcq' ? <p>Point C aligns with the equivalence region where the curve transitions sharply and stoichiometric moles are equal.</p> : null}
      {kind === 'multi-input' ? <p>The balanced equation conserves both atoms and total charge. Part {selectedDropdownPart} controls one term in the complete balanced expression.</p> : null}
      {kind === 'cata' ? <p>Statements 2, 3, and 4 match core electrochemistry principles. Statements 1 and 5 are not consistently true in all cases.</p> : null}
      {kind === 'short-answer' ? <p>High-quality responses explain coefficient decisions, confirm conserved mass and charge, and connect each correction to acidic-solution balancing rules.</p> : null}
    </div>
  );

  return (
    <div className={embedded ? 'question-type-card question-type-card--embedded' : 'question-type-card'}>
      <div className="question-type-card__head">
        <div className="eyebrow">
          {questionTypeLabel} · {points} points
        </div>
      </div>
      <h3>{title}</h3>
      {kind === 'mcq' ? (
        <>
          <p>{prompt}</p>
          {showGraph ? <img className="question-media" src={graphImage} alt="Titration graph" /> : null}
          <div className="question-answer-list">
            {(choices ?? ['Point A', 'Point B', 'Point C', 'Point D']).map((option) => (
              <div key={option} className="answer-chip">
                {option}
              </div>
            ))}
          </div>
        </>
      ) : null}
      {kind === 'multi-input' ? (
        <>
          <p>{prompt}</p>
          <img className="question-media question-media--small" src={formulaImage} alt="Formula prompt" />
          <p>Fill in the coefficients and substances for the balanced overall equation.</p>
          <div className="multi-input-row">
            <button className={selectedDropdownPart === 1 ? 'dropdown-chip is-selected' : 'dropdown-chip'} onClick={() => setSelectedDropdownPart(1)}>
              Dropdown
            </button>
            <span>Cu +</span>
            <button className={selectedDropdownPart === 2 ? 'dropdown-chip is-selected' : 'dropdown-chip'} onClick={() => setSelectedDropdownPart(2)}>
              Dropdown
            </button>
            <span>NO₃ +</span>
            <button className={selectedDropdownPart === 3 ? 'dropdown-chip is-selected' : 'dropdown-chip'} onClick={() => setSelectedDropdownPart(3)}>
              Dropdown
            </button>
            <span>H<sub>2</sub>O +</span>
            <button className={selectedDropdownPart === 4 ? 'dropdown-chip is-selected' : 'dropdown-chip'} onClick={() => setSelectedDropdownPart(4)}>
              Dropdown
            </button>
            <span>NO</span>
          </div>
        </>
      ) : null}
      {kind === 'cata' ? (
        <>
          <p>{prompt}</p>
          <div className="question-answer-list">
            {(cataStatements ?? [
              'Alkaline batteries generally have worse performance than dry cells.',
              'The lead acid battery is a type of secondary battery.',
              'Fuel cells are galvanic cells that convert chemical energy into electrical energy.',
              'Fuel cells produce electricity continuously as long as fuel is available.',
              'Primary and secondary batteries may or may not be rechargeable, depending on battery materials.',
            ]).map((statement) => (
              <label key={statement} className="cata-option">
                <input type="checkbox" readOnly />
                <span>{statement}</span>
              </label>
            ))}
          </div>
        </>
      ) : null}
      {kind === 'short-answer' ? (
        <>
          <p>{prompt}</p>
          <div className="short-answer-box">Student response area</div>
        </>
      ) : null}
      <button className="detail-toggle" onClick={() => setExpanded((current) => !current)}>
        {expanded ? 'Hide Details' : 'View Details'}
        <img src={chevronDownIcon} alt="" aria-hidden="true" className={expanded ? 'chevron-icon is-open' : 'chevron-icon'} />
      </button>
      {expanded ? (
        <div className="question-details">
          <div className="tab-strip">
            <button className={activeTab === 'answer' ? 'tab-strip__tab is-active' : 'tab-strip__tab'} onClick={() => setActiveTab('answer')}>
              Answer Key
            </button>
            <button className={activeTab === 'hints' ? 'tab-strip__tab is-active' : 'tab-strip__tab'} onClick={() => setActiveTab('hints')}>
              Hints
            </button>
            <button className={activeTab === 'explanation' ? 'tab-strip__tab is-active' : 'tab-strip__tab'} onClick={() => setActiveTab('explanation')}>
              Explanation
            </button>
          </div>
          <div className="tab-panel">
            {activeTab === 'answer' ? renderAnswerKey() : null}
            {activeTab === 'hints' ? renderHints() : null}
            {activeTab === 'explanation' ? renderExplanation() : null}
          </div>
        </div>
      ) : null}
      <div className="learning-objective-footnote">
        <strong>LO</strong> {learningObjective}
      </div>
    </div>
  );
}

function MaterialRow({ material, onEdit }: { material: Material; onEdit: (assessmentTitle: string) => void }) {
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
            <button className="button button--secondary button--small" onClick={() => onEdit(material.title)}>
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

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const resolved = typeof item === 'string' ? { label: item, to: index < items.length - 1 ? (index === 0 ? '/' : '#') : undefined } : item;

        return (
        <span key={`${resolved.label}-${index}`}>
          {index < items.length - 1 && resolved.to ? <Link to={resolved.to}>{resolved.label}</Link> : <span>{resolved.label}</span>}
          {index < items.length - 1 ? <span className="breadcrumbs__sep">›</span> : null}
        </span>
      )})}
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

export default App;
