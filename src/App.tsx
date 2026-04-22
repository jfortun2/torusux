import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { loadAssessmentDraft, persistAssessmentSurface, persistBankRemovedQuestionIds } from './assessmentDraftStorage';
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
import searchIcon from './assets/icon-search.svg';
import warningIcon from './assets/warning.png';
import instructorIcon from './assets/instructor.png';
import radiationMaterialsImage from './assets/radiation_materials.jpg';
import electrolysisImage from './assets/electrolysis.jpg';
import kittenImage from './assets/kitten.png';

type Material = {
  id: string;
  title: string;
  type: 'bank' | 'activity';
  hidden?: boolean;
  attemptsStarted?: boolean;
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
  { id: 'm6', title: 'Nuclear Chemistry Unit Checkpoint', type: 'activity', attemptsStarted: true },
];

const electrochemistrySelections: AssessmentSelection[] = [
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
    criteriaTag: 'Electrolysis focus: predict products at electrodes and justify ion movement.',
    exampleQuestions: [
      {
        kind: 'mcq',
        points: 6,
        title: 'Electrolysis Setup Check',
        prompt: 'In aqueous NaCl electrolysis, which statement best matches the expected electrode processes under standard classroom conditions?',
        learningObjective: 'LO 2.2 Predict oxidation and reduction products in electrolytic cells.',
        choices: [
          'Na+ is reduced to sodium metal at the cathode in water before hydrogen evolves.',
          'Chloride oxidation at the anode and hydrogen evolution at the cathode are both plausible outcomes.',
          'No redox occurs because the reaction is nonspontaneous.',
          'Electrons flow from cathode to anode through the external circuit.',
        ],
      },
      {
        kind: 'short-answer',
        points: 6,
        title: 'Electrolysis Product Reasoning',
        prompt: 'Describe how concentration, electrode material, and overpotential can shift product formation during electrolysis.',
        learningObjective: 'LO 2.2 Predict oxidation and reduction products in electrolytic cells.',
      },
      {
        kind: 'cata',
        points: 6,
        title: 'Electrolytic Cell Truths',
        prompt: 'Select all statements that are accurate for an electrolytic cell.',
        learningObjective: 'LO 2.2 Predict oxidation and reduction products in electrolytic cells.',
        cataStatements: [
          'An external power source drives a nonspontaneous redox reaction.',
          'Oxidation occurs at the anode.',
          'Reduction occurs at the cathode.',
          'The anode is always positive in every electrochemical context.',
          'Electrolyte composition influences which species discharge at each electrode.',
        ],
      },
    ],
  },
  {
    id: 'ab-4',
    availableQuestions: 16,
    numberToSelect: 2,
    criteriaTag: 'Application focus: corrosion, prevention methods, and material choices',
    exampleQuestions: [
      {
        kind: 'short-answer',
        points: 7,
        title: 'Corrosion Cell Reasoning',
        prompt: 'Explain why galvanic corrosion accelerates when dissimilar metals are electrically connected in an electrolyte.',
        learningObjective: 'LO 3.2 Explain electrochemical causes of corrosion and mitigation strategies.',
      },
    ],
  },
  {
    id: 'ab-5',
    availableQuestions: 22,
    numberToSelect: 4,
    criteriaTag: 'Industry context: electroplating setup, anode/cathode roles, and ion transfer',
    exampleQuestions: [
      {
        kind: 'multi-input',
        points: 8,
        title: 'Electroplating Process Setup',
        prompt: 'Choose each dropdown to correctly configure an electroplating cell for copper coating.',
        learningObjective: 'LO 3.3 Describe electrode reactions in electroplating systems.',
      },
    ],
  },
  {
    id: 'ab-6',
    availableQuestions: 14,
    numberToSelect: 2,
    criteriaTag: 'Energy applications: compare primary, secondary, and fuel-cell trade-offs',
    exampleQuestions: [
      {
        kind: 'cata',
        points: 5,
        title: 'Energy Storage Claims',
        prompt: 'Select every statement that correctly compares battery and fuel-cell behavior.',
        learningObjective: 'LO 3.4 Compare electrochemical energy technologies by function and limits.',
        cataStatements: [
          'Primary batteries are generally not designed for recharge cycles.',
          'Secondary batteries are intended for repeated charge-discharge use.',
          'Fuel cells require continuous fuel input to keep producing electricity.',
          'Fuel cells store all of their reactants internally like a battery.',
          'Energy density and recharge rate are key design trade-offs across technologies.',
        ],
      },
    ],
  },
  {
    id: 'ab-7',
    availableQuestions: 11,
    numberToSelect: 1,
    criteriaTag: 'Performance interpretation: read discharge curves and voltage behavior',
    exampleQuestions: [
      {
        kind: 'mcq',
        points: 10,
        title: 'Battery Discharge Curve Reading',
        prompt: 'Which region of the discharge curve best indicates rapid voltage drop near end-of-life?',
        learningObjective: 'LO 3.5 Interpret electrochemical performance plots.',
        choices: ['Region A', 'Region B', 'Region C', 'Region D'],
      },
    ],
  },
  {
    id: 'ab-8',
    availableQuestions: 19,
    numberToSelect: 3,
    criteriaTag: 'Cell design mechanics: oxidation/reduction half-reactions in applied devices',
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
    criteriaTag: 'Real-world systems: identify galvanic cell directionality and component purpose',
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
    criteriaTag: 'Emerging applications: evaluate electrochemistry in environmental and industrial contexts',
    exampleQuestions: [
      {
        kind: 'short-answer',
        points: 7,
        title: 'Electrochemistry in Water Treatment',
        prompt: 'Describe one way electrochemical processes are used in water treatment and explain the core reaction principle.',
        learningObjective: 'LO 3.6 Explain modern applications of electrochemistry beyond batteries.',
      },
    ],
  },
];

