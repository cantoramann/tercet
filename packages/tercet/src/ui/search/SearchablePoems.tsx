"use client";

import { useDeferredValue, useEffect, useMemo, useRef } from "react";
import { createSearchIndex, type SearchDoc } from "../../search/index.js";
import { isTyping } from "../common/shortcuts.js";
import { useTercet } from "../context.js";
import PoemList from "./PoemList.js";
import { useUrlQuery } from "./useUrlQuery.js";

export default function SearchablePoems({ docs }: { docs: SearchDoc[] }) {
  const { m, count } = useTercet();
  const [query, setQuery] = useUrlQuery();
  const deferred = useDeferredValue(query);
  const input = useRef<HTMLInputElement>(null);

  const index = useMemo(() => createSearchIndex(docs), [docs]);
  const hits = useMemo(() => index.search(deferred), [index, deferred]);
  const searching = deferred.trim() !== "";

  // "/" focuses search from anywhere on the page.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || isTyping(event)) return;
      event.preventDefault();
      input.current?.focus();
      input.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <search className="search" role="search">
        <label htmlFor="poem-search" className="sr-only">
          {m.search.label}
        </label>
        <input
          ref={input}
          id="poem-search"
          type="search"
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && query) {
              event.preventDefault();
              setQuery("");
            }
          }}
          placeholder={m.search.placeholder}
          aria-describedby="poem-search-hint"
          aria-controls="poem-list"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
        />
        <span id="poem-search-hint" className="sr-only">
          {m.search.shortcutHint}
        </span>
        {query ? (
          <button
            type="button"
            className="search-clear"
            onClick={() => {
              setQuery("");
              input.current?.focus();
            }}
            aria-label={m.search.clear}
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : (
          <kbd className="search-key" aria-hidden="true">
            /
          </kbd>
        )}
        <p className="search-status" role="status" aria-live="polite" aria-atomic="true">
          {searching ? (hits.length === 0 ? m.search.none : count(m.search.found, hits.length)) : ""}
        </p>
      </search>

      <PoemList
        id="poem-list"
        hits={hits}
        instant={query !== ""}
        label={searching ? count(m.search.found, hits.length) : count(m.search.total, docs.length)}
      />
    </>
  );
}
