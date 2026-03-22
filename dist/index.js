"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const context_builder_1 = require("./context-builder");
const summary_generator_1 = require("./summary-generator");
const comment_poster_1 = require("./comment-poster");
async function run() {
    try {
        const token = core.getInput('github-token', { required: true });
        const octokit = github.getOctokit(token);
        const context = github.context;
        const { owner, repo } = context.repo;
        let prNumber;
        if (context.eventName === 'pull_request' || context.eventName === 'pull_request_target') {
            const num = context.payload.pull_request?.number;
            if (!num)
                throw new Error('Could not determine PR number from event payload');
            prNumber = num;
        }
        else {
            const manualPr = core.getInput('pr-number');
            if (!manualPr)
                throw new Error('pr-number input required for non-PR events');
            prNumber = parseInt(manualPr, 10);
        }
        core.info(`Building context for PR #${prNumber}...`);
        const prContext = await (0, context_builder_1.buildPRContext)(octokit, owner, repo, prNumber);
        core.info('Generating rich summary...');
        const richSummary = (0, summary_generator_1.generateRichSummary)(prContext);
        const postComment = core.getInput('post-comment') !== 'false';
        if (postComment) {
            core.info('Posting context summary comment...');
            await (0, comment_poster_1.postOrUpdateComment)(octokit, owner, repo, prNumber, richSummary);
        }
        core.setOutput('risk-level', prContext.change_summary.risk_level);
        core.setOutput('complexity-score', prContext.change_summary.complexity_score);
        core.setOutput('has-tests', prContext.change_summary.has_tests);
        core.setOutput('files-changed', prContext.files_changed);
        core.setOutput('ai-reviewer-prompt', richSummary.ai_reviewer_prompt);
        core.info(`✅ PR context enrichment complete. Risk: ${prContext.change_summary.risk_level}`);
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
        else {
            core.setFailed('An unexpected error occurred');
        }
    }
}
run();
