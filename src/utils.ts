export function rexify(stringOrArray: string | string[]): RegExp {
  if (typeof stringOrArray === "string") {
    return new RegExp(stringOrArray);
  } else {
    return new RegExp(stringOrArray.join("|"));
  }
}
