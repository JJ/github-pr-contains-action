import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
  try {
    const bodyContains = core.getInput('bodyContains');
    console.log(`Checking for body containing ${bodyContains}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
