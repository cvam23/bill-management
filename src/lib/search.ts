export function toIlikePattern(raw: string): string {
  const escaped = raw
    .trim()
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')

  return `%${escaped}%`
}

// Escape for PostgREST's double-quoted value syntax, where backslash escapes the next character.
export function orIlikeFilter(columns: string[], pattern: string): string {
  const quoted = pattern.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
  return columns.map((column) => `${column}.ilike."${quoted}"`).join(',')
}
