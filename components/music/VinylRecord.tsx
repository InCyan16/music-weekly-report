"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { calcSceneHeight, calcSceneWidth } from "@/lib/ui/vinyl-layout";

/** 轻微透视：保留唱盘的实体厚度，同时更接近硬件俯视视角 */
const VINYL_TILT_DEG = 56;
/** 侧边厚度（px），倾斜后可见立体感 */
const VINYL_EDGE_DEPTH = 16;
const VINYL_EDGE_LAYERS = 9;

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
  const labelSize = size * 0.3;
  const holeSize = size * 0.06;
  const holeRing = size * 0.085;

  return (
    <>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, transparent 0 18%, rgba(0,0,0,0.16) 18.5% 20%, transparent 20.5%),
            radial-gradient(circle at 38% 30%, #242424 0%, #151515 38%, #0a0a0a 76%, #050505 100%)
          `,
        }}
      />

      <div
        className="absolute inset-0 rounded-full opacity-[0.68] mix-blend-soft-light"
        style={{
          background: `repeating-radial-gradient(
            circle at 50% 50%,
            transparent 0px,
            transparent 0.55px,
            rgba(255,255,255,0.12) 0.7px,
            rgba(0,0,0,0.2) 1.25px,
            transparent 1.45px,
            transparent 2.2px
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
        className="pointer-events-none absolute inset-[6.8%] rounded-full opacity-[0.34] mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle, transparent 0 27%, rgba(255,255,255,0.038) 27.3% 27.7%, transparent 28% 42%, rgba(255,255,255,0.03) 42.3% 42.6%, transparent 42.9% 61%, rgba(255,255,255,0.032) 61.3% 61.7%, transparent 62% 77%, rgba(255,255,255,0.026) 77.2% 77.6%, transparent 78%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 rounded-full opacity-[0.16] mix-blend-overlay"
        style={{
          background: `
            repeating-conic-gradient(from 17deg, rgba(255,255,255,0.05) 0deg 0.12deg, transparent 0.12deg 7deg),
            conic-gradient(from 210deg, transparent 0deg 28deg, rgba(255,255,255,0.09) 47deg, transparent 74deg 184deg, rgba(255,255,255,0.035) 222deg, transparent 258deg 360deg)
          `,
        }}
      />

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

      {/* 正面外缘：细白圈标出厚度分界 */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          boxShadow: `
            inset 0 0 0 1.25px rgba(245,245,242,0.42),
            inset 0 0 0 2.75px rgba(18,18,18,0.92),
            inset 0 0 0 3.5px rgba(255,255,255,0.06)
          `,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 rounded-full opacity-10 mix-blend-soft-light"
        style={{ backgroundImage: VINYL_NOISE, backgroundSize: "72px 72px" }}
      />

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
        style={{
          width: labelSize,
          height: labelSize,
          filter: "saturate(0.72) brightness(0.86)",
          boxShadow:
            "inset 0 2px 8px rgba(0,0,0,0.44), inset 0 -1px 2px rgba(255,255,255,0.06), 0 0 0 1px rgba(0,0,0,0.34)",
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
          boxShadow:
            "inset 0 1px 2px rgba(255,255,255,0.12), inset 0 -2px 5px rgba(0,0,0,0.38)",
        }}
      />
    </>
  );
}

function VinylEdge({ depth }: { depth: number }) {
  const layers = VINYL_EDGE_LAYERS;
  return (
    <>
      {Array.from({ length: layers }, (_, i) => {
        const t = (i + 1) / layers;
        const z = t * depth;
        // 越深越暗，模拟侧面受光衰减
        const shade = Math.round(46 - t * 34);
        const dark = Math.max(shade - 14, 4);
        const rimAlpha = 0.58 - t * 0.28;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            aria-hidden
            style={{
              // 略大于盘面，让白色外圈从侧面露出来
              inset: -1.75,
              transform: `translateZ(-${z}px)`,
              background: `
                radial-gradient(
                  circle at 50% 50%,
                  rgb(${shade},${shade},${shade}) 0%,
                  rgb(${dark},${dark},${dark}) 96.2%,
                  rgba(228,228,224,${rimAlpha}) 98.6%,
                  rgba(248,248,245,${Math.min(rimAlpha + 0.18, 0.75)}) 100%
                )
              `,
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
            radial-gradient(circle at 34% 28%, rgba(255,255,255,0.07) 0%, transparent 34%),
            repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.025) 0 1px, transparent 1px 4px),
            radial-gradient(circle at 44% 36%, #343434 0%, #1c1c1c 48%, #090909 100%)
          `,
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow:
            "0 28px 56px rgba(0,0,0,0.58), 0 8px 18px rgba(0,0,0,0.42), inset 0 1px 1px rgba(255,255,255,0.06), inset 0 0 0 2px rgba(0,0,0,0.34)",
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
            "linear-gradient(180deg, #2d2d2d, #0c0c0c)",
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

  const environmentLight = (
    <div
      className={cn(
        "vinyl-environment-light pointer-events-none absolute inset-0 overflow-hidden rounded-full",
        useSpinAnimation && "is-active",
      )}
      aria-hidden
      style={{ transform: "translateZ(1px)" }}
    >
      <div className="vinyl-environment-base absolute inset-0 rounded-full" />
      <div className="vinyl-reflection-wide absolute rounded-full" />
      <div className="vinyl-reflection-fine absolute rounded-full" />
      <div className="vinyl-environment-bevel absolute inset-0 rounded-full" />
    </div>
  );

  return (
    <motion.div
      className={cn(
        "relative drop-shadow-[0_26px_38px_rgba(0,0,0,0.44)]",
        onClick ? "cursor-pointer" : "cursor-grab",
        className,
      )}
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
            {environmentLight}
          </div>
        </div>
      ) : (
        <div className="relative h-full w-full">
          {spinningDisc}
          {environmentLight}
        </div>
      )}

      {rank && (
        <div className="absolute -right-2 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
          {rank}
        </div>
      )}
    </motion.div>
  );
}
