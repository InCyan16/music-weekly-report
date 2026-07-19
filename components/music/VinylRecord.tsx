"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { calcSceneHeight, calcSceneWidth } from "@/lib/ui/vinyl-layout";

/** 60° — 接近平视 */
const VINYL_TILT_DEG = 60;
const VINYL_EDGE_DEPTH = 7;

const VINYL_NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

type VinylRecordProps = {
  coverUrl?: string | null;
  isPlaying: boolean;
  size?: number;
  title?: string;
  rank?: number;
  className?: string;
  onClick?: () => void;
  rotationDeg?: number;
  isScrubbing?: boolean;
  view3d?: boolean;
};

function DiscSurface({
  size,
  coverUrl,
  title,
}: {
  size: number;
  coverUrl?: string | null;
  title?: string;
}) {
  const labelSize = size * 0.35;
  const holeSize = size * 0.06;
  const holeRing = size * 0.085;

  return (
    <>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, #1e1e1e 0%, #121212 55%, #0a0a0a 100%)
          `,
        }}
      />

      <div
        className="absolute inset-0 rounded-full opacity-35 mix-blend-overlay"
        style={{
          background: `repeating-radial-gradient(
            circle at 50% 50%,
            transparent 0px,
            transparent 0.7px,
            rgba(255,255,255,0.05) 0.7px,
            rgba(0,0,0,0.07) 1.4px
          )`,
        }}
      />

      {[8, 16, 24, 32, 40].map((inset) => (
        <div
          key={inset}
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: `${inset}%`,
            boxShadow:
              "inset 0 0.5px 0 rgba(255,255,255,0.08), inset 0 -0.5px 0 rgba(0,0,0,0.15)",
          }}
        />
      ))}

      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%,
            transparent 86%,
            rgba(0,0,0,0.1) 92%,
            rgba(255,255,255,0.03) 95%,
            rgba(0,0,0,0.18) 98%,
            rgba(35,35,35,0.45) 100%
          )`,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 rounded-full opacity-[0.15] mix-blend-soft-light"
        style={{ backgroundImage: VINYL_NOISE, backgroundSize: "96px 96px" }}
      />

      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: `
            radial-gradient(ellipse 55% 45% at 32% 26%, rgba(255,248,235,0.2) 0%, transparent 52%),
            radial-gradient(ellipse 40% 35% at 72% 78%, rgba(0,0,0,0.24) 0%, transparent 48%)
          `,
        }}
      />

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
        style={{
          width: labelSize,
          height: labelSize,
          boxShadow:
            "inset 0 2px 8px rgba(0,0,0,0.35), inset 0 -1px 3px rgba(255,255,255,0.07)",
        }}
      >
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title || "专辑封面"}
            fill
            className="object-cover"
            sizes={`${labelSize}px`}
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `
                radial-gradient(circle at 35% 30%, rgba(255,255,255,0.12) 0%, transparent 45%),
                linear-gradient(155deg, rgba(232,168,76,0.52) 0%, rgba(212,132,58,0.4) 45%, rgba(160,90,35,0.55) 100%)
              `,
            }}
          />
        )}
      </div>

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: labelSize + size * 0.016,
          height: labelSize + size * 0.016,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)",
        }}
      />

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: holeRing,
          height: holeRing,
          background:
            "radial-gradient(circle at 50% 42%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.5) 72%, rgba(0,0,0,0.7) 100%)",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.55)",
        }}
      />

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: holeSize,
          height: holeSize,
          background:
            "radial-gradient(circle at 40% 35%, #3a3a3a 0%, #1a1a1a 55%, #080808 100%)",
          boxShadow: "inset 0 2px 5px rgba(0,0,0,0.8)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse 28% 12% at 36% 24%, rgba(255,255,255,0.22) 0%, transparent 100%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          boxShadow:
            "inset 0 1px 2px rgba(255,255,255,0.12), inset 0 -2px 5px rgba(0,0,0,0.38)",
        }}
      />
    </>
  );
}

