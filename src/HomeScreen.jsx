import React from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { APPS } from "./apps";

const Screen = styled.div`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: ${(p) => p.$padTop}px ${(p) => p.$gap}px ${(p) => p.$gap}px
    ${(p) => p.$padLeft}px;
  background: #000;
  display: grid;
  grid-template-columns: repeat(${(p) => p.$cols}, 1fr);
  grid-auto-rows: ${(p) => p.$rowHeight}px;
  gap: ${(p) => p.$gap}px;
  user-select: none;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Tile = styled.button`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
`;

const IconBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  border-radius: ${(p) => p.$radius}px;
  background: ${(p) => p.$color};
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
`;

// Empty grey app slot.
const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  border-radius: ${(p) => p.$radius}px;
  background: #2c2c2e;
`;

const IconName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
`;

function HomeScreen({
  onLaunch,
  rows = 3,
  iconHeight = 56,
  iconRadius = 14,
  gap = 28,
  padLeft = 32,
  padTop = 28,
}) {
  const cols = APPS.length;
  const placeholderCount = Math.max(0, cols * rows - APPS.length);
  const glyph = iconHeight * 0.42;

  return (
    <Screen
      $cols={cols}
      $rowHeight={iconHeight}
      $gap={gap}
      $padLeft={padLeft}
      $padTop={padTop}
    >
      {APPS.map((app) => (
        <Tile key={app.id} onClick={() => onLaunch && onLaunch(app.id)}>
          <IconBox $color={app.color} $radius={iconRadius}>
            <FontAwesomeIcon
              icon={app.icon}
              color="#fff"
              style={{ width: glyph, height: glyph }}
            />
            <IconName>{app.name}</IconName>
          </IconBox>
        </Tile>
      ))}
      {Array.from({ length: placeholderCount }).map((_, i) => (
        <Placeholder key={`ph-${i}`} $radius={iconRadius} />
      ))}
    </Screen>
  );
}

export default HomeScreen;
