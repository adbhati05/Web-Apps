"use client";

import { useRef, useState } from "react";
import { Origin, getRocksByOrigin } from "@/lib/rocks";
import OriginSection from "@/components/OriginSection";
import { BsArrowDown } from "react-icons/bs";

export default function Home() {
  const [activeOrigin, setActiveOrigin] = useState<Origin | null>(null);

  const intrusiveRef = useRef<HTMLElement>(null);
  const extrusiveRef = useRef<HTMLElement>(null);

  const handleSelect = (origin: Origin) => {
    // Updating the active origin state to match the origin that was selected.
    setActiveOrigin(origin);

    // Setting this ref to point to either the intrusive or extrusive section ref depending on what the user selected, this will be used to scroll to the correct section upon activation.
    const ref = origin === "intrusive" ? intrusiveRef : extrusiveRef;
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const intrusiveRocks = getRocksByOrigin("intrusive");
  const extrusiveRocks = getRocksByOrigin("extrusive");

  return (
    <main className="page">
      {/* Landing Page  */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          {/* The hero-grain and hero-orb classes are responsible for adding noise and texture to the background of the hero section. */}
          <div className="hero-grain" />
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>

        <div className="hero-content">
          <p className="hero-author">Project by Aditya Bhati</p>
          <h1 className="hero-title">
            Igneous
            <br />
            <span className="hero-title-secondary">Rock Gallery</span>
          </h1>
          <p className="hero-body">
            A brief introduction to igneous rocks.
          </p>

          <div className="origin-picker">
            <p className="origin-picker-label">Choose Origin</p>
            <div className="origin-btns">
              <button
                className={`origin-btn ${activeOrigin === "intrusive" ? "origin-btn--active" : ""}`}
                onClick={() => handleSelect("intrusive")}
              >
                Intrusive
              </button>
              <button
                className={`origin-btn ${activeOrigin === "extrusive" ? "origin-btn--active" : ""}`}
                onClick={() => handleSelect("extrusive")}
              >
                Extrusive
              </button>
            </div>
          </div>

          <div className="hero-scroll" aria-hidden="true">
            <BsArrowDown />
          </div>
        </div>
      </section>

      {/* Intrusive Rocks Section */}
      <OriginSection
        origin="intrusive"
        rocks={intrusiveRocks}
        sectionRef={intrusiveRef}
      />

      {/* Extrusive Rocks Section */}
      <OriginSection
        origin="extrusive"
        rocks={extrusiveRocks}
        sectionRef={extrusiveRef}
      />

      {/* Footer */}
      <footer className="site-footer">
        <p>&copy; {new Date().getFullYear()} Aditya Bhati. All rights reserved.</p>
      </footer>
    </main>
  );
}