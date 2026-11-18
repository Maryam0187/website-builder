"use client";

import { useEffect, useState } from "react";

/**
 * Sticky site nav. Always has a background so the links stay readable
 * over the page, including inside a scrolling preview panel.
 */
export default function StickySiteHeader({
  overlay = false,
  className = "",
  children,
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const node = document.querySelector("[data-settings-scroll]") || window;
    function onScroll() {
      const top = node === window ? window.scrollY : node.scrollTop;
      setScrolled(top > 12);
    }
    onScroll();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, []);

  const base =
    "z-40 w-full sticky top-0 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-200";
  const surface = overlay
    ? scrolled
      ? "border-b border-white/15 bg-[#07111f] shadow-md"
      : "border-b border-white/10 bg-[#07111f]/95 backdrop-blur-md"
    : scrolled
      ? "border-b border-black/10 bg-white shadow-md"
      : "border-b border-black/10 bg-white/95 backdrop-blur-md";

  return <div className={`${base} ${surface} ${className}`.trim()}>{children}</div>;
}
