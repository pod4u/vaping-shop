const MEMBER_DESTINATIONS = {
  orders: "/member#orders",
} as const;

function readNextDestination(params: URLSearchParams): string | null {
  const next = params.get("next");
  return next && Object.prototype.hasOwnProperty.call(MEMBER_DESTINATIONS, next)
    ? MEMBER_DESTINATIONS[next as keyof typeof MEMBER_DESTINATIONS]
    : null;
}

export function resolveMemberLiffDestination(search: string): string {
  const params = new URLSearchParams(search);
  const directDestination = readNextDestination(params);
  if (directDestination) return directDestination;

  // LINE temporarily carries LIFF URL additions in `liff.state` during its
  // primary redirect. liff.init() normally restores them, but reading the
  // value here keeps the destination reliable if a client remains on that URL.
  const liffState = params.get("liff.state");
  if (!liffState) return "/member";

  const queryIndex = liffState.indexOf("?");
  if (queryIndex < 0) return "/member";
  return readNextDestination(new URLSearchParams(liffState.slice(queryIndex + 1))) ?? "/member";
}
