export function checkContains(content: string, regularExpressionRule: string): boolean {
  return new RegExp(regularExpressionRule).test(content)
}
