"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_SIZES = [
  { label: "Auto", value: "", title: "Use template default" },
  { label: "Small", value: "0.875rem", title: "Small" },
  { label: "Medium", value: "1.125rem", title: "Medium" },
  { label: "Large", value: "1.25rem", title: "Large" },
  { label: "2XL", value: "1.875rem", title: "2XL" },
  { label: "3XL", value: "2.25rem", title: "3XL" },
];

const WEIGHT_OPTIONS = [
  { label: "Light", value: "300", title: "Light" },
  { label: "Medium", value: "500", title: "Medium" },
  { label: "Bold", value: "700", title: "Bold" },
];

function parseCustomSize(fontSize) {
  if (!fontSize) return { amount: "", unit: "px", isCustom: false };
  const preset = DEFAULT_SIZES.some((s) => s.value === fontSize);
  const match = String(fontSize).match(/^(\d+(?:\.\d+)?)(px|rem)$/);
  if (!match) return { amount: "", unit: "px", isCustom: !preset && Boolean(fontSize) };
  return {
    amount: match[1],
    unit: match[2],
    isCustom: !preset,
  };
}

export default function EditPanel({ draft, onClose, onSave }) {
  const [value, setValue] = useState("");
  const [color, setColor] = useState("");
  const [fontSize, setFontSize] = useState("");
  const [fontWeight, setFontWeight] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customUnit, setCustomUnit] = useState("px");
  const [saving, setSaving] = useState(false);

  const isTextEdit = draft?.type === "text" || draft?.type === "textarea";
  const parsed = useMemo(() => parseCustomSize(fontSize), [fontSize]);
  const isCustomSelected = parsed.isCustom;

  useEffect(() => {
    setValue(draft?.value ?? "");
    setColor(draft?.color || "");
    const nextSize = draft?.fontSize || "";
    setFontSize(nextSize);
    setFontWeight(draft?.fontWeight || "");
    const next = parseCustomSize(nextSize);
    setCustomAmount(next.isCustom ? next.amount : "");
    setCustomUnit(next.unit || "px");
  }, [draft]);

  if (!draft) return null;

  function applyCustomSize(amount, unit) {
    setCustomAmount(amount);
    setCustomUnit(unit);
    if (!amount) {
      setFontSize("");
      return;
    }
    setFontSize(`${amount}${unit}`);
  }

  async function save() {
    setSaving(true);
    let nextSize = fontSize || null;
    if (isCustomSelected && customAmount) {
      nextSize = `${customAmount}${customUnit}`;
    }
    if (isTextEdit) {
      await onSave({
        path: draft.path,
        value,
        color: color || null,
        fontSize: nextSize,
        fontWeight: fontWeight || null,
        styled: true,
      });
    } else {
      await onSave({ path: draft.path, value, styled: false });
    }
    setSaving(false);
  }

  const sizeLabel =
    DEFAULT_SIZES.find((o) => o.value === fontSize)?.title ||
    (fontSize ? `Custom · ${fontSize}` : "Default");

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-y-auto border-t border-black/10 bg-white p-4 text-zinc-900 shadow-2xl md:inset-x-auto md:right-6 md:bottom-6 md:w-[420px] md:rounded-2xl md:border">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">{draft.label}</h3>
        <button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-800">
          Close
        </button>
      </div>

      {draft.type === "textarea" ? (
        <textarea
          className="min-h-28 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 caret-zinc-900"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{
            // Always black in the editor — site colors (often white) are invisible on this panel
            color: "#18181b",
            fontSize: fontSize || undefined,
            fontWeight: fontWeight || undefined,
          }}
        />
      ) : draft.type === "color" ? (
        <div className="flex items-center gap-3">
          <input type="color" value={value || "#1a5f4a"} onChange={(e) => setValue(e.target.value)} />
          <input
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      ) : (
        <input
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 caret-zinc-900"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={draft.type === "image" ? "https://... or /uploads/..." : ""}
          style={
            draft.type === "text"
              ? {
                  color: "#18181b",
                  fontSize: fontSize || undefined,
                  fontWeight: fontWeight || undefined,
                }
              : undefined
          }
        />
      )}

      {isTextEdit && (
        <div className="mt-4 space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold tracking-wide text-zinc-600 uppercase">Text style</p>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color || "#14201c"}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded border border-zinc-300 bg-white"
              />
              <input
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                value={color}
                placeholder="Default color"
                onChange={(e) => setColor(e.target.value)}
              />
              {color && (
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-zinc-600 underline"
                  onClick={() => setColor("")}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-800">Size</label>
              <span className="text-xs text-zinc-500">{sizeLabel}</span>
            </div>

            <p className="mb-2 text-xs text-zinc-500">Default sizes</p>
            <div className="grid grid-cols-3 gap-2">
              {DEFAULT_SIZES.map((opt) => {
                const active = fontSize === opt.value && !isCustomSelected;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    title={opt.title}
                    onClick={() => {
                      setFontSize(opt.value);
                      setCustomAmount("");
                      setCustomUnit("px");
                    }}
                    className={`rounded-lg border px-2 py-2.5 text-xs font-semibold ${
                      active
                        ? "border-[#1a5f4a] bg-[#1a5f4a] text-white"
                        : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3">
              <p className="mb-2 text-sm font-medium text-zinc-800">Custom size</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="8"
                  max="200"
                  step="1"
                  placeholder="e.g. 22"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
                  value={customAmount}
                  onChange={(e) => applyCustomSize(e.target.value, customUnit)}
                />
                <select
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900"
                  value={customUnit}
                  onChange={(e) => applyCustomSize(customAmount, e.target.value)}
                >
                  <option value="px">px</option>
                  <option value="rem">rem</option>
                </select>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Type a number for a custom size, or pick a default above.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800">Weight</label>
            <div className="grid grid-cols-3 gap-2">
              {WEIGHT_OPTIONS.map((opt) => {
                const active = fontWeight === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.title}
                    onClick={() => setFontWeight(opt.value)}
                    className={`rounded-lg border px-2 py-2.5 text-xs ${
                      active
                        ? "border-[#1a5f4a] bg-[#1a5f4a] text-white"
                        : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400"
                    }`}
                    style={{ fontWeight: opt.value }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {fontWeight && (
              <button
                type="button"
                className="mt-2 text-xs font-medium text-zinc-600 underline"
                onClick={() => setFontWeight("")}
              >
                Reset to default weight
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="mt-4 w-full rounded-full bg-[#1a5f4a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save change"}
      </button>
    </div>
  );
}
