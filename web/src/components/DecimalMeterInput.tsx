"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Entrada en metros con decimales (coma o punto). Evita que un input controlado
 * convierta "0." en 0 y borre el punto al re-renderizar.
 */
function normalizeTyping(raw: string): string {
  return raw.replace(",", ".").replace(/[^\d.-]/g, "");
}

export function DecimalMeterInput({
  id,
  "aria-describedby": ariaDescribedBy,
  className,
  value,
  placeholder,
  onCommit,
}: {
  id: string;
  "aria-describedby"?: string;
  className?: string;
  value: number | "";
  placeholder?: string;
  onCommit: (next: number | "") => void;
}) {
  const [text, setText] = useState(() =>
    value === "" ? "" : String(value).replace(",", "."),
  );
  const lastExternal = useRef<number | "">(value === "" ? "" : value);

  useEffect(() => {
    const ext = value === "" ? "" : value;
    if (ext !== lastExternal.current) {
      lastExternal.current = ext;
      setText(ext === "" ? "" : String(ext).replace(",", "."));
    }
  }, [value]);

  const baseClass =
    className ??
    "mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-600/35";

  const commitFromString = (raw: string) => {
    const t = raw.trim().replace(",", ".");
    if (t === "") {
      lastExternal.current = "";
      onCommit("");
      return;
    }
    if (t === "." || t === "-" || t === "-.") {
      lastExternal.current = "";
      onCommit("");
      setText("");
      return;
    }
    if (/\.$/.test(t)) {
      const n = Number(t.slice(0, -1));
      if (Number.isFinite(n)) {
        lastExternal.current = n;
        onCommit(n);
        setText(String(n));
      }
      return;
    }
    const n = Number(t);
    if (Number.isFinite(n)) {
      lastExternal.current = n;
      onCommit(n);
      setText(t);
      return;
    }
    lastExternal.current = "";
    onCommit("");
    setText("");
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      aria-describedby={ariaDescribedBy}
      placeholder={placeholder}
      className={baseClass}
      value={text}
      onChange={(e) => setText(normalizeTyping(e.target.value))}
      onBlur={() => commitFromString(text)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
    />
  );
}
