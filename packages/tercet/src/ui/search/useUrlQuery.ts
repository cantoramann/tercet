import { useEffect, useState, useSyncExternalStore } from "react";

const PARAM = "q";
const WRITE_DELAY_MS = 400;

const readUrl = () => new URLSearchParams(window.location.search).get(PARAM) ?? "";
const subscribe = (listener: () => void) => {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
};

/**
 * Search text mirrored to `?q=`, so a search can be shared or bookmarked
 * and survives a reload. The server renders the unfiltered list; the URL is
 * read after hydration. URL writes are debounced because some browsers
 * throttle `history.replaceState`.
 */
export function useUrlQuery(): [string, (value: string) => void] {
  const fromUrl = useSyncExternalStore(subscribe, readUrl, () => "");
  const [typed, setTyped] = useState<string | null>(null);
  const query = typed ?? fromUrl;

  useEffect(() => {
    if (typed === null) return;
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      if (typed.trim()) url.searchParams.set(PARAM, typed);
      else url.searchParams.delete(PARAM);
      if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
    }, WRITE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  return [query, setTyped];
}
