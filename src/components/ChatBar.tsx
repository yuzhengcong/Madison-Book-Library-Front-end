"use client";

import { useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onContextChange?: (selected: string[]) => void;
};

const CONTEXT_OPTIONS = [
  "blackstone -- commentaries v1",
  "blackstone -- commentaries v2",
  "blackstone -- commentaries v3",
  "blackstone -- commentaries v4",
  "De Lolme -- The Constitution of England",
  "Filmer -- The Anarchy of a Limited or Mixed Monarchy",
  "Harrington -- The Commonwealth of Oceana",
  "Hunton -- A Treatise of Monarchy",
  "Locke -- Second Treatise of Government",
  "Montesquieu -- spirit of laws",
  "Rousseau -- The Social Contract",
  "Vattel -- The Law of Nations",
];

export default function ChatBar({ value, onChange, onSend, onContextChange }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const toggleOption = (label: string) => {
    const next = selected.includes(label)
      ? selected.filter((l) => l !== label)
      : [...selected, label];
    setSelected(next);
    onContextChange?.(next);
  };

  const allSelected = selected.length === CONTEXT_OPTIONS.length;
  const toggleAll = () => {
    const next = allSelected ? [] : [...CONTEXT_OPTIONS];
    setSelected(next);
    onContextChange?.(next);
  };

  const confirm = () => {
    onContextChange?.(selected);
    setOpen(false);
  };

  return (
    <div className="w-full relative">
      {/* 输入栏（Gemini风格胶囊） */}
      <div className="rounded-full bg-white ring-1 ring-zinc-300 shadow px-5 py-3 flex items-center justify-between">
        <input
          className="flex-1 bg-transparent outline-none text-zinc-800 placeholder-zinc-500 text-base"
          placeholder="Message"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-1 text-zinc-700"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <span>Context</span>
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M5.23 7.21a.75.75 0 011.06-.02L10 10.67l3.71-3.48a.75.75 0 111.04 1.08l-4.23 3.97a.75.75 0 01-1.04 0L5.25 8.27a.75.75 0 01-.02-1.06z" />
            </svg>
          </button>
          <button
            className="h-9 w-9 rounded-full bg-black text-white flex items-center justify-center"
            onClick={onSend}
            aria-label="Send"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
              <path d="M10 4a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V5a1 1 0 011-1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Context 选项面板 */}
      {open && (
        <div className="absolute bottom-full mb-3 right-0 w-[28rem] max-w-[95vw] rounded-2xl bg-white border border-zinc-200 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              <button className="underline" onClick={toggleAll}>
                {allSelected ? "Deselect All" : "Select All"}
              </button>
            </div>
            <span className="text-sm text-zinc-500">Selected: {selected.length}</span>
          </div>

          <div className="max-h-72 overflow-auto">
            {CONTEXT_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-3 px-4 py-3 text-sm border-b border-zinc-100">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggleOption(opt)}
                />
                <span className="text-zinc-800">{opt}</span>
              </label>
            ))}
          </div>

          <div className="px-4 py-3">
            <button
              onClick={confirm}
              className="w-full rounded-xl bg-black text-white px-4 py-2"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}