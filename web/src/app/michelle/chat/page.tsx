import { MICHELLE_AI_ENABLED } from "@/lib/feature-flags";

import { MichelleChatClient } from "./chat-client";

export default function MichelleChatPage() {
  if (!MICHELLE_AI_ENABLED) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-3xl font-black text-slate-900">ミシェルAIは準備中です</h1>
        <p className="mt-4 text-sm text-slate-500">まもなく公開予定です。もうしばらくお待ちください。</p>
      </section>
    );
  }

  return <MichelleChatClient />;
}
