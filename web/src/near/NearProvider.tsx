"use client";

/**
 * Wallet context built on @hot-labs/near-connect (wallet selector + signing) and plain JSON-RPC (confirmation).
 * Flow for every change call: wallet signs & sends → we wait for FINAL status via RPC → throw if it failed →
 * invalidate all queries so the UI re-reads contract state. Success is never assumed from the wallet alone.
 */
import type { NearConnector, NearWalletBase } from "@hot-labs/near-connect";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CONTRACT_ID, DEPOSIT, GAS, NETWORK, RPC_URLS, type ChangeMethod } from "@/lib/config";
import { txFailure, waitForFinalTx } from "@/lib/rpc";

export class TxError extends Error {
  constructor(
    message: string,
    public readonly hash: string | null,
  ) {
    super(message);
    this.name = "TxError";
  }
}

interface NearContextValue {
  /** Signed-in account, or null. */
  accountId: string | null;
  /** True once the connector has restored (or failed to restore) a previous session. */
  ready: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  /** Sign, send, and wait for finality. Resolves with the tx hash; rejects with TxError. */
  call: (method: ChangeMethod, args: Record<string, unknown>) => Promise<string>;
}

const NearContext = createContext<NearContextValue | null>(null);

export function NearProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const connectorRef = useRef<NearConnector | null>(null);
  const [wallet, setWallet] = useState<NearWalletBase | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Dynamic import: the connector touches `window`, so it must only load in the browser.
    import("@hot-labs/near-connect").then(async ({ NearConnector }) => {
      if (cancelled) return;
      const connector = new NearConnector({
        network: NETWORK,
        providers: { testnet: RPC_URLS },
        features: { signAndSendTransaction: true, testnet: true },
        footerBranding: null,
      });
      connectorRef.current = connector;
      connector.on("wallet:signIn", (e) => {
        setWallet(e.wallet);
        setAccountId(e.accounts[0]?.accountId ?? null);
      });
      connector.on("wallet:signOut", () => {
        setWallet(null);
        setAccountId(null);
      });
      try {
        const { wallet: restored, accounts } = await connector.getConnectedWallet();
        if (!cancelled) {
          setWallet(restored);
          setAccountId(accounts[0]?.accountId ?? null);
        }
      } catch {
        // no previous session
      } finally {
        if (!cancelled) setReady(true);
      }
    });
    return () => {
      cancelled = true;
      connectorRef.current?.removeAllListeners();
    };
  }, []);

  const connect = useCallback(async () => {
    const connector = connectorRef.current;
    if (!connector) return;
    await connector.whenManifestLoaded;
    const w = await connector.connect();
    const accounts = await w.getAccounts();
    setWallet(w);
    setAccountId(accounts[0]?.accountId ?? null);
  }, []);

  const disconnect = useCallback(async () => {
    const connector = connectorRef.current;
    if (connector && wallet) await connector.disconnect(wallet);
    setWallet(null);
    setAccountId(null);
  }, [wallet]);

  const call = useCallback(
    async (method: ChangeMethod, args: Record<string, unknown>) => {
      if (!wallet || !accountId) throw new TxError("Connect a wallet first.", null);
      let hash: string | null = null;
      try {
        const outcome = await wallet.signAndSendTransaction({
          receiverId: CONTRACT_ID,
          actions: [{ type: "FunctionCall", params: { methodName: method, args, gas: GAS, deposit: DEPOSIT[method] } }],
        });
        hash = (outcome as { transaction?: { hash?: string } } | undefined)?.transaction?.hash ?? null;
      } catch (e) {
        throw new TxError(e instanceof Error ? e.message : "The wallet rejected or failed to send the transaction.", null);
      }
      if (!hash) throw new TxError("The wallet did not return a transaction hash. Check your wallet's history.", null);
      try {
        const final = await waitForFinalTx(hash, accountId);
        const failure = txFailure(final);
        if (failure) throw new TxError(failure, hash);
        return hash;
      } catch (e) {
        if (e instanceof TxError) throw e;
        const reason = e instanceof Error ? e.message : "unknown error";
        throw new TxError(`Sent, but finality could not be confirmed (${reason}). Check the explorer link.`, hash);
      } finally {
        // Re-read everything, whether the call succeeded or failed.
        await queryClient.invalidateQueries();
      }
    },
    [wallet, accountId, queryClient],
  );

  const value = useMemo(() => ({ accountId, ready, connect, disconnect, call }), [accountId, ready, connect, disconnect, call]);
  return <NearContext.Provider value={value}>{children}</NearContext.Provider>;
}

export function useNear(): NearContextValue {
  const ctx = useContext(NearContext);
  if (!ctx) throw new Error("useNear must be used inside <NearProvider>");
  return ctx;
}
