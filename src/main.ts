import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
  try {
      const bodyContains = core.getInput('bodyContains');
      const token = core.getInput('github-token', {required: true})
      console.log(`Body needs to contain ${bodyContains}`);
  } catch (error) {
      core.setFailed(error.message);
  }
}

run();
