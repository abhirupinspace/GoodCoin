"use client";
// Which GOODCOIN fire (contract) the app is looking at. Set by ?fire=<account> on any page, remembered per
// browser, defaulting to the demo contract. Every contract read, query key and transaction goes through it.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CONTRACT, isValidFireId } from "./config";

const KEY = "goodcoin:fire";

interface FireContextValue {
  fire: string;
  setFire: (id: string) => void;
}

const FireContext = createContext<FireContextValue>({ fire: CONTRACT, setFire: () => {} });

export function FireProvider({ children }: { children: ReactNode }) {
  const [fire, setFireState] = useState(CONTRACT);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("fire");
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      // storage unavailable
    }
    const pick = fromUrl && isValidFireId(fromUrl) ? fromUrl : stored && isValidFireId(stored) ? stored : null;
    if (pick) setFireState(pick);
  }, []);

  const setFire = useCallback((id: string) => {
    if (!isValidFireId(id)) return;
    setFireState(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // storage unavailable
    }
  }, []);

  return <FireContext.Provider value={{ fire, setFire }}>{children}</FireContext.Provider>;
}

export const useFireId = () => useContext(FireContext).fire;
export const useFireContext = () => useContext(FireContext);
