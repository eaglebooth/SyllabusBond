"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { connectWallet } from "@/lib/genlayer";

type WalletContextType = {
  account: string;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
};

const WalletContext = createContext<WalletContextType>({
  account: "",
  isConnecting: false,
  error: null,
  connect: async () => null,
  disconnect: () => {},
  showModal: false,
  setShowModal: () => {},
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Check if wallet is already connected
  const checkConnected = useCallback(async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = (await window.ethereum.request({
          method: "eth_accounts",
          params: [],
        })) as string[];
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
        }
      } catch {
        // silent catch
      }
    }
  }, []);

  useEffect(() => {
    checkConnected();

    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: unknown) => {
        const accs = accounts as string[];
        if (accs && accs.length > 0) {
          setAccount(accs[0]);
        } else {
          setAccount("");
        }
      };

      const ethereum = window.ethereum as unknown as {
        on?: (event: string, handler: (args: unknown) => void) => void;
        removeListener?: (event: string, handler: (args: unknown) => void) => void;
      };

      if (ethereum.on) {
        ethereum.on("accountsChanged", handleAccountsChanged);
      }

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener("accountsChanged", handleAccountsChanged);
        }
      };
    }
  }, [checkConnected]);

  const connect = async (): Promise<string | null> => {
    setIsConnecting(true);
    setError(null);

    // If window.ethereum is not detected, open the modal explaining how to connect
    if (typeof window === "undefined" || !window.ethereum) {
      setIsConnecting(false);
      setShowModal(true);
      setError("No Web3 wallet extension found. Please install MetaMask or another EVM wallet.");
      return null;
    }

    try {
      const res = await connectWallet();
      if (res.success && typeof res.data === "string") {
        setAccount(res.data);
        setShowModal(false);
        return res.data;
      } else {
        setError(res.error || "Failed to connect wallet.");
        setShowModal(true);
        return null;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Wallet connection failed.";
      setError(msg);
      setShowModal(true);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount("");
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        isConnecting,
        error,
        connect,
        disconnect,
        showModal,
        setShowModal,
      }}
    >
      {children}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-[#1c1917]/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="card-ledger max-w-md w-full p-6 space-y-4 shadow-xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-serif text-lg font-bold text-[#1c1917]">
                Connect Web3 Wallet
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-xs text-[#78716c] hover:text-[#1c1917] font-bold"
              >
                ✕
              </button>
            </div>

            {error ? (
              <div className="notice-danger text-xs">
                {error}
              </div>
            ) : (
              <p className="text-xs text-[#57534e] leading-relaxed">
                Connect your browser wallet (e.g. MetaMask, Rabby, Coinbase Wallet) to sign transactions on GenLayer Studionet.
              </p>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  if (typeof window !== "undefined" && window.ethereum) {
                    connect();
                  } else {
                    window.open("https://metamask.io/download/", "_blank");
                  }
                }}
                className="btn-academic w-full text-xs py-2.5 flex items-center justify-center gap-2"
              >
                {typeof window !== "undefined" && window.ethereum
                  ? isConnecting
                    ? "Opening Wallet Popup..."
                    : "Retry Wallet Connection"
                  : "Install MetaMask Browser Extension ↗"}
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary w-full text-xs py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
