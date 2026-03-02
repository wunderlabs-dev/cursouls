export function extractMessageTypesFromSource(source: string, marker: string): string[] {
  const escapedMarker = escapeForRegex(marker);
  const pattern = new RegExp(`${escapedMarker}\\s*"([^"]+)"`, "g");
  const types = new Set<string>();

  let match = pattern.exec(source);
  while (match) {
    types.add(match[1]);
    match = pattern.exec(source);
  }

  return [...types].sort();
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
