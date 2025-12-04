"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { RECOMMENDATIONS_ENABLED } from "@/lib/feature-flags";

import { RecommendationCard } from "./recommendation-card";

type RecommendationPayload = {
  id: string;
  reason: string;
  matchPercentage?: number | null;
  service: {
    name: string;
    description: string;
    imageUrl?: string | null;
    linkUrl: string;
    buttonText?: string | null;
  } | null;
};

type RecommendationsSectionProps = {
  togelType?: string | null;
  page: "result" | "mypage";
  heading?: string;
  subheading?: string;
};

export function RecommendationsSection({ togelType, page, heading, subheading }: RecommendationsSectionProps) {
  const [recommendations, setRecommendations] = useState<RecommendationPayload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!RECOMMENDATIONS_ENABLED || !togelType) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/recommendations/${togelType}?page=${page}`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!cancelled) {
          setRecommendations((data.recommendations ?? []) as RecommendationPayload[]);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setRecommendations([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [togelType, page]);

  if (!RECOMMENDATIONS_ENABLED || !togelType) return null;
  if (!loading && recommendations.length === 0) return null;

  const trackClick = (recommendationId: string) => {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ recommendationId, source: page })], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/recommendations/track", blob);
      return;
    }
    void fetch("/api/recommendations/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendationId, source: page }),
      keepalive: true,
    });
  };

  return (
    <section className="mt-12">
      <div className="mx-auto w-full max-w-5xl px-4 md:px-0">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[#E91E63]/70">SERVICE</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">{heading ?? "あなたにおすすめのサービス"}</h2>
          <p className="mt-2 text-sm text-slate-500">{subheading ?? "性格データをもとに厳選した特別な提案"}</p>
        </div>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#E91E63]" />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recommendations
              .filter(
                (rec): rec is RecommendationPayload & { service: NonNullable<RecommendationPayload["service"]> } =>
                  Boolean(rec.service)
              )
              .map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  service={rec.service}
                  reason={rec.reason}
                  matchPercentage={rec.matchPercentage}
                  onClickTracking={() => trackClick(rec.id)}
                />
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
