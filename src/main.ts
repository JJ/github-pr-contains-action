import * as core from "@actions/core";
const { GitHub, context } = require("@actions/github");
import parse from "parse-diff";
import { rexify } from "./utils";

async function run() {
  try {
    // get information on everything
    const token = core.getInput("github-token", { required: true });
    const github = new GitHub(token, {});

    // First check for waived users
    const waivedUsers = core.getInput("waivedUsers") || ["dependabot"];
    core.info(context.payload.pull_request.user);
    core.info("User from github" + github.triggering_actor);

    if (waivedUsers.includes(github.actor)) {
      core.warning(
        `⚠️ Not running this workflow for waived user ${github.actor}`
      );
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

      if (context.payload.repository.private !== true) {
        core.info("Checking diff contents");
        const diffContains = core.getInput("diffContains");
        const diffDoesNotContain = core.getInput("diffDoesNotContain");
        const diff_url = context.payload.pull_request.diff_url;
        core.info("Requesting " + diff_url);
        const result = await github.request(diff_url);
        const files = parse(result.data);
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
          "⚠️ I'm sorry, can't check diff in private repositories with the default token"
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
