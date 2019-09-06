import * as core from '@actions/core';
const {GitHub, context} = require('@actions/github')

async function run() {
  try {
      const bodyContains = core.getInput('bodyContains')
      const token = core.getInput('github-token', {required: true})
      const github = new GitHub(token, {} )
      const diff_url = context.payload.pull_request.diff_url
      const result = await github.request( diff_url )
      console.log( result )
  } catch (error) {
      core.setFailed(error.message);
  }
}

run();
