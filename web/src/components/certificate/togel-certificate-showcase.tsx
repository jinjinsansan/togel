"use client"

import { useMemo, useState, useSyncExternalStore } from "react"

import { TogelCertificateCard } from "./togel-certificate-card"
import { generateThemeFromColor, presetColors } from "@/lib/color-theme"

const STORAGE_KEY = "togel-card-color"
const DEFAULT_COLOR = "#f8bbd9"

let colorState = DEFAULT_COLOR
const listeners = new Set<() => void>()

if (typeof window !== "undefined") {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored) {
    colorState = stored
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => colorState
const getServerSnapshot = () => DEFAULT_COLOR

const setColorState = (color: string) => {
  colorState = color
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, color)
  }
  listeners.forEach((listener) => listener())
}

export function TogelCertificateShowcase() {
  const selectedColor = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const normalizedSelected = selectedColor.toLowerCase()
  const [customInput, setCustomInput] = useState<string | null>(null)

  const handleColorChange = (color: string) => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return
    setColorState(color)
    setCustomInput(null)
  }

  const handleTextChange = (value: string) => {
    if (!/^#[0-9A-Fa-f]{0,6}$/.test(value)) return
    setCustomInput(value)
    if (value.length === 7) {
      handleColorChange(value)
    }
  }

  const displayedHex = (customInput ?? selectedColor).toUpperCase()
  const theme = useMemo(() => generateThemeFromColor(selectedColor), [selectedColor])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4 tracking-tight text-balance">
          Togel Personality Certificate
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">あなただけの診断結果を、プレミアムカードでお届けします</p>
      </div>

      <div className="flex flex-col items-center gap-6 mb-10">
        <div className="flex flex-wrap justify-center gap-3">
          {presetColors.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleColorChange(preset.color)}
              className="group relative"
              title={preset.name}
            >
              <div
                className={`w-10 h-10 rounded-full transition-all duration-200 ${
                  normalizedSelected === preset.color.toLowerCase()
                    ? "ring-2 ring-offset-2 ring-slate-900 scale-110"
                    : "hover:scale-105"
                }`}
                style={{
                  background: preset.isDark
                    ? `linear-gradient(145deg, ${preset.color} 0%, #000 100%)`
                    : `linear-gradient(145deg, #fff 0%, ${preset.color} 100%)`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.3)",
                }}
              />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {preset.name}
              </span>
            </button>
          ))}
        </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4 w-full">
        <label className="text-sm text-slate-600 font-medium">Custom Color:</label>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
          <div className="relative">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-slate-200 hover:border-slate-300 transition-colors"
              style={{ padding: 0 }}
            />
          </div>
          <input
            type="text"
            value={displayedHex}
            onChange={(e) => handleTextChange(e.target.value)}
            className="w-full sm:w-24 px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="#FFFFFF"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-xs text-slate-500">Theme Preview:</span>
          <div className="flex gap-1">
            {[theme.primary, theme.secondary, theme.accent, theme.text, theme.textMuted].map((color, index) => (
              <div key={`${color}-${index}`} className="w-6 h-6 rounded-md border border-slate-200" style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="transition-all duration-700 ease-out transform hover:scale-[1.02]">
          <TogelCertificateCard
            baseColor={selectedColor}
            nickname="Mika"
            togelType="Togel-05type"
            togelLabel="Passionate Leader"
            registrationDate="2025.11.30"
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mt-12">
        {["ホログラム認証", "プレミアム仕上げ", "カスタムカラー"].map((feature) => (
          <div
            key={feature}
            className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-slate-200/50 text-sm text-slate-600"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            {feature}
          </div>
        ))}
      </div>
    </div>
  )
}
