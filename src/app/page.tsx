import BrandHeader from "@/components/BrandHeader";
import ChatBar from "@/components/ChatBar";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <BrandHeader />
      <main className="mx-auto max-w-5xl px-6">
        <section className="py-24 sm:py-28">
          <h1
            className="text-center text-3xl sm:text-4xl text-black"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Ask your Madison Book Library Chatbot
          </h1>

          <div className="mt-16 flex w-full items-center justify-center">
            <ChatBar />
          </div>
        </section>
      </main>
    </div>
  );
}
