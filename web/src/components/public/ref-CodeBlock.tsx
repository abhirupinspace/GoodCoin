"use client";
// Printed code block with a copy button (copying needs the clipboard, hence a client component).
import { CopyButton } from "@/components/ui";

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <figure className="frame min-w-0 bg-charcoal text-ink">
      <figcaption className="flex items-center justify-between gap-3 border-b-2 border-line px-4 py-2">
        <span className="eyebrow text-mustard">{label ?? "Shell"}</span>
        <span className="[&_button]:h-8 [&_button]:border-line [&_button]:px-3 [&_button]:text-ink"><CopyButton text={code} /></span>
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-[0.8rem] leading-relaxed"><code>{code}</code></pre>
    </figure>
  );
}
