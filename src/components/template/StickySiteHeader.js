"use client";

import { useEffect, useState } from "react";

/**
 * Sticky site nav shell: transparent at top, solid background after scroll
 * so page content does not show through the navbar.
 */
export default function StickySiteHeader({
  overlay = false,
  className = "",
  children,
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const base =
    "z-40 w-full sticky top-0 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-200";
  const surface = scrolled
    ? overlay
      ? "border-b border-white/10 bg-black/55 shadow-sm backdrop-blur-md"
      : "border-b border-black/10 bg-white/70 shadow-sm backdrop-blur-md"
    : overlay
      ? "border-b border-transparent bg-transparent"
      : "border-b border-transparent bg-transparent";

  return <div className={`${base} ${surface} ${className}`.trim()}>{children}</div>;
}
