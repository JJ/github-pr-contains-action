import { fileURLToPath } from "node:url";
import * as core from "@actions/core";
import { getOctokit, context } from "@actions/github";
import parse from "parse-diff";
import { rexify, getFilesChanged } from "./utils";
import { JobSummary } from "./summary";

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

export async function run() {
  const summary = new JobSummary();
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
        summary.recordCheck("Waived user", "skipped", `«${senderName}» is a waived user, all checks were skipped`);
        return;
      }
    } else {
      core.warning('⚠️ Sender info missing. Passing waived user check.')
    }

    // Check if the body contains required string
    const bodyContains = core.getInput("bodyContains");
    const bodyDoesNotContain = core.getInput("bodyDoesNotContain");
    //Check if a description is required
    const allowEmpty = core.getInput("allowEmpty") === "true"? true: false;

    if (
      context.eventName !== "pull_request" &&
      context.eventName !== "pull_request_target"
    ) {
      // TODO(ApoorvGuptaAi) Should just return here and skip the rest of the check.
      core.warning("⚠️ Not a pull request, skipping PR body checks");
      summary.recordCheck("Event type", "skipped", `Event «${context.eventName}» is not a pull request`);
    } else {
      const pull_request = payload.pull_request;
      const repository = payload.repository;
      if (!pull_request) {
        core.setFailed("❌ Expecting pull_request metadata.")
        summary.recordCheck("Metadata", "failed", "Expecting pull_request metadata.");
        return;
      }
      if (!repository) {
        core.setFailed("❌ Expecting repository metadata.")
        summary.recordCheck("Metadata", "failed", "Expecting repository metadata.");
        return;
      }
      if (bodyContains || bodyDoesNotContain) {
        const PRBody = pull_request?.body;
        core.info("Checking body contents");
        if (!PRBody) {
          console.log(allowEmpty);
          if(allowEmpty) {
            core.warning("⚠️ The PR body is empty, skipping checks");
            summary.recordCheck("PR body", "skipped", "PR body is empty");
          } else {
            const message = "❌ The PR body is empty and allowEmpty is false. Please add a body to your PR.";
            core.setFailed(message);
            summary.recordCheck("PR body", "failed", message);
          }
        } else {
          if (bodyContains) {
            if (!rexify(bodyContains).test(PRBody)) {
              const message = "The body of the PR does not contain " + bodyContains;
              core.setFailed(message);
              summary.recordCheck("PR body contains", "failed", message);
            } else {
              summary.recordCheck("PR body contains", "passed", `Found required pattern «${bodyContains}»`);
            }
          }
          if (bodyDoesNotContain) {
            if (rexify(bodyDoesNotContain).test(PRBody)) {
              const message = "The body of the PR should not contain " + bodyDoesNotContain;
              core.setFailed(message);
              summary.recordCheck("PR body does not contain", "failed", message);
            } else {
              summary.recordCheck(
                "PR body does not contain",
                "passed",
                `Did not find forbidden pattern «${bodyDoesNotContain}»`
              );
            }
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
        let filesChangedInPR: any[] = [];

        // Check files changed first, before parsing diff
        if (filesChanged) {
              core.info("Checking number of files changed");
              const owner = repository?.owner?.login;
              const repo = repository?.name;
              const pull_number = pull_request?.number;

              filesChangedInPR = await getFilesChanged(
                  octokit,
                  owner,
                  repo,
                  pull_number
              );

              if (filesChangedInPR.length != filesChanged) {
                const message =
                  "You should change exactly " + filesChangedInPR.length + " file(s)";
                  core.setFailed( message );
                  summary.recordCheck("Files changed", "failed", message);
              } else {
                  summary.recordCheck("Files changed", "passed", `Changed exactly ${filesChanged} file(s)`);
              }
              return;
        }
        core.setOutput("numberOfFiles", filesChangedInPR?.length);
      }


      if (diffContains || diffDoesNotContain || linesChanged) {
        core.info("Checking diff contents");
        const parsedDiff = await getDiff(octokit, repository, pull_request);

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
        if (diffContains) {
          if (!rexify(diffContains).test(changes)) {
            const message = "The added code does not contain «" + diffContains + "»";
            core.setFailed(message);
            summary.recordCheck("Diff contains", "failed", message);
          } else {
            core.setOutput("diff", changes);
            summary.recordCheck("Diff contains", "passed", `Found required pattern «${diffContains}»`);
          }
        }
        if (diffDoesNotContain) {
          if (rexify(diffDoesNotContain).test(changes)) {
            const message = "The added code should not contain " + diffDoesNotContain;
            core.setFailed(message);
            summary.recordCheck("Diff does not contain", "failed", message);
          } else {
            summary.recordCheck(
              "Diff does not contain",
              "passed",
              `Did not find forbidden pattern «${diffDoesNotContain}»`
            );
          }
        }

        core.info("Checking lines/files changed");
        if (linesChanged) {
          if (additions != linesChanged) {
            const this_msg =
              "You should change exactly " +
              linesChanged +
              " lines(s) and you have changed " +
              additions;
            core.setFailed(this_msg);
            summary.recordCheck("Lines changed", "failed", this_msg);
          } else {
            summary.recordCheck("Lines changed", "passed", `Changed exactly ${linesChanged} line(s)`);
          }
        }
      }
    }
  } catch (error: any) {
    if (error.name === "HttpError") {
      const message =
        "❌ There seems to be an error in an API request" +
        "\nThis is usually due to using a GitHub token without the adequate scope"+
        `\n${error}`;
      core.setFailed(message);
      summary.recordCheck("API request", "failed", message);
    } else {
      core.setFailed("❌ " + error.stack);
      summary.recordCheck("Unexpected error", "failed", error.message);
    }
  } finally {
    await summary.write();
  }
}

// Only auto-run when this file is the actual entry point (e.g. `node dist/index.js`),
// not when it's imported elsewhere - such as by the test suite, which imports `run` directly.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  run();
}
