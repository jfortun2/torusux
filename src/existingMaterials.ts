import type { CurriculumNodeType, PageScoring } from './curriculumData';

export type ExistingMaterialType = Exclude<CurriculumNodeType, 'block'>;

export type ExistingMaterial = {
  id: string;
  type: ExistingMaterialType;
  title: string;
  pageScoring?: PageScoring;
  summary: string;
};

export type InstructorProject = {
  id: string;
  name: string;
  access: string;
  materials: ExistingMaterial[];
};

export const INSTRUCTOR_PROJECTS: InstructorProject[] = [
  {
    id: 'proj-heather',
    name: "Heather's REAL Chem Course",
    access: 'This project',
    materials: [
      {
        id: 'mat-thermo-unit',
        type: 'unit',
        title: 'Thermochemistry',
        summary: 'Unit covering enthalpy, calorimetry, and Hess’s law.',
      },
      {
        id: 'mat-calorimetry-page',
        type: 'page',
        title: 'Calorimetry worked examples',
        pageScoring: 'practice',
        summary: 'Practice page with worked calorimetry problems.',
      },
    ],
  },
  {
    id: 'proj-chem102',
    name: 'Chemistry 102',
    access: 'Instructor',
    materials: [
      {
        id: 'mat-kinetics-module',
        type: 'module',
        title: 'Reaction kinetics',
        summary: 'Module with rate laws and collision theory pages.',
      },
      {
        id: 'mat-equilibrium-page',
        type: 'page',
        title: 'Le Châtelier checkpoint',
        pageScoring: 'scored',
        summary: 'Scored checkpoint on equilibrium shifts.',
      },
    ],
  },
  {
    id: 'proj-physics',
    name: 'Intro Physics',
    access: 'Department',
    materials: [
      {
        id: 'mat-energy-page',
        type: 'page',
        title: 'Conservation of energy lab',
        pageScoring: 'practice',
        summary: 'Lab-style practice page shared with the department.',
      },
      {
        id: 'mat-circuits-module',
        type: 'module',
        title: 'DC circuits',
        summary: 'Module with series, parallel, and Kirchhoff pages.',
      },
    ],
  },
];
