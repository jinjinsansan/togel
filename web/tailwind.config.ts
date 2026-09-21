import type { Config } from "tailwindcss";

/**
 * Togel 2026.08 リニューアル デザイントークン
 * 出典: デザイナー納品 tokens/tailwind.config.snippet.js + togel-tokens.json
 * 原則: ダーク＝毒 / ライト＝救い の2面構成。1画面に背景色は2つまで。
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.375rem",
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      screens: {
        // 背の低い画面（ストーリーズの見える高さが 700px 未満）。
        // 見える高さ ＝ 画面の高さ − 固定ヘッダー 66px なので、画面の高さ 766px 未満。
        // iPhone SE（667px）が該当し、390×844 は該当しない（承認を得た見た目は変えない）。
        short: { raw: "(max-height: 765.98px)" },
      },
      colors: {
        // shadcn系（既存UIコンポーネント互換）
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        pop: "hsl(var(--pop))",

        // ブランド
        primary: {
          DEFAULT: "#FF2E74",
          hover: "#ff5a92",
          light: "#E91E63", // ライト面の面（背景・ボタン）用。本文には ink を使う
          ink: "#D61556", // ライト面の本文用（paper 4.75 / white 5.12）
          foreground: "#ffffff",
        },
        // 黄黒（黄 #FFE03D ＋ 黒の縞）はオーナー判断で廃止（2026-09-21）。
        // 役割としての「注意」は残し、色だけブランドのピンクに寄せた。
        // text-ink を載せている箇所が29あるが、#FF2E74 の上でも 5.58:1 で本文基準を満たす。
        hazard: "#FF2E74",
        navy: "#0b1f3a",
        relief: { DEFAULT: "#4ade9b", ink: "#00734d" }, // ink はライト面専用（AA 4.9:1）
        // ダーク面（毒）
        ink: "#07090F",
        base: "#05070C",
        panel: "#0B0F1A",
        surface: { DEFAULT: "#0d111b", alt: "#141a26" },
        line: { DEFAULT: "#232b3d", soft: "#1c2333" },
        // subtle は旧値 #6b7488 だとどのダーク背景でも 4.5:1 に届かない（本文で使えない）
        txt: { DEFAULT: "#ffffff", muted: "#9aa5ba", subtle: "#818A9C", disabled: "#39415a" },
        // ライト面（救い）
        paper: "#F4F7F5",
        lightline: "#dde5e0",
        lighttext: { DEFAULT: "#0b1f3a", muted: "#3c4a63", subtle: "#5b6a83" },
        // トーナル面（カード背景）
        dangerbg: "#160d14",
        dangerline: "#3d1a2c",
        warnbg: "#151105",
        warnline: "#4a3c12",
        reliefbg: "#06231a",
        reliefline: "#14563f",
        // セマンティック
        error: "#ff5a5a",
        errortext: "#ff8f8f",
        linegreen: "#06C755",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "4xl": "2.5rem",
        chip: "8px",
        input: "12px",
        card: "16px",
        hero: "22px",
        sheet: "34px",
      },
      spacing: { 5.5: "1.375rem", 13: "3.25rem" },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        heading: ["var(--font-heading)", "sans-serif"],
      },
      fontSize: {
        display: [
          "clamp(34px,7.2cqw,62px)",
          { lineHeight: "1.16", letterSpacing: "-0.03em", fontWeight: "900" },
        ],
        h1: [
          "clamp(24px,3.6cqw,40px)",
          { lineHeight: "1.35", letterSpacing: "-0.02em", fontWeight: "900" },
        ],
        label: ["11px", { lineHeight: "1.4", letterSpacing: "0.22em", fontWeight: "900" }],
      },
      boxShadow: {
        card: "0 20px 40px -30px rgba(0,0,0,.9)",
        danger: "0 30px 60px -30px rgba(255,46,116,.6)",
        cta: "0 16px 40px -16px rgba(255,46,116,.8)",
        focusring: "0 0 0 3px rgba(255,46,116,.35)",
      },
      backgroundImage: {
        // 黄黒の縞はオーナー判断で廃止（2026-09-21）。帯そのものは意匠として残し、
        // 単色（bg-hazard）に置き換えた。ここに縞を戻さないこと。
        progress: "linear-gradient(90deg,#FF2E74,#ff6fa5)",
        logo: "linear-gradient(135deg,#ff6fa5,#FF2E74)",
        metal: "linear-gradient(135deg,#1b2540 0%,#0b1f3a 42%,#2a1420 70%,#0b1f3a 100%)",
      },
      transitionTimingFunction: { togel: "cubic-bezier(.2,.8,.2,1)" },
      keyframes: {
        float: {
          "0%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
          "100%": { transform: "translateY(0px)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        rise: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        flash: { "0%,100%": { background: "#160d14" }, "50%": { background: "#2a0f1c" } },
        sheen: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // すごろくの着地：音と振動を使わず「視覚の重さ」で手応えを返す
        "piece-land": {
          "0%": { transform: "scaleY(0.92)" },
          "100%": { transform: "scaleY(1)" },
        },
        "board-settle": {
          "0%": { transform: "translateY(0)" },
          "45%": { transform: "translateY(2px)" },
          "100%": { transform: "translateY(0)" },
        },
        "envelope-open": {
          from: { transform: "rotateX(0deg)" },
          to: { transform: "rotateX(-168deg)" },
        },
        "card-turn": {
          from: { transform: "rotateY(90deg)", opacity: "0" },
          to: { transform: "rotateY(0deg)", opacity: "1" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        marquee: "marquee 22s linear infinite",
        rise: "rise .45s cubic-bezier(.2,.8,.2,1) both",
        flash: "flash 1.6s ease-in-out infinite",
        sheen: "sheen 5s linear infinite",
        "piece-land": "piece-land 80ms ease-out 1",
        "board-settle": "board-settle 160ms ease-out 1",
        "envelope-open": "envelope-open .5s cubic-bezier(.2,.8,.2,1) both",
        "card-turn": "card-turn .5s cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
