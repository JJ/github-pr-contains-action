import * as core from '@actions/core'

export function checkPrBody(pullRequestBody: string, bodyContains: string, bodyDoesNotContain: string): void {
  if (!(bodyContains && bodyDoesNotContain)) {
    // We have not been asked for body checks
    return
  }

  if (!pullRequestBody) {
    core.info('PR body is empty - skipping body check')
    return
  }

  core.info('Checking body contents')
  if (bodyContains && !new RegExp(bodyContains).test(pullRequestBody)) {
    core.setFailed(`The body of the PR does not contain ${bodyContains}`)
  }
  if (bodyDoesNotContain && new RegExp(bodyContains).test(pullRequestBody)) {
    core.setFailed(`The body of the PR should not contain ${bodyDoesNotContain}`)
  }
}
