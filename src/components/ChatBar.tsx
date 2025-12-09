import { useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onContextChange?: (selected: string[]) => void;
};

// Structured list: `id` is the exact filename key sent to the backend
// `label` is the human-friendly display shown in the UI (Title — Author)
export const CONTEXT_OPTIONS: { id: string; label: string }[] = [
  { id: "blackstone -- commentaries v1", label: "Blackstone — Commentaries Volume 1" },
  { id: "blackstone -- commentaries v2", label: "Blackstone — Commentaries Volume 2" },
  { id: "blackstone -- commentaries v3", label: "Blackstone — Commentaries Volume 3" },
  { id: "blackstone -- commentaries v4", label: "Blackstone — Commentaries Volume 4" },
  { id: "De Lolme -- The Constitution of England", label: "De Lolme — The Constitution of England" },
  { id: "Filmer -- The Anarchy of a Limited or Mixed Monarchy", label: "Filmer — The Anarchy of a Limited or Mixed Monarchy" },
  { id: "Harrington -- The Commonwealth of Oceana", label: "Harrington — The Commonwealth of Oceana" },
  { id: "Hunton -- A Treatise of Monarchy", label: "Hunton — A Treatise of Monarchy" },
  { id: "Locke -- Second Treatise of Government", label: "Locke — Second Treatise of Government" },
  { id: "Montesquieu -- spirit of laws", label: "Montesquieu — The Spirit of Laws" },
  { id: "Rousseau -- The Social Contract", label: "Rousseau — The Social Contract" },
  { id: "Vattel -- The Law of Nations", label: "Vattel — The Law of Nations" },
];

export default function ChatBar({ value, onChange, onSend, onContextChange }: Props) {
  // ChatBar renders the user input area and a compact Books selector.
  // It exposes the `onContextChange` callback to inform the page which
  // book contexts are selected. The `CONTEXT_OPTIONS` constant is the
  // authoritative mapping of book filename IDs to human-friendly labels.
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([CONTEXT_OPTIONS[0].id, CONTEXT_OPTIONS[1].id]);

  const toggleOption = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));
  };

  const allSelected = selected.length === CONTEXT_OPTIONS.length;
  const toggleAll = () => {
    setSelected(allSelected ? [] : CONTEXT_OPTIONS.map((o) => o.id));
  };

  const confirm = () => {
    onContextChange?.(selected);
    setOpen(false);
  };

  return (
    <div className="w-full relative">
      {/* Chat bar with chips inside the white area */}
      <div className="rounded-2xl bg-white border border-zinc-300 shadow-sm px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {/* Books chip on left (same style as selected chips) */}
          <button
            className="text-xs px-3 py-1 rounded-full bg-stone-100 text-stone-700 border-stone-200 border border-indigo-100 font-medium"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            Books
          </button>

          {/* Selected book chips in the same row */}
            <div className="flex items-center gap-2 flex-wrap">
              {CONTEXT_OPTIONS.filter((o) => selected.includes(o.id)).map((s) => (
                <span key={s.id} className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                  {s.label}
                </span>
              ))}
            </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            className="flex-1 bg-transparent outline-none text-zinc-800 placeholder-zinc-500 text-base py-2"
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

          <div className="flex-shrink-0">
            <button
              className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center"
              onClick={onSend}
              aria-label="Send"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* dropdown moved below (single instance) — handled after the main white area */}
      </div>

      {/* single dropdown panel (appears once, left anchored) */}
      {open && (
        <div className="absolute bottom-full mb-3 left-4 w-[28rem] max-w-[95vw] rounded-2xl bg-white border border-zinc-200 shadow-xl overflow-hidden">
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
            {CONTEXT_OPTIONS.map((opt) => {
              const isSel = selected.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 px-4 py-3 text-sm border-b border-zinc-100 ${isSel ? 'bg-indigo-50 text-indigo-800' : 'text-zinc-800'}`}
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggleOption(opt.id)}
                  />
                  <span className={`truncate ${isSel ? 'font-semibold' : ''}`}>{opt.label}</span>
                </label>
              );
            })}
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