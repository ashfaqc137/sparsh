export function formatDecisionReason(reason: string): string {
  return reason.replace(
    /(-?\d+(?:\.\d+)?)ms\b/g,
    (_match, value: string) => `${(Number(value) / 1000).toFixed(2)}s`,
  )
}
