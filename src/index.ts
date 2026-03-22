import * as core from '@actions/core';
import * as github from '@actions/github';
import { buildPRContext } from './context-builder';
import { generateRichSummary } from './summary-generator';
import { postOrUpdateComment } from './comment-poster';

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true });
    const octokit = github.getOctokit(token);

    const context = github.context;
    const { owner, repo } = context.repo;

    let prNumber: number;

    if (context.eventName === 'pull_request' || context.eventName === 'pull_request_target') {
      prNumber = context.payload.pull_request?.number;
      if (!prNumber) throw new Error('Could not determine PR number from event payload');
    } else {
      const manualPr = core.getInput('pr-number');
      if (!manualPr) throw new Error('pr-number input required for non-PR events');
      prNumber = parseInt(manualPr, 10);
    }

    core.info(`Building context for PR #${prNumber}...`);
    const prContext = await buildPRContext(octokit, owner, repo, prNumber);

    core.info('Generating rich summary...');
    const richSummary = generateRichSummary(prContext);

    const postComment = core.getInput('post-comment') !== 'false';
    if (postComment) {
      core.info('Posting context summary comment...');
      await postOrUpdateComment(octokit, owner, repo, prNumber, richSummary);
    }

    // Set outputs for downstream steps
    core.setOutput('risk-level', prContext.change_summary.risk_level);
    core.setOutput('complexity-score', prContext.change_summary.complexity_score);
    core.setOutput('has-tests', prContext.change_summary.has_tests);
    core.setOutput('files-changed', prContext.files_changed);
    core.setOutput('ai-reviewer-prompt', richSummary.ai_reviewer_prompt);

    core.info(`✅ PR context enrichment complete. Risk: ${prContext.change_summary.risk_level}`);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

run();
