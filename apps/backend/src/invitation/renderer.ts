export function renderTemplate(html: string, content: Record<string, unknown>): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path: string) => {
    const value = getByPath(content, path);
    if (value === undefined || value === null) return match;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  });
}

function getByPath(obj: unknown, path: string): unknown {
  let current: unknown = obj;
  for (const key of path.split(".")) {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}
