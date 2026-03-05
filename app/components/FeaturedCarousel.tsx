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
  delay?: string;
}

export default function FeaturedCarousel({ slides, delay = "6" }: FeaturedCarouselProps) {
  if (!slides || slides.length === 0) return null;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const active = slides[activeIndex];
  const hasMultiple = slides.length > 1;
  const activeHasVertical = !!(
    (active.slideType === "video" && active.verticalVideo?.url) ||
    (active.slideType !== "video" && active.verticalImage?.url)
  );

  const goPrev = () => { setIsPaused(true); setActiveIndex((i) => (i === 0 ? slides.length - 1 : i - 1)); };
  const goNext = () => { setIsPaused(true); setActiveIndex((i) => (i === slides.length - 1 ? 0 : i + 1)); };

  const delayMs = delay === "off" ? null : parseInt(delay, 10) * 1000;

  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      setIsPaused(true);
      diff > 0 ? goNext() : goPrev();
    }
    touchStartX.current = null;
  }

  useEffect(() => {
    if (!hasMultiple || isPaused || delayMs === null) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i === slides.length - 1 ? 0 : i + 1));
    }, delayMs);
    return () => clearInterval(id);
  }, [hasMultiple, isPaused, delayMs, slides.length]);

  return (
    <section className="featured-carousel">
      <div
        className={`featured-carousel__inner${activeHasVertical ? " has-active-vertical" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, i) => (
          <CarouselSlide
            key={i}
            slide={slide}
            isActive={i === activeIndex}
            onPauseChange={setIsPaused}
            onVideoPlayingChange={setIsVideoPlaying}
          />
        ))}

        {/* Chevrons overlay the slide — hidden while a video is playing */}
        {hasMultiple && !isVideoPlaying && (
          <>
            <button
              className="featured-carousel__nav featured-carousel__nav--prev"
              onClick={goPrev}
              aria-label="Previous slide"
              type="button"
            >
              <ChevronLeftIcon className="featured-carousel__nav-icon" />
            </button>
            <button
              className="featured-carousel__nav featured-carousel__nav--next"
              onClick={goNext}
              aria-label="Next slide"
              type="button"
            >
              <ChevronRightIcon className="featured-carousel__nav-icon" />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="featured-carousel__controls">
          <div className="featured-carousel__dots">
            {slides.map((_, i) => (
              <button
                key={i}
                className={`featured-carousel__dot${i === activeIndex ? " is-active" : ""}`}
                onClick={() => { setIsPaused(true); setActiveIndex(i); }}
                aria-label={`Go to slide ${i + 1}`}
                type="button"
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CarouselSlide({
  slide,
  isActive,
  onPauseChange,
  onVideoPlayingChange,
}: {
  slide: FeaturedSlide;
  isActive: boolean;
  onPauseChange: (paused: boolean) => void;
  onVideoPlayingChange: (playing: boolean) => void;
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
            onVideoPlayingChange={onVideoPlayingChange}
          />
        </div>
        {hasVerticalVideo && (
          <div className="featured-carousel__media featured-carousel__media--vertical">
            <VideoPlayer
              src={verticalVideoUrl}
              preview={verticalVideoPreviewUrl}
              isActive={isActive}
              onPauseChange={onPauseChange}
              onVideoPlayingChange={onVideoPlayingChange}
            />
          </div>
        )}
      </div>
    );
  }

  if (isImage && wideImageUrl) {
    const alt = slide.wideImage?.alt ?? "";
    const hasOverlay = slide.slideType === "image-text" &&
      (slide.heading || slide.subtext || slide.button?.label);

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

        {hasOverlay && (
          <div className="featured-carousel__overlay">
            <div className="featured-carousel__overlay-tint" />
            <div className="featured-carousel__overlay-content">
              {slide.heading && (
                <h2 className="featured-carousel__overlay-heading">{slide.heading}</h2>
              )}
              {slide.subtext && (
                <p className="featured-carousel__overlay-subtext">{slide.subtext}</p>
              )}
              {slide.button?.label && slide.button?.url && (
                <a
                  href={slide.button.url}
                  className="btn btn--outline btn--lg"
                  target={slide.button.openInNewTab ? "_blank" : undefined}
                  rel={slide.button.openInNewTab ? "noopener noreferrer" : undefined}
                >
                  {slide.button.label}
                </a>
              )}
            </div>
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
  onVideoPlayingChange,
}: {
  src: string;
  preview?: string;
  isActive: boolean;
  onPauseChange: (paused: boolean) => void;
  onVideoPlayingChange: (playing: boolean) => void;
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
      onVideoPlayingChange(false);
    } else {
      videoRef.current.play();
      if (!hasEverPlayed) setHasEverPlayed(true);
      onPauseChange(true);
      onVideoPlayingChange(true);
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
    const el = videoRef.current as HTMLVideoElement & {
      webkitRequestFullscreen?: () => void;
      webkitEnterFullscreen?: () => void;
    };
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.webkitEnterFullscreen) {
      // iOS Safari — only works on <video> elements
      el.webkitEnterFullscreen();
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
        onPause={() => { setPlaying(false); onVideoPlayingChange(false); }}
      />
      {!hasEverPlayed && preview && (
        <img className="featured-video__preview" src={preview} alt="" />
      )}
      {!playing && (
        <button className="featured-video__play" aria-label="Play video" type="button" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
          <PlayIcon className="featured-video__play-icon" />
        </button>
      )}
      {playing && (
        <>
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
        </>
      )}
    </div>
  );
}
