import "server-only";
import { start } from "workflow/api";

import { parseError } from "@/lib/error";
import { getGitHubApp, getInstallationOctokit } from "@/lib/github";
import { botWorkflow } from "@/lib/review";

const BOT_NAME = "openreview";

const shouldHandleComment = (payload: {
  action: string;
  comment: { body: string; user: { type: string } };
  issue: { pull_request?: { url: string } };
}): boolean => {
  if (payload.action !== "created") {
    return false;
  }
  if (payload.comment.user.type === "Bot") {
    return false;
  }
  if (!payload.comment.body.toLowerCase().includes(`@${BOT_NAME}`)) {
    return false;
  }
  if (!payload.issue.pull_request) {
    return false;
  }
  return true;
};

const extractComment = (body: string): string => {
  const mention = `@${BOT_NAME}`;
  const index = body.toLowerCase().indexOf(mention);

  if (index === -1) {
    return body.trim();
  }

  return body.slice(index + mention.length).trim() || "Review this pull request";
};

const startCommand = async (
  repoFullName: string,
  prNumber: number,
  comment: string
): Promise<void> => {
  const octokit = await getInstallationOctokit();
  const [owner, repo] = repoFullName.split("/");

  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    pull_number: prNumber,
    repo,
  });

  await start(botWorkflow, [
    {
      baseBranch: pr.base.ref,
      comment,
      prBranch: pr.head.ref,
      prNumber,
      repoFullName,
    },
  ]);
};

export const handleIssueComment = async (payload: {
  action: string;
  comment: { body: string; user: { type: string } };
  issue: { number: number; pull_request?: { url: string } };
  repository: { full_name: string };
}): Promise<void> => {
  if (!shouldHandleComment(payload)) {
    return;
  }

  const comment = extractComment(payload.comment.body);

  await startCommand(
    payload.repository.full_name,
    payload.issue.number,
    comment
  );
};

export const handlePullRequest = async (payload: {
  action: string;
  pull_request: {
    base: { ref: string };
    head: { ref: string };
    number: number;
  };
  repository: { full_name: string };
}): Promise<void> => {
  if (payload.action !== "opened" && payload.action !== "synchronize") {
    return;
  }

  await start(botWorkflow, [
    {
      baseBranch: payload.pull_request.base.ref,
      comment: "Review this pull request",
      prBranch: payload.pull_request.head.ref,
      prNumber: payload.pull_request.number,
      repoFullName: payload.repository.full_name,
    },
  ]);
};

export const verifyWebhookSignature = async (
  rawBody: string,
  signature: string
): Promise<boolean> => {
  try {
    const app = getGitHubApp();
    await app.webhooks.verify(rawBody, signature);
    return true;
  } catch (error) {
    throw new Error(
      `Webhook signature verification failed: ${parseError(error)}`,
      { cause: error }
    );
  }
};
