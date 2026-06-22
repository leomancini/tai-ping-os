import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faGear,
  faArrowsRotate,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import HomeScreen from "./HomeScreen";
import CreatorApp from "./CreatorApp";
import { useApps } from "./apps/AppsContext";
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  UI_SCALE,
  SCREEN_RADIUS,
  SCREEN_INSET,
  CONTENT_WIDTH,
  CONTENT_HEIGHT,
  APP_RADIUS,
  ICON_RADIUS,
  concentric,
} from "./screenMetrics";

export {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  UI_SCALE,
  APP_RADIUS,
  SCREEN_INSET,
};


// Black mask down the left of the app. `offset` is the black strip width in
// physical px; the app to its right gets rounded top-left/bottom-left corners.
export const LEFT_MASK = {
  offset: 160,
  color: "#000",
  // Red dot's left edge position in physical px from the screen's left.
  dotLeft: 28,
  // Red dot diameter in physical px.
  dotSize: 60,
};

// Four rounded rects spaced evenly down the mask strip, each with an icon.
export const MASK_RECTS = {
  icons: ["home", "settings", "creator", "refresh"],
  width: 88,
  height: 88,
  radius: ICON_RADIUS,
  color: "#1c1c1e",
  iconSize: 44,
  iconColor: "#fff",
};

// Map of rect names to Font Awesome (free, solid) icons.
const MASK_ICONS = {
  home: faHouse,
  settings: faGear,
  creator: faWandMagicSparkles,
  refresh: faArrowsRotate,
};

// Backdrop shown around the simulated screen when the window isn't an exact match.
const Backdrop = styled.div`
  width: 100vw;
  height: 100vh;
  margin: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  background: #d4d4d4;
  overflow: hidden;
`;

// The fixed 1600x720 device screen. Content inside is clipped to these bounds.
const Screen = styled.div`
  position: relative;
  width: ${SCREEN_WIDTH}px;
  height: ${SCREEN_HEIGHT}px;
  flex: none;
  overflow: hidden;
  background: #000;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4), 0 24px 80px rgba(0, 0, 0, 0.5);
`;

// All screen contents live inside this box, inset from the screen edges by
// SCREEN_INSET on every side. Its corner radius is concentric with the screen's
// outer corner (APP_RADIUS = SCREEN_RADIUS − inset). Everything inside (the app
// stage, the left mask, the icons) is laid out in this box's coordinates.
const Content = styled.div`
  position: absolute;
  top: ${(p) => p.$top}px;
  left: ${SCREEN_INSET}px;
  width: ${CONTENT_WIDTH}px;
  height: ${(p) => p.$h}px;
  overflow: hidden;
  background: #000;
  border-radius: ${(p) => p.$radius}px;
`;

// Logical canvas the app is authored on, scaled up to fill the available area
// (the content minus the left mask) and pinned to its right of the mask.
const Stage = styled.div`
  position: absolute;
  top: 0;
  left: ${(p) => p.$left}px;
  width: ${(p) => p.$w}px;
  height: ${(p) => p.$h}px;
  background: #000;
  transform: scale(${UI_SCALE});
  transform-origin: top left;
`;

// Inverted mask: the app shows through this window; the huge spread box-shadow
// paints everything outside it (the left strip + the concave corners) black, so
// the *app* gets the rounded top-left/bottom-left corners — not the mask.
const LeftMask = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: ${(p) => p.$offset}px;
  border-radius: ${(p) => p.$radius}px 0 0 ${(p) => p.$radius}px;
  box-shadow: 0 0 0 9999px ${(p) => p.$color};
  pointer-events: none;
  z-index: 10;
`;

// Red dot inside the black left mask, positioned by its left edge.
const LeftMaskDot = styled.div`
  position: absolute;
  top: 50%;
  left: ${(p) => p.$left}px;
  width: ${(p) => p.$size}px;
  height: ${(p) => p.$size}px;
  transform: translateY(-50%);
  border-radius: 50%;
  background: ${(p) => p.$color};
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
  z-index: 11;
`;

// Vertical column of rounded rects spanning the mask strip.
const MaskRects = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: ${(p) => p.$maskWidth}px;
  height: 100%;
  box-sizing: border-box;
  padding: ${(p) => p.$padY}px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
  z-index: 11;
`;

