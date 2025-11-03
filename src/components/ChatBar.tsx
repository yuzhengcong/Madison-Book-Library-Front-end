export default function ChatBar() {
  return (
    <div className="w-full max-w-3xl">
      <div className="rounded-2xl bg-zinc-100 border border-zinc-200 px-6 py-4 flex items-center justify-between">
        <input
          className="flex-1 bg-transparent outline-none text-zinc-800 placeholder-zinc-500"
          placeholder="Message"
        />
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 text-zinc-600">
            <span>Context</span>
            {/* Chevron Down icon */}
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M5.23 7.21a.75.75 0 011.06-.02L10 10.67l3.71-3.48a.75.75 0 111.04 1.08l-4.23 3.97a.75.75 0 01-1.04 0L5.25 8.27a.75.75 0 01-.02-1.06z" />
            </svg>
          </button>
          <button className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center">
            {/* Arrow Up icon */}
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M10 3a.75.75 0 01.75.75v9.5a.75.75 0 01-1.5 0v-9.5A.75.75 0 0110 3zm-4.47 4.47a.75.75 0 011.06 0L10 10.88l3.41-3.41a.75.75 0 111.06 1.06l-3.94 3.94a.75.75 0 01-1.06 0L5.53 8.53a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}