import * as core from "@actions/core";

export type CheckStatus = "passed" | "failed" | "skipped";

export interface CheckResult {
  name: string;
  status: CheckStatus;
  details: string;
}

const STATUS_ICON: Record<CheckStatus, string> = {
  passed: "✅",
  failed: "❌",
  skipped: "⏭️",
};

/**
 * Collects the outcome of each check performed during a run and renders them
 * as a GitHub Actions job summary. Instantiate one per run (or per test) -
 * state lives on the instance, not on the module, so concurrent/parallel runs
 * (e.g. tests, or multiple invocations in the same process) never share it.
 */
export class JobSummary {
  private readonly results: CheckResult[] = [];

  recordCheck(name: string, status: CheckStatus, details = ""): void {
    this.results.push({ name, status, details });
  }

  /**
   * Writes the accumulated checks to the job summary. A no-op when nothing
   * has been recorded. Never throws: job summaries are not supported in
   * every runtime (e.g. local runs), and that must never fail the action.
   */
  async write(): Promise<void> {
    if (this.results.length === 0) {
      return;
    }

    const overallStatus = this.results.some((result) => result.status === "failed") ? "❌ Failed" : "✅ Passed";

    core.summary
      .addHeading("PR contains action - results", 2)
      .addRaw(`Overall status: **${overallStatus}** `, true)
      .addTable([
        [
          { data: "Check", header: true },
          { data: "Status", header: true },
          { data: "Details", header: true },
        ],
        ...this.results.map((result) => [
          result.name,
          `${STATUS_ICON[result.status]} ${result.status}`,
          result.details || "-",
        ]),
      ]);

    try {
      await core.summary.write();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      core.debug(`Could not write job summary: ${message}`);
    }
  }
}
