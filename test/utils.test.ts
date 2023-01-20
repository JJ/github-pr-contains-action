import { rexify } from "../src/utils";

describe("Regex creator", () => {
  it("Should create single-string regexes", () => {
    const re1: RegExp = rexify("foo");
    expect("foobar").toMatch(re1);
  });
});
