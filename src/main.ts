import * as core from '@actions/core'
import { getOctokit, context } from '@actions/github'
import { PayloadRepository } from '@actions/github/lib/interfaces'
import parseDiff from 'parse-diff'

interface PullRequest {
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
    // get information on everything
    const token = core.getInput('github-token', { required: true })
    const octokit = getOctokit(token)

    const payload = context.payload

    const senderInfo = payload?.sender
    const senderName = senderInfo?.login
    const senderType = senderInfo?.type
    core.info(`PR created by ${senderName} (${senderType})`)

    // First check for waived users
    if (senderName) {
      const waivedUsers = core.getInput('waivedUsers') || ['dependabot[bot]']
      if (waivedUsers.includes(senderName)) {
        core.warning(
          `⚠️ Not running this workflow for waived user «${senderName}»`
        )
        return
      }
    } else {
      core.warning('⚠️ Sender info missing. Passing waived user check.')
    }

    // Check if the body contains required string
    const bodyContains = core.getInput('bodyContains')
    const bodyDoesNotContain = core.getInput('bodyDoesNotContain')

    if (
      context.eventName !== 'pull_request' &&
      context.eventName !== 'pull_request_target'
    ) {
      // TODO(ApoorvGuptaAi) Should just return here and skip the rest of the check.
      core.warning('⚠️ Not a pull request, skipping PR body checks')
    } else {
      const pull_request = payload.pull_request
      const repository = payload.repository
      if (!pull_request) {
        core.setFailed('Expecting pull_request metadata.')
        return
      }
      if (!repository) {
        core.setFailed('Expecting repository metadata.')
        return
      }
      if (bodyContains || bodyDoesNotContain) {
        const PRBody = pull_request?.body
        core.info('Checking body contents')
        // NOTE(apoorv) Its valid to have PRs with no body, so maybe that should not fail validation?
        if (!PRBody) {
          core.setFailed("The body is empty, can't check")
        } else {
          if (bodyContains && !new RegExp(bodyContains).test(PRBody)) {
            core.setFailed(
              `The body of the PR does not contain ${bodyContains}`
            )
          }
          if (bodyDoesNotContain && new RegExp(bodyContains).test(PRBody)) {
            core.setFailed(
              `The body of the PR should not contain ${bodyDoesNotContain}`
            )
          }
        }
      }

      core.info('Checking diff contents')
      const diffContains = core.getInput('diffContains')
      const diffDoesNotContain = core.getInput('diffDoesNotContain')

      const files = await getDiff(octokit, repository, pull_request)
      core.exportVariable('files', files)
      core.setOutput('files', files)
      const filesChanged = +core.getInput('filesChanged')
      if (filesChanged && files.length !== filesChanged) {
        core.setFailed(`You should change exactly ${filesChanged} file(s)`)
      }

      let changes = ''
      let additions = 0
      for (const file of files) {
        additions += file.additions

        for (const chunk of file.chunks) {
          for (const change of chunk.changes) {
            if ('add' in change) {
              changes += change.content
            }
          }
        }
      }
      if (diffContains && !new RegExp(diffContains).test(changes)) {
        core.setFailed(`The added code does not contain «${diffContains}»`)
      } else {
        core.exportVariable('diff', changes)
        core.setOutput('diff', changes)
      }
      if (diffDoesNotContain && new RegExp(diffDoesNotContain).test(changes)) {
        core.setFailed(
          `The added code should not contain ${diffDoesNotContain}`
        )
      }

      core.info('Checking lines/files changed')
      const linesChanged = +core.getInput('linesChanged')
      if (linesChanged && additions !== linesChanged) {
        const this_msg = `You should change exactly ${linesChanged} lines(s) and you have changed ${additions}`
        core.setFailed(this_msg)
      }
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

async function getDiff(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  octokit: InstanceType<any>,
  repository?: PayloadRepository,
  pull_request?: PullRequest
): Promise<parseDiff.File[]> {
  const owner = repository?.owner?.login
  const repo = repository?.name
  const pull_number = pull_request?.number
  core.info(`Getting diff for: ${owner}, ${repo}, ${pull_number}`)
  if (!owner || !repo || typeof pull_number !== 'number') {
    throw Error('Missing metadata required for fetching diff.')
  }
  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number,
    headers: { accept: 'application/vnd.github.v3.diff' }
  })

  const diff = response.data as unknown as string
  return parseDiff(diff)
}
