import parseDiff from 'parse-diff'
import * as core from '@actions/core'
import { checkContains } from './utils/regexp'

export function checkPrDiff(
  filesChanged: parseDiff.File[],
  diffContainsRule: string,
  diffDoesNotContainRule: string
): void {
  if (!(diffContainsRule || diffDoesNotContainRule)) {
    return
  }
  core.info('Checking diff contents')

  const didMatchContains = false
  // Should test the regexp rules to the smallest possible payload, thus drill for the chunks.
  // This is the best way to avoid the regular expressions to run wild on too large diffs.
  for (const file of filesChanged) {
    for (const chunk of file.chunks) {
      for (const change of chunk.changes) {
        if (!('add' in change)) {
          continue
        }

        if (diffContainsRule && checkContains(change.content, diffContainsRule)) {
          // early exit (succeed fast), we already find what we looked for, no need to check any more diffs
          return
        }

        if (diffDoesNotContainRule && checkContains(change.content, diffDoesNotContainRule)) {
          // early exit, we found what should not be present, fail fast
          core.setFailed(`The added code does contain «${diffDoesNotContainRule}» - this is not allowed»`)
          core.exportVariable('diff', change.content)
          core.setOutput('diff', change.content)
          return
        }
      }
    }
  }

  if (diffContainsRule && !didMatchContains) {
    // we parsed through all changes but did not find what is required, fail
    core.setFailed(`The added code does not contain «${diffContainsRule}» - this is required`)
  }
}
