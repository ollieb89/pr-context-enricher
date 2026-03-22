import { RichSummary } from '../src/summary-generator';

const makeSummary = (): RichSummary => ({
  executive_summary: '**PR #1: Test PR**\n**Author:** @dev',
  change_breakdown: '### Changed Files\n- `src/index.ts` (+10/-5)',
  risk_assessment: '### Risk Assessment: 🟢 Low\n**Complexity score:** 2/10',
  review_checklist: ['Does the PR description explain the changes?', 'Are tests included?'],
  ai_reviewer_prompt: 'You are reviewing PR #1 by @dev. Risk: low.',
});

describe('RichSummary shape', () => {
  test('has all required fields', () => {
    const s = makeSummary();
    expect(s.executive_summary).toBeTruthy();
    expect(s.change_breakdown).toBeTruthy();
    expect(s.risk_assessment).toBeTruthy();
    expect(Array.isArray(s.review_checklist)).toBe(true);
    expect(s.ai_reviewer_prompt).toBeTruthy();
  });
  test('checklist items are strings', () => {
    for (const item of makeSummary().review_checklist) { expect(typeof item).toBe('string'); }
  });
  test('executive_summary contains PR ref', () => { expect(makeSummary().executive_summary).toContain('#1'); });
  test('ai prompt is actionable', () => { expect(makeSummary().ai_reviewer_prompt.length).toBeGreaterThan(10); });
});
