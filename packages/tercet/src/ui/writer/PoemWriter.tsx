"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { countLines, countWords } from "../../poems/text.js";
import { LIMITS } from "../../poems/validate.js";
import BackLink from "../common/BackLink.js";
import { useTercet } from "../context.js";
import { clearDraft, updateDraft, useDraft } from "./draft.js";
import { downloadPoem } from "./download.js";
import { publishPoem, type PublishError } from "./publish.js";

type Status =
  | { kind: "idle" }
  | { kind: "asking" }
  | { kind: "sending" }
  | { kind: "done"; slug: string }
  | { kind: "failed"; error: PublishError };

export default function PoemWriter({ canPublish }: { canPublish: boolean }) {
  const { m: t, count } = useTercet();
  const { title, content, savedAt } = useDraft();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [token, setToken] = useState("");
  const tokenInput = useRef<HTMLInputElement>(null);

  const ready = title.trim() !== "" && content.trim() !== "";
  const w = t.writer;

  // ⌘/Ctrl + S saves the file instead of the browser's "save page".
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "s" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      if (ready) downloadPoem(title, content);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, title, content]);

  useEffect(() => {
    if (status.kind === "asking") tokenInput.current?.focus();
  }, [status.kind]);

  const publish = async () => {
    setStatus({ kind: "sending" });
    const sent = { title, content };
    const result = await publishPoem(token.trim(), title, content);
    if (result.ok) {
      setToken("");
      clearDraft(sent);
      setStatus({ kind: "done", slug: result.slug });
    } else {
      setStatus({ kind: "failed", error: result.error });
    }
  };

  return (
    <div className="writer">
      <BackLink text={t.back} label={t.backToAll} />

      <label htmlFor="writer-title" className="sr-only">
        {w.titleLabel}
      </label>
      <input
        id="writer-title"
        className="writer-title"
        value={title}
        onChange={(event) => updateDraft({ title: event.target.value })}
        placeholder={w.titlePlaceholder}
        autoComplete="off"
        maxLength={LIMITS.title}
      />

      <label htmlFor="writer-body" className="sr-only">
        {w.bodyLabel}
      </label>
      <textarea
        id="writer-body"
        className="writer-body"
        value={content}
        onChange={(event) => updateDraft({ content: event.target.value })}
        placeholder={w.bodyPlaceholder}
        maxLength={LIMITS.content}
      />

      <div className="writer-bar">
        <span className="writer-meta">
          {content.trim() ? `${count(w.lines, countLines(content))} · ${count(w.words, countWords(content))}` : ""}
          {savedAt && (title || content) ? ` · ${w.draftSaved}` : ""}
        </span>

        {(title || content) && status.kind !== "sending" && (
          <button
            type="button"
            className="label"
            onClick={() => {
              if (window.confirm(w.confirmClear)) {
                clearDraft();
                setStatus({ kind: "idle" });
              }
            }}
          >
            {w.clear}
          </button>
        )}

        <button
          type="button"
          className="label"
          disabled={!ready}
          onClick={() => downloadPoem(title, content)}
          title={w.downloadHint}
        >
          {w.download}
        </button>

        {canPublish && (status.kind === "asking" || status.kind === "sending" || status.kind === "failed") ? (
          <form
            className="writer-publish"
            onSubmit={(event) => {
              event.preventDefault();
              if (token.trim() && ready) void publish();
            }}
          >
            <label htmlFor="writer-token" className="sr-only">
              {w.tokenLabel}
            </label>
            <input
              ref={tokenInput}
              id="writer-token"
              className="writer-token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={w.tokenLabel}
              autoComplete="off"
              spellCheck={false}
            />{" "}
            <button type="submit" className="label" disabled={!ready || !token.trim() || status.kind === "sending"}>
              {status.kind === "sending" ? w.publishing : w.publish}
            </button>
          </form>
        ) : (
          canPublish && (
            <button type="button" className="label" disabled={!ready} onClick={() => setStatus({ kind: "asking" })}>
              {w.publish}
            </button>
          )
        )}

        {status.kind === "failed" && (
          <p className="writer-message" role="alert">
            {w.errors[status.error]}
          </p>
        )}
        {status.kind === "done" && (
          <p className="writer-message" role="status">
            {w.published} — <Link href={`/poems/${status.slug}`}>/poems/{status.slug}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
