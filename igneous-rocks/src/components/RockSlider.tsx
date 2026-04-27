import { useRef, useEffect, useCallback, useState } from "react";
import { Rock, Origin } from "../lib/rocks";
import RockCard from "./RockCard";
import { BsChevronLeft, BsChevronRight, BsPause, BsPlay } from "react-icons/bs";

interface RockSliderProps {
  rocks: Rock[];
  origin: Origin;
}

export default function RockSlider({ rocks, origin }: RockSliderProps) {
  // Setting up a useRef hook to keep track of the scroll position of the slider track.
  const scrollRef = useRef<HTMLDivElement>(null);

  // Setting up a useRef hook to keep track of the timer for the auto-play feature.
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Setting up an index to keep track of the current index in the slider array. And 
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  const handleScrollEvent = () => {
    if (!scrollRef.current) return;

    // Setting up an array consisting of the rock cards in the slider.
    const children = Array.from(scrollRef.current.children);

    // Establishing the center of the slider track container (when the slider auto-scrolls or the user chooses to scroll, the current image will be at the center of the screen).
    const containerCenter = scrollRef.current.scrollLeft + scrollRef.current.clientWidth / 2;

    let closestIndex = 0;
    let minDistance = Infinity;

    // Looping through the rock cards to establish which card is closest to the center of the slider track container.
    children.forEach((child, index) => {
      const childElement = child as HTMLElement;
      const childCenter = childElement.offsetLeft + childElement.clientWidth / 2;
      const distance = Math.abs(childCenter - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // Updating activeIndexRef's current state to match the closest index if they're different (i.e. the slider has been scrolled to a new position).
    if (closestIndex !== activeIndexRef.current) {
      activeIndexRef.current = closestIndex;
      setActiveIndex(closestIndex);
    }
  };

  const handleScroll = useCallback((direction: "left" | "right") => {
    if (!scrollRef.current) return;

    const currentIndex = activeIndexRef.current;
    let nextIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;

    if (direction === "right" && nextIndex >= rocks.length) {
      nextIndex = 0;
    } else if (direction === "left" && nextIndex < 0) {
      return;
    }

    const children = Array.from(scrollRef.current.children);
    const targetChild = children[nextIndex] as HTMLElement;

    if (targetChild) {
      const scrollPosition = targetChild.offsetLeft - scrollRef.current.clientWidth / 2 + targetChild.clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollPosition, behavior: "smooth" });
    }
  }, [rocks.length]);

  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayInterval = 10000;

  const resetAutoPlay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isAutoPlaying) {
      timerRef.current = setInterval(() => {
        handleScroll("right");
      }, autoPlayInterval);
    }
  }, [handleScroll, isAutoPlaying]);

  useEffect(() => {
    resetAutoPlay();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resetAutoPlay]);

  const toggleAutoPlay = () => {
    setIsAutoPlaying((prev) => !prev);
  };

  const onManualScroll = (direction: "left" | "right") => {
    handleScroll(direction);
    resetAutoPlay();
  };

  return (
    <div className="slider-row">
      <div className="slider-header" style={{ justifyContent: "center" }}>
        <div className="slider-controls">
          <button
            className="slider-button"
            onClick={() => onManualScroll("left")}
            aria-label="Scroll Left"
          >
            <BsChevronLeft />
          </button>
          <button
            className="slider-button"
            onClick={() => onManualScroll("right")}
            aria-label="Scroll Right"
          >
            <BsChevronRight />
          </button>
          <button
            className="slider-button"
            aria-label={isAutoPlaying ? "Pause" : "Play"}
            onClick={toggleAutoPlay}
          >
            {isAutoPlaying ? <BsPause /> : <BsPlay />}
          </button>
        </div>
      </div>

      <div className="slider-track-container">
        <div
          className="slider-track"
          ref={scrollRef}
          onScroll={handleScrollEvent}
        >
          {rocks.map((rock, index) => (
            <RockCard key={rock.name} rock={rock} index={index} isActive={index === activeIndex} />
          ))}
        </div>
      </div>
    </div>
  );
}
