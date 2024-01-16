import { PayloadRepository } from '@actions/github/lib/interfaces'
import { PullRequest } from '../main'
import { getOctokit } from '@actions/github'
import * as core from '@actions/core'
import parseDiff from 'parse-diff'

export async function fetchDiff(repository: PayloadRepository, pullRequest: PullRequest): Promise<parseDiff.File[]> {
  const token = core.getInput('github-token', { required: true })
  const octokit = getOctokit(token)

  const owner = repository.owner?.login
  const repo = repository.name
  const pullNumber = pullRequest.number
  core.info(`Getting diff for: ${owner}, ${repo}, ${pullNumber}`)
  if (!owner || !repo || typeof pullNumber !== 'number') {
    throw Error('Missing metadata required for fetching diff.')
  }
  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    headers: { accept: 'application/vnd.github.v3.diff' }
  })

  return parseDiff(response.data as unknown as string)
}
