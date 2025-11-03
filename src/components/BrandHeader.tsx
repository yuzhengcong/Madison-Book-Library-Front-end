import Image from "next/image";

export default function BrandHeader() {
  return (
    <header className="w-full border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-3 flex items-center gap-3">
        <Image
          src="/cornell_logo_simple_b31b1b.svg"
          alt="Cornell University seal"
          width={40}
          height={40}
          className="h-10 w-auto"
          priority
        />
        {/* Removed black text label as requested */}
      </div>
    </header>
  );
}