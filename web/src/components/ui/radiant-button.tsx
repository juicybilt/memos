/**
 * RadiantButton — Web port of the Reacticx Radiant Button.
 *
 * Layers (bottom → top):
 *  1. Dark gradient background
 *  2. SVG: static border rect + animated dots (stroke-dashoffset)
 *  3. Shimmer: oversized rotating conic-gradient (clipped to button shape)
 *  4. Glow: bottom radial gradient with breathing animation (rendered outside
 *           the button so it isn't clipped — lives in a wrapper div)
 *  5. Label
 */

import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Theme (Reacticx defaults)
// ---------------------------------------------------------------------------
const HIGHLIGHT = "192,132,252"; // c084fc as r,g,b for rgba()
const BG = "#000000";
const BG_SUBTLE = "#1a1a1a";

// ---------------------------------------------------------------------------
// Injected keyframes
// ---------------------------------------------------------------------------
const CSS = `
@keyframes rb-dots {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: -1000; }
}
@keyframes rb-shimmer {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes rb-breathe {
  0%, 100% { opacity: 0.55; transform: translateX(-50%) scaleX(1); }
  50%       { opacity: 1;    transform: translateX(-50%) scaleX(1.18); }
}
`;

let cssInjected = false;
function injectCSS() {
  if (cssInjected || typeof document === "undefined") return;
  const s = document.createElement("style");
  s.dataset.rbBtn = "";
  s.textContent = CSS;
  document.head.appendChild(s);
  cssInjected = true;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface RadiantButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  // Reacticx params
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  showDots?: boolean;
  showShimmer?: boolean;
  showGlow?: boolean;
  dotSpacing?: number;
  dotRadius?: number;
  dotOpacity?: number;
  shimmerOpacity?: number;
  glowBlur?: number;
  glowWidth?: number;
  breathingEnabled?: boolean;
  glowBandWidth?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const RadiantButton = forwardRef<HTMLButtonElement, RadiantButtonProps>(
  (
    {
      children,
      isLoading,
      loadingText,
      disabled,
      className,
      style,
      onClick,
      // Reacticx defaults
      borderRadius = 12,
      borderWidth = 2,
      duration = 3000,
      paddingHorizontal = 24,
      paddingVertical = 14,
      showDots = true,
      showShimmer = true,
      showGlow = true,
      dotSpacing = 5,
      dotRadius = 0.65,
      dotOpacity = 0.35,
      shimmerOpacity = 0.35,
      glowBlur = 18,
      glowWidth = 0.7,
      breathingEnabled = true,
      glowBandWidth = 0.15,
      ...rest
    },
    forwardedRef,
  ) => {
    useEffect(injectCSS, []);

    // Measure the button so SVG + glow can be sized precisely
    const btnRef = useRef<HTMLButtonElement>(null);
    const [dims, setDims] = useState({ w: 0, h: 0 });

    useLayoutEffect(() => {
      const el = btnRef.current;
      if (!el) return;
      const measure = () => setDims({ w: el.offsetWidth, h: el.offsetHeight });
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // Merge the forwarded ref with our internal one
    const setRef = (el: HTMLButtonElement | null) => {
      (btnRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
      if (typeof forwardedRef === "function") forwardedRef(el);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
    };

    const isDisabled = disabled || isLoading;
    const active = !isDisabled;
    const { w: W, h: H } = dims;
    const hasDims = W > 0 && H > 0;

    // SVG rect is inset by half the stroke width so the stroke sits on the border edge
    const inset = borderWidth / 2;
    const rx = Math.max(0, borderRadius - inset);

    // Dot dasharray — values are in pathLength units (pathLength="1000" normalises the path)
    // dotRadius * 2 = dot "diameter"; dotSpacing = gap between dots.
    // Scale ×10 so params match Reacticx's React-Native-unit feel at typical button sizes.
    const dotDash = dotRadius * 2 * 10;
    const dotGap = dotSpacing * 10;

    // Glow dimensions
    const glowW = W * glowWidth;
    const glowH = Math.max(glowBlur, H * glowBandWidth * 3);

    return (
      // Wrapper: overflow:visible so the glow can bleed below the button
      <div className={cn("relative inline-flex", className)} style={style}>
        {/* ── Breathing bottom glow (outside the button so it isn't clipped) ── */}
        {showGlow && hasDims && active && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: -(glowBlur * 0.45),
              left: "50%",
              width: glowW,
              height: glowH,
              background: `radial-gradient(ellipse at 50% 0%, rgba(${HIGHLIGHT},0.85) 0%, transparent 72%)`,
              filter: `blur(${glowBlur}px)`,
              pointerEvents: "none",
              animation: breathingEnabled
                ? `rb-breathe ${duration}ms ease-in-out infinite`
                : undefined,
              // animation sets transform, so seed the initial translateX here via the keyframe
            }}
          />
        )}

        {/* ── Button ── */}
        <button
          ref={setRef}
          disabled={isDisabled}
          onClick={onClick}
          style={{
            position: "relative",
            overflow: "hidden", // clips shimmer to button shape
            borderRadius,
            paddingLeft: paddingHorizontal,
            paddingRight: paddingHorizontal,
            paddingTop: paddingVertical,
            paddingBottom: paddingVertical,
            background: `linear-gradient(145deg, ${BG} 0%, ${BG_SUBTLE} 100%)`,
            color: "#ffffff",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: isDisabled ? "not-allowed" : "pointer",
            opacity: isDisabled ? 0.45 : 1,
            transition: "transform 150ms ease-out, opacity 150ms ease-out",
            border: "none",
            outline: "none",
          }}
          onMouseDown={(e) => {
            if (active) (e.currentTarget as HTMLElement).style.transform = "scale(0.97)";
            rest.onMouseDown?.(e);
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "";
            rest.onMouseUp?.(e);
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "";
            rest.onMouseLeave?.(e);
          }}
          {...rest}
        >
          {/* ── SVG: static border + animated dots ── */}
          {hasDims && (
            <svg
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: W,
                height: H,
                pointerEvents: "none",
                overflow: "visible",
              }}
            >
              {/* Static border ring */}
              <rect
                x={inset}
                y={inset}
                width={W - borderWidth}
                height={H - borderWidth}
                rx={rx}
                ry={rx}
                fill="none"
                stroke={`rgba(${HIGHLIGHT},0.28)`}
                strokeWidth={borderWidth}
              />

              {/* Travelling dots */}
              {showDots && active && (
                <rect
                  x={inset}
                  y={inset}
                  width={W - borderWidth}
                  height={H - borderWidth}
                  rx={rx}
                  ry={rx}
                  fill="none"
                  stroke={`rgba(${HIGHLIGHT},${dotOpacity})`}
                  strokeWidth={borderWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${dotDash} ${dotGap}`}
                  pathLength={1000}
                  style={{
                    animation: `rb-dots ${duration}ms linear infinite`,
                  }}
                />
              )}
            </svg>
          )}

          {/* ── Shimmer sweep (clipped by button's overflow:hidden + border-radius) ── */}
          {showShimmer && active && (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: "-50%",
                width: "200%",
                height: "200%",
                background: `conic-gradient(
                  from 0deg,
                  transparent 60%,
                  rgba(${HIGHLIGHT},${shimmerOpacity * 0.9}) 78%,
                  rgba(255,255,255,${shimmerOpacity * 0.22}) 85%,
                  transparent 100%
                )`,
                animation: `rb-shimmer ${duration}ms linear infinite`,
                pointerEvents: "none",
              }}
            />
          )}

          {/* ── Label ── */}
          <span
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isLoading && (
              <svg
                style={{ width: "0.875rem", height: "0.875rem" }}
                className="animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity={0.25} />
                <path
                  fill="currentColor"
                  opacity={0.75}
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {isLoading ? (loadingText ?? children) : children}
          </span>
        </button>
      </div>
    );
  },
);

RadiantButton.displayName = "RadiantButton";
