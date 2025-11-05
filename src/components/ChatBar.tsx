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
  "De Lolme -- The Constitution of England",
  "Filmer -- The Anarchy of a Limited or Mixed Monarchy",
  "Harrington -- The Commonwealth of Oceana",
  "Hunt on -- A Treatise of Monarchy",
  "Locke -- Second Treatise of Government",
];

export default function ChatBar({ value, onChange, onSend, onContextChange }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([CONTEXT_OPTIONS[0], CONTEXT_OPTIONS[1]]);

  const toggleOption = (label: string) => {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const allSelected = selected.length === CONTEXT_OPTIONS.length;
  const toggleAll = () => {
    setSelected(allSelected ? [] : [...CONTEXT_OPTIONS]);
  };

  const confirm = () => {
    onContextChange?.(selected);
    setOpen(false);
  };

  return (
    <div className="w-full relative">
      {/* 输入栏 */}
      <div className="rounded-2xl bg-white border border-zinc-300 shadow-sm px-6 py-3 flex items-center justify-between">
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
            className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center"
            onClick={onSend}
            aria-label="Send"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M10 3a.75.75 0 01.75.75v9.5a.75.75 0 01-1.5 0v-9.5A.75.75 0 0110 3zm-4.47 4.47a.75.75 0 011.06 0L10 10.88l3.41-3.41a.75.75 0 111.06 1.06l-3.94 3.94a.75.75 0 01-1.06 0L5.53 8.53a.75.75 0 010-1.06z" />
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