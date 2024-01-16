import * as core from '@actions/core'
import parseDiff from 'parse-diff'

export function checkLinesAdded(filesChanged: parseDiff.File[], linesAllowedToChange: number): void {
  if (!linesAllowedToChange) {
    return
  }

  core.info(`Checking pr to not exceed more lines to change than ${linesAllowedToChange}`)

  const linesAdded = filesChanged.reduce((acc, current) => {
    return acc + current.additions
  }, 0)
  if (linesAdded !== linesAllowedToChange) {
    core.setFailed(`You should change exactly ${linesAllowedToChange} lines(s) and you have changed ${linesAdded}`)
  }
}
