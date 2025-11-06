import { rexify, checkFilesChanged } from "../src/utils";

describe("Regex creator", () => {
  it("Should create single-string regexes", () => {
    const re1: RegExp = rexify("foo");
    expect("foobar").toMatch(re1);
  });

  it("Should create multi-string regexes", () => {
    const re1: RegExp = rexify("foo|bar|baz");
    expect("foobar").toMatch(re1);
    expect("1234").not.toMatch(re1);
  });

  it("Should prep for regex with square brackets", () => {
    const re1: RegExp = rexify("[x]");
    expect(" [x] ").toMatch(re1);
    expect("x").not.toMatch(re1);
  });
  it("Should prep for regex with quantifiers", () => {
    const re1: RegExp = rexify("question?");
    expect("Is this a question?").toMatch(re1);
    expect("question").not.toMatch(re1);
  });
});

describe("Check files changed", () => {
  it("Should return true when file count matches", async () => {
    const mockOctokit = {
      rest: {
        pulls: {
          get: jest.fn().mockResolvedValue({
            data: {
              changed_files: 3
            }
          })
        }
      }
    };
    
    const result = await checkFilesChanged(mockOctokit, "owner", "repo", 123, 3);
    expect(result).toBe(true);
    expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      pull_number: 123
    });
  });

  it("Should return false when file count does not match", async () => {
    const mockOctokit = {
      rest: {
        pulls: {
          get: jest.fn().mockResolvedValue({
            data: {
              changed_files: 5
            }
          })
        }
      }
    };
    
    const result = await checkFilesChanged(mockOctokit, "owner", "repo", 456, 3);
    expect(result).toBe(false);
  });

  it("Should return true when no files changed and expected is 0", async () => {
    const mockOctokit = {
      rest: {
        pulls: {
          get: jest.fn().mockResolvedValue({
            data: {
              changed_files: 0
            }
          })
        }
      }
    };
    
    const result = await checkFilesChanged(mockOctokit, "owner", "repo", 789, 0);
    expect(result).toBe(true);
  });

  it("Should return false when file count is greater than expected", async () => {
    const mockOctokit = {
      rest: {
        pulls: {
          get: jest.fn().mockResolvedValue({
            data: {
              changed_files: 10
            }
          })
        }
      }
    };
    
    const result = await checkFilesChanged(mockOctokit, "owner", "repo", 999, 2);
    expect(result).toBe(false);
  });
});
