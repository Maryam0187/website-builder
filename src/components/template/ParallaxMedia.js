"use client";

import { useEffect, useRef } from "react";

/**
 * Image that shifts slower than scroll for a parallax depth effect.
 * Parent should clip overflow; image is scaled up so edges stay covered.
 */
export default function ParallaxMedia({
  src,
  alt = "",
  className = "",
  imgClassName = "",
  strength = 0.28,
}) {
  const wrapRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;

    function apply(y) {
      img.style.transform = `translate3d(0, ${y}px, 0) scale(1.18)`;
    }

    function update() {
      raf = 0;
      if (reduceMotion.matches) {
        apply(0);
        return;
      }
      const rect = wrap.getBoundingClientRect();
      const viewH = window.innerHeight || 1;
      const centerOffset = rect.top + rect.height / 2 - viewH / 2;
      apply(-centerOffset * strength);
    }

    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    reduceMotion.addEventListener?.("change", update);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      reduceMotion.removeEventListener?.("change", update);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [strength]);

  return (
    <div ref={wrapRef} className={`overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`h-full w-full object-cover will-change-transform ${imgClassName}`}
        style={{ transform: "translate3d(0, 0, 0) scale(1.18)" }}
      />
    </div>
  );
}
