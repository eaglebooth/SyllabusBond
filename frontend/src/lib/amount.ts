export type GenAmount = string | number | bigint;

export function asGenBigInt(value: GenAmount): bigint {
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) throw new Error("GEN amount must be a non-negative whole number.");
  return BigInt(normalized);
}

export function parseGenInput(value: string): bigint {
  const amount = asGenBigInt(value);
  if (amount <= BigInt(0)) throw new Error("Tuition must be at least 1 GEN.");
  return amount;
}

export function formatGen(value: GenAmount): string {
  return `${asGenBigInt(value).toLocaleString("en-US")} GEN`;
}