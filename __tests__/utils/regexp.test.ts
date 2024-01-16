/**
 * Unit tests for the action's entrypoint, src/index.ts
 */

import { checkContains } from '../../src/utils/regexp'

// Mock the action's entrypoint
describe('checkContains', () => {
  const regexpRule = '^[^/]*"(0.0.0-.*-SNAPSHOT).*"'

  it('should contain', async () => {
    const content = 'anything "0.0.0-foo-SNAPSHOT" else'
    expect(checkContains(content, regexpRule)).toBeTruthy()
  })

  it('should not contain', async () => {
    const content = '// "0.0.0-foo-SNAPSHOT" else'
    expect(checkContains(content, regexpRule)).toBeFalsy()
  })
})
