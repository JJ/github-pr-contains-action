import * as core from "@actions/core";
import { getOctokit, context } from "@actions/github";
import parse from "parse-diff";
import { rexify } from "./utils";

async function getDiff(octokit, context) {
  const {owner, repo} = context.repo();
  const pull_number = context.payload.pull_request.number;
  core.info(`${owner}, ${repo}, ${pull_number}`);
  const response = await octokit.pulls.get({
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
    // const github = new GitHub(token, {});
    const user = context.payload.pull_request.user.login;
    // First check for waived users
    const waivedUsers = core.getInput("waivedUsers") || ["dependabot[bot]"];

    if (waivedUsers.includes(user)) {
      core.warning(`⚠️ Not running this workflow for waived user «${user}»`);
      return;
    }

    // Check if the body contains required string
    const bodyContains = core.getInput("bodyContains");
    const bodyDoesNotContain = core.getInput("bodyDoesNotContain");

    if (
      context.eventName !== "pull_request" &&
      context.eventName !== "pull_request_target"
    ) {
      core.warning("⚠️ Not a pull request, skipping PR body checks");
    } else {
      if (bodyContains || bodyDoesNotContain) {
        core.info("Checking body contents");
        if (!context.payload.pull_request.hasOwnProperty("body")) {
          core.setFailed("There's no body in the PR, can't check");
        } else if (context.payload.pull_request.body === "") {
          core.setFailed("The body is empty, can't check");
        } else {
          const PRBody = context.payload.pull_request.body;
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

      core.info(`PR #: ${context.payload.pull_request.number}`);
      core.info(`${context.payload.repository}`);
      core.info(`${context.payload}`);

      const isNotPrivate = context.payload.repository.private !== true;
      const bypassPrivateRepoCheck = core.getInput("bypassPrivateRepoCheck");
      if (isNotPrivate || bypassPrivateRepoCheck) {
        core.info("Checking diff contents : 7");
        const diffContains = core.getInput("diffContains");
        const diffDoesNotContain = core.getInput("diffDoesNotContain");
        const octokit = getOctokit(token);

        // core.info("Requesting " + diff_url);
        // const result = await github.request(diff_url);
        // const files = parse(result.data);
        const files = await getDiff(octokit, context);
        core.exportVariable("files", files);
        core.setOutput("files", files);
        const filesChanged = +core.getInput("filesChanged");
        if (filesChanged && files.length != filesChanged) {
          core.setFailed(
            "You should change exactly " + filesChanged + " file(s)"
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
          core.setFailed(
            "The added code does not contain «" + diffContains + "»"
          );
        } else {
          core.exportVariable("diff", changes);
          core.setOutput("diff", changes);
        }
        if (diffDoesNotContain && rexify(diffDoesNotContain).test(changes)) {
          core.setFailed(
            "The added code should not contain " + diffDoesNotContain
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
          core.setFailed(this_msg);
        }
      } else {
        core.warning(
          "⚠️ Apoorv: I'm sorry, can't check diff in private repositories with the default token. " +
          "If you are using a valid token, please set bypassPrivateRepoCheck: true to disable the check."
        );
      }
    }
  } catch (error: any) {
    if (error.name === "HttpError") {
      core.setFailed(
        "❌ There seems to be an error in an API request" +
          "\nThis is usually due to either being in a private repository" +
          "\nor at any rate using a GitHub token without the adequate scope"
      );
    } else {
      core.setFailed("❌ " + error.stack);
    }
  }
}

run();
