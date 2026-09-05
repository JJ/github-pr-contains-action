import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { jest } from "@jest/globals";

// main.ts calls getOctokit(token) and then octokit.rest.pulls.listFiles/get.
// Mocking the whole module (rather than hitting the network) lets us feed it
// a canned PR/files-changed response.
const listFiles: jest.Mock<() => Promise<any>> = jest.fn();
const getPull: jest.Mock<() => Promise<any>> = jest.fn();
const fakeContext: any = {};

jest.unstable_mockModule("@actions/github", () => ({
  context: fakeContext,
  getOctokit: () => ({
    rest: {
      pulls: {
        listFiles,
        get: getPull,
      },
    },
  }),
}));

const { context } = await import("@actions/github");
const { run } = await import("../src/main");

describe("run", () => {
  // @actions/core caches the resolved summary file path for the lifetime of the process,
  // so every test must use the same underlying file.
  const summaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-summary-"));
  const summaryFilePath = path.join(summaryDir, "summary.md");

  beforeAll(() => {
    process.env.GITHUB_STEP_SUMMARY = summaryFilePath;
    process.env["INPUT_GITHUB-TOKEN"] = "fake-token";
  });

  afterAll(() => {
    delete process.env.GITHUB_STEP_SUMMARY;
    delete process.env["INPUT_GITHUB-TOKEN"];
    fs.rmSync(summaryDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    fs.writeFileSync(summaryFilePath, "");
    process.env.INPUT_WAIVEDUSERS = "";
    delete process.env.INPUT_FILESCHANGED;
    context.eventName = "pull_request";
    context.payload = {};
    listFiles.mockReset();
    getPull.mockReset();
    // core.info/warning/debug all write through process.stdout - silence the
    // GitHub Actions command output these tests intentionally trigger.
    jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("writes a job summary explaining the run was skipped for a non pull-request event", async () => {
    context.eventName = "push";
    context.payload = { sender: { login: "someone", type: "User" } };

    await run();

    const content = fs.readFileSync(summaryFilePath, "utf8");
    expect(content).toContain("Event type");
    expect(content).toContain("is not a pull request");
    expect(content).toContain("Overall status: **✅ Passed**");
  });

  it("writes a job summary explaining the run was skipped for a waived user", async () => {
    process.env.INPUT_WAIVEDUSERS = "somebot";
    context.eventName = "pull_request";
    context.payload = { sender: { login: "somebot", type: "Bot" } };

    await run();

    const content = fs.readFileSync(summaryFilePath, "utf8");
    expect(content).toContain("Waived user");
    expect(content).toContain("«somebot» is a waived user");
    expect(content).toContain("Overall status: **✅ Passed**");
  });

  it("fails when the PR changes more files than the allowed exact count", async () => {
    const TOO_MANY_FILES = 300;
    process.env.INPUT_FILESCHANGED = "2";
    context.eventName = "pull_request";
    context.payload = {
      sender: { login: "someone", type: "User" },
      repository: { owner: { login: "some-owner" }, name: "some-repo" },
      pull_request: { number: 42, body: "a body" },
    };
    // Mock a PR that touches far more files than allowed.
    getPull.mockResolvedValue({ data: "" });
    listFiles.mockResolvedValue({
      data: Array.from({ length: TOO_MANY_FILES }, (_, i) => ({ filename: `file${i}.js` })),
    });

    await run();

    expect(listFiles).toHaveBeenCalledWith({
      owner: "some-owner",
      repo: "some-repo",
      pull_number: 42,
    });
    const content = fs.readFileSync(summaryFilePath, "utf8");
    expect(content).toContain("Files changed");
    expect(content).toContain(`You should change exactly ${TOO_MANY_FILES} file(s)`);
    expect(content).toContain("Overall status: **❌ Failed**");
  });
});
