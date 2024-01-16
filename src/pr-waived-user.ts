import * as core from '@actions/core'

export function isWaivedUser(senderName: string): boolean {
  // First check for waived users
  if (senderName) {
    const waivedUsers = core.getMultilineInput('waivedUsers') || ['dependabot[bot]']
    if (waivedUsers.includes(senderName)) {
      core.warning(`⚠️ Not running this workflow for waived user «${senderName}»`)
      return true
    }
  }

  core.warning('⚠️ Sender info missing. Passing waived user check.')
  return false
}
