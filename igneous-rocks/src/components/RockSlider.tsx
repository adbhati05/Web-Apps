import { useRef } from "react";
import { Rock, Origin } from "../lib/rocks";
import RockCard from "./RockCard";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";

interface RockSliderProps {
  rocks: Rock[];
  origin: Origin;
}

export default function RockSlider({ rocks, origin }: RockSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 532; // 500px card + 2rem gap
    scrollRef.current.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="slider-row">
      <div className="slider-header" style={{ justifyContent: "center" }}>
        <div className="slider-controlls">
          <button
            className="slider-button"
            onClick={() => handleScroll("left")}
            aria-label="Scroll Left"
          >
            <BsChevronLeft />
          </button>
          <button
            className="slider-button"
            onClick={() => handleScroll("right")}
            aria-label="Scroll Right"
          >
            <BsChevronRight />
          </button>
        </div>
      </div>

      <div className="slider-track-container" ref={scrollRef}>
        <div className="slider-track">
          {rocks.map((rock, index) => (
            <RockCard key={rock.name} rock={rock} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
