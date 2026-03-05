import { useState, useRef, useEffect } from "react";
import {
  PlayIcon,
  FullscreenIcon,
  MuteIcon,
  UnmuteIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "~/components/Icons";
import { resolveMediaUrl } from "~/lib/payload";
import type { FeaturedSlide } from "~/lib/payload";

interface FeaturedCarouselProps {
  slides: FeaturedSlide[];
}

export default function FeaturedCarousel({ slides }: FeaturedCarouselProps) {
  if (!slides || slides.length === 0) return null;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const active = slides[activeIndex];
  const hasMultiple = slides.length > 1;
  const activeHasVertical = !!(
    (active.slideType === "video" && active.verticalVideo?.url) ||
    (active.slideType !== "video" && active.verticalImage?.url)
  );

  const goPrev = () => setActiveIndex((i) => (i === 0 ? slides.length - 1 : i - 1));
  const goNext = () => setActiveIndex((i) => (i === slides.length - 1 ? 0 : i + 1));

  useEffect(() => {
    if (!hasMultiple || isPaused) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i === slides.length - 1 ? 0 : i + 1));
    }, 6000);
    return () => clearInterval(id);
  }, [hasMultiple, isPaused, slides.length]);

  return (
    <section className="featured-carousel">
      <div className={`featured-carousel__inner${activeHasVertical ? " has-active-vertical" : ""}`}>
        {slides.map((slide, i) => (
          <CarouselSlide
            key={i}
            slide={slide}
            isActive={i === activeIndex}
            onPauseChange={setIsPaused}
          />
        ))}
      </div>

      {hasMultiple && (
        <div className="featured-carousel__controls">
          <button
            className="featured-carousel__nav featured-carousel__nav--prev"
            onClick={goPrev}
            aria-label="Previous slide"
            type="button"
          >
            <ChevronLeftIcon className="featured-carousel__nav-icon" />
          </button>
          <div className="featured-carousel__dots">
            {slides.map((_, i) => (
              <button
                key={i}
                className={`featured-carousel__dot${i === activeIndex ? " is-active" : ""}`}
                onClick={() => setActiveIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                type="button"
              />
            ))}
          </div>
          <button
            className="featured-carousel__nav featured-carousel__nav--next"
            onClick={goNext}
            aria-label="Next slide"
            type="button"
          >
            <ChevronRightIcon className="featured-carousel__nav-icon" />
          </button>
        </div>
      )}
    </section>
  );
}

function CarouselSlide({
  slide,
  isActive,
  onPauseChange,
}: {
  slide: FeaturedSlide;
  isActive: boolean;
  onPauseChange: (paused: boolean) => void;
}) {
  const isVideo = slide.slideType === "video";
  const isImage = slide.slideType === "image" || slide.slideType === "image-text";

  const wideVideoUrl = resolveMediaUrl(slide.wideVideo?.url);
  const wideVideoPreviewUrl = resolveMediaUrl(slide.wideVideoPreview?.url);
  const verticalVideoUrl = resolveMediaUrl(slide.verticalVideo?.url);
  const verticalVideoPreviewUrl = resolveMediaUrl(slide.verticalVideoPreview?.url);
  const wideImageUrl = resolveMediaUrl(slide.wideImage?.url);
  const verticalImageUrl = resolveMediaUrl(slide.verticalImage?.url);

  const hasVerticalVideo = !!verticalVideoUrl;
  const hasVerticalImage = !!verticalImageUrl;

  if (isVideo && wideVideoUrl) {
    return (
      <div
        className={`featured-carousel__slide${isActive ? " is-active" : ""}${hasVerticalVideo ? " has-vertical" : ""}`}
      >
        <div className="featured-carousel__media featured-carousel__media--wide">
          <VideoPlayer
            src={wideVideoUrl}
            preview={wideVideoPreviewUrl}
            isActive={isActive}
            onPauseChange={onPauseChange}
          />
        </div>
        {hasVerticalVideo && (
          <div className="featured-carousel__media featured-carousel__media--vertical">
            <VideoPlayer
              src={verticalVideoUrl}
              preview={verticalVideoPreviewUrl}
              isActive={isActive}
              onPauseChange={onPauseChange}
            />
          </div>
        )}
      </div>
    );
  }

  if (isImage && wideImageUrl) {
    const alt = slide.wideImage?.alt ?? "";
    return (
      <div
        className={`featured-carousel__slide${isActive ? " is-active" : ""}${hasVerticalImage ? " has-vertical" : ""}`}
      >
        <div className="featured-carousel__media featured-carousel__media--wide">
          <img src={wideImageUrl} alt={alt} />
        </div>
        {hasVerticalImage && (
          <div className="featured-carousel__media featured-carousel__media--vertical">
            <img src={verticalImageUrl} alt={slide.verticalImage?.alt ?? alt} />
          </div>
        )}
      </div>
    );
  }

  return null;
}

function VideoPlayer({
  src,
  preview,
  isActive,
  onPauseChange,
}: {
  src: string;
  preview?: string;
  isActive: boolean;
  onPauseChange: (paused: boolean) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [hasEverPlayed, setHasEverPlayed] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && playing) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive, playing]);

  function togglePlay() {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      onPauseChange(false);
    } else {
      videoRef.current.play();
      if (!hasEverPlayed) setHasEverPlayed(true);
      onPauseChange(true);
    }
    setPlaying(!playing);
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  }

  function requestFullscreen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!videoRef.current) return;
    const el = videoRef.current;
    if (el.requestFullscreen) el.requestFullscreen();
    else if ((el as HTMLVideoElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
      (el as HTMLVideoElement & { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
    }
  }

  return (
    <div className="featured-video" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        playsInline
        loop
        muted={muted}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {!hasEverPlayed && preview && (
        <img
          className="featured-video__preview"
          src={preview}
          alt=""
        />
      )}
      {!playing && (
        <button className="featured-video__play" aria-label="Play video" type="button" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
          <PlayIcon className="featured-video__play-icon" />
        </button>
      )}
      <button
        className="featured-video__control featured-video__control--fullscreen"
        aria-label="Fullscreen"
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); requestFullscreen(e); }}
      >
        <FullscreenIcon className="featured-video__control-icon" />
      </button>
      <button
        className="featured-video__control featured-video__control--mute"
        aria-label={muted ? "Unmute" : "Mute"}
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleMute(e); }}
      >
        {muted ? (
          <MuteIcon className="featured-video__control-icon" />
        ) : (
          <UnmuteIcon className="featured-video__control-icon" />
        )}
      </button>
    </div>
  );
}
