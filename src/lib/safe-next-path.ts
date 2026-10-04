export function safeNextPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;

  const url = new URL(value, "https://crane-spotting.invalid");
  return url.origin === "https://crane-spotting.invalid"
    ? `${url.pathname}${url.search}${url.hash}`
    : fallback;
}