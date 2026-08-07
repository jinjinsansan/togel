import Link from "next/link";

export const metadata = {
  title: "Togelについて | Togel",
  description: "Togel＝言いにくいことを、告げる。ミスマッチを先に伝える診断エンタメの物語。",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-ink text-white">
      {/* 01 ヒーロー */}
      <section
        className="bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(255,46,116,.24),transparent_62%)] px-5.5 pb-12 pt-[60px]"
        style={{ containerType: "inline-size" }}
      >
        <div className="mx-auto max-w-[760px]">
          <div className="text-[11px] font-black tracking-[0.3em] text-hazard">ABOUT TOGEL</div>
          <h1 className="mt-4 text-display" style={{ textWrap: "pretty" }}>
            言いにくいことを、
            <br />
            告げる。
          </h1>
          <p className="mt-5 max-w-[36em] text-[15px] leading-8 text-txt-muted">
            Togel（トゥゲル）＝告げる。40問のビッグファイブ診断であなたを24タイプに分類し、
            <strong className="font-bold text-white">絶対に合わない相手</strong>
            を先にお伝えするサービスです。
          </p>
        </div>
      </section>

      {/* 02 なぜ相性ではなく非相性なのか */}
      <section className="border-t border-line-soft bg-panel px-5.5 py-13">
        <div className="mx-auto max-w-[760px]">
          <div className="text-label text-primary">WHY MISMATCH?</div>
          <h2 className="mt-3.5 text-h1">
            なぜ相性ではなく、
            <br />
            非相性なのか。
          </h2>
          <p className="mt-5 max-w-[38em] text-sm leading-[2.1] text-txt-muted" style={{ textWrap: "pretty" }}>
            相性のいい人を教えてくれるサービスは、世の中に十分あります。でも思い出してください。人間関係で本当に困るのは、いい出会いの少なさよりも、
            <strong className="font-bold text-white">合わない相手とのやり過ごし方</strong>
            のほうです。上司も、親も、部活の後輩も、選べません。
          </p>
          <p className="mt-4 max-w-[38em] text-sm leading-[2.1] text-txt-muted" style={{ textWrap: "pretty" }}>
            だからTogelは順番を変えました。まず、あなたと合わない相手を名指しでお伝えします。付き合ったら起こる地獄のシナリオも、絶対にやってはいけないことも、先に。言いにくいことほど、先に知っていた方が、あなたの毎日は無事に済みます。
          </p>
        </div>
      </section>

      {/* 03 トーンの約束（ライト反転） */}
      <section className="bg-paper px-5.5 py-13 text-navy">
        <div className="mx-auto max-w-[760px]">
          <div className="inline-flex items-center gap-2 rounded-full bg-navy px-3.5 py-1.5">
            <span className="text-[11px] font-black tracking-[0.16em] text-relief">トーンの約束</span>
          </div>
          <h2 className="mt-4 text-h1">毒は、タイプに向ける。</h2>
          <p className="mt-5 max-w-[36em] text-base leading-[2.1] text-lighttext-muted" style={{ textWrap: "pretty" }}>
            Togelの診断結果は、ときどきかなり失礼です。ただしすべての毒は「24タイプ」という分類に向けたものであって、あなた個人や、実在する誰かに向けたものではありません。
          </p>
          <p className="mt-4 max-w-[36em] text-base leading-[2.1] text-lighttext-muted" style={{ textWrap: "pretty" }}>
            そしてもうひとつの約束。ボロクソに言ったあとは、必ず救います。合わない相手との付き合い方（地雷回避ガイド）まで用意しているのは、そのためです。突き放して終わる画面は、このサイトにはひとつもありません。
          </p>
        </div>
      </section>

      {/* 04 診断の中身 */}
      <section className="bg-ink px-5.5 py-13">
        <div className="mx-auto max-w-[760px]">
          <div className="text-label text-hazard">METHOD</div>
          <h2 className="mt-3.5 text-h1">診断の中身</h2>
          <p className="mt-5 max-w-[38em] text-sm leading-[2.1] text-txt-muted" style={{ textWrap: "pretty" }}>
            使っているのは、性格心理学で最も広く使われる
            <strong className="font-bold text-white">ビッグファイブ（5因子モデル）</strong>
            。開放性・誠実性・外向性・協調性・神経症傾向の5つを40問で測定し、その組み合わせから24タイプに分類します。ライト版（10問）もありますが、指摘の解像度は40問が段違いです。
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { title: "24タイプ図鑑", href: "/types", desc: "全タイプの特徴と「合わない相手」を公開中" },
              { title: "タイプ分布図", href: "/types/distribution", desc: "あなたのタイプは多数派か、少数派か" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-card border border-line bg-surface p-5 transition-colors hover:border-primary"
              >
                <div className="text-base font-black">{item.title}</div>
                <p className="mt-2 text-xs leading-[1.9] text-txt-muted">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 05 CTA */}
      <section className="bg-[radial-gradient(110%_90%_at_50%_0%,rgba(255,46,116,.3),#07090F_62%)] px-5.5 py-[60px] text-center">
        <h2 className="text-h1">
          では、告げます。
          <br />
          準備はいいですか。
        </h2>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/diagnosis/select"
            className="flex min-h-[58px] items-center justify-center rounded-full bg-hazard px-[34px] text-base font-black text-ink shadow-cta transition-colors hover:bg-white"
          >
            診断をはじめる
          </Link>
        </div>
        <p className="mt-[18px] text-[11px] text-txt-disabled">
          ※ エンタメ目的の診断です。18歳以上の方が対象です。
        </p>
      </section>
    </div>
  );
}
