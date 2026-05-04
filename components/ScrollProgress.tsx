"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Mini barre de progression scroll en haut de page (signature subtile).
// 2px, gradient HumaniX. Disparait en prefers-reduced-motion (bouge pas).
//
// A11y : aria-hidden, purement decoratif. La progression scroll est
// deja fournie par le navigateur.

import { useEffect, useState } from "react";

export default function ScrollProgress() {
  const [pct, setPct] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia) {
      setReducedMotion(
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
    }
    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight =
        (document.documentElement.scrollHeight || 1) - window.innerHeight;
      const ratio =
        scrollHeight > 0 ? Math.min(1, scrollTop / scrollHeight) : 0;
      setPct(ratio * 100);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-1 left-0 right-0 z-50 h-0.5 pointer-events-none"
    >
      <div
        className="h-full bg-humanix-hero transition-[width] duration-100 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
