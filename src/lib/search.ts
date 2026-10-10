export function toIlikePattern(raw: string): string {
  const escaped = raw
    .trim()
    .replaceAll('"', '')
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')

  return `%${escaped}%`
}

export function orIlikeFilter(columns: string[], pattern: string): string {
  return columns.map((column) => `${column}.ilike."${pattern}"`).join(',')
}
