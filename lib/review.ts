import { FatalError } from "workflow";

import { parseError } from "@/lib/error";
import { addPRComment } from "@/lib/steps/add-pr-comment";
import { checkPushAccess } from "@/lib/steps/check-push-access";
import { commitAndPush } from "@/lib/steps/commit-and-push";
import { configureGit } from "@/lib/steps/configure-git";
import { createSandbox } from "@/lib/steps/create-sandbox";
import { extendSandbox } from "@/lib/steps/extend-sandbox";
import { getDiff } from "@/lib/steps/get-diff";
import { getGitHubToken } from "@/lib/steps/get-github-token";
import { hasUncommittedChanges } from "@/lib/steps/has-uncommitted-changes";
import { installDependencies } from "@/lib/steps/install-dependencies";
import { runAgent } from "@/lib/steps/run-agent";
import { stopSandbox } from "@/lib/steps/stop-sandbox";

export interface WorkflowParams {
  baseBranch: string;
  comment: string;
  prBranch: string;
  prNumber: number;
  repoFullName: string;
}

const postErrorComment = async (
  repoFullName: string,
  prNumber: number,
  error: unknown
): Promise<void> => {
  try {
    await addPRComment(
      repoFullName,
      prNumber,
      `## Error

An error occurred while processing your request:

\`\`\`
${parseError(error)}
\`\`\`

---
*Powered by [OpenReview](https://github.com/haydenbleasel/openreview)*`
    );
  } catch {
    // Ignore comment failure
  }
};

const denyPushAccess = async (
  repoFullName: string,
  prNumber: number,
  reason: string | undefined
): Promise<never> => {
  await addPRComment(
    repoFullName,
    prNumber,
    `## Skipped

Unable to access this branch: ${reason}

Please ensure the OpenReview app has access to this repository and branch.

---
*Powered by [OpenReview](https://github.com/haydenbleasel/openreview)*`
  );

  throw new FatalError(reason ?? "Push access denied");
};

const prepareSandbox = async (
  sandboxId: string,
  repoFullName: string,
  token: string
): Promise<void> => {
  await installDependencies(sandboxId);
  await configureGit(sandboxId, repoFullName, token);
  await extendSandbox(sandboxId);
};

const pushAgentChanges = async (
  sandboxId: string,
  prBranch: string
): Promise<void> => {
  const changed = await hasUncommittedChanges(sandboxId);

  if (changed) {
    await commitAndPush(sandboxId, "openreview: apply changes", prBranch);
  }
};

const runSandboxAgent = async (
  sandboxId: string,
  repoFullName: string,
  prNumber: number,
  prBranch: string,
  baseBranch: string,
  token: string,
  comment: string
): Promise<void> => {
  await prepareSandbox(sandboxId, repoFullName, token);

  const diff = await getDiff(sandboxId, baseBranch);
  const agentResult = await runAgent(
    sandboxId,
    diff,
    comment,
    repoFullName,
    prNumber
  );

  if (!agentResult.success) {
    throw new FatalError(
      agentResult.errorMessage ?? "Agent failed to run"
    );
  }

  await pushAgentChanges(sandboxId, prBranch);
};

const executeWorkflow = async (params: WorkflowParams): Promise<void> => {
  const { baseBranch, comment, prBranch, prNumber, repoFullName } = params;

  const token = await getGitHubToken();
  const sandboxId = await createSandbox(repoFullName, token, prBranch);

  try {
    await runSandboxAgent(
      sandboxId,
      repoFullName,
      prNumber,
      prBranch,
      baseBranch,
      token,
      comment
    );
  } catch (error) {
    await postErrorComment(repoFullName, prNumber, error);
    throw error;
  } finally {
    await stopSandbox(sandboxId);
  }
};

export const botWorkflow = async (params: WorkflowParams): Promise<void> => {
  "use workflow";

  const pushAccess = await checkPushAccess(
    params.repoFullName,
    params.prBranch
  );

  if (!pushAccess.canPush) {
    await denyPushAccess(
      params.repoFullName,
      params.prNumber,
      pushAccess.reason
    );
  }

  await executeWorkflow(params);
};
