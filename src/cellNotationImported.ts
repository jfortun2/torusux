/** Converted from Torus export page 80623 (Cell Notation) and its Activity/Objective JSON. */

export const CELL_NOTATION_LO = "LO 1.2 Use cell notation to describe galvanic cells.";

export const cellNotationIntro = {
  heading: "Cell notation",
  bodyHtml: "<p>Chemists often use a compact notation to efficiently describe the composition of electrochemical cells. This <span class=\"page-keyword\">cell notation</span> (also called a <em>cell diagram</em>) provides information about the species involved in the reaction and how the cell is constructed. In this representation:</p>\n<ul><li><p>Species involved in the oxidation half-reaction are written on the left, and species in the reduction half-reaction are on the right.</p></li>\n<li><p>The anode is written farthest to the left and the cathode is written farthest to the right.</p></li>\n<li><p>A vertical line, │, denotes a phase boundary and a double line, ║, indicates the salt bridge (and separates the two half-reactions).</p></li>\n<li><p>If reactants and products of a half-reaction are in the same phase, we use a comma to separate them.</p></li></ul>\n<p>The cell notation for the galvanic cell described on the previous page is shown here:</p>\n<p>Cu(s)│Cu<sup>2+</sup>(aq, 1 M)║Ag<sup>+</sup>(aq, 1 M)│Ag(s)</p>",
  learningObjective: CELL_NOTATION_LO,
};

export const cellNotationExample = {
  id: "example-notation",
  heading: "Example",
  bodyHtml: "<p>Consider a galvanic cell that uses the reaction:</p>\n<p>2 Cr(s) + 3 Cu<sup>2+</sup>(aq) → 2 Cr<sup>3+</sup>(aq) + 3 Cu(s)</p>\n<p>Write the oxidation and reduction half-reactions. Which reaction occurs at the anode? Which occurs at the cathode? Write the shorthand notation for this galvanic cell.</p>\n<p>By inspection, Cr is oxidized when three electrons are lost to form Cr<sup>3+</sup>, and Cu<sup>2+</sup> is reduced as it gains two electrons to form Cu. Balancing the charge gives:</p>\n<p>Oxidation: 2 Cr(s) → 2 Cr<sup>3+</sup>(aq) + 6 e<sup>−</sup><br>Reduction: 3 Cu<sup>2+</sup>(aq) + 6 e<sup>−</sup> → 3 Cu(s) <br>Overall: 2 Cr(s) + 3 Cu<sup>2+</sup>(aq) → 2 Cr<sup>3+</sup>(aq) + 3 Cu(s)</p>\n<p>We start on the left with information about the oxidation half-reaction. The anode, Cr(<em>s</em>), is written farthest to the left. Next is a single line, │, representing the phase boundary, followed by the Cr<sup>3+</sup>(<em>aq</em>) ions in the solution.</p>\n<p>Next, we write a double line, ║, to indicate the salt bridge and separate the two half-reactions.</p>\n<p>Finally, we state the information about the reduction half-reaction. First, we write the Cu<sup>2+</sup>(<em>aq</em>) ions in the solution. Next is a single line, │, representing the phase boundary. The cathode, Cu(<em>s</em>), is written farthest to the right.</p>\n<p>The cell notation is therefore:</p>\n<p>Cr(s)│Cr<sup>3+</sup>(aq)║Cu<sup>2+</sup>(aq)│Cu(s)</p>\n<p>Note that this notation provides information about the reactants and products of the redox reaction that occurs in the cell, but it does not explicitly state the stoichiometric coefficients for the reaction. (These coefficients can be determined relatively easily from the information given in the cell notation.)</p>",
};

export const cellNotationExtraTextBlocks = [
  {
    id: "notation-lbd",
    heading: "Learn by Doing",
    beforeQuestionIndex: 0,
    learningObjective: CELL_NOTATION_LO,
    bodyHtml: "<p>Use the following description of a galvanic cell to answer the questions that follow.</p>\n<p>One half-cell consists of a gold electrode in a 1.0 M Au(NO<sub>3</sub>)<sub>3</sub> solution, and the other half-cell is a magnesium electrode in a 1.0 M Mg(NO<sub>3</sub>)<sub>2</sub> solution. The salt bridge contains NaNO<sub>3</sub>. NO<sub>3</sub><sup>−</sup> ions from the salt bridge flow toward the cell containing the Mg(NO<sub>3</sub>)<sub>2</sub> solution, and Na<sup>+</sup> ions flow toward the cell containing the Au(NO<sub>3</sub>)<sub>3</sub> solution.</p>",
  },
  {
    id: "notation-digt",
    heading: "Did I Get This",
    beforeQuestionIndex: 4,
    learningObjective: CELL_NOTATION_LO,
    bodyHtml: "<p>Use the following description of a galvanic cell to answer the questions that follow.</p>\n<p>One half-cell consists of a piece of Pt metal submerged in a solution of Pt(NO<sub>3</sub>)<sub>2</sub>, and the other half-cell consists of a piece of Cu metal submerged in a solution of Cu(NO<sub>3</sub>)<sub>2</sub>. When the cell operates, Pt is formed and Cu is consumed.</p>",
  },
  {
    id: "notation-source",
    heading: "Source",
    learningObjective: CELL_NOTATION_LO,
    bodyHtml: "<p>Adapted from <a href=\"https://cnx.org/contents/havxkyvS@9.422:b39avmGq@29/Preface\">Openstax Chemistry</a> under <a href=\"https://creativecommons.org/licenses/by/4.0\">Creative Commons Attribution 4.0 License.</a></p>\n<p>Download for free at <a href=\"http://cnx.org/contents/85abf193-2bd2-4908-8563-90b8a7ac8df6@9.312\">http://cnx.org/contents/85abf193-2bd2-4908-8563-90b8a7ac8df6@9.312.</a></p>",
  },
];

