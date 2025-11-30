"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { ColorTheme, PRESET_COLORS, generateThemeFromColor, withAlpha } from "@/lib/color-theme"

const VARIANT_DEFAULTS: Record<"feminine" | "masculine", string> = {
  feminine: PRESET_COLORS["rose-gold"],
  masculine: PRESET_COLORS["onyx-blue"],
}

export interface TogelCertificateCardProps {
  nickname: string
  togelType: string
  togelLabel: string
  registrationDate: string
  variant?: "feminine" | "masculine"
  theme?: ColorTheme
  baseColor?: string
}

export function TogelCertificateCard({
  nickname,
  togelType,
  togelLabel,
  registrationDate,
  variant = "feminine",
  theme,
  baseColor,
}: TogelCertificateCardProps) {
  const resolvedTheme = useMemo(() => {
    if (theme) return theme
    if (baseColor) return generateThemeFromColor(baseColor)
    return generateThemeFromColor(VARIANT_DEFAULTS[variant])
  }, [theme, baseColor, variant])

  const [rotation, setRotation] = useState(0)
  const [isAutoRotating, setIsAutoRotating] = useState(true)
  const [rotationSpeed, setRotationSpeed] = useState(0.5)
  const [isDragging, setIsDragging] = useState(false)
  const lastX = useRef(0)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const animate = () => {
      if (isAutoRotating && !isDragging) {
        setRotation((prev) => (prev + rotationSpeed) % 360)
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isAutoRotating, isDragging, rotationSpeed])

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

  const handleEnd = () => setIsDragging(false)

  const controlButtonStyle = {
    background: resolvedTheme.controlBackground,
    borderColor: resolvedTheme.controlBorder,
    color: resolvedTheme.controlText,
  }

  const metalGradient = resolvedTheme.background
  const brushedMetal = resolvedTheme.brushed
  const sharpHighlight = resolvedTheme.highlight
  const edgeHighlight = `inset 0 1px 0 ${withAlpha("#ffffff", 0.6)}, inset 0 -1px 0 ${withAlpha(
    resolvedTheme.primary,
    0.5,
  )}`
  const cardShadow = resolvedTheme.glow
  const innerPanelBg = resolvedTheme.panel
  const borderColor = resolvedTheme.border
  const backSolidBase = resolvedTheme.backface

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {[
          { label: isAutoRotating ? "Stop" : "Auto", action: () => setIsAutoRotating((prev) => !prev) },
          { label: "Slow", action: () => setRotationSpeed((prev) => Math.max(prev - 0.3, -3)) },
          { label: "Fast", action: () => setRotationSpeed((prev) => Math.min(prev + 0.3, 3)) },
          { label: "Reverse", action: () => setRotationSpeed((prev) => -prev) },
        ].map((control) => (
          <button
            key={control.label}
            onClick={control.action}
            className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            style={controlButtonStyle}
          >
            {control.label}
          </button>
        ))}
      </div>

      <div
        className="relative w-[400px] md:w-[440px] aspect-[1.7/1] cursor-grab active:cursor-grabbing select-none"
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
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-xl overflow-hidden"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", boxShadow: cardShadow }}
          >
            <div className="absolute inset-0" style={{ background: metalGradient }} />
            <div className="absolute inset-0" style={{ background: brushedMetal }} />
            <div className="absolute inset-0" style={{ background: sharpHighlight }} />
            <div className="absolute inset-0 rounded-xl" style={{ boxShadow: edgeHighlight }} />

            <div
              className="absolute inset-2.5 rounded-lg overflow-hidden"
              style={{
                background: innerPanelBg,
                border: resolvedTheme.panelBorder,
                boxShadow: resolvedTheme.shadow,
              }}
            >
              <div className="absolute inset-0" style={{ background: brushedMetal, opacity: 0.4 }} />

              <div className="relative z-10 flex items-start justify-between px-5 pt-4 pb-2 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                      style={{
                        background: `linear-gradient(145deg, ${resolvedTheme.primary}, ${resolvedTheme.secondary})`,
                        boxShadow: "inset 0 1px 2px rgba(255,255,255,0.4), 0 1px 3px rgba(0,0,0,0.3)",
                      }}
                    >
                      T
                    </div>
                    <span className="text-sm font-bold tracking-wide" style={{ color: resolvedTheme.accent }}>
                      Togel
                    </span>
                  </div>
                  <span className="text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: resolvedTheme.textMuted }}>
                    Personality Certificate
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[8px] uppercase tracking-wider font-semibold block" style={{ color: resolvedTheme.textMuted }}>
                    Registered
                  </span>
                  <span className="text-[11px] font-bold tracking-wide" style={{ color: resolvedTheme.text }}>
                    {registrationDate}
                  </span>
                </div>
              </div>

              <div className="relative z-10 px-5 pt-1 pb-4 text-left">
                <div className="mb-3">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ color: resolvedTheme.textMuted }}>
                    Member
                  </span>
                  <h2
                    className="text-4xl font-serif font-bold tracking-tight leading-none mt-1"
                    style={{
                      color: resolvedTheme.text,
                      textShadow: "0 1px 2px rgba(0,0,0,0.25)",
                    }}
                  >
                    {nickname}
                  </h2>
                </div>

                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md"
                  style={{ background: resolvedTheme.chipBackground, border: resolvedTheme.chipBorder }}
                >
                  <span className="text-sm font-bold tracking-tight" style={{ color: resolvedTheme.chipText }}>
                    {togelType}
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: resolvedTheme.chipMuted }}>
                    / {togelLabel}
                  </span>
                </div>
              </div>

              <div
                className="absolute bottom-2.5 left-2.5 w-4 h-4"
                style={{
                  borderLeft: resolvedTheme.panelBorder,
                  borderBottom: resolvedTheme.panelBorder,
                  borderBottomLeftRadius: "4px",
                }}
              />
              <div
                className="absolute top-2.5 right-2.5 w-4 h-4"
                style={{
                  borderRight: resolvedTheme.panelBorder,
                  borderTop: resolvedTheme.panelBorder,
                  borderTopRightRadius: "4px",
                }}
              />
            </div>

            <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ border: borderColor }} />
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-xl overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              boxShadow: cardShadow,
            }}
          >
            <div className="absolute inset-0" style={{ background: backSolidBase }} />
            <div className="absolute inset-0" style={{ background: brushedMetal }} />
            <div className="absolute inset-0" style={{ background: sharpHighlight }} />
            <div className="absolute inset-0 rounded-xl" style={{ boxShadow: edgeHighlight }} />

            <div className="absolute inset-0 flex items-center justify-center">
              <h1
                className="text-6xl font-bold tracking-widest"
                style={{
                  color: resolvedTheme.text,
                  textShadow: `0 2px 6px ${withAlpha("#000000", 0.35)}`,
                }}
              >
                Togel
              </h1>
            </div>

            <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ border: borderColor }} />
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">Drag the card to rotate manually</p>
    </div>
  )
}
