const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  extension: "Extension",
  export: "Export",
  import: "Import",
};

export function formatSourceName(
  source: string,
): string {
  if (!source) {
    return "";
  }

  const normalized =
    source.trim().toLowerCase();

  const known =
    SOURCE_DISPLAY_NAMES[normalized];

  if (known) {
    return known;
  }

  return (
    normalized.charAt(0).toUpperCase() +
    normalized.slice(1)
  );
}

export default formatSourceName;
