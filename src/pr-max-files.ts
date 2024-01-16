import * as core from '@actions/core'
import parseDiff from 'parse-diff'

export function checkMaxChangedFiles(changedFiles: parseDiff.File[], maxFilesAllowedToChange: number): void {
  if (maxFilesAllowedToChange && changedFiles.length !== maxFilesAllowedToChange) {
    core.setFailed(`You should change exactly ${maxFilesAllowedToChange} file(s)`)
  }
}
