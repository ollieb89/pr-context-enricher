import { PRContext, ChangeSummary } from './context-builder';

export interface RichSummary {
  executive_summary: string;
  change_breakdown: string;
  risk_assessment: string;
  review_checklist: string[];
  ai_reviewer_prompt: string;
}

export function generateRichSummary(ctx: PRContext): RichSummary {
  return {
    executive_summary: buildExecutiveSummary(ctx),
    change_breakdown: buildChangeBreakdown(ctx),
    risk_assessment: buildRiskAssessment(ctx.change_summary),
    review_checklist: buildReviewChecklist(ctx),
    ai_reviewer_prompt: buildAIReviewerPrompt(ctx),
  };
}

function buildExecutiveSummary(ctx: PRContext): string {
  const lines: string[] = [];
  lines.push(`**PR #${ctx.pr_number}: ${ctx.title}**`);
  lines.push(`**Author:** @${ctx.author} | **Base:** \`${ctx.base_branch}\` ← \`${ctx.head_branch}\``);
  lines.push('');
  lines.push(
    `This PR touches **${ctx.files_changed} file(s)** with **+${ctx.lines_added}/-${ctx.lines_removed}** lines across ${ctx.change_summary.affected_areas.length > 0 ? ctx.change_summary.affected_areas.map((a) => `\`${a}\``).join(', ') : 'the codebase'}.`
  );

  if (ctx.related_issues.length > 0) {
    lines.push(`**Related issues:** ${ctx.related_issues.map((i) => `#${i}`).join(', ')}`);
  }

  if (ctx.labels.length > 0) {
    lines.push(`**Labels:** ${ctx.labels.join(', ')}`);
  }

  return lines.join('\n');
}

function buildChangeBreakdown(ctx: PRContext): string {
  const lines: string[] = ['### Changed Files'];

  const byStatus: Record<string, string[]> = {};
  for (const f of ctx.file_changes) {
    if (!byStatus[f.status]) byStatus[f.status] = [];
    byStatus[f.status].push(`\`${f.filename}\` (+${f.additions}/-${f.deletions})`);
  }

  for (const [status, files] of Object.entries(byStatus)) {
    lines.push(`**${capitalize(status)}:**`);
    for (const f of files) lines.push(`- ${f}`);
  }

  lines.push('');
  lines.push('### Commits');
  for (const msg of ctx.commit_messages.slice(0, 10)) {
    lines.push(`- ${msg}`);
  }
  if (ctx.commit_messages.length > 10) {
    lines.push(`- … and ${ctx.commit_messages.length - 10} more`);
  }

  return lines.join('\n');
}

function buildRiskAssessment(summary: ChangeSummary): string {
  const riskEmoji = { low: '🟢', medium: '🟡', high: '🔴' }[summary.risk_level];
  const lines: string[] = [`### Risk Assessment: ${riskEmoji} ${capitalize(summary.risk_level)}`];
  lines.push(`**Complexity score:** ${summary.complexity_score}/10`);
  lines.push('');

  const flags: string[] = [];
  if (summary.has_migrations) flags.push('⚠️ Contains database migrations — review carefully');
  if (!summary.has_tests) flags.push('⚠️ No test files detected — consider adding coverage');
  if (!summary.has_docs && summary.change_types.includes('new files'))
    flags.push('💡 New files added but no documentation updated');
  if (summary.has_config) flags.push('ℹ️ Configuration files modified — check environment compatibility');

  if (flags.length > 0) {
    lines.push('**Flags:**');
    for (const flag of flags) lines.push(`- ${flag}`);
  } else {
    lines.push('No major risk flags detected.');
  }

  return lines.join('\n');
}

function buildReviewChecklist(ctx: PRContext): string[] {
  const checklist: string[] = [
    'Does the PR description clearly explain the motivation and approach?',
    'Are all related issues linked and addressed?',
    'Is the scope of changes appropriate for a single PR?',
  ];

  if (!ctx.change_summary.has_tests) {
    checklist.push('Add or update tests to cover the changes');
  } else {
    checklist.push('Verify tests are comprehensive and cover edge cases');
  }

  if (ctx.change_summary.has_migrations) {
    checklist.push('Review migration for backward compatibility');
    checklist.push('Confirm rollback strategy exists for database changes');
  }

  if (ctx.change_summary.has_config) {
    checklist.push('Confirm all environments have required config updates');
  }

  if (!ctx.change_summary.has_docs && ctx.change_summary.change_types.includes('new files')) {
    checklist.push('Update documentation to reflect new functionality');
  }

  checklist.push('Check for hardcoded secrets or sensitive data');
  checklist.push('Review for potential performance implications');

  return checklist;
}

function buildAIReviewerPrompt(ctx: PRContext): string {
  const summary = ctx.change_summary;
  return [
    `You are reviewing PR #${ctx.pr_number}: "${ctx.title}" by @${ctx.author}.`,
    '',
    `**Context:**`,
    `- Primary language: ${summary.primary_language}`,
    `- Risk level: ${summary.risk_level} (complexity: ${summary.complexity_score}/10)`,
    `- Has tests: ${summary.has_tests}`,
    `- Has migrations: ${summary.has_migrations}`,
    `- Affected areas: ${summary.affected_areas.join(', ') || 'root'}`,
    '',
    `**PR Description:**`,
    ctx.body ? ctx.body.slice(0, 500) : '_No description provided_',
    '',
    `**Commit history:**`,
    ctx.commit_messages
      .slice(0, 5)
      .map((m) => `- ${m}`)
      .join('\n'),
    '',
    `Please review this PR for: correctness, security, performance, test coverage, and code style. Be concise and actionable.`,
  ].join('\n');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
