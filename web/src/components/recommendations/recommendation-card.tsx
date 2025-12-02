import Image from "next/image";
import { ImageIcon } from "lucide-react";

type ServicePayload = {
  name: string;
  description: string;
  imageUrl?: string | null;
  linkUrl: string;
  buttonText?: string | null;
};

type RecommendationCardProps = {
  service: ServicePayload;
  reason: string;
  matchPercentage?: number | null;
  onClickTracking?: () => void;
};

export function RecommendationCard({ service, reason, matchPercentage, onClickTracking }: RecommendationCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#E91E63] hover:shadow-xl">
      <div className="relative h-48 overflow-hidden">
        {service.imageUrl ? (
          <Image
            src={service.imageUrl}
            alt={service.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
        <div className="absolute right-3 top-3 rounded-full bg-[#E91E63] px-3 py-1 text-xs font-bold text-white">
          相性 {matchPercentage ?? "-"}%
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{service.name}</h3>
          <p className="mt-1 text-sm text-slate-600 line-clamp-2">{service.description}</p>
        </div>
        <div className="rounded-xl border border-pink-100 bg-pink-50/70 p-3">
          <p className="text-xs font-semibold text-[#E91E63]">あなたにおすすめの理由</p>
          <p className="mt-1 text-sm text-slate-700">{reason}</p>
        </div>
        <a
          href={service.linkUrl}
          target="_blank"
          rel="noreferrer"
          onClick={onClickTracking}
          className="block w-full rounded-full bg-gradient-to-r from-[#E91E63] to-[#D81B60] py-3 text-center text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:scale-[1.01] hover:shadow-lg"
        >
          {service.buttonText || "詳しく見る"}
        </a>
      </div>
    </div>
  );
}
