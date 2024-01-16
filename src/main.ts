import * as core from '@actions/core'
import { context } from '@actions/github'
import { PayloadRepository } from '@actions/github/lib/interfaces'
import { Context } from '@actions/github/lib/context'
import { checkLinesAdded as checkMaxLinesAdded } from './pr-max-lines'
import { checkPrDiff } from './pr-diff'
import { isWaivedUser } from './pr-waived-user'
import { checkPrBody } from './pr-body'
import { fetchDiff } from './utils/diff'
import { checkMaxChangedFiles } from './pr-max-files'

export interface PullRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
  number: number
  html_url?: string
  body?: string
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const payload = context.payload
    const senderInfo = payload?.sender
    const senderName = senderInfo?.login
    const senderType = senderInfo?.type

    if (!isPullRequest(context)) {
      core.warning('⚠️ Not a pull request, skipping PR body checks')
      return
    }

    const { repository, pullRequest } = extractMetaData(payload.repository, payload.pull_request)

    core.info(`PR created by ${senderName} (${senderType})`)
    if (isWaivedUser(senderName)) {
      // the user is allowed to do anything, skip all checks
      return
    }

    if (pullRequest.body) {
      checkPrBody(pullRequest.body, core.getInput('bodyContains'), core.getInput('bodyDoesNotContain'))
    }

    if (hasDiffBasedRules()) {
      const filesChanged = await fetchDiff(repository, pullRequest)
      checkMaxChangedFiles(filesChanged, Number(core.getInput('filesChanged')))
      const excludedFiles = core.getMultilineInput('diffFilesToExclude') ?? []
      checkPrDiff(filesChanged, core.getInput('diffContains'), core.getInput('diffDoesNotContain'), excludedFiles)
      checkMaxLinesAdded(filesChanged, Number(core.getInput('linesChanged')))
    }
  } catch (error: unknown) {
    if (error instanceof Error)
      if (error.name === 'HttpError') {
        core.setFailed(
          `❌ There seems to be an error in an API request\nThis is usually due to using a GitHub token without the adequate scope`
        )
      } else {
        core.setFailed(`❌ ${error.stack}`)
      }
  }
}

function hasDiffBasedRules(): boolean {
  const diffContains = core.getInput('diffContains')
  const diffDoesNotContain = core.getInput('diffDoesNotContain')
  const maxFilesAllowedToChange = Number(core.getInput('filesChanged'))
  const linesAllowedToChange = Number(core.getInput('linesChanged'))

  return diffContains !== '' || diffDoesNotContain !== '' || maxFilesAllowedToChange > 0 || linesAllowedToChange > 0
}

function isPullRequest(ctx: Context): boolean {
  return ctx.eventName === 'pull_request' || ctx.eventName === 'pull_request_target'
}

function extractMetaData(
  repository?: PayloadRepository,
  pullRequest?: PullRequest
): { repository: PayloadRepository; pullRequest: PullRequest } {
  if (!pullRequest) {
    const msg = 'Expecting pull_request metadata.'
    core.setFailed(msg)
    throw new Error(msg)
  }
  if (!repository) {
    const msg = 'Expecting repository metadata.'
    core.setFailed(msg)
    throw new Error(msg)
  }

  return {
    repository,
    pullRequest
  }
}
