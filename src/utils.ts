export function rexify(expression: string): RegExp {
  ["(", ")", "[", "]", "?", "+", "*"].forEach((s) => {
    expression = expression.replace(s, `\\${s}`);
  });
  return new RegExp(expression);
}

/**
 * Check if the number of files changed in a PR matches the expected count
 * @param octokit - GitHub API client
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param pull_number - Pull request number
 * @param expectedCount - Expected number of files changed
 * @returns Promise<boolean> - True if the count matches, false otherwise
 */
export async function checkFilesChanged(
  octokit: any,
  owner: string,
  repo: string,
  pull_number: number,
  expectedCount: number
): Promise<boolean> {
  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number,
  });
  
  const actualCount = response.data.changed_files;
  return actualCount === expectedCount;
}
