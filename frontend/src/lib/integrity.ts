export type IntegrityState = "not-provided" | "checking" | "verified" | "mismatch" | "unavailable";

export function normalizeSha256(value: string): string {
  return value.trim().toLowerCase();
}

export function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyRemoteSha256(url: string, expectedDigest: string): Promise<{
  state: IntegrityState;
  actualDigest?: string;
  detail: string;
}> {
  if (!url || !expectedDigest) return { state: "not-provided", detail: "No evidence committed for this source." };
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const actualDigest = `sha256:${toHex(await crypto.subtle.digest("SHA-256", await response.arrayBuffer()))}`;
    const matches = normalizeSha256(actualDigest) === normalizeSha256(expectedDigest);
    return {
      state: matches ? "verified" : "mismatch",
      actualDigest,
      detail: matches ? "Fetched bytes match the on-chain commitment." : "Fetched bytes do not match the on-chain commitment.",
    };
  } catch (error) {
    return {
      state: "unavailable",
      detail: error instanceof Error ? `Browser verification unavailable: ${error.message}` : "Browser verification unavailable.",
    };
  }
}

export function deadlinePhase(nowSeconds: number, deadline: number): "pending" | "due" {
  return nowSeconds < deadline ? "pending" : "due";
}

export function formatCountdown(nowSeconds: number, deadline: number): string {
  const remaining = Math.max(0, deadline - nowSeconds);
  if (remaining === 0) return "Due now";
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return [days ? `${days}d` : "", hours || days ? `${hours}h` : "", `${minutes}m`, `${seconds}s`].filter(Boolean).join(" ");
}

