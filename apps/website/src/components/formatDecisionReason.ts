function floorToTwoDecimals(value: number): string {
  const floored = Math.floor(value * 100) / 100
  return floored.toFixed(2)
}

export function formatDecisionReason(reason: string): string {
  return reason
    .replace(
      /(-?\d+(?:\.\d+)?)ms\b/g,
      (_match, value: string) => `${(Number(value) / 1000).toFixed(2)}s`,
    )
    .replace(
      /(-?\d+(?:\.\d+)?)px\b/g,
      (_match, value: string) => `${floorToTwoDecimals(Number(value))}px`,
    )
}
