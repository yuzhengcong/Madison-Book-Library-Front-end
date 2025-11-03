export default function BrandHeader() {
  return (
    <header className="w-full border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-red-700 flex items-center justify-center text-white font-bold">C</div>
        <span className="text-xl font-medium tracking-wide">Cornell University</span>
      </div>
    </header>
  );
}