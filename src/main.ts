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
      if (!context.payload.pull_request.body) {
        core.setFailed("The body of the PR is empty, can't check");
      } else {
        const PRBody = context.payload.pull_request.body;
        if (
          bodyContains &&
          typeof PRBody.match(rexify(bodyContains)) === "undefined"
        ) {
          core.setFailed("The body of the PR does not contain " + bodyContains);
        }
        if (
          bodyDoesNotContain &&
          typeof PRBody.match(rexify(bodyDoesNotContain)) !== "undefined"
        ) {
          core.setFailed(
            "The body of the PR should not contain " + bodyDoesNotContain
          );
        }
      }
    }

    const diffContains = core.getInput("diffContains");
    const diff_url = context.payload.pull_request.diff_url;
    const result = await github.request(diff_url);
    const files = parse(result.data);
    core.exportVariable("files", files);
    core.setOutput("files", files);
    const filesChanged = +core.getInput("filesChanged");
    if (filesChanged && files.length != filesChanged) {
      core.setFailed("You should change exactly " + filesChanged + " file(s)");
    }

    var changes = "";
    var additions: number = 0;
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
    if (diffContains && changes.indexOf(diffContains) < 0) {
      core.setFailed("The added code does not contain " + diffContains);
    } else {
      core.exportVariable("diff", changes);
      core.setOutput("diff", changes);
    }

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
    core.setFailed(error.message);
  }
}

run();
