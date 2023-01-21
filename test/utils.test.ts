import { rexify } from "../src/utils";

// TODO: more tests
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
