import * as core from '@actions/core';
const {GitHub, context} = require('@actions/github')
const parse = require('parse-diff')

async function run() {
  try {
      const bodyContains = core.getInput('bodyContains')
      if ( context.payload.pull_request.body.indexOf( bodyContains) < 0  ) {
          core.setFailed("The body of the PR does not contain ${bodyContains}");
      }
      const diffContains = core.getInput('diffContains')
      const token = core.getInput('github-token', {required: true})
      const github = new GitHub(token, {} )
      const diff_url = context.payload.pull_request.diff_url
      const result = await github.request( diff_url )
      const files = parse(result.data)
      console.log( files )
  } catch (error) {
      core.setFailed(error.message);
  }
}

run();
