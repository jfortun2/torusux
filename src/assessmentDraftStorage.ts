const STORAGE_PREFIX = 'torusux:assessmentDraft:';

export type AssessmentDraftV1 = {
  v: 1;
  removedBanks: string[];
  removedEmbedded: Record<string, boolean>;
  /** bankId -> question ids currently marked removed */
  bankRemovedQuestionIds: Record<string, string[]>;
};

const emptyDraft = (): AssessmentDraftV1 => ({
  v: 1,
  removedBanks: [],
  removedEmbedded: {},
  bankRemovedQuestionIds: {},
});

const storageKey = (assessmentTitle: string) => `${STORAGE_PREFIX}${encodeURIComponent(assessmentTitle)}`;

export function loadAssessmentDraft(assessmentTitle: string): AssessmentDraftV1 {
  if (typeof window === 'undefined') return emptyDraft();
  try {
    const raw = sessionStorage.getItem(storageKey(assessmentTitle));
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw) as Partial<AssessmentDraftV1>;
    if (!parsed || typeof parsed !== 'object') return emptyDraft();
    return {
      v: 1,
      removedBanks: Array.isArray(parsed.removedBanks) ? parsed.removedBanks : [],
      removedEmbedded: parsed.removedEmbedded && typeof parsed.removedEmbedded === 'object' ? parsed.removedEmbedded : {},
      bankRemovedQuestionIds:
        parsed.bankRemovedQuestionIds && typeof parsed.bankRemovedQuestionIds === 'object' ? parsed.bankRemovedQuestionIds : {},
    };
  } catch {
    return emptyDraft();
  }
}

function saveDraft(assessmentTitle: string, draft: AssessmentDraftV1) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(storageKey(assessmentTitle), JSON.stringify(draft));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Persist assessment-default surface state without clobbering per-bank question removals. */
export function persistAssessmentSurface(assessmentTitle: string, surface: Pick<AssessmentDraftV1, 'removedBanks' | 'removedEmbedded'>) {
  const cur = loadAssessmentDraft(assessmentTitle);
  saveDraft(assessmentTitle, {
    ...cur,
    removedBanks: surface.removedBanks,
    removedEmbedded: surface.removedEmbedded,
  });
}

/** Persist removed question ids for one activity bank. */
export function persistBankRemovedQuestionIds(assessmentTitle: string, bankId: string, removedQuestionIds: string[]) {
  const cur = loadAssessmentDraft(assessmentTitle);
  saveDraft(assessmentTitle, {
    ...cur,
    bankRemovedQuestionIds: { ...cur.bankRemovedQuestionIds, [bankId]: removedQuestionIds },
  });
}
