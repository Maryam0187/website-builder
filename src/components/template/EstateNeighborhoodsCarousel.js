"use client";

import { useEffect, useMemo, useState } from "react";

function useVisibleCount() {
  const [count, setCount] = useState(3);

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w < 640) setCount(1);
      else if (w < 1024) setCount(2);
      else setCount(3);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return count;
}

export default function EstateNeighborhoodsCarousel({
  items = [],
  base,
  theme,
  editable,
  handle,
}) {
  const visible = useVisibleCount();
  const [page, setPage] = useState(0);

  const pages = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < items.length; i += visible) {
      chunks.push(items.slice(i, i + visible).map((item, j) => ({ item, index: i + j })));
    }
    return chunks;
  }, [items, visible]);

  const maxPage = Math.max(0, pages.length - 1);

  useEffect(() => {
    setPage((p) => Math.min(p, maxPage));
  }, [maxPage]);

  if (!items.length) return null;

  return (
    <div className="mt-10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/45">
          Browse areas
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous neighborhoods"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-white/40 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M10 3L5 8l5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next neighborhoods"
            disabled={page >= maxPage}
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-white/40 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M6 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {pages.map((chunk, pageIndex) => (
            <div
              key={pageIndex}
              className="grid w-full shrink-0 gap-4"
              style={{
                gridTemplateColumns: `repeat(${visible}, minmax(0, 1fr))`,
              }}
            >
              {chunk.map(({ item, index }) => (
                <button
                  key={index}
                  type="button"
                  className={`group relative overflow-hidden text-left ${editable()}`}
                  onClick={() =>
                    handle(`${base}.items.${index}.image`, "Gallery image URL", "image")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    className="tpl-img-zoom aspect-[3/4] h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 pb-4 pt-16">
                    <span className="mb-1 block h-px w-8" style={{ background: theme.primary }} />
                    <span
                      className={`block text-sm font-medium text-white ${editable()}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handle(
                          `${base}.items.${index}.caption`,
                          "Neighborhood caption",
                          "text",
                          "#ffffff",
                        );
                      }}
                    >
                      {item.caption}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {maxPage > 0 && (
        <div className="mt-6 flex justify-center gap-2">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to neighborhood slide ${i + 1}`}
              aria-current={i === page ? "true" : undefined}
              onClick={() => setPage(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === page ? 28 : 8,
                background: i === page ? theme.primary : "rgba(255,255,255,0.28)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
