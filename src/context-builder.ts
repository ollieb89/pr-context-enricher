import * as github from '@actions/github';

export interface FileChange {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;
}

export interface PRContext {
  pr_number: number;
  title: string;
  body: string;
  author: string;
  base_branch: string;
  head_branch: string;
  files_changed: number;
  lines_added: number;
  lines_removed: number;
  file_changes: FileChange[];
  related_issues: number[];
  labels: string[];
  reviewers: string[];
  commit_messages: string[];
  change_summary: ChangeSummary;
}

export interface ChangeSummary {
  primary_language: string;
  change_types: string[];
  affected_areas: string[];
  has_tests: boolean;
  has_docs: boolean;
  has_config: boolean;
  has_migrations: boolean;
  risk_level: 'low' | 'medium' | 'high';
  complexity_score: number;
}

export async function buildPRContext(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number
): Promise<PRContext> {
  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  const { data: commits } = await octokit.rest.pulls.listCommits({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 50,
  });

  const fileChanges: FileChange[] = files.map((f) => ({
    filename: f.filename,
    status: f.status as FileChange['status'],
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
  }));

  const commitMessages = commits.map((c) => c.commit.message.split('\n')[0]);
  const relatedIssues = extractIssueRefs(pr.body ?? '', pr.title);
  const changeSummary = analyzeChanges(fileChanges);

  return {
    pr_number: prNumber,
    title: pr.title,
    body: pr.body ?? '',
    author: pr.user?.login ?? 'unknown',
    base_branch: pr.base.ref,
    head_branch: pr.head.ref,
    files_changed: files.length,
    lines_added: pr.additions,
    lines_removed: pr.deletions,
    file_changes: fileChanges,
    related_issues: relatedIssues,
    labels: pr.labels.map((l) => l.name),
    reviewers: pr.requested_reviewers?.map((r) => ('login' in r ? r.login : r.name)) ?? [],
    commit_messages: commitMessages,
    change_summary: changeSummary,
  };
}

function extractIssueRefs(body: string, title: string): number[] {
  const combined = `${title} ${body}`;
  const pattern = /(?:closes?|fixes?|resolves?|refs?)\s*#(\d+)/gi;
  const refs: number[] = [];
  let match;
  while ((match = pattern.exec(combined)) !== null) {
    refs.push(parseInt(match[1], 10));
  }
  return [...new Set(refs)];
}

export function analyzeChanges(files: FileChange[]): ChangeSummary {
  const extCounts: Record<string, number> = {};
  const changeTypes = new Set<string>();
  const affectedAreas = new Set<string>();

  let hasTests = false;
  let hasDocs = false;
  let hasConfig = false;
  let hasMigrations = false;

  for (const f of files) {
    const ext = f.filename.split('.').pop()?.toLowerCase() ?? 'unknown';
    extCounts[ext] = (extCounts[ext] ?? 0) + 1;

    if (/\.(test|spec)\.(ts|js|py|rb|go)$/.test(f.filename)) hasTests = true;
    if (/\.(md|mdx|rst|txt)$/.test(f.filename)) hasDocs = true;
    if (/\.(yml|yaml|json|toml|ini|env)$/.test(f.filename)) hasConfig = true;
    if (/migration|schema/.test(f.filename.toLowerCase())) hasMigrations = true;

    if (f.status === 'added') changeTypes.add('new files');
    if (f.status === 'removed') changeTypes.add('deletions');
    if (f.status === 'modified') changeTypes.add('modifications');
    if (f.status === 'renamed') changeTypes.add('renames');

    const parts = f.filename.split('/');
    if (parts.length > 1) affectedAreas.add(parts[0]);
  }

  const primaryLanguage = Object.entries(extCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';

  const totalLines = files.reduce((s, f) => s + f.additions + f.deletions, 0);
  const complexityScore = Math.min(
    10,
    Math.round((files.length * 0.3 + totalLines * 0.01 + (hasMigrations ? 3 : 0)) * 10) / 10
  );

  const riskLevel: ChangeSummary['risk_level'] =
    hasMigrations || complexityScore > 7
      ? 'high'
      : complexityScore > 4
      ? 'medium'
      : 'low';

  return {
    primary_language: primaryLanguage,
    change_types: [...changeTypes],
    affected_areas: [...affectedAreas],
    has_tests: hasTests,
    has_docs: hasDocs,
    has_config: hasConfig,
    has_migrations: hasMigrations,
    risk_level: riskLevel,
    complexity_score: complexityScore,
  };
}
