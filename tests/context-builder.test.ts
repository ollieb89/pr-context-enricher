import { analyzeChanges, FileChange } from '../src/context-builder';

describe('analyzeChanges', () => {
  const makeFile = (filename: string, status: FileChange['status'] = 'modified', additions = 10, deletions = 5): FileChange => ({ filename, status, additions, deletions });

  test('detects test files', () => { expect(analyzeChanges([makeFile('src/foo.test.ts')]).has_tests).toBe(true); });
  test('detects spec files', () => { expect(analyzeChanges([makeFile('tests/foo.spec.js')]).has_tests).toBe(true); });
  test('no tests when absent', () => { expect(analyzeChanges([makeFile('src/index.ts')]).has_tests).toBe(false); });
  test('detects docs', () => { expect(analyzeChanges([makeFile('README.md')]).has_docs).toBe(true); });
  test('detects config files', () => { expect(analyzeChanges([makeFile('config.yml')]).has_config).toBe(true); });
  test('detects migrations', () => { expect(analyzeChanges([makeFile('db/migrations/001.sql')]).has_migrations).toBe(true); });
  test('detects schema as migration', () => { expect(analyzeChanges([makeFile('schema.prisma')]).has_migrations).toBe(true); });
  test('added change type', () => { expect(analyzeChanges([makeFile('new.ts', 'added')]).change_types).toContain('new files'); });
  test('removed change type', () => { expect(analyzeChanges([makeFile('old.ts', 'removed')]).change_types).toContain('deletions'); });
  test('modified change type', () => { expect(analyzeChanges([makeFile('src/foo.ts', 'modified')]).change_types).toContain('modifications'); });
  test('affected areas from dirs', () => { const r = analyzeChanges([makeFile('src/foo.ts'), makeFile('tests/bar.ts')]); expect(r.affected_areas).toContain('src'); expect(r.affected_areas).toContain('tests'); });
  test('root files no areas', () => { expect(analyzeChanges([makeFile('README.md')]).affected_areas).toHaveLength(0); });
  test('migrations = high risk', () => { expect(analyzeChanges([makeFile('migrations/001.sql')]).risk_level).toBe('high'); });
  test('small change = low risk', () => { expect(analyzeChanges([makeFile('src/index.ts', 'modified', 2, 1)]).risk_level).toBe('low'); });
  test('primary language is most common ext', () => { const r = analyzeChanges([makeFile('a.ts'), makeFile('b.ts'), makeFile('README.md')]); expect(r.primary_language).toBe('ts'); });
  test('complexity capped at 10', () => { const files = Array.from({length:50},(_,i)=>makeFile(`src/f${i}.ts`,'modified',100,100)); expect(analyzeChanges(files).complexity_score).toBeLessThanOrEqual(10); });
  test('complexity non-negative', () => { expect(analyzeChanges([]).complexity_score).toBeGreaterThanOrEqual(0); });
});
