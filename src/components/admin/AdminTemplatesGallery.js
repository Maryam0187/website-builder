"use client";

import Link from "next/link";
import { listTemplates } from "@/lib/templates";

export default function AdminTemplatesGallery({
  openBase = "/admin/templates",
  actionLabel = "Open template",
  description = "One-page previews by default. Assigned from business type at draft creation; clients can switch templates in the editor. Extra sections are added from the sites list (navbar).",
}) {
  const templates = listTemplates();

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
      <div className="border-b border-white/10 px-6 py-4">
        <h2 className="font-semibold">All templates</h2>
        <p className="mt-1 text-xs text-blue-200/80">{description}</p>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => {
          const href = openBase ? `${openBase}/${t.id}` : null;
          const cover = (
            <div
              className="relative aspect-[16/10] overflow-hidden"
              style={{ background: t.theme?.accent || "#111" }}
            >
              {t.heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.heroImage}
                  alt=""
                  className="h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-[1.03]"
                />
              ) : null}
              <div
                className="absolute inset-x-0 bottom-0 h-1/2"
                style={{
                  background: `linear-gradient(transparent, ${t.theme?.primary || "#000"}cc)`,
                }}
              />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-sm font-semibold text-white drop-shadow">{t.label}</p>
                <p className="text-[11px] text-white/80">{t.id}</p>
              </div>
            </div>
          );
          return (
            <article
              key={t.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#040b1a]/50"
            >
              {href ? (
                <Link href={href} className="group block">
                  {cover}
                </Link>
              ) : (
                <div className="group">{cover}</div>
              )}
              <div className="space-y-3 p-4">
                <p className="text-xs leading-5 text-blue-100">{t.description}</p>
                <div className="flex items-center gap-2">
                  {["primary", "accent", "text", "muted"].map((key) => (
                    <span
                      key={key}
                      title={key}
                      className="h-5 w-5 rounded-full border border-white/20"
                      style={{ background: t.theme?.[key] || "#333" }}
                    />
                  ))}
                </div>
                {href ? (
                  <Link
                    href={href}
                    className="inline-flex rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white"
                  >
                    {actionLabel}
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
