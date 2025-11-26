import Link from "next/link";

import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "プロフィール編集",
    description: "仕事・趣味・画像を更新してプロフィール充実度を上げましょう。",
    action: "編集する",
    href: "/mypage",
  },
  {
    title: "診断のやり直し",
    description: "最新の価値観を反映するために、いつでも診断を再実施できます。",
    action: "診断ページへ",
    href: "/diagnosis/select",
  },
  {
    title: "紹介リンク",
    description: "プロフィールが充実すると1位固定リンクが発行できます。LINEログイン後に利用可能です。",
    action: "Coming Soon",
    href: "#",
    disabled: true,
  },
];

const SettingsPage = () => {
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm font-semibold text-primary">Settings</p>
          <h1 className="font-heading text-4xl">設定・紹介リンク</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            LINEログイン実装までは機能の一部をサンプルとして表示しています。紹介リンクといたずらモードは後続タスクで追加されます。
          </p>
        </div>
        <div className="grid gap-4">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col justify-between rounded-2xl border border-border bg-white/80 p-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-semibold">{section.title}</h2>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
              <Button
                asChild
                variant={section.disabled ? "outline" : "secondary"}
                disabled={section.disabled}
                className="mt-4 sm:mt-0"
              >
                <Link href={section.href}>{section.action}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
