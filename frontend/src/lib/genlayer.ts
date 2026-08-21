import { createClient } from "genlayer-js";
import { localnet, studionet, testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

type NetworkName = "localnet" | "studionet" | "testnetBradbury";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

const network = (process.env.NEXT_PUBLIC_NETWORK as NetworkName) || "studionet";
const endpoint = process.env.NEXT_PUBLIC_GENLAYER_RPC;
const chainMap = { localnet, studionet, testnetBradbury };

const readClient = createClient({
  chain: chainMap[network] ?? studionet,
  ...(endpoint ? { endpoint } : {}),
});

type RuntimeClient = {
  connect?: (name: NetworkName) => Promise<unknown>;
  readContract: (args: { address: string; functionName: string; args: unknown[] }) => Promise<unknown>;
  writeContract: (args: { address: string; functionName: string; args: unknown[]; value: bigint }) => Promise<string | { txId: string }>;
  waitForTransactionReceipt: (args: { hash: `0x${string}`; status: string; interval?: number; retries?: number }) => Promise<Record<string, unknown>>;
  getTransaction: (args: { hash: `0x${string}` }) => Promise<Record<string, unknown>>;
};

export type ContractResult = {
  success: boolean;
  pending?: boolean;
  data?: unknown;
  hash?: string;
  status?: string;
  error?: string;
};

const STORAGE_KEY = "syllabusbond.contract";

export function configuredAddress(): string {
  if (typeof window !== "undefined") {
    const override = window.localStorage.getItem(STORAGE_KEY);
    if (override && override.startsWith("0x") && override.length === 42) {
      return override;
    }
  }
  return process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
}

export function setConfiguredAddress(address: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, address.trim());
  }
}

export function restoreConfiguredAddress() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function normalizeTxId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "txId" in value && typeof (value as { txId: unknown }).txId === "string") {
    return (value as { txId: string }).txId;
  }
  return String(value || "");
}

export function parseContractJson<T>(input: unknown): T | null {
  try {
    if (typeof input === "string") return JSON.parse(input) as T;
    if (input && typeof input === "object" && "result" in input) {
      return parseContractJson<T>((input as { result: unknown }).result);
    }
    return input as T;
  } catch {
    return null;
  }
}

export async function connectWallet(): Promise<ContractResult> {
  if (typeof window === "undefined" || !window.ethereum) {
    return { success: false, error: "Please install or unlock an EVM browser wallet." };
  }
  try {
    const accounts = (await window.ethereum.request({ method: "eth_requestAccounts", params: [] })) as string[];
    return accounts[0] ? { success: true, data: accounts[0] } : { success: false, error: "No wallet account selected." };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Wallet connection failed." };
  }
}

export async function readContract(functionName: string, args: unknown[] = []): Promise<ContractResult> {
  const address = configuredAddress();
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return { success: false, error: "No contract address configured. Set address in header override." };
  }
  try {
    const data = await (readClient as unknown as RuntimeClient).readContract({ address, functionName, args });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Contract read failed." };
  }
}

export async function writeContract(
  functionName: string,
  args: unknown[] = [],
  value = BigInt(0)
): Promise<ContractResult> {
  if (typeof window === "undefined" || !window.ethereum) {
    return { success: false, error: "Connect your wallet to execute this transaction." };
  }
  const address = configuredAddress();
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return { success: false, error: "No valid contract address configured." };
  }

  let hash = "";
  try {
    const accounts = (await window.ethereum.request({ method: "eth_requestAccounts", params: [] })) as string[];
    if (!accounts[0]) return { success: false, error: "No wallet account selected." };

    const runtime = createClient({
      chain: chainMap[network] ?? studionet,
      ...(endpoint ? { endpoint } : {}),
      provider: window.ethereum,
      account: accounts[0] as `0x${string}`,
    }) as unknown as RuntimeClient;

    if (runtime.connect) await runtime.connect(network);

    const rawTx = await runtime.writeContract({ address, functionName, args, value });
    hash = normalizeTxId(rawTx);

    const receipt = await runtime.waitForTransactionReceipt({
      hash: hash as `0x${string}`,
      status: TransactionStatus.ACCEPTED,
      interval: 2000,
      retries: 100,
    });

    let observed = receipt;
    try {
      observed = await runtime.getTransaction({ hash: hash as `0x${string}` });
    } catch {
      // receipt is sufficient
    }

    const status = String(observed.statusName || receipt.statusName || "ACCEPTED");
    const executionResult = String(observed.txExecutionResultName || receipt.txExecutionResultName || "");

    if (executionResult === "FINISHED_WITH_ERROR" || executionResult === "FAILED") {
      return { success: false, hash, status, error: "Transaction execution reverted by contract rules." };
    }

    return { success: true, hash, status, data: receipt };
  } catch (error) {
    return {
      success: false,
      hash,
      error: error instanceof Error ? error.message : "Contract write failed.",
    };
  }
}
