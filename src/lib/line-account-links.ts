export type LineAccountAlias = "primary" | "secondary";

export const MEMBER_LIFF_URL = "https://liff.line.me/2011511843-ReAPLsJH";

const LINE_ADD_URLS: Record<LineAccountAlias, string> = {
  primary: "https://lin.ee/RU5qNLj",
  secondary: "https://lin.ee/P17vzBB",
};

export function parseLineAccountAlias(value: unknown): LineAccountAlias {
  return value === "secondary" ? "secondary" : "primary";
}

export function getLineAddUrl(alias: LineAccountAlias): string {
  return LINE_ADD_URLS[alias];
}

export function buildMemberLiffUrl(
  alias: LineAccountAlias = "primary",
  next?: "orders",
): string {
  const url = new URL(MEMBER_LIFF_URL);
  if (alias === "secondary") url.searchParams.set("oa", "secondary");
  if (next === "orders") url.searchParams.set("next", "orders");
  return url.toString();
}

function nestedLiffSearch(params: URLSearchParams): URLSearchParams | null {
  const state = params.get("liff.state");
  if (!state) return null;
  try {
    const decoded = decodeURIComponent(state);
    const query = decoded.includes("?") ? decoded.slice(decoded.indexOf("?")) : decoded;
    return new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  } catch {
    return null;
  }
}

export function resolveMemberLiffAccount(search: string): LineAccountAlias {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const direct = params.get("oa");
  if (direct) return parseLineAccountAlias(direct);
  return parseLineAccountAlias(nestedLiffSearch(params)?.get("oa"));
}
