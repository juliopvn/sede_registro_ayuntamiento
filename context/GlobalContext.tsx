"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { SessionUsuario } from "@/lib/types";

interface GlobalContextValue {
  usuario: SessionUsuario | null;
  setUsuario: (usuario: SessionUsuario | null) => void;
}

const GlobalContext = createContext<GlobalContextValue | undefined>(undefined);

export function GlobalContextProvider({
  children,
  initialUsuario,
}: {
  children: ReactNode;
  initialUsuario: SessionUsuario | null;
}) {
  const [usuario, setUsuario] = useState<SessionUsuario | null>(initialUsuario);

  const value = useMemo(() => ({ usuario, setUsuario }), [usuario]);

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
}

export function useGlobalContext(): GlobalContextValue {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobalContext debe usarse dentro de GlobalContextProvider.");
  }
  return context;
}