const nuclearSelections: AssessmentSelection[] = [
  {
    id: 'n-ab-1',
    availableQuestions: 20,
    numberToSelect: 2,
    criteriaTag: 'Core idea: identify ionizing radiation types and compare their penetration.',
    exampleQuestions: [
      {
        kind: 'mcq',
        points: 8,
        title: 'Radiation Type Classification',
        prompt: 'Which sequence ranks alpha, beta, and gamma radiation from lowest to highest penetration in matter?',
        learningObjective: 'LO 4.1 Distinguish alpha, beta, and gamma radiation by interaction with matter.',
        choices: ['gamma < beta < alpha', 'alpha < beta < gamma', 'beta < alpha < gamma', 'alpha = beta = gamma'],
      },
    ],
  },
  {
    id: 'n-ab-2',
    availableQuestions: 16,
    numberToSelect: 2,
    criteriaTag: 'Biological effects: connect dose, pathway, and tissue radiosensitivity.',
    exampleQuestions: [
      {
        kind: 'short-answer',
        points: 7,
        title: 'Dose Pathway Reasoning',
        prompt: 'Explain why internal exposure to alpha-emitting particles can pose high biological risk even though alpha has low external penetration.',
        learningObjective: 'LO 4.2 Explain how pathway and tissue sensitivity influence biological effect.',
      },
    ],
  },
  {
    id: 'n-ab-3',
    availableQuestions: 14,
    numberToSelect: 1,
    criteriaTag: 'Radiation safety: apply time, distance, shielding, and monitoring controls.',
    exampleQuestions: [
      {
        kind: 'cata',
        points: 6,
        title: 'ALARA Controls Check',
        prompt: 'Select all practices that align with ALARA in an instructional lab.',
        learningObjective: 'LO 4.3 Apply practical radiation safety controls in lab scenarios.',
        cataStatements: [
          'Reduce time spent near active sources.',
          'Increase distance using tools instead of direct handling.',
          'Use lead shielding for high-energy gamma sources.',
          'Remove shielding to make source labels easier to read.',
          'Track dose with personal dosimeters.',
        ],
      },
    ],
  },
  {
    id: 'n-ab-4',
    availableQuestions: 12,
    numberToSelect: 1,
    criteriaTag: 'Risk-benefit analysis: evaluate radiation use in medicine and industry.',
    exampleQuestions: [
      {
        kind: 'multi-input',
        points: 8,
        title: 'Medical Radiation Decision',
        prompt: 'Choose the most appropriate imaging approach, isotope behavior, and shielding practice for a patient case.',
        learningObjective: 'LO 4.4 Evaluate benefit-risk trade-offs in radiation applications.',
      },
    ],
  },
];

