"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Scene } from "@/lib/contracts";
import { createNotebookStore } from "@/lib/notebook-store";
export function useNotebook(createInitial: () => Scene) {
  const [store] = useState(() => createNotebookStore(createInitial()));
  const state = useSyncExternalStore(
    store.subscribe,
    store.snapshot,
    store.serverSnapshot,
  );
  useEffect(() => {
    store.hydrate();
    window.addEventListener("pagehide", store.flush);
    return () => {
      store.flush();
      window.removeEventListener("pagehide", store.flush);
    };
  }, [store]);
  return { ...state, setBook: store.setBook };
}
