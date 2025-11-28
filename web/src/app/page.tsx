import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-white to-white">
      <div className="container flex flex-col items-center gap-10 py-24 text-center">
        <div className="space-y-6">
          <p className="font-heading text-[clamp(4rem,12vw,12rem)] leading-none text-primary">
            <span className="block font-semibold">Togel</span>
            <span className="mt-12 block font-semibold">診断</span>
          </p>
          <p className="text-base text-muted-foreground">
            あなたの本音と相性が一瞬でわかる、24タイプ性格診断。
          </p>
        </div>
        <Button size="lg" className="h-14 rounded-full px-10 text-lg" asChild>
          <Link href="/diagnosis/select">LINEで始める</Link>
        </Button>
      </div>
    </main>
  );
}
