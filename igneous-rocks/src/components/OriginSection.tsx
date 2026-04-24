import {
  origins,
  Origin,
  Rock,
} from "../lib/rocks";
import RockSlider from "./RockSlider";

interface OriginSectionProps {
  origin: Origin;
  rocks: Rock[];
  sectionRef: React.RefObject<HTMLElement | null>;
}

export default function OriginSection({
  origin,
  rocks,
  sectionRef,
}: OriginSectionProps) {
  return (
    <section ref={sectionRef} className="origin-section" data-origin={origin}>
      <div className="origin-header">
        <div className="origin-title-container">
          <span className="origin-dot" data-origin={origin} />
          <h2 className="origin-title">
            {origin.charAt(0).toUpperCase() + origin.slice(1)} Rocks
          </h2>
        </div>
        <div className="origin-description-container">
          <p className="origin-description">
            {origins.find((o) => o.origin === origin)?.description}
          </p>
        </div>
      </div>

      <div className="sliders-stack">
        <RockSlider rocks={rocks} origin={origin} />
      </div>
    </section>
  );
}
