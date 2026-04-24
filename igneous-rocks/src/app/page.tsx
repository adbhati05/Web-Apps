"use client";

import { useRef, useState } from "react";
import { Origin, getRocksByOrigin } from "@/lib/rocks";
import OriginSection from "@/components/OriginSection";

export default function Home() {
  const [activeOrigin, setActiveOrigin] = useState<Origin | null>(null);

  const intrusiveRef = useRef<HTMLElement>(null);
  const extrusiveRef = useRef<HTMLElement>(null);

  const handleSelect = (origin: Origin) => {
    setActiveOrigin(origin);
    const ref = origin === "intrusive" ? intrusiveRef : extrusiveRef;
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const intrusiveRocks = getRocksByOrigin("intrusive");
  const extrusiveRocks = getRocksByOrigin("extrusive");

  return (
    <main className="page">
      {/* ── HERO / LANDING ── */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-grain" />
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>

        <div className="hero-content">
          <p className="hero-eyebrow">Petrology Reference</p>
          <h1 className="hero-title">
            Igneous
            <br />
            <span className="hero-title-accent">Rock Gallery</span>
          </h1>
          <p className="hero-body">
            Explore the full spectrum of igneous rocks — from the depths of the
            mantle to volcanic surface flows — classified by composition and
            origin.
          </p>

          <div className="origin-picker">
            <p className="origin-picker-label">Choose Origin</p>
            <div className="origin-buttons">
              <button
                className={`origin-btn ${activeOrigin === "intrusive" ? "origin-btn--active" : ""}`}
                onClick={() => handleSelect("intrusive")}
              >
                <span className="origin-btn-icon">⬡</span>
                Intrusive
              </button>
              <button
                className={`origin-btn ${activeOrigin === "extrusive" ? "origin-btn--active" : ""}`}
                onClick={() => handleSelect("extrusive")}
              >
                <span className="origin-btn-icon">△</span>
                Extrusive
              </button>
            </div>
          </div>

          <div className="hero-scroll-hint" aria-hidden="true">
            <span>↓</span>
          </div>
        </div>
      </section>

      {/* ── INTRUSIVE SECTION ── */}
      <OriginSection
        origin="intrusive"
        rocks={intrusiveRocks}
        sectionRef={intrusiveRef}
      />

      {/* ── EXTRUSIVE SECTION ── */}
      <OriginSection
        origin="extrusive"
        rocks={extrusiveRocks}
        sectionRef={extrusiveRef}
      />

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <p>Igneous Rock Gallery · Petrology Reference</p>
      </footer>
    </main>
  );
}