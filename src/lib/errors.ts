export function parseDbError(
  error: { message?: string } | null,
): { code: string; message: string } | null {
  const match = error?.message?.match(/^([a-z_]+):\s*(.+)$/s)

  if (!match) {
    return null
  }

  return {
    code: match[1],
    message: match[2].trim(),
  }
}
