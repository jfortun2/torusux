import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  getIncludedQuestionCountForBank,
  loadAssessmentDraft,
  persistAllQuestionsRemovedForBank,
  persistAssessmentSurface,
  persistBankRemovedQuestionIds,
} from './assessmentDraftStorage';
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
import studentIcon from './assets/student.png';
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
  showGraph?: boolean;
  removed?: boolean;
};

type PageObjective = {
  code: string;
  label: string;
};

type ObjectiveCoverage = {
  objective: PageObjective;
  min: number;
  max: number;
  state: 'healthy' | 'at-risk' | 'not-covered';
};

type ViewMode = 'instructor' | 'student';

type StudentPreviewQuestion = {
  id: string;
  title: string;
  prompt: string;
  kind: QuestionKind;
  points: number;
  choices?: string[];
  cataStatements?: string[];
  showGraph?: boolean;
};

type StudentPreviewBank = {
  id: string;
  label: string;
  numberToSelect: number;
  candidateQuestions: StudentPreviewQuestion[];
  scenarioQuestions: StudentPreviewQuestion[];
};

const rotateArray = <T,>(items: T[], amount: number): T[] => {
  if (items.length === 0) return items;
  const offset = ((amount % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
};

const isElectrochemistryUnitCheckpoint = (assessmentTitle?: string) =>
  (assessmentTitle ?? '').toLowerCase().includes('electrochemistry');
const isNuclearUnitCheckpoint = (assessmentTitle?: string) => (assessmentTitle ?? '').toLowerCase().includes('nuclear');
const usesTaggedVariantNaming = (assessmentTitle?: string) =>
  isElectrochemistryUnitCheckpoint(assessmentTitle) || isNuclearUnitCheckpoint(assessmentTitle);

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
    availableQuestions: 4,
    numberToSelect: 3,
    criteriaTag: 'balancing_redox_acidic_media',
    exampleQuestions: [
      {
        kind: 'multi-input',
        points: 8,
        title: 'redox_balance_acidic_multi',
        prompt:
          '24.0 mL of 0.030 M acidified MnO4− is mixed with 30.0 mL of 0.090 M Fe2+. Use the dropdowns to complete the balanced line in acidic solution (coefficients and key species).',
        learningObjective: 'LO 1.1 Balance redox equations in acidic conditions.',
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'redox_balance_acidic_multi',
        prompt:
          'A 0.040 M Cr2O7^2− solution in acid is paired with 0.15 M Fe2+. Complete the balanced redox expression using the dropdowns (watch the dichromate stoichiometry).',
        learningObjective: 'LO 1.1 Balance redox equations in acidic conditions.',
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'redox_balance_acidic_multi',
        prompt:
          'Balance the oxidation of SO3^2− to SO4^2− by MnO4− in acidic medium for a 35.0 mL sulfite sample titrated with 16.2 mL of 0.020 M MnO4−. Use the dropdowns to finish the balanced form.',
        learningObjective: 'LO 1.1 Balance redox equations in acidic conditions.',
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'redox_balance_acidic_multi',
        prompt:
          'Copper metal reacts with nitric acid producing Cu2+, NO, and water. With 0.50 M HNO3 contacting excess Cu, complete the balanced redox line in acidic solution via the dropdowns.',
        learningObjective: 'LO 1.1 Balance redox equations in acidic conditions.',
      },
    ],
  },
  {
    id: 'ab-2',
    availableQuestions: 3,
    numberToSelect: 1,
    criteriaTag: 'titration_curve_equivalence',
    exampleQuestions: [
      {
        kind: 'mcq',
        points: 10,
        title: 'titration_equivalence_mcq',
        prompt: 'At which point in the titration is the number of moles of analyte and titrant the same?',
        learningObjective: 'LO 1.2 Identify equivalence points from titration curves.',
        choices: ['Point A', 'Point B', 'Point C', 'Point D'],
        showGraph: true,
      },
    ],
  },
  {
    id: 'ab-3',
    availableQuestions: 4,
    numberToSelect: 2,
    criteriaTag: 'electrolysis_electrode_products',
    exampleQuestions: [
      {
        kind: 'multi-input',
        points: 6,
        title: 'electrolysis_cell_setup_multi',
        prompt:
          'Aqueous 1.0 M NaCl, inert electrodes, 6.0 V applied: choose the dominant anode process, dominant cathode process, and electron flow in the external circuit.',
        learningObjective: 'LO 1.2 Predict oxidation and reduction products in electrolytic cells.',
      },
      {
        kind: 'multi-input',
        points: 6,
        title: 'electrolysis_cell_setup_multi',
        prompt:
          'Aqueous 0.50 M CuSO4 with Cu cathode and inert anode: choose what happens at the anode, what happens at the cathode, and electron flow direction.',
        learningObjective: 'LO 1.2 Predict oxidation and reduction products in electrolytic cells.',
      },
      {
        kind: 'multi-input',
        points: 6,
        title: 'electrolysis_cell_setup_multi',
        prompt:
          'Molten NaCl with inert electrodes: choose the species oxidized at the anode, the species reduced at the cathode, and electron flow direction.',
        learningObjective: 'LO 1.2 Predict oxidation and reduction products in electrolytic cells.',
      },
      {
        kind: 'multi-input',
        points: 6,
        title: 'electrolysis_cell_setup_multi',
        prompt:
          'Dilute AgNO3 (0.10 M), inert electrodes, pH ~7: choose the primary anode process, the primary cathode process, and electron flow in the external circuit.',
        learningObjective: 'LO 1.2 Predict oxidation and reduction products in electrolytic cells.',
      },
    ],
  },
  {
    id: 'ab-4',
    availableQuestions: 3,
    numberToSelect: 2,
    criteriaTag: 'corrosion_and_prevention',
    exampleQuestions: [
      {
        kind: 'multi-input',
        points: 7,
        title: 'corrosion_mitigation_multi',
        prompt:
          'A Zn washer is in contact with mild steel in aerated seawater (3.5% NaCl). Choose the metal that tends to corrode fastest, the best first mitigation, and what to monitor weekly.',
        learningObjective: 'LO 1.3 Explain electrochemical causes of corrosion and mitigation strategies.',
      },
      {
        kind: 'multi-input',
        points: 7,
        title: 'corrosion_mitigation_multi',
        prompt:
          'A Cu fitting is coupled to galvanized (Zn-coated) steel in freshwater at pH 7.2. Choose the likely cathode region, the primary corrosion risk, and a mitigation that breaks the galvanic path.',
        learningObjective: 'LO 1.3 Explain electrochemical causes of corrosion and mitigation strategies.',
      },
      {
        kind: 'multi-input',
        points: 7,
        title: 'corrosion_mitigation_multi',
        prompt:
          '304 stainless is bolted to aluminum in salt spray with chloride films present. Choose the main driving force for attack, a coating or isolation step, and a field inspection signal to track.',
        learningObjective: 'LO 1.3 Explain electrochemical causes of corrosion and mitigation strategies.',
      },
    ],
  },
  {
    id: 'ab-5',
    availableQuestions: 4,
    numberToSelect: 4,
    criteriaTag: 'electroplating_cell_roles',
    exampleQuestions: [
      {
        kind: 'multi-input',
        points: 8,
        title: 'copper_electroplating_setup_multi',
        prompt:
          'Acidic 0.80 M CuSO4, soluble Cu anode, steel jewelry as workpiece at 12 mA/cm^2: choose the workpiece electrode, where Cu2+ is reduced, and what happens at the anode.',
        learningObjective: 'LO 1.3 Describe electrode reactions in electroplating systems.',
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'copper_electroplating_setup_multi',
        prompt:
          'Cyanide-copper bath (prototype), Pt anode, brass part: choose where metal deposits, which electrode oxidizes water or supporting ions at the anode, and electron flow direction.',
        learningObjective: 'LO 1.3 Describe electrode reactions in electroplating systems.',
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'copper_electroplating_setup_multi',
        prompt:
          'Nickel strike then Cu plate from acid sulfate; current ramps from 2 A to 8 A over 5 min. Choose the cathode identity for Cu deposition, the role of the Ni layer, and the anode type if using soluble Cu.',
        learningObjective: 'LO 1.3 Describe electrode reactions in electroplating systems.',
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'copper_electroplating_setup_multi',
        prompt:
          'Hull cell trial at 3.0 V with a Cu anode dissolving unevenly: choose where to place the test panel, where reduction of Cu2+ occurs, and the risk if the anode passivates.',
        learningObjective: 'LO 1.3 Describe electrode reactions in electroplating systems.',
      },
    ],
  },
  {
    id: 'ab-6',
    availableQuestions: 3,
    numberToSelect: 2,
    criteriaTag: 'battery_fuel_cell_tradeoffs',
    exampleQuestions: [
      {
        kind: 'cata',
        points: 5,
        title: 'energy_storage_comparison_cata',
        prompt: 'Select every statement that correctly compares battery and fuel-cell behavior.',
        learningObjective: 'Untagged objective',
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
    availableQuestions: 4,
    numberToSelect: 1,
    criteriaTag: 'discharge_curve_interpretation',
    exampleQuestions: [
      {
        kind: 'mcq',
        points: 10,
        title: 'battery_discharge_curve_mcq',
        prompt: 'Which region of the discharge curve best indicates rapid voltage drop near end-of-life?',
        learningObjective: 'LO 1.3 Interpret electrochemical performance plots.',
        choices: ['Region A', 'Region B', 'Region C', 'Region D'],
        showGraph: true,
      },
    ],
  },
  {
    id: 'ab-8',
    availableQuestions: 3,
    numberToSelect: 3,
    criteriaTag: 'half_reactions_devices',
    exampleQuestions: [
      {
        kind: 'multi-input',
        points: 8,
        title: 'acidic_half_reaction_multi',
        prompt:
          'In acidic medium, write the balanced oxidation Fe2+ → Fe3+ using the dropdowns (electrons, Fe species, and H+/H2O as needed).',
        learningObjective: 'LO 1.1 Construct oxidation and reduction half-reactions.',
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'acidic_half_reaction_multi',
        prompt:
          'In acidic medium, balance the reduction of MnO4− to Mn2+ using the dropdowns (e−, Mn species, H+, H2O).',
        learningObjective: 'LO 1.1 Construct oxidation and reduction half-reactions.',
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'acidic_half_reaction_multi',
        prompt:
          'In acidic medium, balance the oxidation of Cr3+ to Cr2O7^2− using the dropdowns (e−, Cr-containing species, H2O/H+).',
        learningObjective: 'LO 1.1 Construct oxidation and reduction half-reactions.',
      },
    ],
  },
  {
    id: 'ab-9',
    availableQuestions: 4,
    numberToSelect: 2,
    criteriaTag: 'galvanic_cell_behavior',
    exampleQuestions: [
      {
        kind: 'cata',
        points: 5,
        title: 'galvanic_cell_behavior_cata',
        prompt: 'Mark all statements that are consistent with galvanic cell behavior.',
        learningObjective: 'LO 1.2 Compare galvanic and electrolytic cell properties.',
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
    availableQuestions: 3,
    numberToSelect: 1,
    criteriaTag: 'environmental_electrochemistry',
    exampleQuestions: [
      {
        kind: 'multi-input',
        points: 7,
        title: 'water_treatment_electrolysis_multi',
        prompt:
          'Groundwater contains 2.1 mg/L Fe2+ and 18 mg/L NO3−. Choose the primary anodic oxidant pathway, the knob that most shifts current efficiency, and the online signal to log.',
        learningObjective: 'Untagged objective',
      },
      {
        kind: 'multi-input',
        points: 7,
        title: 'water_treatment_electrolysis_multi',
        prompt:
          'Industrial wastewater carries a phenolic trace at pH 6.5 with a BDD anode. Choose the dominant degradation route, the operating variable that raises mass-transfer limitation, and a surrogate measurement for removal.',
        learningObjective: 'Untagged objective',
      },
      {
        kind: 'multi-input',
        points: 7,
        title: 'water_treatment_electrolysis_multi',
        prompt:
          'As(III) is present at 120 μg/L in carbonate-buffered water. Choose the electrochemical step that targets valence change, the co-reactant often managed at the cathode, and the compliance sample point.',
        learningObjective: 'Untagged objective',
      },
    ],
  },
];

const nuclearSelections: AssessmentSelection[] = [
  {
    id: 'n-ab-1',
    availableQuestions: 8,
    numberToSelect: 2,
    criteriaTag: 'radiation_types_and_penetration',
    exampleQuestions: [
      {
        kind: 'mcq',
        points: 8,
        title: 'radiation_type_classification',
        prompt: 'Which sequence ranks alpha, beta, and gamma radiation from lowest to highest penetration in matter?',
        learningObjective: 'LO 1.4 Distinguish alpha, beta, and gamma radiation by interaction with matter.',
        choices: ['gamma < beta < alpha', 'alpha < beta < gamma', 'beta < alpha < gamma', 'alpha = beta = gamma'],
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'shielding_workflow_multi',
        prompt:
          'A Cs-137 source (662 keV gamma), 0.25 mCi stored behind a closed shield, is observed at 2.5 m. Choose primary shielding material, the handling practice that increases distance most reliably, and the first monitoring control you brief.',
        learningObjective: 'LO 1.5 Explain how pathway and tissue sensitivity influence biological effects.',
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'shielding_workflow_multi',
        prompt:
          'Co-60 pair source (1.17 & 1.33 MeV), 1.8 mCi combined, wall-mounted behind interlocked door. Choose the shielding emphasis for room egress, the transfer practice between storage and use, and the dosimetry expectation for instructors.',
        learningObjective: 'LO 1.5 Explain how pathway and tissue sensitivity influence biological effects.',
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'shielding_workflow_multi',
        prompt:
          'Low-energy gamma check source (≈35 keV), 5 μCi, used for detector lab at bench. Choose appropriate primary barrier type, the distance rule for unshielded line-of-sight, and the monitoring tool matched to energy.',
        learningObjective: 'LO 1.5 Explain how pathway and tissue sensitivity influence biological effects.',
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'shielding_workflow_multi',
        prompt:
          'Beta emitter (Emax 0.5 MeV) in sealed plastic mount for absorption curve lab; no gamma significant. Choose surface shielding students should still use, the distance practice for hands, and the contamination check emphasis.',
        learningObjective: 'LO 1.5 Explain how pathway and tissue sensitivity influence biological effects.',
      },
    ],
  },
  {
    id: 'n-ab-2',
    availableQuestions: 8,
    numberToSelect: 2,
    criteriaTag: 'biological_effects_and_pathways',
    exampleQuestions: [
      {
        kind: 'multi-input',
        points: 7,
        title: 'internal_alpha_pathway_multi',
        prompt:
          'Inhaled insoluble alpha-bearing dust deposits in lung epithelium. Choose the dominant exposure pathway, why high-LET internally matters, and the first clinical follow-up emphasis.',
        learningObjective: 'LO 1.5 Explain how pathway and tissue sensitivity influence biological effect.',
      },
      {
        kind: 'multi-input',
        points: 7,
        title: 'internal_alpha_pathway_multi',
        prompt:
          'Am-241 in a sealed smoke detector: the seal integrity is compromised. For a small-ingestion concern, choose pathway of concern, the main risk amplifier versus external alpha, and the response training point.',
        learningObjective: 'LO 1.5 Explain how pathway and tissue sensitivity influence biological effect.',
      },
      {
        kind: 'multi-input',
        points: 7,
        title: 'internal_alpha_pathway_multi',
        prompt:
          'Equal committed effective dose is delivered either as whole-body gamma or as alpha to red marrow. Choose which exposure stresses deterministic limits first, why tissue weighting differs, and the communication takeaway.',
        learningObjective: 'LO 1.5 Explain how pathway and tissue sensitivity influence biological effect.',
      },
      {
        kind: 'multi-input',
        points: 7,
        title: 'internal_alpha_pathway_multi',
        prompt:
          'Compare radon progeny alpha dose to bronchial tissue with gamma from building materials. Choose the primary pathway for radon risk, the metric tied to mitigation, and why pathway changes the message.',
        learningObjective: 'LO 1.5 Explain how pathway and tissue sensitivity influence biological effect.',
      },
      {
        kind: 'mcq',
        points: 7,
        title: 'dose_rate_biological_response',
        prompt: 'Two exposures deliver equal absorbed dose, but one is spread over weeks and one occurs in minutes. Which is typically more harmful?',
        learningObjective: 'LO 1.4 Distinguish alpha, beta, and gamma radiation by interaction with matter.',
        choices: [
          'The rapid exposure in minutes',
          'The prolonged exposure over weeks',
          'Both are always identical in effect',
          'Neither has biological effect',
        ],
      },
    ],
  },
  {
    id: 'n-ab-3',
    availableQuestions: 8,
    numberToSelect: 1,
    criteriaTag: 'radiation_safety_controls',
    exampleQuestions: [
      {
        kind: 'cata',
        points: 6,
        title: 'alara_controls_check',
        prompt: 'Select all practices that align with ALARA in an instructional lab.',
        learningObjective: 'LO 1.4 Apply practical radiation safety controls in lab scenarios.',
        cataStatements: [
          'Reduce time spent near active sources.',
          'Increase distance using tools instead of direct handling.',
          'Use lead shielding for high-energy gamma sources.',
          'Remove shielding to make source labels easier to read.',
          'Track dose with personal dosimeters.',
        ],
      },
      {
        kind: 'multi-input',
        points: 6,
        title: 'alara_lab_sequence_multi',
        prompt:
          'A sealed Cs source is used for the first lab of the semester. Choose the first control before unshielding, the distance practice during cart transfer, and the log entry you require before class dismissal.',
        learningObjective: 'LO 1.4 Apply practical radiation safety controls in lab scenarios.',
      },
      {
        kind: 'multi-input',
        points: 6,
        title: 'alara_lab_sequence_multi',
        prompt:
          'A beta source with acrylic step wedges is used in a room shared with an optics lab. Choose the pre-lab barrier check, the tool-use rule to maximize distance, and the survey meter sweep pattern emphasis.',
        learningObjective: 'LO 1.4 Apply practical radiation safety controls in lab scenarios.',
      },
      {
        kind: 'multi-input',
        points: 6,
        title: 'alara_lab_sequence_multi',
        prompt:
          'A sealed capsule was dropped and its integrity is unknown. Choose the immediate cordon step, the first measurement objective, and the documentation trigger for EH&S.',
        learningObjective: 'LO 1.4 Apply practical radiation safety controls in lab scenarios.',
      },
      {
        kind: 'multi-input',
        points: 6,
        title: 'alara_lab_sequence_multi',
        prompt:
          'During a guest lecture, students borrow portable meters while sources remain locked. Choose the student practice that best reduces collective dose, the instructor positioning rule, and the return checklist for meters.',
        learningObjective: 'LO 1.4 Apply practical radiation safety controls in lab scenarios.',
      },
    ],
  },
  {
    id: 'n-ab-4',
    availableQuestions: 8,
    numberToSelect: 1,
    criteriaTag: 'radiation_risk_benefit_analysis',
    exampleQuestions: [
      {
        kind: 'multi-input',
        points: 8,
        title: 'pe_workup_tradeoffs_multi',
        prompt:
          '42-year-old with no renal failure, high Wells score, positive D-dimer. Choose the guiding imaging principle for first-line PE workup, the key message to radiology, and how you would approach shielding in pregnancy if applicable.',
        learningObjective: 'LO 1.5 Evaluate benefit-risk trade-offs in radiation applications.',
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'pe_workup_tradeoffs_multi',
        prompt:
          '68-year-old with eGFR 28 mL/min and suspected PE. Choose the modality bias balancing contrast load versus radiation, the team coordination step, and the documentation that supports justification.',
        learningObjective: 'LO 1.5 Evaluate benefit-risk trade-offs in radiation applications.',
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'pe_workup_tradeoffs_multi',
        prompt:
          'Young adult with low pretest probability and stable vitals. Choose whether advanced imaging is justified yet, the alternative pathway emphasis, and how you document shared decision-making.',
        learningObjective: 'LO 1.5 Evaluate benefit-risk trade-offs in radiation applications.',
      },
      {
        kind: 'multi-input',
        points: 8,
        title: 'pe_workup_tradeoffs_multi',
        prompt:
          'After CTA, an incidental finding prompts debate about repeat imaging. Choose the principle for repeat imaging, how to reduce cumulative dose, and the communication priority with the patient.',
        learningObjective: 'LO 1.5 Evaluate benefit-risk trade-offs in radiation applications.',
      },
      {
        kind: 'mcq',
        points: 8,
        title: 'industrial_radiography_tradeoff',
        prompt: 'In industrial radiography, what is the strongest justification for controlled source use despite exposure risk?',
        learningObjective: 'LO 1.4 Distinguish alpha, beta, and gamma radiation by interaction with matter.',
        choices: [
          'It can reveal structural defects non-destructively when controls are applied',
          'It eliminates the need for any shielding procedures',
          'It produces no ionizing radiation when enclosed',
          'It guarantees zero occupational dose in all workflows',
        ],
      },
    ],
  },
];

const getAssessmentSelections = (assessmentTitle?: string) =>
  assessmentTitle?.toLowerCase().includes('nuclear') ? nuclearSelections : electrochemistrySelections;

const getPageObjectives = (assessmentTitle?: string): PageObjective[] => {
  const isNuclear = assessmentTitle?.toLowerCase().includes('nuclear');
  return isNuclear
    ? [
        { code: 'LO 1.4', label: 'LO 1.4 Distinguish alpha, beta, and gamma radiation by interaction with matter.' },
        { code: 'LO 1.5', label: 'LO 1.5 Explain how dose, pathway, and tissue sensitivity influence biological effects.' },
      ]
    : [
        { code: 'LO 1.1', label: 'LO 1.1 Balance redox equations and construct half-reactions.' },
        { code: 'LO 1.2', label: 'LO 1.2 Predict electrochemical behavior and cell trends.' },
        { code: 'LO 1.3', label: 'LO 1.3 Evaluate electrochemistry applications in real systems.' },
      ];
};

const extractObjectiveCode = (objectiveText?: string) => {
  if (!objectiveText) return null;
  const match = objectiveText.match(/LO\s*\d+(?:\.\d+)?/i);
  return match ? match[0].replace(/\s+/g, ' ').toUpperCase() : null;
};

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

function computeObjectiveCoverage({
  assessmentTitle,
  selections,
  removedBanks,
  removedEmbedded,
}: {
  assessmentTitle: string;
  selections: AssessmentSelection[];
  removedBanks: string[];
  removedEmbedded: Record<string, boolean>;
}) {
  const objectives = getPageObjectives(assessmentTitle);
  const objectiveByCode = new Map(objectives.map((objective) => [objective.code.toUpperCase(), objective]));
  const totals = new Map<string, { min: number; max: number }>();
  objectiveByCode.forEach((_, code) => totals.set(code, { min: 0, max: 0 }));
  const draft = loadAssessmentDraft(assessmentTitle);
  let untaggedIncluded = 0;
  let taggedIncluded = 0;

  selections.forEach((selection) => {
    if (removedBanks.includes(selection.id)) return;
    const removedIdSet = new Set(draft.bankRemovedQuestionIds[selection.id] ?? []);
    const generated = Array.from({ length: selection.availableQuestions }).map((_, index) => {
      const seeded = selection.exampleQuestions[index % selection.exampleQuestions.length];
      const id = `${selection.id}-q-${index + 1}`;
      return {
        id,
        learningObjective: seeded.learningObjective,
      };
    });
    const included = generated.filter((question) => !removedIdSet.has(question.id));
    const n = included.length;
    const k = Math.min(selection.numberToSelect, n);

    included.forEach((question) => {
      const code = extractObjectiveCode(question.learningObjective);
      if (!code || !objectiveByCode.has(code)) {
        untaggedIncluded += 1;
      } else {
        taggedIncluded += 1;
      }
    });

    objectiveByCode.forEach((_, objectiveCode) => {
      const c = included.filter((question) => extractObjectiveCode(question.learningObjective) === objectiveCode).length;
      const contributionMin = Math.max(0, k - (n - c));
      const contributionMax = Math.min(k, c);
      const current = totals.get(objectiveCode);
      if (!current) return;
      current.min += contributionMin;
      current.max += contributionMax;
    });
  });

  const embeddedQuestions = [
    {
      id: 'exitQuestion',
      removed: Boolean(removedEmbedded.exitQuestion),
      learningObjective: assessmentTitle.toLowerCase().includes('nuclear')
        ? 'LO 1.5 Explain why biological impact varies by pathway and tissue sensitivity.'
        : 'LO 1.2 Explain how concentration changes affect cell potential.',
    },
    ...(assessmentTitle.toLowerCase().includes('nuclear')
      ? [
          {
            id: 'nuclearSafety',
            removed: Boolean(removedEmbedded.nuclearSafety),
            learningObjective: 'LO 1.4 Compare shielding and handling strategies for common radiation types.',
          },
        ]
      : []),
  ];

  embeddedQuestions.forEach((question) => {
    if (question.removed) return;
    const code = extractObjectiveCode(question.learningObjective);
    if (!code || !objectiveByCode.has(code)) {
      untaggedIncluded += 1;
      return;
    }
    taggedIncluded += 1;
    const current = totals.get(code);
    if (!current) return;
    current.min += 1;
    current.max += 1;
  });

  const coverage: ObjectiveCoverage[] = objectives.map((objective) => {
    const totalsForObjective = totals.get(objective.code.toUpperCase()) ?? { min: 0, max: 0 };
    const state: ObjectiveCoverage['state'] =
      totalsForObjective.max === 0 ? 'not-covered' : totalsForObjective.min === 0 ? 'at-risk' : 'healthy';
    return {
      objective,
      min: totalsForObjective.min,
      max: totalsForObjective.max,
      state,
    };
  });

  return { coverage, taggedIncluded, untaggedIncluded };
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
  const [viewMode, setViewMode] = useState<ViewMode>('instructor');
  const isNuclearAssessment = assessmentTitle.toLowerCase().includes('nuclear');
  const isStudentPreview = viewMode === 'student';
  const assessmentSelections = getAssessmentSelections(assessmentTitle);
  const attemptsStarted = state?.attemptsStarted ?? false;
  const studentPreviewData = useMemo(() => {
    const usesVariantNaming = usesTaggedVariantNaming(assessmentTitle);
    const isElectrochemistry = isElectrochemistryUnitCheckpoint(assessmentTitle);
    const banks: StudentPreviewBank[] = assessmentSelections
      .filter((selection) => !removedBanks.includes(selection.id))
      .map((selection, index) => {
        const candidateCount = isElectrochemistry
          ? selection.availableQuestions
          : Math.min(selection.availableQuestions, Math.max(selection.numberToSelect * 2, selection.exampleQuestions.length + 1));
        const candidateQuestions: StudentPreviewQuestion[] = Array.from({ length: candidateCount }).map((_, questionIndex) => {
          const seeded = selection.exampleQuestions[questionIndex % selection.exampleQuestions.length];
          if (usesVariantNaming) {
            return {
              id: `${selection.id}-candidate-${questionIndex + 1}`,
              title: `${seeded.title}_v${questionIndex + 1}`,
              prompt: seeded.prompt,
              kind: seeded.kind,
              points: seeded.points,
              choices: seeded.choices ? rotateArray(seeded.choices, questionIndex) : undefined,
              cataStatements: seeded.cataStatements ? rotateArray(seeded.cataStatements, questionIndex) : undefined,
              showGraph: seeded.showGraph,
            };
          }
          const needsVariantTitle = questionIndex >= selection.exampleQuestions.length;
          return {
            id: `${selection.id}-candidate-${questionIndex + 1}`,
            title: needsVariantTitle ? `${seeded.title} Variant ${questionIndex + 1}` : seeded.title,
            prompt: seeded.prompt,
            kind: seeded.kind,
            points: seeded.points,
            choices: seeded.choices,
            cataStatements: seeded.cataStatements,
            showGraph: seeded.showGraph,
          };
        });
        return {
          id: selection.id,
          label: `Activity Bank ${index + 1}`,
          numberToSelect: selection.numberToSelect,
          candidateQuestions,
          scenarioQuestions: candidateQuestions.slice(0, selection.numberToSelect),
        };
      });
    const embeddedQuestions: StudentPreviewQuestion[] = [];
    if (isNuclearAssessment && !removedEmbeddedQuestions.nuclearSafety) {
      embeddedQuestions.push({
        id: 'embedded-nuclear-safety-preview',
        title: 'Radiation Materials Safety Check',
        prompt: 'A lab stores alpha, beta, and gamma emitters for demonstrations. Which setup best reduces exposure risk while preserving visibility for students?',
        kind: 'mcq',
        points: 6,
        choices: [
          'Use paper shielding for all sources and keep all containers open for easier viewing.',
          'Use thick lead shielding for alpha sources only and remove barriers for beta and gamma sources.',
          'Keep sealed containers, use acrylic shielding for beta sources, and place gamma sources behind lead shielding at distance.',
          'Store all emitters together in one tray to simplify transport between lab benches.',
        ],
      });
    }
    if (!removedEmbeddedQuestions.exitQuestion) {
      embeddedQuestions.push({
        id: 'embedded-exit-preview',
        title: isNuclearAssessment ? 'Biological Effects Exit Question' : 'Electrochemistry Exit Question',
        prompt: isNuclearAssessment
          ? 'Which factor most directly explains why equal absorbed doses can lead to different biological outcomes?'
          : 'Which statement best explains why a galvanic cell potential decreases as reactants are consumed?',
        kind: 'mcq',
        points: 6,
        choices: isNuclearAssessment
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
            ],
      });
    }
    return { banks, embeddedQuestions };
  }, [assessmentTitle, assessmentSelections, removedBanks, removedEmbeddedQuestions, isNuclearAssessment]);
  const coverageSummary = useMemo(
    () =>
      computeObjectiveCoverage({
        assessmentTitle,
        selections: assessmentSelections,
        removedBanks,
        removedEmbedded: removedEmbeddedQuestions,
      }),
    [assessmentTitle, assessmentSelections, removedBanks, removedEmbeddedQuestions],
  );

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
    const bankMeta = getAssessmentSelections(assessmentTitle).find((selection) => selection.id === state.removeBankId);
    if (bankMeta) {
      persistAllQuestionsRemovedForBank(assessmentTitle, state.removeBankId, bankMeta.availableQuestions);
    }
    setRemovedBanks((current) => {
      if (current.includes(state.removeBankId as string)) return current;
      return [...current, state.removeBankId as string];
    });
    showBankToast(state.removeBankId, state.bulkToast ?? 'Activity bank removed.');
  }, [state?.removeBankId, state?.bulkToast, assessmentTitle]);

  useEffect(() => {
    persistAssessmentSurface(assessmentTitle, { removedBanks, removedEmbedded: removedEmbeddedQuestions });
  }, [assessmentTitle, removedBanks, removedEmbeddedQuestions]);

  const toggleRemoved = (id: string, label: string) => {
    setRemovedBanks((current) => {
      const willRestore = current.includes(id);
      const bankMeta = assessmentSelections.find((selection) => selection.id === id);
      if (bankMeta) {
        if (willRestore) {
          persistBankRemovedQuestionIds(assessmentTitle, id, []);
        } else {
          persistAllQuestionsRemovedForBank(assessmentTitle, id, bankMeta.availableQuestions);
        }
      }
      showBankToast(id, willRestore ? `${label} restored.` : `${label} removed.`);
      return willRestore ? current.filter((bankId) => bankId !== id) : [...current, id];
    });
  };

  const requestToggleBank = (id: string) => {
    const alreadyRemoved = removedBanks.includes(id);
    if (!attemptsStarted || alreadyRemoved) {
      if (!alreadyRemoved) {
        const warning = getBankCoverageWarning(id);
        if (warning) {
          showBankToast(id, warning);
        }
      }
      toggleRemoved(id, 'Activity bank');
      return;
    }
    const warning = getBankCoverageWarning(id);
    if (warning) {
      showBankToast(id, warning);
    }
    setPendingBankRemoveId(id);
  };

  function getBankCoverageWarning(bankId: string) {
    const before = coverageSummary.coverage;
    const after = computeObjectiveCoverage({
      assessmentTitle,
      selections: assessmentSelections,
      removedBanks: removedBanks.includes(bankId) ? removedBanks : [...removedBanks, bankId],
      removedEmbedded: removedEmbeddedQuestions,
    }).coverage;
    const impacted = before
      .filter((item) => item.max > 0)
      .filter((item) => (after.find((a) => a.objective.code === item.objective.code)?.max ?? 0) === 0)
      .map((item) => item.objective.code);
    if (impacted.length === 0) return null;
    return `Warning: removing this bank leaves ${impacted.join(', ')} without coverage.`;
  }

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
      if (!alreadyRemoved) {
        const nextRemoved = { ...removedEmbeddedQuestions, [questionId]: true };
        const after = computeObjectiveCoverage({
          assessmentTitle,
          selections: assessmentSelections,
          removedBanks,
          removedEmbedded: nextRemoved,
        }).coverage;
        const impacted = coverageSummary.coverage
          .filter((item) => item.max > 0)
          .filter((item) => (after.find((a) => a.objective.code === item.objective.code)?.max ?? 0) === 0)
          .map((item) => item.objective.code);
        if (impacted.length > 0) {
          showEmbeddedToast(questionId, `Warning: removing this question leaves ${impacted.join(', ')} without coverage.`);
        }
      }
      toggleEmbeddedRemoved(questionId);
      return;
    }
    setPendingEmbeddedRemoveId(questionId);
  };

  return (
    <InstructorShell>
      <div className="assessment-layout">
        <AssessmentHeader coverageSummary={coverageSummary} viewMode={viewMode} onViewModeChange={setViewMode} />
        <div className="assessment-content">
          {attemptsStarted && !isStudentPreview ? (
            <div className="attempts-banner" role="status" aria-live="polite">
              <img src={warningIcon} alt="" aria-hidden="true" />
              Students have already started this assessment. Removing or changing questions will only impact future attempts.
            </div>
          ) : null}
          <div className="assessment-main">
            {!isStudentPreview ? <div className="assessment-shortcuts-card">
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
            </div> : null}
            {!isStudentPreview ? <div className="assessment-intro">
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
            </div> : <StudentAssessmentPreview banks={studentPreviewData.banks} embeddedQuestions={studentPreviewData.embeddedQuestions} />}
            {!isStudentPreview ? assessmentSelections.map((selection) => (
              <ActivityBankSelectionCard
                key={selection.id}
                selection={selection}
                questionsAvailableCount={
                  removedBanks.includes(selection.id)
                    ? 0
                    : getIncludedQuestionCountForBank(assessmentTitle, selection.id, selection.availableQuestions)
                }
                removed={removedBanks.includes(selection.id)}
                toastMessage={bankToasts[selection.id]}
                onToggleRemove={() => requestToggleBank(selection.id)}
                attemptsStarted={attemptsStarted}
                assessmentTitle={state?.assessmentTitle}
                breadcrumbTrail={state?.breadcrumbTrail}
                canManage={!isStudentPreview}
              />
            )) : null}
            {!isStudentPreview && !isNuclearAssessment ? (
              <section className="assessment-mid-media" aria-label="Electrolysis cell diagram">
                <img src={electrolysisImage} alt="Electrolysis setup with electrodes and ion movement" />
              </section>
            ) : null}
            {!isStudentPreview && isNuclearAssessment ? (
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
                    learningObjective="LO 1.4 Compare shielding and handling strategies for common radiation types."
                    choices={[
                      'Use paper shielding for all sources and keep all containers open for easier viewing.',
                      'Use thick lead shielding for alpha sources only and remove barriers for beta and gamma sources.',
                      'Keep sealed containers, use acrylic shielding for beta sources, and place gamma sources behind lead shielding at distance.',
                      'Store all emitters together in one tray to simplify transport between lab benches.',
                    ]}
                    embedded
                    removed={Boolean(removedEmbeddedQuestions.nuclearSafety)}
                    onToggleRemove={!isStudentPreview ? () => requestToggleEmbedded('nuclearSafety') : undefined}
                    studentPreview={isStudentPreview}
                  />
                </section>
              </>
            ) : null}
            {!isStudentPreview ? <section className="embedded-question" id="embedded-question">
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
                    ? 'LO 1.5 Explain why biological impact varies by pathway and tissue sensitivity.'
                    : 'LO 1.2 Explain how concentration changes affect cell potential.'
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
                onToggleRemove={!isStudentPreview ? () => requestToggleEmbedded('exitQuestion') : undefined}
                studentPreview={isStudentPreview}
              />
            </section> : null}
          </div>
          <div className="assessment-footer">
            <button className="button button--secondary">Previous</button>
            <span>All pages auto-saving now.</span>
            <span>Lasts Media edit at 4:48 PM</span>
            <button className="button button--primary">Next</button>
          </div>
        </div>
      </div>
      {!isStudentPreview && pendingBankRemoveId ? (
        <AttemptsStartedChangeModal
          targetLabel="bank"
          onKeep={() => setPendingBankRemoveId(null)}
          onRemove={() => {
            toggleRemoved(pendingBankRemoveId, 'Activity bank');
            setPendingBankRemoveId(null);
          }}
        />
      ) : null}
      {!isStudentPreview && pendingEmbeddedRemoveId ? (
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
  const baseQuestions: BankQuestionRow[] = useMemo(() => {
    const draft = loadAssessmentDraft(assessmentTitle);
    const removedIdSet = new Set(draft.bankRemovedQuestionIds[selectedBank.id] ?? []);
    if (usesTaggedVariantNaming(assessmentTitle)) {
      return Array.from({ length: generatedQuestionCount }).map((_, index) => {
        const seeded = selectedBank.exampleQuestions[index % selectedBank.exampleQuestions.length];
        const difficulty = index % 3 === 0 ? 'Easy' : index % 3 === 1 ? 'Medium' : 'Hard';
        const rotatedChoices = seeded.choices ? rotateArray(seeded.choices, index) : undefined;
        const rotatedStatements = seeded.cataStatements ? rotateArray(seeded.cataStatements, index) : undefined;
        const id = `${selectedBank.id}-q-${index + 1}`;
        return {
          id,
          title: `${seeded.title}_v${index + 1}`,
          prompt: seeded.prompt,
          kind: seeded.kind,
          points: seeded.points,
          learningObjective: seeded.learningObjective,
          choices: rotatedChoices,
          cataStatements: rotatedStatements,
          showGraph: seeded.showGraph,
          difficulty,
          removed: removedIdSet.has(id),
        };
      });
    }
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
        showGraph: seeded.showGraph,
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
      {question.showGraph ? <img className="question-media" src={graphImage} alt="Question graph" /> : null}
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

function AssessmentHeader({
  coverageSummary,
  viewMode,
  onViewModeChange,
}: {
  coverageSummary: { coverage: ObjectiveCoverage[]; taggedIncluded: number; untaggedIncluded: number };
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const location = useLocation();
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const state = location.state as { breadcrumbTrail?: BreadcrumbItem[]; assessmentTitle?: string } | null;
  const breadcrumbTrail = state?.breadcrumbTrail ?? [
    { label: 'Customize Content', to: '/customize' },
    { label: 'Assessment' },
  ];
  const assessmentTitle = state?.assessmentTitle ?? '12. Electrochemistry Unit Checkpoint';
  const objectives = getPageObjectives(assessmentTitle);

  return (
    <>
      <div className={viewMode === 'student' ? 'instructor-bar instructor-bar--student' : 'instructor-bar'}>
        <div className="view-switcher">
          <button
            type="button"
            className="instructor-pill instructor-pill--dropdown"
            onClick={() => setViewMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={viewMenuOpen}
          >
            <img className="instructor-pill__icon" src={viewMode === 'student' ? studentIcon : instructorIcon} alt="" aria-hidden="true" />
            <span>{viewMode === 'instructor' ? 'Instructor view' : 'Student preview'}</span>
            <img src={chevronDownIcon} alt="" aria-hidden="true" className={viewMenuOpen ? 'instructor-pill__chevron is-open' : 'instructor-pill__chevron'} />
          </button>
          {viewMenuOpen ? (
            <div className="view-switcher__menu" role="menu" aria-label="View mode">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={viewMode === 'instructor'}
                className={viewMode === 'instructor' ? 'view-switcher__item is-active' : 'view-switcher__item'}
                onClick={() => {
                  onViewModeChange('instructor');
                  setViewMenuOpen(false);
                }}
              >
                Instructor view
              </button>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={viewMode === 'student'}
                className={viewMode === 'student' ? 'view-switcher__item is-active' : 'view-switcher__item'}
                onClick={() => {
                  onViewModeChange('student');
                  setViewMenuOpen(false);
                }}
              >
                Student preview
              </button>
            </div>
          ) : null}
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
        {viewMode === 'student' ? (
          <div className="student-preview-badge">Preview only - students will not see instructor controls.</div>
        ) : (
          <div className="learning-objectives">
            <div className="learning-objectives__label">Learning Objectives</div>
            <div className="learning-objective-checker__meta">
              Tagged: {coverageSummary.taggedIncluded} · Untagged: {coverageSummary.untaggedIncluded}
              {coverageSummary.untaggedIncluded > 0 ? (
                <span className="learning-objective-checker__meta-warning">
                  Coverage may be understated due to untagged questions.
                </span>
              ) : null}
            </div>
            {objectives.map((objective) => {
              const item = coverageSummary.coverage.find((coverage) => coverage.objective.code === objective.code);
              const state = item?.state ?? 'not-covered';
              return (
                <div key={objective.code} className="learning-objective-item learning-objective-item--with-coverage">
                  <div className="learning-objective-item__main">
                    {state !== 'healthy' ? <img src={warningIcon} alt="" aria-hidden="true" /> : <img src={checkIcon} alt="" aria-hidden="true" />}
                    <span>{objective.label}</span>
                  </div>
                  <div className="learning-objective-item__coverage">
                    <div className={state === 'healthy' ? 'learning-objective-checker__range' : 'learning-objective-checker__range is-warning'}>
                      {(item?.min ?? 0) === (item?.max ?? 0) ? `${item?.min ?? 0} questions` : `${item?.min ?? 0}-${item?.max ?? 0} questions`}
                    </div>
                    <div className="learning-objective-checker__state">
                      {state === 'not-covered' ? 'No coverage' : state === 'at-risk' ? 'At risk' : 'Guaranteed'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function ActivityBankSelectionCard({
  selection,
  questionsAvailableCount,
  removed,
  toastMessage,
  onToggleRemove,
  attemptsStarted,
  assessmentTitle,
  breadcrumbTrail,
  canManage,
}: {
  selection: AssessmentSelection;
  questionsAvailableCount: number;
  removed: boolean;
  toastMessage?: string;
  onToggleRemove: () => void;
  attemptsStarted: boolean;
  assessmentTitle?: string;
  breadcrumbTrail?: BreadcrumbItem[];
  canManage: boolean;
}) {
  const navigate = useNavigate();
  const [exampleIndex, setExampleIndex] = useState(0);
  const previewQuestions = selection.exampleQuestions.slice(0, Math.max(1, selection.numberToSelect));
  const previewCount = previewQuestions.length;
  const safeExampleIndex = previewCount > 0 ? exampleIndex % previewCount : 0;
  const exampleQuestion = previewQuestions[safeExampleIndex] ?? selection.exampleQuestions[0];

  return (
    <section id={`bank-${selection.id}`} className={removed ? 'bank-card-wrapper bank-card-wrapper--removed' : 'bank-card-wrapper'}>
      {toastMessage ? <SuccessToast message={toastMessage} inline /> : null}
      <div className={removed ? 'bank-card bank-card--removed' : 'bank-card'}>
      <div className="bank-card__header">
        <div>
          <div className="muted-caption">{questionsAvailableCount} questions available</div>
          <div className="bank-card__title-row">
            <h2>Activity Bank Selection</h2>
            {removed ? <span className="status-pill">Removed</span> : null}
          </div>
        </div>
        {canManage ? (
          <button className={removed ? 'button button--secondary button--small' : 'button button--danger button--small'} onClick={onToggleRemove}>
            {removed ? 'Restore' : 'Remove'}
          </button>
        ) : null}
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
          {previewCount > 1 ? (
            <div className="example-pagination">
              <button
                className="button button--secondary button--small pagination-nav-btn"
                onClick={() => setExampleIndex((current) => (current === 0 ? previewCount - 1 : current - 1))}
              >
                Previous
              </button>
              <span>
                {safeExampleIndex + 1} / {previewCount}
              </span>
              <div className="example-shortcuts" role="tablist" aria-label="Example question shortcuts">
                {previewQuestions.map((_, index) => (
                  <button
                    key={index}
                    className={safeExampleIndex === index ? 'example-shortcut is-active' : 'example-shortcut'}
                    onClick={() => setExampleIndex(index)}
                  >
                    Q{index + 1}
                  </button>
                ))}
              </div>
              <button
                className="button button--secondary button--small pagination-nav-btn"
                onClick={() => setExampleIndex((current) => (current + 1) % previewCount)}
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
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Change will affect future attempts">
      <div className="modal-card">
        <h3>Change will affect future attempts</h3>
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
  studentPreview = false,
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
  studentPreview?: boolean;
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
      {!studentPreview ? <button className="detail-toggle" onClick={() => setExpanded((current) => !current)}>
        {expanded ? 'Hide Details' : 'View Details'}
        <img src={chevronDownIcon} alt="" aria-hidden="true" className={expanded ? 'chevron-icon is-open' : 'chevron-icon'} />
      </button> : null}
      {!studentPreview && expanded ? (
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
      {!studentPreview ? <div className="learning-objective-footnote">
        <strong>LO</strong> {learningObjective}
      </div> : null}
    </div>
  );
}

function StudentAssessmentPreview({
  banks,
  embeddedQuestions,
}: {
  banks: StudentPreviewBank[];
  embeddedQuestions: StudentPreviewQuestion[];
}) {
  const questions = [...banks.flatMap((bank) => bank.scenarioQuestions), ...embeddedQuestions];
  return (
    <section className="student-preview-sheet" aria-label="Student assessment preview">
      <div className="student-preview-sheet__header">
        <div>
          <h2>Student Assessment Preview</h2>
          <p>Showing one sampled student scenario per bank.</p>
        </div>
      </div>
      {questions.map((question, index) => (
        <article key={question.id} className="student-question-card">
          <div className="student-question-card__meta">
            Question {index + 1} · {question.points} point{question.points === 1 ? '' : 's'}
          </div>
          <h3>{question.title}</h3>
          <p>{question.prompt}</p>
          {question.showGraph ? <img className="question-media" src={graphImage} alt="Question graph" /> : null}
          {question.kind === 'mcq' ? (
            <div className="student-choice-list">
              {(question.choices ?? ['Option A', 'Option B', 'Option C', 'Option D']).map((choice) => (
                <label key={choice} className="student-choice-row">
                  <input type="radio" name={question.id} disabled />
                  <span>{choice}</span>
                </label>
              ))}
            </div>
          ) : null}
          {question.kind === 'cata' ? (
            <div className="student-choice-list">
              {(question.cataStatements ?? ['Statement A', 'Statement B', 'Statement C']).map((statement) => (
                <label key={statement} className="student-choice-row">
                  <input type="checkbox" disabled />
                  <span>{statement}</span>
                </label>
              ))}
            </div>
          ) : null}
          {question.kind === 'multi-input' ? (
            <>
              <img className="question-media question-media--small" src={formulaImage} alt="" />
              <p className="student-preview-dropdown-hint">Students choose values from each dropdown to complete the item.</p>
              <div className="multi-input-row multi-input-row--preview">
                <button type="button" className="dropdown-chip is-selected" disabled>
                  Dropdown
                </button>
                <span>Cu +</span>
                <button type="button" className="dropdown-chip" disabled>
                  Dropdown
                </button>
                <span>
                  NO<sub>3</sub> +
                </span>
                <button type="button" className="dropdown-chip" disabled>
                  Dropdown
                </button>
                <span>
                  H<sub>2</sub>O +
                </span>
                <button type="button" className="dropdown-chip" disabled>
                  Dropdown
                </button>
                <span>NO</span>
              </div>
            </>
          ) : null}
          {question.kind === 'short-answer' ? <textarea className="student-short-answer" disabled placeholder="Type your response here…" /> : null}
        </article>
      ))}
    </section>
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
