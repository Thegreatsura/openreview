import "server-only";
import type { GitHubRawMessage } from "@chat-adapter/github";
import { createGitHubAdapter } from "@chat-adapter/github";
import { createMemoryState } from "@chat-adapter/state-memory";
import { createRedisState } from "@chat-adapter/state-redis";
import { Chat } from "chat";
import { start } from "workflow/api";

import { env } from "@/lib/env";
import type { WorkflowParams } from "@/lib/review";

import { getInstallationOctokit } from "./github";

const state = env.REDIS_URL
  ? createRedisState({ url: env.REDIS_URL })
  : createMemoryState();

export const bot = new Chat({
  adapters: {
    github: createGitHubAdapter({
      appId: env.GITHUB_APP_ID,
      installationId: env.GITHUB_APP_INSTALLATION_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY.replaceAll("\\n", "\n"),
      userName: "openreview[bot]",
      webhookSecret: env.GITHUB_APP_WEBHOOK_SECRET,
    }),
  },
  state,
  userName: "openreview",
});

bot.onNewMention(async (thread, message) => {
  const raw = message.raw as GitHubRawMessage;

  const repoFullName = raw.repository.full_name;
  const { prNumber } = raw;
  const comment = message.text.trim() || "Review this pull request";

  const octokit = await getInstallationOctokit();
  const [owner, repo] = repoFullName.split("/");

  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    pull_number: prNumber,
    repo,
  });

  const { botWorkflow } = await import("@/lib/review");

  await start(botWorkflow, [
    {
      baseBranch: pr.base.ref,
      comment,
      prBranch: pr.head.ref,
      prNumber,
      repoFullName,
      threadId: thread.id,
    } satisfies WorkflowParams,
  ]);
});