const getAssessmentSelections = (assessmentTitle?: string) =>
  assessmentTitle?.toLowerCase().includes('nuclear') ? nuclearSelections : electrochemistrySelections;

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
              onEdit={(assessment) =>
                navigate('/assessment-default', {
                  state: {
                    assessmentTitle: assessment.title,
                    attemptsStarted: assessment.attemptsStarted ?? false,
                    breadcrumbTrail: [
                      { label: 'Manage', to: '/' },
                      { label: 'Customize Content', to: '/customize' },
                      { label: assessment.title },
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
  const location = useLocation();
  const state = location.state as {
    removeBankId?: string;
    bulkToast?: string;
    attemptsStarted?: boolean;
    assessmentTitle?: string;
    breadcrumbTrail?: BreadcrumbItem[];
  } | null;
  const assessmentTitle = state?.assessmentTitle ?? '12. Electrochemistry Unit Checkpoint';
  const [removedBanks, setRemovedBanks] = useState<string[]>(() => loadAssessmentDraft(assessmentTitle).removedBanks);
  const [showJumpLinks, setShowJumpLinks] = useState(false);
  const [bankToasts, setBankToasts] = useState<Record<string, string>>({});
  const [pendingBankRemoveId, setPendingBankRemoveId] = useState<string | null>(null);
  const [removedEmbeddedQuestions, setRemovedEmbeddedQuestions] = useState<Record<string, boolean>>(
    () => loadAssessmentDraft(assessmentTitle).removedEmbedded,
  );
  const [embeddedToasts, setEmbeddedToasts] = useState<Record<string, string>>({});
  const [pendingEmbeddedRemoveId, setPendingEmbeddedRemoveId] = useState<string | null>(null);
  const isNuclearAssessment = assessmentTitle.toLowerCase().includes('nuclear');
  const assessmentSelections = getAssessmentSelections(assessmentTitle);
  const attemptsStarted = state?.attemptsStarted ?? false;

  const showBankToast = (bankId: string, message: string) => {
    setBankToasts((current) => ({ ...current, [bankId]: message }));
    window.setTimeout(() => {
      setBankToasts((current) => {
        const next = { ...current };
        delete next[bankId];
        return next;
      });
    }, 2200);
  };

  useLayoutEffect(() => {
    const draft = loadAssessmentDraft(assessmentTitle);
    setRemovedBanks(draft.removedBanks);
    setRemovedEmbeddedQuestions(draft.removedEmbedded);
  }, [assessmentTitle]);

  useEffect(() => {
    if (!state?.removeBankId) return;
    setRemovedBanks((current) => {
      if (current.includes(state.removeBankId as string)) return current;
      return [...current, state.removeBankId as string];
    });
    showBankToast(state.removeBankId, state.bulkToast ?? 'Activity bank removed.');
  }, [state?.removeBankId, state?.bulkToast]);

  useEffect(() => {
    persistAssessmentSurface(assessmentTitle, { removedBanks, removedEmbedded: removedEmbeddedQuestions });
  }, [assessmentTitle, removedBanks, removedEmbeddedQuestions]);

  const toggleRemoved = (id: string, label: string) => {
    setRemovedBanks((current) => {
      const willRestore = current.includes(id);
      showBankToast(id, willRestore ? `${label} restored.` : `${label} removed.`);
      return willRestore ? current.filter((bankId) => bankId !== id) : [...current, id];
    });
  };

  const requestToggleBank = (id: string) => {
    const alreadyRemoved = removedBanks.includes(id);
    if (!attemptsStarted || alreadyRemoved) {
      toggleRemoved(id, 'Activity bank');
      return;
    }
    setPendingBankRemoveId(id);
  };

  const jumpTo = (targetId: string) => {
    const node = document.getElementById(targetId);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const showEmbeddedToast = (questionId: string, message: string) => {
    setEmbeddedToasts((current) => ({ ...current, [questionId]: message }));
    window.setTimeout(() => {
      setEmbeddedToasts((current) => {
        const next = { ...current };
        delete next[questionId];
        return next;
      });
    }, 2200);
  };

  const toggleEmbeddedRemoved = (questionId: string) => {
    setRemovedEmbeddedQuestions((current) => {
      const willRestore = Boolean(current[questionId]);
      showEmbeddedToast(questionId, willRestore ? 'Question restored.' : 'Question removed.');
      return { ...current, [questionId]: !willRestore };
    });
  };

  const requestToggleEmbedded = (questionId: string) => {
    const alreadyRemoved = Boolean(removedEmbeddedQuestions[questionId]);
    if (!attemptsStarted || alreadyRemoved) {
      toggleEmbeddedRemoved(questionId);
      return;
    }
    setPendingEmbeddedRemoveId(questionId);
  };

  return (
    <InstructorShell>
      <div className="assessment-layout">
        <AssessmentHeader />
        <div className="assessment-content">
          {attemptsStarted ? (
            <div className="attempts-banner" role="status" aria-live="polite">
              <img src={warningIcon} alt="" aria-hidden="true" />
              Students have already started this assessment. Removing or changing questions will only impact future attempts.
            </div>
          ) : null}
          <div className="assessment-main">
            <div className="assessment-shortcuts-card">
              <button type="button" className="jump-section-header" onClick={() => setShowJumpLinks((open) => !open)} aria-expanded={showJumpLinks}>
                <span className="jump-section-header__label">Jump to section</span>
                <span className="jump-section-header__meta">{assessmentSelections.length} Activity Banks · 1 Embedded Question</span>
                <img src={chevronDownIcon} alt="" aria-hidden="true" className={showJumpLinks ? 'jump-section-header__chevron is-open' : 'jump-section-header__chevron'} />
              </button>
              {showJumpLinks ? (
                <div className="assessment-shortcuts-wrap">
                  <div className="assessment-shortcuts" role="navigation" aria-label="Jump to section links">
                    {assessmentSelections.map((selection, index) => (
                      <button key={selection.id} type="button" className="shortcut-chip" onClick={() => jumpTo(`bank-${selection.id}`)}>
                        Activity Bank {index + 1}
                      </button>
                    ))}
                    <button type="button" className="shortcut-chip shortcut-chip--embedded" onClick={() => jumpTo('embedded-question')}>
                      Embedded Question
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="assessment-intro">
              {isNuclearAssessment ? (
                <>
                  <p>
                    Nuclear chemistry explores unstable nuclei, radioactive decay pathways, and how emitted radiation interacts with matter. Students in this checkpoint should distinguish alpha, beta, and gamma behavior in both shielding and biological contexts.
                  </p>
                  <p>
                    Biological effects are not determined by radiation label alone: exposure pathway, absorbed dose, dose rate, and tissue radiosensitivity all change risk. These ideas are essential when interpreting why identical source strengths can produce different outcomes in real scenarios.
                  </p>
                  <p>
                    The activity banks below focus on evidence-based reasoning about safety controls, clinical or industrial uses, and risk-benefit decisions tied to radiation applications.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Electrochemistry links electron transfer to chemical change: oxidation is loss of electrons, reduction is gain. In a galvanic cell, a spontaneous reaction drives current through an external circuit; in electrolysis, electrical work drives a nonspontaneous process. Standard reduction potentials help you compare tendencies and predict cell direction under standard conditions.
                  </p>
                  <p>
                    Beyond lecture-scale cells, electrochemistry shapes everyday technology-alkaline and lithium-ion batteries store portable energy, lead-acid systems support vehicles, and fuel cells convert fuel continuously while reactants are supplied. Corrosion is the same chemistry working against structures: dissimilar metals in contact with an electrolyte can accelerate material loss unless design or coatings interrupt the cell.
                  </p>
                  <p>
                    This checkpoint draws on those ideas so students connect definitions to graphs, half-reactions, and applications. As you review activity banks below, you are choosing which items best reinforce the learning objectives for this unit on electrochemistry and its real-world uses.
                  </p>
                </>
              )}
            </div>
            {assessmentSelections.map((selection) => (
              <ActivityBankSelectionCard
                key={selection.id}
                selection={selection}
                removed={removedBanks.includes(selection.id)}
                toastMessage={bankToasts[selection.id]}
                onToggleRemove={() => requestToggleBank(selection.id)}
                attemptsStarted={attemptsStarted}
                assessmentTitle={state?.assessmentTitle}
                breadcrumbTrail={state?.breadcrumbTrail}
              />
            ))}
            {!isNuclearAssessment ? (
              <section className="assessment-mid-media" aria-label="Electrolysis cell diagram">
                <img src={electrolysisImage} alt="Electrolysis setup with electrodes and ion movement" />
              </section>
            ) : null}
            {isNuclearAssessment ? (
              <>
                <section className="assessment-mid-media" aria-label="Nuclear chemistry materials">
                  <img src={radiationMaterialsImage} alt="Nuclear chemistry lab and radiation safety materials" />
                </section>
                <section className="embedded-question">
                  {embeddedToasts.nuclearSafety ? <SuccessToast message={embeddedToasts.nuclearSafety} inline /> : null}
                  <QuestionTypeCard
                    kind="mcq"
                    points={6}
                    title="Radiation Materials Safety Check"
                    prompt="A lab stores alpha, beta, and gamma emitters for demonstrations. Which setup best reduces exposure risk while preserving visibility for students?"
                    learningObjective="LO 4.3 Compare shielding and handling strategies for common radiation types."
                    choices={[
                      'Use paper shielding for all sources and keep all containers open for easier viewing.',
                      'Use thick lead shielding for alpha sources only and remove barriers for beta and gamma sources.',
                      'Keep sealed containers, use acrylic shielding for beta sources, and place gamma sources behind lead shielding at distance.',
                      'Store all emitters together in one tray to simplify transport between lab benches.',
                    ]}
                    embedded
                    removed={Boolean(removedEmbeddedQuestions.nuclearSafety)}
                    onToggleRemove={() => requestToggleEmbedded('nuclearSafety')}
                  />
                </section>
              </>
            ) : null}
            <section className="embedded-question" id="embedded-question">
              {embeddedToasts.exitQuestion ? <SuccessToast message={embeddedToasts.exitQuestion} inline /> : null}
              <QuestionTypeCard
                kind="mcq"
                points={6}
                title={isNuclearAssessment ? 'Biological Effects Exit Question' : 'Electrochemistry Exit Question'}
                prompt={
                  isNuclearAssessment
                    ? 'Which factor most directly explains why equal absorbed doses can lead to different biological outcomes?'
                    : 'Which statement best explains why a galvanic cell potential decreases as reactants are consumed?'
                }
                learningObjective={
                  isNuclearAssessment
                    ? 'LO 4.2 Explain why biological impact varies by pathway and tissue sensitivity.'
                    : 'LO 2.5 Explain how concentration changes affect cell potential.'
                }
                choices={
                  isNuclearAssessment
                    ? [
                        'All tissues respond identically to ionizing radiation.',
                        'Biological effect varies with tissue radiosensitivity, dose rate, and exposure pathway.',
                        'Only external exposure affects biological outcome.',
                        'Shielding type has no impact once exposure begins.',
                      ]
                    : [
                        'The anode starts reducing instead of oxidizing.',
                        'Reaction quotient shifts and lowers the driving force toward equilibrium.',
                        'Electrons are no longer transferred through the external circuit.',
                        'The salt bridge blocks ion movement once products form.',
                      ]
                }
                embedded
                removed={Boolean(removedEmbeddedQuestions.exitQuestion)}
                onToggleRemove={() => requestToggleEmbedded('exitQuestion')}
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
      {pendingBankRemoveId ? (
        <AttemptsStartedChangeModal
          targetLabel="bank"
          onKeep={() => setPendingBankRemoveId(null)}
          onRemove={() => {
            toggleRemoved(pendingBankRemoveId, 'Activity bank');
            setPendingBankRemoveId(null);
          }}
        />
      ) : null}
      {pendingEmbeddedRemoveId ? (
        <AttemptsStartedChangeModal
          targetLabel="question"
          onKeep={() => setPendingEmbeddedRemoveId(null)}
          onRemove={() => {
            toggleEmbeddedRemoved(pendingEmbeddedRemoveId);
            setPendingEmbeddedRemoveId(null);
          }}
        />
      ) : null}
    </InstructorShell>
  );
}

function ActivityBankScreen({ bulkEdit }: { bulkEdit: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    bankId?: string;
    attemptsStarted?: boolean;
    assessmentTitle?: string;
    breadcrumbTrail?: BreadcrumbItem[];
  } | null;
  const assessmentTitle = state?.assessmentTitle ?? '12. Electrochemistry Unit Checkpoint';
  const assessmentSelections = getAssessmentSelections(state?.assessmentTitle);
  const selectedBank = assessmentSelections.find((bank) => bank.id === state?.bankId) ?? assessmentSelections[0];
  const attemptsStarted = state?.attemptsStarted ?? false;
  const generatedQuestionCount = selectedBank.availableQuestions;
  const variantSuffix = [
    'with a conceptual check',
    'with a quantitative emphasis',
    'with an error-analysis angle',
    'with a real-world application',
  ];
  const rotateArray = (items: string[], amount: number) => {
    if (items.length === 0) return items;
    const offset = amount % items.length;
    return [...items.slice(offset), ...items.slice(0, offset)];
  };
  const baseQuestions: BankQuestionRow[] = useMemo(() => {
    const draft = loadAssessmentDraft(assessmentTitle);
    const removedIdSet = new Set(draft.bankRemovedQuestionIds[selectedBank.id] ?? []);
    return Array.from({ length: generatedQuestionCount }).map((_, index) => {
      const seeded = selectedBank.exampleQuestions[index % selectedBank.exampleQuestions.length];
      const difficulty = index % 3 === 0 ? 'Easy' : index % 3 === 1 ? 'Medium' : 'Hard';
      const promptVariant = index < selectedBank.exampleQuestions.length ? seeded.prompt : `${seeded.prompt} (${variantSuffix[index % variantSuffix.length]})`;
      const rotatedChoices = seeded.choices ? rotateArray(seeded.choices, index % seeded.choices.length) : undefined;
      const rotatedStatements = seeded.cataStatements ? rotateArray(seeded.cataStatements, index % seeded.cataStatements.length) : undefined;
      const id = `${selectedBank.id}-q-${index + 1}`;
      return {
        id,
        title: index < selectedBank.exampleQuestions.length ? seeded.title : `${seeded.title} Variant ${index + 1}`,
        prompt: promptVariant,
        kind: seeded.kind,
        points: seeded.points,
        learningObjective: seeded.learningObjective,
        choices: rotatedChoices,
        cataStatements: rotatedStatements,
        difficulty,
        removed: removedIdSet.has(id),
      };
    });
  }, [assessmentTitle, generatedQuestionCount, selectedBank]);
  const [questionRows, setQuestionRows] = useState<BankQuestionRow[]>(baseQuestions);
  const [filterMode, setFilterMode] = useState<'all' | 'included' | 'removed'>('all');
  const [searchText, setSearchText] = useState('');
  const [learningObjectiveFilter, setLearningObjectiveFilter] = useState('all');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [limitModalContext, setLimitModalContext] = useState<{ remaining: number } | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{ type: 'question'; ids: string[] } | null>(null);
  const availableQuestionCount = questionRows.filter((question) => !question.removed).length;
  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredQuestions = questionRows.filter((question) => {
    if (filterMode === 'included' && question.removed) return false;
    if (filterMode === 'removed' && !question.removed) return false;
    if (learningObjectiveFilter !== 'all' && question.learningObjective !== learningObjectiveFilter) return false;
    if (questionTypeFilter !== 'all' && question.kind !== questionTypeFilter) return false;
    if (difficultyFilter !== 'all' && question.difficulty !== difficultyFilter) return false;
    if (
      normalizedSearch &&
      !`${question.id} ${question.title} ${question.prompt} ${question.learningObjective} ${(question.choices ?? []).join(' ')} ${(question.cataStatements ?? []).join(' ')}`
        .toLowerCase()
        .includes(normalizedSearch)
    ) {
      return false;
    }
    return true;
  });
  const [selected, setSelected] = useState<string[]>(
    bulkEdit ? filteredQuestions.filter((question) => !question.removed).slice(0, 6).map((question) => question.id) : [],
  );
  const [activeQuestionId, setActiveQuestionId] = useState(filteredQuestions[0]?.id ?? baseQuestions[0]?.id ?? '');
  const currentQuestion = filteredQuestions.find((question) => question.id === activeQuestionId) ?? filteredQuestions[0] ?? baseQuestions[0];
  const allVisibleSelected = filteredQuestions.length > 0 && filteredQuestions.every((question) => selected.includes(question.id));
  const selectedRows = questionRows.filter((question) => selected.includes(question.id));
  const selectionType = selectedRows.length === 0 ? null : selectedRows.every((row) => row.removed) ? 'removed' : 'included';
  const masterCheckboxRef = useRef<HTMLInputElement>(null);
  const visibleSelectedCount = filteredQuestions.filter((question) => selected.includes(question.id)).length;

  const toggleSelected = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      const incoming = questionRows.find((question) => question.id === id);
      if (!incoming) return current;
      const currentRows = questionRows.filter((question) => current.includes(question.id));
      if (currentRows.length > 0) {
        const currentTypeIsRemoved = currentRows.every((row) => row.removed);
        if (incoming.removed !== currentTypeIsRemoved) {
          return current;
        }
      }
      return [...current, id];
    });
  };

  const toggleSelectAllVisible = () => {
    if (selected.length > 0) {
      setSelected([]);
      return;
    }
    setSelected((current) => {
      const currentRows = questionRows.filter((question) => current.includes(question.id));
      const currentType = currentRows.length === 0 ? null : currentRows.every((row) => row.removed);
      const targetRows =
        currentType === null
          ? filteredQuestions
          : filteredQuestions.filter((question) => question.removed === currentType);
      return Array.from(new Set([...current, ...targetRows.map((question) => question.id)]));
    });
  };

  useEffect(() => {
    if (!masterCheckboxRef.current) return;
    masterCheckboxRef.current.indeterminate = selected.length === 0 ? false : visibleSelectedCount > 0 && !allVisibleSelected;
  }, [selected.length, visibleSelectedCount, allVisibleSelected]);

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
  }, [baseQuestions, bulkEdit]);

  useEffect(() => {
    persistBankRemovedQuestionIds(
      assessmentTitle,
      selectedBank.id,
      questionRows.filter((question) => question.removed).map((question) => question.id),
    );
  }, [assessmentTitle, selectedBank.id, questionRows]);

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

  const removeQuestions = (ids: string[]) => {
    if (ids.length === 0) return;
    setQuestionRows((current) => current.map((question) => (ids.includes(question.id) ? { ...question, removed: true } : question)));
    setToastMessage(ids.length === 1 ? 'Question removed.' : `Removed ${ids.length} questions.`);
    setSelected((current) => current.filter((item) => !ids.includes(item)));
  };

  const applyBulkAction = (force = false) => {
    if (!selectionType || selected.length === 0) return;
    if (selectionType === 'included') {
      const selectedIncludedCount = selectedRows.filter((row) => !row.removed).length;
      const remainingIncluded = availableQuestionCount - selectedIncludedCount;
      if (!force && remainingIncluded < selectedBank.numberToSelect) {
        setLimitModalContext({ remaining: remainingIncluded });
        return;
      }
      setQuestionRows((current) =>
        current.map((question) => (selected.includes(question.id) ? { ...question, removed: true } : question)),
      );
      setToastMessage(`Removed ${selected.length} questions.`);
      setSelected([]);
      return;
    }
    setQuestionRows((current) =>
      current.map((question) => (selected.includes(question.id) ? { ...question, removed: false } : question)),
    );
    setToastMessage(`Restored ${selected.length} questions.`);
    setSelected([]);
  };

  const requestBulkRemove = () => {
    const selectedIncludedCount = selectedRows.filter((row) => !row.removed).length;
    const remainingIncluded = availableQuestionCount - selectedIncludedCount;
    if (remainingIncluded < selectedBank.numberToSelect) {
      setLimitModalContext({ remaining: remainingIncluded });
      return;
    }
    if (attemptsStarted) {
      setPendingRemoval({ type: 'question', ids: [...selected] });
      return;
    }
    applyBulkAction(false);
  };

  return (
    <InstructorShell>
      <div className="bank-screen">
        <button
          className="back-link"
          type="button"
          onClick={() =>
            navigate('/assessment-default', {
              state: { attemptsStarted, assessmentTitle: state?.assessmentTitle, breadcrumbTrail: state?.breadcrumbTrail },
            })
          }
        >
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
              <img src={searchIcon} alt="" aria-hidden="true" className="search-field__icon" />
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
            <button className="clear-link clear-link--toolbar" onClick={clearFilters}>Clear All Filters</button>
          </div>
        </div>
        {selected.length > 0 && selectionType === 'included' ? (
          <button
            className="button button--danger button--small bulk-action-button"
            onClick={requestBulkRemove}
          >
            Remove Selected ({selected.length})
          </button>
        ) : null}
        {selected.length > 0 && selectionType === 'removed' ? (
          <button className="button button--secondary button--small bulk-action-button" onClick={() => applyBulkAction(false)}>
            Restore Selected ({selected.length})
          </button>
        ) : null}
        {toastMessage ? <SuccessToast message={toastMessage} inline /> : null}
        <div className="split-pane">
          <div className="question-list-panel">
            <div className="question-list-header">
              <div className="muted-caption">Showing {filteredQuestions.length} questions</div>
              <label className="check-row">
                <input ref={masterCheckboxRef} type="checkbox" checked={selected.length > 0} onChange={toggleSelectAllVisible} />
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
                  {selectionType && ((selectionType === 'included' && question.removed) || (selectionType === 'removed' && !question.removed)) ? (
                    <span className="checkbox-wrap is-disabled" title="You can only bulk-select included questions OR removed questions, not both.">
                      <input type="checkbox" checked={selected.includes(question.id)} disabled aria-label={`Select ${question.title}`} />
                    </span>
                  ) : (
                  <input
                    type="checkbox"
                    checked={selected.includes(question.id)}
                    onChange={() => toggleSelected(question.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Select ${question.title}`}
                  />
                  )}
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
              ) : selected.length > 1 ? (
                <button className="button button--disabled button--small">{currentQuestion?.removed ? 'Restore' : 'Remove'}</button>
              ) : (
                <button
                  className={currentQuestion?.removed ? 'button button--secondary button--small' : 'button button--danger button--small'}
                  onClick={() => {
                    if (!currentQuestion) return;
                    if (attemptsStarted && !currentQuestion.removed) {
                      setPendingRemoval({ type: 'question', ids: [currentQuestion.id] });
                      return;
                    }
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
      {limitModalContext ? (
        <BulkWarningModal
          numberToSelect={selectedBank.numberToSelect}
          remaining={limitModalContext.remaining}
          onKeepQuestion={() => setLimitModalContext(null)}
          onRemoveBank={() => {
            setLimitModalContext(null);
            navigate('/assessment-default', {
              state: {
                removeBankId: selectedBank.id,
                bulkToast: 'Activity bank removed.',
                attemptsStarted,
                assessmentTitle: state?.assessmentTitle,
                breadcrumbTrail: state?.breadcrumbTrail,
              },
            });
          }}
        />
      ) : null}
      {pendingRemoval ? (
        <AttemptsStartedChangeModal
          targetLabel={pendingRemoval.type}
          onKeep={() => setPendingRemoval(null)}
          onRemove={() => {
            removeQuestions(pendingRemoval.ids);
            setPendingRemoval(null);
          }}
        />
      ) : null}
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

function BulkWarningModal({
  numberToSelect,
  remaining,
  onKeepQuestion,
  onRemoveBank,
}: {
  numberToSelect: number;
  remaining: number;
  onKeepQuestion: () => void;
  onRemoveBank: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Bulk action warning">
      <div className="modal-card">
        <h3>Cannot remove this question</h3>
        <p>This activity bank requires {numberToSelect} questions, and removing this would leave only {remaining}. To make changes, you can remove the entire activity bank.</p>
        <div className="modal-actions">
          <button className="button button--primary" onClick={onKeepQuestion}>Keep question</button>
          <button className="button button--secondary" onClick={onRemoveBank}>Remove bank</button>
        </div>
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
  const isNuclearAssessment = assessmentTitle.toLowerCase().includes('nuclear');

  return (
    <>
      <div className="instructor-bar">
        <div className="instructor-pill">
          <img className="instructor-pill__icon" src={instructorIcon} alt="" aria-hidden="true" />
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
            <span>{isNuclearAssessment ? 'LO 4.1 Distinguish alpha, beta, and gamma radiation by interaction with matter.' : 'LO 1.1 Calculate the concentration of ions in solution.'}</span>
          </div>
          <div className="learning-objective-item">
            <img src={checkIcon} alt="" aria-hidden="true" />
            <span>{isNuclearAssessment ? 'LO 4.2 Explain how dose, pathway, and tissue sensitivity influence biological effects.' : 'LO 1.2 Distinguish between oxidation and reduction processes.'}</span>
          </div>
        </div>
      </div>
    </>
  );
}

function ActivityBankSelectionCard({
  selection,
  removed,
  toastMessage,
  onToggleRemove,
  attemptsStarted,
  assessmentTitle,
  breadcrumbTrail,
}: {
  selection: AssessmentSelection;
  removed: boolean;
  toastMessage?: string;
  onToggleRemove: () => void;
  attemptsStarted: boolean;
  assessmentTitle?: string;
  breadcrumbTrail?: BreadcrumbItem[];
}) {
  const navigate = useNavigate();
  const [exampleIndex, setExampleIndex] = useState(0);
  const exampleQuestion = selection.exampleQuestions[exampleIndex] ?? selection.exampleQuestions[0];

  return (
    <section id={`bank-${selection.id}`} className={removed ? 'bank-card-wrapper bank-card-wrapper--removed' : 'bank-card-wrapper'}>
      {toastMessage ? <SuccessToast message={toastMessage} inline /> : null}
      <div className={removed ? 'bank-card bank-card--removed' : 'bank-card'}>
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
            state: { bankId: selection.id, attemptsStarted, assessmentTitle, breadcrumbTrail },
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
      </div>
    </section>
  );
}

function AttemptsStartedChangeModal({
  targetLabel,
  onKeep,
  onRemove,
}: {
  targetLabel: 'question' | 'bank';
  onKeep: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Change may affect student scores">
      <div className="modal-card">
        <h3>Change may affect student scores</h3>
        <p>Students have already started this assessment. Removing this {targetLabel} will only impact future attempts.</p>
        <div className="modal-actions">
          <button className="button button--secondary" onClick={onRemove}>Remove {targetLabel}</button>
          <button className="button button--primary" onClick={onKeep}>Keep {targetLabel}</button>
        </div>
      </div>
    </div>
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
  removed = false,
  onToggleRemove,
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
  removed?: boolean;
  onToggleRemove?: () => void;
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
    <div className={[embedded ? 'question-type-card question-type-card--embedded' : 'question-type-card', removed ? 'question-type-card--removed' : ''].filter(Boolean).join(' ')}>
      <div className="question-type-card__head">
        <div className="eyebrow">
          {questionTypeLabel} · {points} points
        </div>
        {onToggleRemove ? (
          <div className="question-type-card__actions">
            {removed ? <span className="status-pill">Removed</span> : null}
            <button className={removed ? 'button button--secondary button--small' : 'button button--danger button--small'} onClick={onToggleRemove}>
              {removed ? <img src={resetIcon} alt="" aria-hidden="true" /> : null}
              {removed ? 'Restore' : 'Remove'}
            </button>
          </div>
        ) : null}
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

function MaterialRow({ material, onEdit }: { material: Material; onEdit: (assessment: Material) => void }) {
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
            <button className="button button--secondary button--small" onClick={() => onEdit(material)}>
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
