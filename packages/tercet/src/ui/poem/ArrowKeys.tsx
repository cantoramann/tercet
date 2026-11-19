"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isTyping } from "../common/shortcuts.js";

/** ← / → go to the previous / next poem. Renders nothing. */
export default function ArrowKeys({ previous, next }: { previous: string | null; next: string | null }) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event) || event.shiftKey) return;
      const target = event.key === "ArrowLeft" ? previous : event.key === "ArrowRight" ? next : null;
      if (!target) return;
      event.preventDefault();
      router.push(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, previous, next]);

  return null;
}
