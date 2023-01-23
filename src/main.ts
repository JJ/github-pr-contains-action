import * as core from "@actions/core";
const { GitHub, context } = require("@actions/github");
import parse from "parse-diff";
import { rexify } from "./utils";

async function run() {
  try {
    // get information on everything
    const token = core.getInput("github-token", { required: true });
    const github = new GitHub(token, {});

    // Check if the body contains required string
    const bodyContains = core.getInput("bodyContains");
    const bodyDoesNotContain = core.getInput("bodyDoesNotContain");

    if (bodyContains || bodyDoesNotContain) {
      core.info("Checking body contents");
      if (!context.payload.pull_request.body) {
        core.setFailed("The body of the PR is empty, can't check");
      } else {
        const PRBody = context.payload.pull_request.body;
        if (bodyContains && !rexify(bodyContains).test(PRBody)) {
          core.setFailed("The body of the PR does not contain " + bodyContains);
        }
        if (bodyDoesNotContain && rexify(bodyDoesNotContain).test(PRBody)) {
          core.setFailed(
            "The body of the PR should not contain " + bodyDoesNotContain
          );
        }
      }
    }

    core.info("Checking diff contents");
    const diffContains = core.getInput("diffContains");
    const diffDoesNotContain = core.getInput("diffDoesNotContain");
    const diff_url = context.payload.pull_request.diff_url;
    core.info("Requesting " + diff_url);
    const result = await github.request(diff_url);
    core.info(result);
    const files = parse(result.data);
    core.exportVariable("files", files);
    core.setOutput("files", files);
    const filesChanged = +core.getInput("filesChanged");
    if (filesChanged && files.length != filesChanged) {
      core.setFailed("You should change exactly " + filesChanged + " file(s)");
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
      core.setFailed("The added code does not contain " + diffContains);
    } else {
      core.exportVariable("diff", changes);
      core.setOutput("diff", changes);
    }
    if (diffDoesNotContain && rexify(diffDoesNotContain).test(changes)) {
      core.setFailed("The added code should not contain " + diffDoesNotContain);
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
  } catch (error: any) {
    core.setFailed(error.message + "❌" + error.stack);
  }
}

run();
