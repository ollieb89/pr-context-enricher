import { generateRichSummary } from '../src/summary-generator';
import { PRContext } from '../src/context-builder';

const makeSummaryCtx = (overrides: Partial<PRContext> = {}): PRContext => ({
  pr_number: 42, title: 'Add user authentication', body: 'Closes #10. Adds JWT-based auth.',
  author: 'devuser', base_branch: 'main', head_branch: 'feature/auth',
  files_changed: 5, lines_added: 200, lines_removed: 50,
  file_changes: [
    { filename: 'src/auth.ts', status: 'added', additions: 150, deletions: 0 },
    { filename: 'tests/auth.test.ts', status: 'added', additions: 50, deletions: 0 },
  ],
  related_issues: [10], labels: ['feature'], reviewers: ['reviewer1'],
  commit_messages: ['feat: add JWT auth', 'test: add auth tests'],
  change_summary: {
    primary_language: 'ts', change_types: ['new files'], affected_areas: ['src', 'tests'],
    has_tests: true, has_docs: false, has_config: false, has_migrations: false,
    risk_level: 'low', complexity_score: 2.5,
  },
  ...overrides,
});

describe('generateRichSummary', () => {
  test('returns all required fields', () => { const s = generateRichSummary(makeSummaryCtx()); expect(s).toHaveProperty('executive_summary'); expect(s).toHaveProperty('change_breakdown'); expect(s).toHaveProperty('risk_assessment'); expect(s).toHaveProperty('review_checklist'); expect(s).toHaveProperty('ai_reviewer_prompt'); });
  test('exec summary includes PR number', () => { expect(generateRichSummary(makeSummaryCtx()).executive_summary).toContain('#42'); });
  test('exec summary includes title', () => { expect(generateRichSummary(makeSummaryCtx()).executive_summary).toContain('Add user authentication'); });
  test('exec summary includes author', () => { expect(generateRichSummary(makeSummaryCtx()).executive_summary).toContain('@devuser'); });
  test('exec summary includes related issues', () => { expect(generateRichSummary(makeSummaryCtx()).executive_summary).toContain('#10'); });
  test('low risk shows green', () => { const r = generateRichSummary(makeSummaryCtx()); expect(r.risk_assessment).toContain('🟢'); });
  test('high risk from migrations shows red', () => {
    const ctx = makeSummaryCtx({ change_summary: { primary_language: 'sql', change_types: ['new files'], affected_areas: ['db'], has_tests: false, has_docs: false, has_config: false, has_migrations: true, risk_level: 'high', complexity_score: 8 }});
    expect(generateRichSummary(ctx).risk_assessment).toContain('🔴');
  });
  test('migration warning in risk assessment', () => {
    const ctx = makeSummaryCtx({ change_summary: { primary_language: 'sql', change_types: ['new files'], affected_areas: ['db'], has_tests: false, has_docs: false, has_config: false, has_migrations: true, risk_level: 'high', complexity_score: 8 }});
    expect(generateRichSummary(ctx).risk_assessment).toContain('migration');
  });
  test('checklist is non-empty array', () => { const s = generateRichSummary(makeSummaryCtx()); expect(Array.isArray(s.review_checklist)).toBe(true); expect(s.review_checklist.length).toBeGreaterThan(0); });
  test('checklist flags missing tests', () => {
    const ctx = makeSummaryCtx({ change_summary: { ...makeSummaryCtx().change_summary, has_tests: false }});
    expect(generateRichSummary(ctx).review_checklist.some(i => i.toLowerCase().includes('test'))).toBe(true);
  });
  test('ai prompt contains title', () => { expect(generateRichSummary(makeSummaryCtx()).ai_reviewer_prompt).toContain('Add user authentication'); });
  test('ai prompt contains author', () => { expect(generateRichSummary(makeSummaryCtx()).ai_reviewer_prompt).toContain('@devuser'); });
  test('ai prompt contains risk level', () => { expect(generateRichSummary(makeSummaryCtx()).ai_reviewer_prompt).toContain('low'); });
  test('breakdown includes commit messages', () => { expect(generateRichSummary(makeSummaryCtx()).change_breakdown).toContain('feat: add JWT auth'); });
  test('handles empty body', () => { expect(() => generateRichSummary(makeSummaryCtx({ body: '' }))).not.toThrow(); });
  test('empty body shows placeholder', () => { expect(generateRichSummary(makeSummaryCtx({ body: '' })).ai_reviewer_prompt).toContain('No description provided'); });
  test('no related issues omits section', () => { expect(generateRichSummary(makeSummaryCtx({ related_issues: [] })).executive_summary).not.toContain('Related issues'); });
});
