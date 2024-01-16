/**
 * Unit tests for the action's entrypoint, src/index.ts
 */

import parseDiff from 'parse-diff'
import { checkPrDiff } from '../src/pr-diff'
import * as core from '@actions/core'

function getChunk(content: string): parseDiff.Chunk {
  return {
    content,
    changes: [
      {
        type: 'add',
        add: true,
        ln: 1,
        content
      }
    ],
    oldStart: 1,
    oldLines: 1,
    newStart: 1,
    newLines: 1
  }
}

const filesContaining: parseDiff.File[] = [
  {
    from: 'file.txt',
    to: 'file.txt',
    chunks: [getChunk('anything else')],
    additions: 5,
    deletions: 0
  },
  {
    from: './.workflows/offending.txt',
    to: './.workflows/offending.txt',
    chunks: [getChunk('something  else'), getChunk('anything "0.0.0-foo-SNAPSHOT" else')],
    additions: 5,
    deletions: 0
  }
]

const filesNotContaining: parseDiff.File[] = [
  {
    from: 'file.txt',
    to: 'file.txt',
    chunks: [getChunk('anything else')],
    additions: 5,
    deletions: 0
  },
  {
    from: 'other.txt',
    to: 'other.txt',
    chunks: [getChunk('something  else'), getChunk('else')],
    additions: 5,
    deletions: 0
  }
]

// Mock the GitHub Actions core library
let setFailedMock: jest.SpyInstance
let setInfoMock: jest.SpyInstance
// Mock the action's entrypoint
describe('diffContainsRule', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setInfoMock = jest.spyOn(core, 'info').mockImplementation()
  })

  const regexpRule = '^[^/]*"(0.0.0-.*-SNAPSHOT).*"'

  it('should find', async () => {
    checkPrDiff(filesContaining, regexpRule, '', [])
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('should not find', async () => {
    checkPrDiff(filesNotContaining, regexpRule, '', [])
    expect(setFailedMock).toHaveBeenCalled()
  })

  it('should allow to exclude file', async () => {
    // even though our files contains an offending string, the file doing so is excluded
    checkPrDiff(filesContaining, '', regexpRule, ['./.workflows/offending.txt'])
    expect(setFailedMock).not.toHaveBeenCalled()
    expect(setInfoMock).toHaveBeenCalled()
  })
})
