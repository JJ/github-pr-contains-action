import * as core from '@actions/core';
const {GitHub, context} = require('@actions/github')

async function run() {
  try {
      const bodyContains = core.getInput('bodyContains')
      const token = core.getInput('github-token', {required: true})
      const client = new GitHub(token, {} )
      console.log( context )
      console.log( context.payload )
      console.log(`Body needs to contain ${bodyContains}`)
  } catch (error) {
      core.setFailed(error.message);
  }
}

run();
