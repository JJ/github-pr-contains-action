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
  it("Should return the correct number of files changed", async () => {
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
    
    const result = await checkFilesChanged(mockOctokit, "owner", "repo", 123);
    expect(result).toBe(3);
    expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      pull_number: 123
    });
  });

  it("Should return different file count", async () => {
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
    
    const result = await checkFilesChanged(mockOctokit, "owner", "repo", 456);
    expect(result).toBe(5);
  });

  it("Should return 0 when no files changed", async () => {
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
    
    const result = await checkFilesChanged(mockOctokit, "owner", "repo", 789);
    expect(result).toBe(0);
  });

  it("Should return large file count", async () => {
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
    
    const result = await checkFilesChanged(mockOctokit, "owner", "repo", 999);
    expect(result).toBe(10);
  });
});