function VinylEdge({ depth }: { depth: number }) {
  const layers = 5;
  return (
    <>
      {Array.from({ length: layers }, (_, i) => {
        const z = ((i + 1) / layers) * depth;
        const shade = 28 - i * 4;
        return (
          <div
            key={z}
            className="absolute inset-0 rounded-full"
            aria-hidden
            style={{
              transform: `translateZ(-${z}px)`,
              background: `linear-gradient(180deg, rgb(${shade},${shade},${shade}) 0%, rgb(${Math.max(shade - 12, 4)},${Math.max(shade - 12, 4)},${Math.max(shade - 12, 4)}) 100%)`,
            }}
          />
        );
      })}
    </>
  );
}

function GlassPlatter({ size, depth }: { size: number; depth: number }) {
  const platterSize = size * 1.22;
  const z = depth + 10;

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2"
      aria-hidden
      style={{
        width: platterSize,
        height: platterSize,
        marginLeft: -(platterSize / 2),
        marginTop: -(platterSize / 2),
        transform: `translateZ(-${z}px)`,
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              168deg,
              rgba(255, 255, 255, 0.52) 0%,
              rgba(255, 255, 255, 0.28) 38%,
              rgba(255, 255, 255, 0.1) 72%,
              rgba(255, 255, 255, 0.04) 100%
            )
          `,
          border: "1.5px solid rgba(255, 255, 255, 0.5)",
          borderTopColor: "rgba(255, 255, 255, 0.88)",
          borderBottomColor: "rgba(255, 255, 255, 0.22)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow:
            "inset 0 3px 8px rgba(255, 255, 255, 0.72), inset 0 -3px 10px rgba(0, 0, 0, 0.07)",
        }}
      />
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: 0,
          height: 4,
          transform: "rotateX(-90deg)",
          transformOrigin: "bottom center",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0.14))",
        }}
      />
    </div>
  );
}

export function VinylRecord({
  coverUrl,
  isPlaying,
  size = 280,
  title = "",
  rank,
  className,
  onClick,
  rotationDeg = 0,
  isScrubbing = false,
  view3d,
}: VinylRecordProps) {
  const reduceMotion = useReducedMotion();
  const useSpinAnimation = isPlaying && !reduceMotion && !isScrubbing;
  const show3d = view3d ?? size >= 180;
  const sceneWidth = show3d ? calcSceneWidth(size) : size;
  const sceneHeight = show3d ? calcSceneHeight(size) : size;

  const spinningDisc = (
    <motion.div
      className="absolute inset-0"
      style={{ transformStyle: "preserve-3d" }}
      animate={
        useSpinAnimation
          ? { rotate: [rotationDeg, rotationDeg + 360] }
          : { rotate: rotationDeg }
      }
      transition={
        useSpinAnimation
          ? { duration: 3, repeat: Infinity, ease: "linear" }
          : isScrubbing
            ? { duration: 0 }
            : { duration: 0.6, ease: "easeOut" }
      }
    >
      {show3d && <VinylEdge depth={VINYL_EDGE_DEPTH} />}

      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{ transform: "translateZ(0)" }}
      >
        <DiscSurface size={size} coverUrl={coverUrl} title={title} />
      </div>
    </motion.div>
  );

  return (
    <motion.div
      className={cn("relative", onClick ? "cursor-pointer" : "cursor-grab", className)}
      style={{ width: sceneWidth, height: sceneHeight }}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      role={onClick ? "button" : undefined}
      aria-label={title ? `唱片: ${title}` : "黑胶唱片"}
    >
      {show3d ? (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "50%",
            width: size,
            height: size,
            perspective: size * 3,
            perspectiveOrigin: "50% 50%",
          }}
        >
          <div
            className="relative h-full w-full"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateX(${VINYL_TILT_DEG}deg)`,
            }}
          >
            <GlassPlatter size={size} depth={VINYL_EDGE_DEPTH} />
            {spinningDisc}
          </div>
        </div>
      ) : (
        <div className="relative h-full w-full">{spinningDisc}</div>
      )}

      {rank && (
        <div className="absolute -right-2 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
          {rank}
        </div>
      )}
    </motion.div>
  );
}
