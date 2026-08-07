"use client";

import Reveal from "./Reveal";
import { DINEOS_DEFAULTS, getDineOsUrl } from "@/lib/dineos";
import { textStyle } from "./template-helpers";

/** Promotional / product section for restaurant & cafe sites. */
export default function DineOsSection({
  page,
  pageId = "dineos",
  theme: _theme,
  content,
  editable,
  handle,
  editMode = false,
  variant = "dark",
}) {
  const base = `pages.${pageId}`;
  const title = page?.title || DINEOS_DEFAULTS.title;
  const body = page?.body || DINEOS_DEFAULTS.body;
  const cta = page?.cta || DINEOS_DEFAULTS.cta;
  const eyebrow = page?.eyebrow || DINEOS_DEFAULTS.eyebrow;
  const points =
    Array.isArray(page?.points) && page.points.length
      ? page.points
      : DINEOS_DEFAULTS.points;
  const href = page?.href || getDineOsUrl();
  const light = variant === "light";
  const gold = "#c4a35a";
  const green = "#2f6f4e";

  return (
    <section
      id={pageId}
      className="relative overflow-hidden px-6 py-24"
      style={{
        background: light
          ? `linear-gradient(165deg, #f4f1ea 0%, #e8efe6 55%, #f4f1ea 100%)`
          : `linear-gradient(165deg, #0f1410 0%, #1a221c 48%, #0f1410 100%)`,
        color: light ? "#1a221c" : "#f4f1ea",
      }}
    >
      <div
        className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full blur-3xl"
        style={{ background: `${gold}33` }}
      />
      <div
        className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full blur-3xl"
        style={{ background: `${green}44` }}
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <p
              className={`text-xs font-semibold uppercase tracking-[0.28em] ${editable()}`}
              style={{ color: gold }}
              onClick={() =>
                handle?.(`${base}.eyebrow`, "DineOS eyebrow", "text", gold)
              }
            >
              {eyebrow}
            </p>
            <h1
              className={`mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight md:text-5xl ${editable()}`}
              style={textStyle(
                content,
                `${base}.title`,
                light ? "#1a221c" : "#f4f1ea",
              )}
              onClick={() =>
                handle?.(
                  `${base}.title`,
                  "DineOS title",
                  "text",
                  light ? "#1a221c" : "#f4f1ea",
                )
              }
            >
              {title}
            </h1>
            <p
              className={`mt-5 max-w-xl text-lg leading-8 ${editable()}`}
              style={{
                color: light ? "#5c6b64" : "#a8b0a4",
                ...textStyle(content, `${base}.body`, light ? "#5c6b64" : "#a8b0a4"),
              }}
              onClick={() =>
                handle?.(
                  `${base}.body`,
                  "DineOS description",
                  "textarea",
                  light ? "#5c6b64" : "#a8b0a4",
                )
              }
            >
              {body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex rounded-full px-7 py-3.5 text-sm font-semibold transition hover:brightness-110 ${editable()}`}
                style={{ background: gold, color: "#0f1410" }}
                onClick={(e) => {
                  if (editMode) {
                    e.preventDefault();
                    handle?.(`${base}.cta`, "DineOS button text", "text", "#0f1410");
                  }
                }}
              >
                {cta}
              </a>
              {editMode && (
                <button
                  type="button"
                  className="rounded-full border px-5 py-3 text-sm"
                  style={{
                    borderColor: light ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.25)",
                  }}
                  onClick={() => handle?.(`${base}.href`, "DineOS link URL", "text")}
                >
                  Edit DineOS link
                </button>
              )}
            </div>
            <p
              className="mt-4 text-xs tracking-wide"
              style={{ color: light ? "#7a8a80" : "#7a847c" }}
            >
              A Technonaire product · dine-in operating system
            </p>
          </Reveal>

          <div className="space-y-4">
            {points.map((point, index) => (
              <Reveal key={index} delay={index * 90}>
                <article
                  className="border p-5 backdrop-blur-sm"
                  style={{
                    borderColor: light ? "rgba(47,111,78,0.2)" : "rgba(196,163,90,0.28)",
                    background: light ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ background: green, color: "#f4f1ea" }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h2
                        className={`text-lg font-semibold ${editable()}`}
                        onClick={() =>
                          handle?.(
                            `${base}.points.${index}.title`,
                            "Point title",
                            "text",
                            light ? "#1a221c" : "#f4f1ea",
                          )
                        }
                      >
                        {point.title}
                      </h2>
                      <p
                        className={`mt-1.5 text-sm leading-6 ${editable()}`}
                        style={{ color: light ? "#5c6b64" : "#a8b0a4" }}
                        onClick={() =>
                          handle?.(
                            `${base}.points.${index}.description`,
                            "Point description",
                            "textarea",
                            light ? "#5c6b64" : "#a8b0a4",
                          )
                        }
                      >
                        {point.description}
                      </p>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
