import parseDiff from 'parse-diff'
import * as core from '@actions/core'
import { checkContains } from './utils/regexp'

export function checkPrDiff(
  filesChanged: parseDiff.File[],
  diffMustContainRule: string,
  diffShallNotContainRule: string
): void {
  if (!(diffMustContainRule || diffShallNotContainRule)) {
    return
  }

  if (diffMustContainRule) {
    core.info(`Checking diff contain to contain «${diffMustContainRule}»`)
  }
  if (diffShallNotContainRule) {
    core.info(`Checking diff content to NOT contain «${diffShallNotContainRule}»`)
  }
  // Should test the regexp rules to the smallest possible payload, thus drill for the chunks.
  // This is the best way to avoid the regular expressions to run wild on too large diffs.
  for (const file of filesChanged) {
    for (const chunk of file.chunks) {
      for (const change of chunk.changes) {
        if (!('add' in change)) {
          continue
        }

        if (diffMustContainRule && checkContains(change.content, diffMustContainRule)) {
          // early exit (succeed fast), we already find what we looked for, no need to check any more diffs
          return
        }

        if (diffShallNotContainRule && checkContains(change.content, diffShallNotContainRule)) {
          // early exit, we found what should not be present, fail fast
          core.setFailed(`The added code does contain «${diffShallNotContainRule}» - this is not allowed»`)
          core.warning(`Offending diff: «${change.content}»`)
          core.exportVariable('diff', change.content)
          core.setOutput('diff', change.content)
          return
        }
      }
    }
  }

  if (diffMustContainRule) {
    // if a rule was provided but our file scan did not find and early exit, the required string has not been found
    // in any changes. Thus, we need to fail
    core.setFailed(`The added code does not contain «${diffMustContainRule}» - this is required`)
  }
}