const MaskRect = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${(p) => p.$w}px;
  height: ${(p) => p.$h}px;
  border: none;
  padding: 0;
  border-radius: ${(p) => p.$r}px;
  background: ${(p) => p.$color};
  pointer-events: auto;
  cursor: pointer;
  transition: filter 0.12s ease;

  &:active {
    filter: brightness(1.4);
  }
`;

// Constant-position layer for the mask icons + camera dot. It stays inset by
// SCREEN_INSET and does NOT move when the home grid bleeds to the screen edges,
// so the sidebar icons keep the same frame as the apps. (The black strip itself
// stays with the app in <Content> so it can round the app's left corners.)
const MaskChrome = styled.div`
  position: absolute;
  top: ${SCREEN_INSET}px;
  left: ${SCREEN_INSET}px;
  width: ${(p) => p.$w}px;
  height: ${CONTENT_HEIGHT}px;
  pointer-events: none;
  z-index: 12;
`;

const Label = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  color: #888;
  font-family: source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
`;

const ToggleLink = styled.button`
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  letter-spacing: inherit;
  color: #0a84ff;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;

function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const onResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return size;
}

function Simulator({ children, leftMask }) {
  const { width, height } = useWindowSize();
  const { getApp } = useApps();
  // On the physical device, the page is loaded with ?onDevice=true and rendered
  // full-bleed. Anywhere else, render in the scaled-down simulator.
  const params = new URLSearchParams(window.location.search);
  const onDevice = params.get("onDevice") === "true";
  // The red camera dot in the left mask is hidden unless ?showCamera=true, and
  // can be toggled from the simulator chrome.
  const [showCamera, setShowCamera] = useState(
    params.get("showCamera") === "true"
  );
  // Current screen: "home", "creator", an app id, or "app" for the default app.
  const [view, setView] = useState("home");

  const mask = { ...LEFT_MASK, ...leftMask };
  const appLeft = mask.offset > 0 ? mask.offset : 0;
  const stageWidth = (CONTENT_WIDTH - appLeft) / UI_SCALE;

  // Map each mask button to an action.
  const onMaskTap = (name) => {
    if (name === "home") setView("home");
    else if (name === "creator") setView("creator");
    else if (name === "refresh") window.location.reload();
  };

  // Mask squares are centered horizontally in the strip, so their left/right
  // padding is (offset - width) / 2. Use that same value as the top/bottom
  // padding and lay them out with space-between, so the first and last squares
  // have equal padding on the left and top/bottom.
  const rectCount = MASK_RECTS.icons.length;
  const rectPad = (appLeft - MASK_RECTS.width) / 2;
  const rectGap =
    (CONTENT_HEIGHT - 2 * rectPad - rectCount * MASK_RECTS.height) /
    (rectCount - 1);
  const square1Top = rectPad;
  const square2Bottom = rectPad + MASK_RECTS.height * 2 + rectGap;

  // Home screen grid: row 1's top aligns to mask square 1's top; icons fill the
  // width across APPS.length columns; icon height spans mask square 1's top to
  // square 2's bottom (the original tall size). HOME_ROWS rows can exceed the
  // app area height, so the home screen scrolls. The mask squares sit `maskInset`
  // left of the app area; the left padding subtracts it to keep gaps equal.
  const HOME_ROWS = 3;
  const iconTop = square1Top / UI_SCALE;
  const maskInset = rectPad / UI_SCALE;
  const homeGap = iconTop;
  const homePadLeft = homeGap - maskInset;
  const iconHeight = (square2Bottom - square1Top) / UI_SCALE;

  let stageContent;
  if (view === "home") {
    stageContent = (
      <HomeScreen
        onLaunch={(id) => setView(id)}
        rows={HOME_ROWS}
        iconHeight={iconHeight}
        iconRadius={concentric(MASK_RECTS.radius) / UI_SCALE}
        gap={homeGap}
        padLeft={homePadLeft}
        padTop={iconTop + SCREEN_INSET / UI_SCALE}
        padBottom={homeGap + SCREEN_INSET / UI_SCALE}
      />
    );
  } else if (view === "creator") {
    stageContent = <CreatorApp onLaunch={(id) => setView(id)} />;
  } else {
    const app = getApp(view);
    stageContent = app ? <app.Component /> : children;
  }

  // The home grid bleeds to the top/bottom screen edges so its icons clip at the
  // rounded outer corner (under the bezel) instead of being sliced at the inset
  // frame line when scrolled. The top/bottom gap is recreated as scroll padding
  // (see padTop/padBottom above), so home still reads as inset at rest. Apps keep
  // the inset and rounded corners on all sides; the sidebar stays inset via
  // MaskChrome.
  const bleed = view === "home";
  const contentTop = bleed ? 0 : SCREEN_INSET;
  const contentHeight = bleed ? SCREEN_HEIGHT : CONTENT_HEIGHT;
  const contentRadius = bleed ? 0 : APP_RADIUS;
  const stageHeight = contentHeight / UI_SCALE;

  const screenContent = (
    <>
      <Content $top={contentTop} $h={contentHeight} $radius={contentRadius}>
        <Stage $left={appLeft} $w={stageWidth} $h={stageHeight}>
          {stageContent}
        </Stage>
        {mask.offset > 0 && (
          <LeftMask
            $offset={mask.offset}
            $color={mask.color}
            $radius={view === "home" ? 0 : APP_RADIUS}
          />
        )}
      </Content>
      {mask.offset > 0 && (
        <MaskChrome $w={mask.offset}>
          {showCamera && (
            <LeftMaskDot
              $left={mask.dotLeft}
              $size={mask.dotSize}
              $color={onDevice ? "#000" : "#ff3b30"}
            />
          )}
          <MaskRects $maskWidth={mask.offset} $padY={rectPad}>
            {MASK_RECTS.icons.map((name, i) => (
              <MaskRect
                key={i}
                onClick={() => onMaskTap(name)}
                $w={MASK_RECTS.width}
                $h={MASK_RECTS.height}
                $r={concentric(MASK_RECTS.radius)}
                $color={MASK_RECTS.color}
              >
                <FontAwesomeIcon
                  icon={MASK_ICONS[name]}
                  color={MASK_RECTS.iconColor}
                  style={{ width: MASK_RECTS.iconSize, height: MASK_RECTS.iconSize }}
                />
              </MaskRect>
            ))}
          </MaskRects>
        </MaskChrome>
      )}
    </>
  );

  // On device: fill the screen. The device WebView reports a portrait CSS
  // viewport (e.g. ~411x914) even though the panel is mounted landscape, so
  // rotate the 1600x720 screen 90deg when the viewport is portrait, then scale
  // to fill. (Flip to "rotate(-90deg)" below if the content is upside down.)
  if (onDevice) {
    const portrait = height > width;
    // Space available in the screen's own (pre-rotation) coordinates.
    const availW = portrait ? height : width;
    const availH = portrait ? width : height;
    const scale = Math.min(availW / SCREEN_WIDTH, availH / SCREEN_HEIGHT);
    const transform = portrait
      ? `rotate(90deg) scale(${scale})`
      : `scale(${scale})`;
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            flex: "none",
            transform,
            transformOrigin: "center center",
            // Composite the whole transformed subtree as one layer so the
            // rounded-corner clips rasterize once, not per nested transform.
            willChange: "transform",
            backfaceVisibility: "hidden",
          }}
        >
          <Screen style={{ boxShadow: "none" }}>{screenContent}</Screen>
        </div>
      </div>
    );
  }

  // Simulator mode: scale the screen down to fit the current window, leaving
  // breathing room on the left/right (and a little top/bottom). Never above 1:1.
  const PADDING_X = 96;
  const scale = Math.min(
    1,
    (width - PADDING_X * 2) / SCREEN_WIDTH,
    (height - 40) / SCREEN_HEIGHT
  );

  return (
    <Backdrop>
      <Label>
        <span>
          Simulator · {SCREEN_WIDTH} × {SCREEN_HEIGHT}
          {scale < 1 ? ` · ${Math.round(scale * 100)}%` : ""}
        </span>
        <ToggleLink onClick={() => setShowCamera((v) => !v)}>
          {showCamera ? "Hide camera cutout" : "Show camera cutout"}
        </ToggleLink>
      </Label>
      <div
        style={{
          width: SCREEN_WIDTH * scale,
          height: SCREEN_HEIGHT * scale,
          flex: "none",
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            willChange: "transform",
            backfaceVisibility: "hidden",
          }}
        >
          <Screen
            style={{
              borderRadius: SCREEN_RADIUS,
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.25)",
            }}
          >
            {screenContent}
          </Screen>
        </div>
      </div>
    </Backdrop>
  );
}

export default Simulator;
