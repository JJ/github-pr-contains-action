export async function wait(milliseconds: number): Promise<string> {
  return new Promise(resolve => {
    if (isNaN(milliseconds)) {
      throw new Error(`${milliseconds} does not look like a number`)
    }

    setTimeout(() => resolve('done!'), milliseconds)
  })
}
