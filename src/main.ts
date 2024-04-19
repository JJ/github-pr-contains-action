import * as core from "@actions/core";
import { getOctokit, context } from "@actions/github";
import parse from "parse-diff";
import { rexify } from "./utils";

async function getDiff(octokit, repository, pull_request) {
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
    const waivedUsers = core.getInput("waivedUsers").split("|") || ["dependabot[bot]"];
    if (senderName) {

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
        core.setFailed("❌ Expecting pull_request metadata.")
        return;
      }
      if (!repository) {
        core.setFailed("❌ Expecting repository metadata.")
        return;
      }
      if (bodyContains || bodyDoesNotContain) {
        const PRBody = pull_request?.body;
        core.info("Checking body contents");
        if (!PRBody) {
          core.warning("⚠️ The PR body is empty, skipping checks");
        } else {
          if (bodyContains && !rexify(bodyContains).test(PRBody)) {
            core.setFailed(
              "The body of the PR does not contain " + bodyContains
            );
          }
          if (bodyDoesNotContain && rexify(bodyDoesNotContain).test(PRBody)) {
            core.setFailed(
              "The body of the PR should not contain " + bodyDoesNotContain
            );
          }
        }
      }

      const diffContains = core.getInput("diffContains");
      const diffDoesNotContain = core.getInput("diffDoesNotContain");
      const linesChanged = +core.getInput("linesChanged");
      const filesChanged = +core.getInput("filesChanged");

      if (diffContains || diffDoesNotContain || filesChanged || linesChanged) {
        core.info("Checking diff contents");
        const parsedDiff = await getDiff(octokit, repository, pull_request);
        core.setOutput("numberOfFiles", parsedDiff.length);
        if (filesChanged && parsedDiff.length != filesChanged) {
          core.setFailed(
            "You should change exactly " + filesChanged + " file(s)"
          );
        }

        let changes = "";
        let additions: number = 0;
        parsedDiff.forEach(function (file) {
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
          core.setFailed(
            "The added code does not contain «" + diffContains + "»"
          );
        } else {
          core.setOutput("diff", changes);
        }
        if (diffDoesNotContain && rexify(diffDoesNotContain).test(changes)) {
          core.setFailed(
            "The added code should not contain " + diffDoesNotContain
          );
        }

        core.info("Checking lines/files changed");
        if (linesChanged && additions != linesChanged) {
          const this_msg =
            "You should change exactly " +
            linesChanged +
            " lines(s) and you have changed " +
            additions;
          core.setFailed(this_msg);
        }
      }
    }
  } catch (error: any) {
    if (error.name === "HttpError") {
      core.setFailed(
        "❌ There seems to be an error in an API request" +
          "\nThis is usually due to using a GitHub token without the adequate scope"
      );
    } else {
      core.setFailed("❌ " + error.stack);
    }
  }
}

run();
