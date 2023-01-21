export function rexify(expression: string): RegExp {
  ["(", ")", "[", "]", "?", "+", "*"].forEach((s) => {
    expression = expression.replace(s, `\\${s}`);
  });
  return new RegExp(expression);
}