export const cellNotationQuestions = [
  {
    id: "notation-lbd-q1",
    question: {
      kind: "multi-input",
      title: "Choose the oxidation and reduction half-reactions",
      prompt: "Choose the oxidation and reduction half-reactions. Oxidation: Reduction: ___ Options: Au(s) + 3 e⁻ → Au³⁺(aq); Au(s) → Au³⁺(aq) + 3 e⁻; Au³⁺(aq) + 3 e⁻ → Au(s); Au³⁺(aq) → Au(s) + 3 e⁻; Mg(s) + 2 e⁻ → Mg²⁺(aq); Mg(s) → Mg²⁺(aq) + 2 e⁻; Mg²⁺(aq) + 2 e⁻ → Mg(s); Mg²⁺(aq) → Mg(s) + 2 e⁻.",
      points: 2,
      learningObjective: CELL_NOTATION_LO,
      choices: [],
      inputs: [
        { id: "notation-lbd-q1-first", label: "Oxidation", answer: "Mg(s) → Mg²⁺(aq) + 2 e⁻" },
        { id: "notation-lbd-q1-second", label: "Reduction", answer: "Au³⁺(aq) + 3 e⁻ → Au(s)" },
      ],
      correctFeedback: "Correct. Mg(s) is oxidized to form Mg²⁺(aq). Correct. Au³⁺(aq) is reduced to form Au(s).",
      incorrectFeedback: "Incorrect. This half-reaction is not oxidation, and is not balanced. Incorrect. Au is not oxidized. Incorrect. This half-reaction represents reduction. Incorrect. This half-reaction is not balanced. Incorrect. This half-reaction represents oxidation. Incorrect. This half-reaction is not reduction, and is not balanced. Incorrect. This equation represents oxidation. Incorrect. Mg²⁺ is not reduced. Hint: In the cell where oxidation occurs, atoms from the solid electrode are converted into positive ions and flow into the solution. Negative ions from the salt bridge will therefore flow here to balance charge. In the cell where reduction occurs, positive ions from the solution are converted into atoms and are added to the solid electrode. Positive ions from the salt bridge will therefore flow here to balance charge.",
    },
  },
  {
    id: "notation-lbd-q2",
    question: {
      kind: "multi-input",
      title: "Fill in the correct coefficients for the balanced overall reaction",
      prompt: "Fill in the correct coefficients for the balanced overall reaction. Hint: Multiply each half-reaction by the factor that makes the number of electrons gained equal to the number of electrons lost, and then add the half-reactions together. Au³⁺(aq) + Mg(s) → Au(s) + Mg²⁺(aq) Options: 1; 2; 3; 4; 5.",
      points: 4,
      learningObjective: CELL_NOTATION_LO,
      choices: [],
      inputs: [
        { id: "notation-lbd-q2-first", label: "Coefficient of Au³⁺(aq)", answer: "2" },
        { id: "notation-lbd-q2-second", label: "Coefficient of Mg(s)", answer: "3" },
        { id: "notation-lbd-q2-third", label: "Coefficient of Au(s)", answer: "2" },
        { id: "notation-lbd-q2-four", label: "Coefficient of Mg²⁺(aq)", answer: "3" },
      ],
      correctFeedback: "Correct.",
      incorrectFeedback: "Incorrect.",
    },
  },
  {
    id: "notation-lbd-q3",
    question: {
      kind: "multi-input",
      title: "Which half-reaction occurs at the anode and the cathode?",
      prompt: "Which half-reaction occurs at the anode? Which half-reaction occurs at the cathode? ___ Options: Au³⁺(aq) + 3 e⁻ → Au(s); Mg(s) → Mg²⁺(aq) + 2 e⁻.",
      points: 2,
      learningObjective: CELL_NOTATION_LO,
      choices: [],
      inputs: [
        { id: "notation-lbd-q3-first", label: "Anode", answer: "Mg(s) → Mg²⁺(aq) + 2 e⁻" },
        { id: "notation-lbd-q3-second", label: "Cathode", answer: "Au³⁺(aq) + 3 e⁻ → Au(s)" },
      ],
      correctFeedback: "Correct. The oxidation half-reaction occurs at the anode. Correct. The reduction half-reaction occurs at the cathode.",
      incorrectFeedback: "Incorrect. The oxidation half-reaction occurs at the anode. Incorrect. The reduction half-reaction occurs at the cathode. Hint: Which process occurs at the anode, oxidation or reduction? Which process occurs at the cathode, oxidation or reduction?",
    },
  },
  {
    id: "notation-lbd-q4",
    question: {
      kind: "mcq",
      title: "Which is the correct cell notation?",
      prompt: "Which is the correct cell notation?",
      points: 1,
      learningObjective: CELL_NOTATION_LO,
      inputs: [],
      choices: [
        { id: "notation-lbd-q4-a", text: "Mg(s)│Mg²⁺(aq)║Au³⁺(aq)│Au(s)", correct: true },
        { id: "notation-lbd-q4-b", text: "Au(s)│Au³⁺(aq)║Mg²⁺(aq)│Mg(s)", correct: false },
      ],
      correctFeedback: "Correct. In cell notation, the oxidation information is written on the left and the reduction information is written on the right.",
      incorrectFeedback: "Incorrect.",
    },
  },
  {
    id: "notation-digt-q1",
    question: {
      kind: "multi-input",
      title: "The oxidation and reduction half-reactions",
      prompt: "The oxidation half-reaction is: The reduction half-reaction is: ___ Options: Cu(s) + 2 e⁻ → Cu²⁺(aq); Cu(s) → Cu²⁺(aq) + 2 e⁻; Cu²⁺(aq) + 2 e⁻ → Cu(s); Cu²⁺(aq) → Cu(s) + 2 e⁻; Pt(s) + 2 e⁻ → Pt²⁺(aq); Pt(s) → Pt²⁺(aq) + 2 e⁻; Pt²⁺(aq) + 2 e⁻ → Pt(s); Pt²⁺(aq) → Pt(s) + 2 e⁻.",
      points: 2,
      learningObjective: CELL_NOTATION_LO,
      choices: [],
      inputs: [
        { id: "notation-digt-q1-first", label: "Oxidation", answer: "Cu(s) → Cu²⁺(aq) + 2 e⁻" },
        { id: "notation-digt-q1-second", label: "Reduction", answer: "Pt²⁺(aq) + 2 e⁻ → Pt(s)" },
      ],
      correctFeedback: "Correct. The Cu is oxidized. Correct. The Pt is reduced.",
      incorrectFeedback: "Incorrect. This half-reaction is not balanced. Incorrect. This half-reaction represents reduction. Incorrect. This is not what happens to Pt, as described in the problem. Incorrect. This half-reaction represents oxidation.",
    },
  },
  {
    id: "notation-digt-q2",
    question: {
      kind: "multi-input",
      title: "Which reaction occurs at the anode and the cathode?",
      prompt: "Oxidation: Cu(s) → Cu²⁺(aq) + 2 e⁻ Reduction: Pt²⁺(aq) + 2 e⁻ → Pt(s)Which reaction that occurs at the anode and the cathode? Anode: Cathode: ___ Options: Cu(s) → Cu²⁺(aq) + 2 e⁻; Pt²⁺(aq) + 2 e⁻ → Pt(s).",
      points: 2,
      learningObjective: CELL_NOTATION_LO,
      choices: [],
      inputs: [
        { id: "notation-digt-q2-first", label: "Anode", answer: "Cu(s) → Cu²⁺(aq) + 2 e⁻" },
        { id: "notation-digt-q2-second", label: "Cathode", answer: "Pt²⁺(aq) + 2 e⁻ → Pt(s)" },
      ],
      correctFeedback: "Correct. Oxidation occurs at the anode. Correct. Reduction occurs at the cathode.",
      incorrectFeedback: "Incorrect. Oxidation occurs at the anode. Incorrect. Reduction occurs at the cathode.",
    },
  },
  {
    id: "notation-digt-q3",
    question: {
      kind: "mcq",
      title: "Which is the correct cell notation?",
      prompt: "Which is the correct cell notation?",
      points: 1,
      learningObjective: CELL_NOTATION_LO,
      inputs: [],
      choices: [
        { id: "notation-digt-q3-a", text: "Cu(s)│Cu²⁺(aq)║Pt²⁺(aq)│Pt(s)", correct: true },
        { id: "notation-digt-q3-b", text: "Pt(s)│Pt²⁺(aq)║Cu²⁺(aq)│Cu(s)", correct: false },
      ],
      correctFeedback: "Correct. In the cell notation, the anode and its solution are written to the left of the symbol for the salt bridge.",
      incorrectFeedback: "Incorrect.",
    },
  },
];

