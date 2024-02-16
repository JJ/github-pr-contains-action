import * as core from '@actions/core'

export function checkPrBody(pullRequestBody: string, bodyMustContain: string, bodyShallNotContain: string): void {
  if (!(bodyMustContain && bodyShallNotContain)) {
    // We have not been asked for body checks
    return
  }

  if (!pullRequestBody) {
    core.info('PR body is empty - skipping body check')
    return
  }

  if (bodyMustContain) {
    core.info(`Checking pr body to contain «${bodyMustContain}»`)
  }
  if (bodyShallNotContain) {
    core.info(`Checking pr body to NOT contain «${bodyShallNotContain}»`)
  }

  if (bodyMustContain && !new RegExp(bodyMustContain).test(pullRequestBody)) {
    core.setFailed(`The PR body did not contain «${bodyMustContain}» while it is required`)
  }
  if (bodyShallNotContain && new RegExp(bodyShallNotContain).test(pullRequestBody)) {
    core.setFailed(`The body of the PR should not contain ${bodyShallNotContain}`)
    core.warning(`Offending body part ${pullRequestBody}`)
  }
}
