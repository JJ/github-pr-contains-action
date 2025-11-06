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
          listFiles: jest.fn().mockResolvedValue({
            data: [
              { filename: "file1.ts" },
              { filename: "file2.ts" },
              { filename: "file3.ts" }
            ]
          })
        }
      }
    };
    
    const result = await checkFilesChanged(mockOctokit, "owner", "repo", 123);
    expect(result).toBe(3);
    expect(mockOctokit.rest.pulls.listFiles).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      pull_number: 123
    });
  });

  it("Should return different file count", async () => {
    const mockOctokit = {
      rest: {
        pulls: {
          listFiles: jest.fn().mockResolvedValue({
            data: [
              { filename: "file1.ts" },
              { filename: "file2.ts" },
              { filename: "file3.ts" },
              { filename: "file4.ts" },
              { filename: "file5.ts" }
            ]
          })
        }
      }
    };
    
    const result = await checkFilesChanged(mockOctokit, "owner", "repo", 456);
    expect(result).toBe(5);
  });

  it("Should return large file count", async () => {
    const mockOctokit = {
      rest: {
        pulls: {
          listFiles: jest.fn().mockResolvedValue({
            data: Array.from({ length: 10 }, (_, i) => ({ filename: `file${i + 1}.ts` }))
          })
        }
      }
    };
    
    const result = await checkFilesChanged(mockOctokit, "owner", "repo", 999);
    expect(result).toBe(10);
  });
});
