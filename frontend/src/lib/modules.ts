import type { GenAmount } from "@/lib/amount";

export function cumulativeModuleTarget(fee: GenAmount, moduleIndex: number, moduleCount: number): bigint {
  if (moduleCount < 1 || moduleIndex < 0 || moduleIndex >= moduleCount) throw new Error("Invalid module range");
  return (BigInt(fee) * BigInt(moduleIndex + 1)) / BigInt(moduleCount);
}

export function moduleTranche(fee: GenAmount, moduleIndex: number, moduleCount: number): bigint {
  const previous = moduleIndex === 0 ? BigInt(0) : cumulativeModuleTarget(fee, moduleIndex - 1, moduleCount);
  return cumulativeModuleTarget(fee, moduleIndex, moduleCount) - previous;
}

export function moduleProgressPercent(nextModule: number, moduleCount: number): number {
  if (moduleCount <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((nextModule / moduleCount) * 100)));
}
