import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faGear,
  faSquare,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import HomeScreen from "./HomeScreen";
import CreatorApp from "./CreatorApp";
import { useApps } from "./apps/AppsContext";

export const SCREEN_WIDTH = 1600;
export const SCREEN_HEIGHT = 720;

// The app is authored at a logical resolution and rendered at this scale,
// so a 24px element occupies 48px on the physical 1600x720 screen.
export const UI_SCALE = 2;

// Corner rounding on the app's left edge (top-left + bottom-left), all modes.
export const APP_RADIUS = 56;
const LOGICAL_HEIGHT = SCREEN_HEIGHT / UI_SCALE;

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
  icons: ["home", "settings", "creator", "placeholder"],
  width: 88,
  height: 88,
  radius: 24,
  color: "#333",
  iconSize: 44,
  iconColor: "#fff",
};

// Map of rect names to Font Awesome (free, solid) icons.
const MASK_ICONS = {
  home: faHouse,
  settings: faGear,
  creator: faWandMagicSparkles,
  placeholder: faSquare,
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

// Logical canvas the app is authored on, scaled up to fill the available area
// (the screen minus the left mask) and pinned to its right of the mask.
const Stage = styled.div`
  position: absolute;
  top: 0;
  left: ${(p) => p.$left}px;
  width: ${(p) => p.$w}px;
  height: ${LOGICAL_HEIGHT}px;
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

const Label = styled.div`
  position: absolute;
  top: 16px;
  left: 16px;
  color: #888;
  font-family: source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
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
  const onDevice =
    new URLSearchParams(window.location.search).get("onDevice") === "true";
  // Current screen: "home", "creator", an app id, or "app" for the default app.
  const [view, setView] = useState("home");

  const mask = { ...LEFT_MASK, ...leftMask };
  const appLeft = mask.offset > 0 ? mask.offset : 0;
  const stageWidth = (SCREEN_WIDTH - appLeft) / UI_SCALE;

  // Map each mask button to an action.
  const onMaskTap = (name) => {
    if (name === "home") setView("home");
    else if (name === "creator") setView("creator");
  };

  // Mask squares are centered horizontally in the strip, so their left/right
  // padding is (offset - width) / 2. Use that same value as the top/bottom
  // padding and lay them out with space-between, so the first and last squares
  // have equal padding on the left and top/bottom.
  const rectCount = MASK_RECTS.icons.length;
  const rectPad = (appLeft - MASK_RECTS.width) / 2;
  const rectGap =
    (SCREEN_HEIGHT - 2 * rectPad - rectCount * MASK_RECTS.height) /
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
        iconRadius={MASK_RECTS.radius / UI_SCALE}
        gap={homeGap}
        padLeft={homePadLeft}
        padTop={iconTop}
      />
    );
  } else if (view === "creator") {
    stageContent = <CreatorApp onLaunch={(id) => setView(id)} />;
  } else {
    const app = getApp(view);
    stageContent = app ? <app.Component /> : children;
  }

  const screenContent = (
    <>
      <Stage $left={appLeft} $w={stageWidth}>
        {stageContent}
      </Stage>
      {mask.offset > 0 && (
        <>
          <LeftMask
            $offset={mask.offset}
            $color={mask.color}
            $radius={view === "home" ? 0 : APP_RADIUS}
          />
          <LeftMaskDot
            $left={mask.dotLeft}
            $size={mask.dotSize}
            $color={onDevice ? "#000" : "#ff3b30"}
          />
          <MaskRects $maskWidth={mask.offset} $padY={rectPad}>
            {MASK_RECTS.icons.map((name, i) => (
              <MaskRect
                key={i}
                onClick={() => onMaskTap(name)}
                $w={MASK_RECTS.width}
                $h={MASK_RECTS.height}
                $r={MASK_RECTS.radius}
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
        </>
      )}
    </>
  );

  // On device: render the screen full-bleed.
  if (onDevice) {
    return <Screen style={{ boxShadow: "none" }}>{screenContent}</Screen>;
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
        Simulator · {SCREEN_WIDTH} × {SCREEN_HEIGHT}
        {scale < 1 ? ` · ${Math.round(scale * 100)}%` : ""}
      </Label>
      <div
        style={{
          width: SCREEN_WIDTH * scale,
          height: SCREEN_HEIGHT * scale,
          flex: "none",
        }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <Screen
            style={{
              borderRadius: APP_RADIUS,
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
