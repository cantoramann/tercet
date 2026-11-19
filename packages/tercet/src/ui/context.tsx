"use client";

import { createContext, useContext } from "react";
import type { ClientConfig } from "../config.js";
import { plural, type Plural } from "../i18n/index.js";

const TercetContext = createContext<ClientConfig | null>(null);

/** Hands the serializable part of the site config to client components. Rendered by the layout. */
export function TercetProvider({ value, children }: { value: ClientConfig; children: React.ReactNode }) {
  return <TercetContext.Provider value={value}>{children}</TercetContext.Provider>;
}

export function useTercet() {
  const config = useContext(TercetContext);
  if (!config) throw new Error("Tercet components must be rendered inside the Tercet layout.");
  return { ...config, m: config.messages, count: (message: Plural, n: number) => plural(message, n, config.locale) };
}
