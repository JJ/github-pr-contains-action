import * as core from "@actions/core";
import { getOctokit, context, } from "@actions/github";
import parse from "parse-diff";
import { rexify } from "./utils";
import { Context } from "@actions/github/lib/context";
import { Octokit } from "@octokit/core";
import { PaginateInterface } from "@octokit/plugin-paginate-rest";
import { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types";
import { PayloadRepository } from "@actions/github/lib/interfaces";

async function getDiff(
  octokit: Octokit & Api & { paginate: PaginateInterface; },
  repository: PayloadRepository,
  pull_request
) {
  const owner = repository?.owner?.login;
  const repo = repository?.name;
  const pull_number = pull_request?.number;
  core.info(`Getting diff for: ${owner}, ${repo}, ${pull_number}`);
  if (!owner || !repo || typeof(pull_number) !== 'number') {
    throw Error('Missing metadata required for fetching diff.');
  }
  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number,
    headers: { accept: "application/vnd.github.v3.diff" },
  });

  const diff = response.data as unknown as string;
  return parse(diff);
}

async function comment(
  message: string,
  octokit: Octokit & Api & { paginate: PaginateInterface; },
  context: Context) {
  const owner = context.payload.repository?.owner?.login;

  if (!owner) {
    core.setFailed("❌ Expecting repository metadata.");
    return;
  }

  octokit.rest.issues.createComment({
    owner: owner,
    repo: context.issue.repo,
    issue_number: context.issue.number,
    body: message
  });
}

async function run() {
  try {
    // get information on everything
    const token = core.getInput("github-token", { required: true });
    const octokit = getOctokit(token);

    const payload = context.payload;

    const senderInfo = payload?.sender;
    const senderName = senderInfo?.login;
    const senderType = senderInfo?.type;
    core.info(`PR created by ${senderName} (${senderType})`)

    // First check for waived users
    if (senderName) {
      const waivedUsers = core.getInput("waivedUsers") || ["dependabot[bot]"];
      if (waivedUsers.includes(senderName)) {
        core.warning(`⚠️ Not running this workflow for waived user «${senderName}»`);
        return;
      }
    } else {
      core.warning('⚠️ Sender info missing. Passing waived user check.')
    }

    // Check if the body contains required string
    const bodyContains = core.getInput("bodyContains");
    const bodyDoesNotContain = core.getInput("bodyDoesNotContain");

    if (
      context.eventName !== "pull_request" &&
      context.eventName !== "pull_request_target"
    ) {
      // TODO(ApoorvGuptaAi) Should just return here and skip the rest of the check.
      core.warning("⚠️ Not a pull request, skipping PR body checks");
    } else {
      const pull_request = payload.pull_request;
      const repository = payload.repository;
      if (!pull_request) {
        comment("❌ Expecting pull_request metadata.", octokit, context)
        return;
      }
      if (!repository) {
        comment("❌ Expecting repository metadata.", octokit, context)
        return;
      }
      if (bodyContains || bodyDoesNotContain) {
        const PRBody = pull_request?.body;
        core.info("Checking body contents");
        if (PRBody) {
          if (bodyContains && !rexify(bodyContains).test(PRBody)) {
            comment(
              "The body of the PR does not contain " + bodyContains,
              octokit,
              context
            );
          }
          if (bodyDoesNotContain && rexify(bodyDoesNotContain).test(PRBody)) {
            comment(
              "The body of the PR should not contain " + bodyDoesNotContain,
              octokit,
              context
            );
          }
        }
      }

      core.info("Checking diff contents");
      const diffContains = core.getInput("diffContains");
      const diffDoesNotContain = core.getInput("diffDoesNotContain");

      const files = await getDiff(octokit, repository, pull_request);
      core.exportVariable("files", files);
      core.setOutput("files", files);
      const filesChanged = +core.getInput("filesChanged");
      if (filesChanged && files.length != filesChanged) {
        comment(
          "You should change exactly " + filesChanged + " file(s)",
          octokit,
          context
        );
      }

      let changes = "";
      let additions: number = 0;
      files.forEach(function (file) {
        additions += file.additions;
        file.chunks.forEach(function (chunk: parse.Chunk) {
          chunk.changes.forEach(function (change: any) {
            if (change.add) {
              changes += change.content;
            }
          });
        });
      });
      if (diffContains && !rexify(diffContains).test(changes)) {
        comment(
          "The added code does not contain '" + diffContains + "'",
          octokit,
          context
        );
      } else {
        core.exportVariable("diff", changes);
        core.setOutput("diff", changes);
      }
      if (diffDoesNotContain && rexify(diffDoesNotContain).test(changes)) {
        comment(
          "The added code should not contain " + diffDoesNotContain,
          octokit,
          context
        );
      }

      core.info("Checking lines/files changed");
      const linesChanged = +core.getInput("linesChanged");
      if (linesChanged && additions != linesChanged) {
        const this_msg =
          "You should change exactly " +
          linesChanged +
          " lines(s) and you have changed " +
          additions;
        comment(this_msg, octokit, context);
      }
    }
  } catch (error: any) {
    if (error.name === "HttpError") {
      core.setFailed(
        "❌ There seems to be an error in an API request" +
          "\nThis is usually due to using a GitHub token without the adequate scope",
      );
    } else {
      core.setFailed("❌ " + error.stack);
    }
  }
}

run();
