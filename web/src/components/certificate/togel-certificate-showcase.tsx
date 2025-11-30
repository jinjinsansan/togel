"use client"

import { useEffect, useState } from "react"

import { ColorTheme, PRESET_COLORS, generateThemeFromColor } from "@/lib/color-theme"

import { TogelCertificateCard } from "./togel-certificate-card"

const PRESET_OPTIONS = [
  { id: "rose-gold", label: "Rose Gold", color: PRESET_COLORS["rose-gold"] },
  { id: "onyx-blue", label: "Onyx Blue", color: PRESET_COLORS["onyx-blue"] },
  { id: "silver", label: "Platinum", color: PRESET_COLORS.silver },
  { id: "gold", label: "Champagne Gold", color: PRESET_COLORS.gold },
  { id: "emerald", label: "Emerald", color: PRESET_COLORS.emerald },
  { id: "royal", label: "Royal Purple", color: PRESET_COLORS.royal },
  { id: "copper", label: "Copper", color: PRESET_COLORS.copper },
  { id: "obsidian", label: "Obsidian", color: PRESET_COLORS.obsidian },
]

const STORAGE_KEY = "togel-certificate-color"

export function TogelCertificateShowcase() {
  const [customColor, setCustomColor] = useState(() => {
    if (typeof window === "undefined") return PRESET_OPTIONS[0].color
    return window.localStorage.getItem(STORAGE_KEY) ?? PRESET_OPTIONS[0].color
  })
  const [selectedPreset, setSelectedPreset] = useState(() => {
    if (typeof window === "undefined") return PRESET_OPTIONS[0].id
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return PRESET_OPTIONS[0].id
    const preset = PRESET_OPTIONS.find((option) => option.color.toLowerCase() === stored.toLowerCase())
    return preset ? preset.id : "custom"
  })
  const [theme, setTheme] = useState<ColorTheme>(() => {
    if (typeof window === "undefined") return generateThemeFromColor(PRESET_OPTIONS[0].color)
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return generateThemeFromColor(stored ?? PRESET_OPTIONS[0].color)
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, customColor)
  }, [customColor])

  const handlePresetSelect = (presetId: string, color: string) => {
    setSelectedPreset(presetId)
    setCustomColor(color)
    setTheme(generateThemeFromColor(color))
  }

  const handleColorInput = (value: string) => {
    setSelectedPreset("custom")
    setCustomColor(value)
    setTheme(generateThemeFromColor(value))
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <p className="text-xs font-semibold tracking-[0.5em] text-slate-400 uppercase">Togel Premium</p>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 tracking-tight text-balance">
          Interactive Personality Certificate
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          カラーピッカーやプリセットを使って、カード全体のメタル質感・ハイライト・影までワンクリックでカスタマイズできます。
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 flex justify-center">
          <TogelCertificateCard
            nickname="Mika"
            togelType="Togel 05"
            togelLabel="Passionate Leader"
            registrationDate="2025.11.30"
            theme={theme}
          />
        </div>

        <div className="w-full lg:w-72 bg-white/80 backdrop-blur rounded-3xl border border-slate-200/60 p-5 space-y-6 shadow-lg">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Base Color</p>
            <div className="flex items-center gap-3 mt-3">
              <input
                type="color"
                className="h-12 w-12 rounded-full border border-slate-200 shadow-inner cursor-pointer"
                value={customColor}
                onChange={(event) => handleColorInput(event.target.value)}
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">{selectedPreset === "custom" ? "Custom" : PRESET_OPTIONS.find((p) => p.id === selectedPreset)?.label}</p>
                <p className="text-xs text-slate-400 font-mono">{customColor.toUpperCase()}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Preset Themes</p>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_OPTIONS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id, preset.color)}
                  className={`h-12 rounded-2xl border transition-all ${
                    selectedPreset === preset.id ? "ring-2 ring-offset-2 ring-slate-900" : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ background: preset.color, borderColor: preset.color }}
                  aria-label={preset.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-600">
            <p>・プライマリカラーからライト/ダークトーンを自動生成</p>
            <p>・ハイライトやブラッシュドメタル効果も自動調整</p>
            <p>・テーマはローカルに保存され、次回も継続します</p>
          </div>
        </div>
      </div>
    </div>
  )
}
