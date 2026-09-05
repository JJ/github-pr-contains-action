import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { jest } from "@jest/globals";
import { context } from "@actions/github";
import { run } from "../src/main";

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
    context.eventName = "pull_request";
    context.payload = {};
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
});
