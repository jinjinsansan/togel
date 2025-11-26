import Image from "next/image";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { mockProfiles } from "@/data/mock-profiles";

type Params = {
  id: string;
};

const ProfileDetailPage = ({ params }: { params: Params }) => {
  const profile = mockProfiles.find((item) => item.id === params.id);
  if (!profile) {
    notFound();
  }

  const infoItems = [
    { label: "自己紹介", value: profile.bio },
    { label: "好きなこと", value: profile.favoriteThings },
    { label: "趣味", value: profile.hobbies },
    { label: "特技", value: profile.specialSkills },
    { label: "価値観", value: profile.values },
    { label: "コミュ力", value: profile.communication },
  ];

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-border bg-white/90 p-8 shadow-card">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative h-32 w-32">
              <Image
                src={profile.avatarUrl}
                alt={profile.nickname}
                fill
                sizes="128px"
                className="rounded-full border border-border object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">{profile.animalType}</p>
              <h1 className="mt-1 text-3xl font-heading">
                {profile.nickname} さん ({profile.age}歳)
              </h1>
              <p className="text-muted-foreground">{profile.job} / {profile.city}</p>
            </div>
            <Button variant="secondary" className="rounded-full px-6">
              マッチング希望を送る
            </Button>
          </div>
          <div className="mt-8 space-y-4">
            {infoItems.map((item) => (
              <div key={item.label} className="rounded-2xl bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-base text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDetailPage;
