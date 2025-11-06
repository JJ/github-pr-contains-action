export function rexify(expression: string): RegExp {
  ["(", ")", "[", "]", "?", "+", "*"].forEach((s) => {
    expression = expression.replace(s, `\\${s}`);
  });
  return new RegExp(expression);
}

/**
 * Get the files changed in a PR
 * @param octokit - GitHub API client
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param pull_number - Pull request number
 * @returns Promise<any[]> - Array of files changed in the PR
 */
export async function getFilesChanged(
  octokit: any,
  owner: string,
  repo: string,
  pull_number: number
): Promise<any[]> {
  const response = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number,
  });
  
  return response.data;
}
