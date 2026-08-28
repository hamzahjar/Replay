const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
};

export function formatProviderName(
  provider: string,
): string {
  if (!provider) {
    return "";
  }

  const normalized =
    provider.trim().toLowerCase();

  return (
    PROVIDER_DISPLAY_NAMES[normalized] ??
    provider
  );
}

export default formatProviderName;
