import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { jest } from "@jest/globals";
import * as core from "@actions/core";
import { JobSummary } from "../src/summary";

describe("JobSummary", () => {
  // @actions/core caches the resolved summary file path for the lifetime of the process,
  // so the env var must point at the same file for every test in this suite.
  const summaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-summary-"));
  const summaryFilePath = path.join(summaryDir, "summary.md");

  beforeAll(() => {
    process.env.GITHUB_STEP_SUMMARY = summaryFilePath;
  });

  afterAll(() => {
    delete process.env.GITHUB_STEP_SUMMARY;
    fs.rmSync(summaryDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    fs.writeFileSync(summaryFilePath, "");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does not write anything when no checks were recorded", async () => {
    const summary = new JobSummary();

    await summary.write();

    expect(fs.readFileSync(summaryFilePath, "utf8")).toBe("");
  });

  it("writes a table with every recorded check and an overall passed status", async () => {
    const summary = new JobSummary();
    summary.recordCheck("Files changed", "passed", "Changed exactly 1 file(s)");
    summary.recordCheck("Lines changed", "passed", "Changed exactly 10 line(s)");

    await summary.write();

    const content = fs.readFileSync(summaryFilePath, "utf8");
    expect(content).toContain("PR contains action - results");
    expect(content).toContain("Overall status: **✅ Passed**");
    expect(content).toContain("Files changed");
    expect(content).toContain("Changed exactly 1 file(s)");
    expect(content).toContain("Lines changed");
  });

  it("marks the overall status as failed when any check failed", async () => {
    const summary = new JobSummary();
    summary.recordCheck("Files changed", "passed", "Changed exactly 1 file(s)");
    summary.recordCheck("Lines changed", "failed", "Expected 10, got 20");

    await summary.write();

    const content = fs.readFileSync(summaryFilePath, "utf8");
    expect(content).toContain("Overall status: **❌ Failed**");
    expect(content).toContain("Expected 10, got 20");
  });

  it("falls back to a missing detail placeholder", async () => {
    const summary = new JobSummary();
    summary.recordCheck("Files changed", "passed");

    await summary.write();

    const content = fs.readFileSync(summaryFilePath, "utf8");
    expect(content).toContain("<td>-</td>");
  });

  it("keeps checks recorded on separate instances independent of one another", async () => {
    const summaryA = new JobSummary();
    const summaryB = new JobSummary();
    summaryA.recordCheck("Files changed", "passed", "Changed exactly 1 file(s)");

    await summaryB.write();

    // summaryB never recorded anything, so it must not have picked up summaryA's check
    expect(fs.readFileSync(summaryFilePath, "utf8")).toBe("");
  });

  it("does not throw when writing the summary fails", async () => {
    jest.spyOn(core.summary, "write").mockRejectedValueOnce(new Error("runtime does not support job summaries"));
    // the failure is logged via core.debug, which writes through process.stdout - silence it
    jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    const summary = new JobSummary();
    summary.recordCheck("Files changed", "passed", "Changed exactly 1 file(s)");

    await expect(summary.write()).resolves.not.toThrow();
  });
});
