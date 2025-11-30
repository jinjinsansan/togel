"use client"

import { useEffect, useRef, useState } from "react"

import {
  type ColorTheme,
  generateThemeFromColor,
  generateMetalGradient,
  generateBrushedMetal,
  generateSharpHighlight,
  generateEdgeHighlight,
  generateCardShadow,
} from "@/lib/color-theme"

interface TogelCertificateCardProps {
  variant?: "feminine" | "masculine"
  colorTheme?: ColorTheme
  baseColor?: string
  nickname: string
  togelType: string
  togelLabel: string
  registrationDate: string
}

const DEFAULT_COLORS = {
  feminine: "#f8bbd9",
  masculine: "#1a2538",
}

const AUTO_ROTATION_SPEED = 0.5

const isDarkHex = (hex: string) => {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return false
  const r = Number.parseInt(normalized.substring(0, 2), 16)
  const g = Number.parseInt(normalized.substring(2, 4), 16)
  const b = Number.parseInt(normalized.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5
}

export function TogelCertificateCard({
  variant = "feminine",
  colorTheme,
  baseColor,
  nickname,
  togelType,
  togelLabel,
  registrationDate,
}: TogelCertificateCardProps) {
  const resolvedTheme = colorTheme
    ? colorTheme
    : generateThemeFromColor(baseColor ?? DEFAULT_COLORS[variant])

  const isDark = baseColor ? isDarkHex(baseColor) : variant === "masculine"

  const [rotation, setRotation] = useState(0)
  const [isAutoRotating, setIsAutoRotating] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const lastX = useRef(0)
  const animationRef = useRef<number | null>(null)
  const toggleAutoRotation = () => setIsAutoRotating((prev) => !prev)
  const autoStateLabel = isAutoRotating ? "ON" : "OFF"

  useEffect(() => {
    const animate = () => {
      if (isAutoRotating && !isDragging) {
        setRotation((prev) => (prev + AUTO_ROTATION_SPEED) % 360)
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isAutoRotating, isDragging])

  const handleStart = (clientX: number) => {
    setIsDragging(true)
    lastX.current = clientX
  }

  const handleMove = (clientX: number) => {
    if (!isDragging) return
    const deltaX = clientX - lastX.current
    setRotation((prev) => (prev + deltaX * 0.5) % 360)
    lastX.current = clientX
  }

  const handleEnd = () => {
    setIsDragging(false)
  }

  const metalGradient = generateMetalGradient(resolvedTheme, isDark)
  const brushedMetal = generateBrushedMetal(isDark)
  const sharpHighlight = generateSharpHighlight(isDark)
  const edgeHighlight = generateEdgeHighlight(isDark)
  const cardShadow = generateCardShadow(resolvedTheme, isDark)
  const innerPanelBg = isDark ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.25)"
  const borderColor = `1.5px solid ${resolvedTheme.accent}50`

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex w-full justify-center">
        <button
          onClick={toggleAutoRotation}
          aria-pressed={isAutoRotating}
          className="flex min-w-[170px] items-center justify-between gap-3 rounded-full px-5 py-2 text-sm font-semibold tracking-wide transition-all"
          style={{
            backgroundColor: resolvedTheme.buttonBg,
            color: resolvedTheme.buttonText,
            border: `1px solid ${resolvedTheme.buttonBorder}`,
            opacity: isAutoRotating ? 1 : 0.75,
          }}
        >
          <span>Auto</span>
          <span className="text-xs font-bold">{autoStateLabel}</span>
        </button>
      </div>

      <div
        className="relative w-full max-w-full sm:max-w-[420px] md:max-w-[480px] lg:max-w-[520px] xl:max-w-[580px] aspect-[1.7/1] cursor-grab select-none active:cursor-grabbing"
        style={{ perspective: "1200px" }}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        <div
          className="relative w-full h-full"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          <div
            className="absolute inset-0 rounded-xl overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              boxShadow: cardShadow,
            }}
          >
            <div className="absolute inset-0" style={{ background: metalGradient }} />
            <div className="absolute inset-0" style={{ background: brushedMetal }} />
            <div className="absolute inset-0" style={{ background: sharpHighlight }} />
            <div className="absolute inset-0 rounded-xl" style={{ boxShadow: edgeHighlight }} />

            <div
              className="absolute inset-2.5 rounded-lg overflow-hidden"
              style={{
                background: innerPanelBg,
                border: isDark ? `1px solid ${resolvedTheme.accent}30` : `1px solid rgba(255,255,255,0.7)`,
                boxShadow: isDark
                  ? "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3)"
                  : "inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.03)",
              }}
            >
              <div className="absolute inset-0" style={{ background: brushedMetal, opacity: 0.5 }} />

              <div className="relative z-10 flex items-start justify-between px-5 pt-4 pb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                      style={{
                        background: `linear-gradient(145deg, ${resolvedTheme.accent} 0%, ${resolvedTheme.primary} 100%)`,
                        boxShadow: "inset 0 1px 2px rgba(255,255,255,0.4), 0 1px 3px rgba(0,0,0,0.3)",
                        color: isDark ? resolvedTheme.text : "white",
                      }}
                    >
                      T
                    </div>
                    <span className="text-sm font-bold tracking-wide" style={{ color: resolvedTheme.text }}>
                      Togel
                    </span>
                  </div>
                  <span
                    className="text-[9px] tracking-[0.15em] uppercase font-semibold ml-0.5"
                    style={{ color: resolvedTheme.textMuted }}
                  >
                    Personality Certificate
                  </span>
                </div>

                <div className="text-right">
                  <span
                    className="text-[8px] uppercase tracking-wider font-semibold block"
                    style={{ color: resolvedTheme.textMuted }}
                  >
                    Registered
                  </span>
                  <span className="text-[11px] font-bold tracking-wide" style={{ color: resolvedTheme.text }}>
                    {registrationDate}
                  </span>
                </div>
              </div>

              <div className="relative z-10 flex flex-col gap-3 px-5 pt-2 pb-5">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ color: resolvedTheme.textMuted }}>
                    Member
                  </span>
                  <h2
                    className="text-2xl font-serif font-bold tracking-tight leading-tight sm:text-3xl md:text-4xl"
                    style={{
                      color: resolvedTheme.text,
                      textShadow: isDark ? "0 1px 2px rgba(0,0,0,0.3)" : "0 1px 1px rgba(255,255,255,0.5)",
                      wordBreak: "break-word",
                    }}
                  >
                    {nickname}
                  </h2>
                </div>

                <div
                  className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-md px-3 py-1.5"
                  style={{
                    background: `${resolvedTheme.accent}20`,
                    border: `1px solid ${resolvedTheme.accent}50`,
                  }}
                >
                  <span className="text-sm font-bold tracking-tight" style={{ color: resolvedTheme.text }}>
                    {togelType}
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: resolvedTheme.textMuted }}>
                    / {togelLabel}
                  </span>
                </div>
              </div>

              <div
                className="absolute bottom-2.5 left-2.5 w-4 h-4"
                style={{
                  borderLeft: `1.5px solid ${resolvedTheme.accent}40`,
                  borderBottom: `1.5px solid ${resolvedTheme.accent}40`,
                  borderBottomLeftRadius: "4px",
                }}
              />
              <div
                className="absolute top-2.5 right-2.5 w-4 h-4"
                style={{
                  borderRight: `1.5px solid ${resolvedTheme.accent}30`,
                  borderTop: `1.5px solid ${resolvedTheme.accent}30`,
                  borderTopRightRadius: "4px",
                }}
              />
            </div>

            <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ border: borderColor }} />
          </div>

          <div
            className="absolute inset-0 rounded-xl overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              boxShadow: cardShadow,
            }}
          >
            <div className="absolute inset-0" style={{ background: metalGradient }} />
            <div className="absolute inset-0" style={{ background: brushedMetal }} />
            <div className="absolute inset-0" style={{ background: sharpHighlight }} />
            <div className="absolute inset-0 rounded-xl" style={{ boxShadow: edgeHighlight }} />

            <div className="absolute inset-0 flex items-center justify-center">
              <h1
                className="text-4xl font-bold tracking-widest sm:text-5xl md:text-6xl"
                style={{
                  color: resolvedTheme.text,
                  textShadow: isDark
                    ? "0 2px 4px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.15)"
                    : `0 2px 4px ${resolvedTheme.shadow}50, 0 1px 0 rgba(255,255,255,0.6)`,
                }}
              >
                Togel
              </h1>
            </div>

            <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ border: borderColor }} />
          </div>
        </div>
      </div>

      <p className="text-xs" style={{ color: resolvedTheme.textMuted }}>
        Drag the card to rotate manually
      </p>
    </div>
  )
}
