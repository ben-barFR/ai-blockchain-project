"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";

export function AskBldcrtChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/registry/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, busy]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-40 rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-[var(--accent-hover)]"
      >
        Ask bldcrt
      </button>
    );
  }

  return (
    <section
      className="fixed right-4 bottom-4 z-40 flex h-[min(32rem,calc(100vh-6rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
      aria-label="Ask bldcrt"
    >
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <p className="text-sm font-medium">Ask bldcrt</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Close
        </button>
      </header>

      <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Ask how certificates live on the blockchain, what issuance and transfer do, and how a PDF
            proves a certificate is authentic.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[90%] rounded-2xl bg-[var(--accent)] px-3 py-2 text-sm text-white"
                  : "mr-auto max-w-[90%] rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              }
            >
              {message.parts.map((part, index) =>
                part.type === "text" ? <span key={index}>{part.text}</span> : null,
              )}
            </div>
          ))
        )}
        {busy && messages.at(-1)?.role !== "assistant" ? (
          <p className="text-xs text-[var(--muted)]">bldcrt is typing…</p>
        ) : null}
      </div>

      {error ? (
        <p className="border-t border-red-500/30 px-3 py-2 text-xs text-red-300">{error.message}</p>
      ) : null}

      <form onSubmit={onSubmit} className="border-t border-[var(--border)] p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about certificates…"
            disabled={busy}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
