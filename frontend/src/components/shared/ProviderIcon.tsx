interface ProviderIconProps {
  provider: string;
}

function ProviderIcon({
  provider,
}: ProviderIconProps) {
  const normalizedProvider =
    provider.toLowerCase();

  let iconPath = "/assets/chatgpt.png";

  if (normalizedProvider === "chatgpt") {
    iconPath = "/assets/chatgpt.png";
  }

  return (
    <div
      className="provider-icon"
      title={provider}
      aria-label={provider}
    >
      <img
        src={iconPath}
        alt={provider}
      />
    </div>
  );
}

export default ProviderIcon;