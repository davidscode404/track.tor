import Link from "next/link";
import { Sprout } from "lucide-react";

import { Button } from "@/components/ui/button";

const HERO_VIDEO_URL =
  "https://videos.pexels.com/video-files/4471213/4471213-uhd_2560_1440_30fps.mp4";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 size-full object-cover"
        aria-hidden
      >
        <source src={HERO_VIDEO_URL} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/50" aria-hidden />

      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 backdrop-blur-md mb-4">
          <Sprout className="size-5 text-emerald-400" />
          <span className="text-base font-semibold tracking-[0.15em] text-white uppercase">
            Track-Tor
          </span>
        </div>

        <h1 className="text-shadow-md text-shadow-zinc-900 text-4xl font-semibold tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-5xl">
          Intelligent crop fertilisation & irrigation planner
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/90 sm:text-xl">
          Select a location, crop type, check weather, and know the perfect time
          for your tasks.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-emerald-600 px-8 py-6 text-base font-medium text-black shadow-lg hover:bg-emerald-500"
          >
            <Link href="/map">Get Started</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
