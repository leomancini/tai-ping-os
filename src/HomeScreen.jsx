import React from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faComment,
  faCamera,
  faMusic,
  faImage,
  faClock,
  faCalendar,
  faMap,
  faGear,
  faEnvelope,
  faPhone,
  faCloudSun,
  faGamepad,
} from "@fortawesome/free-solid-svg-icons";

// Apps shown on the home screen grid. Authored on the app's logical canvas.
const APPS = [
  { name: "Messages", icon: faComment, color: "#34c759" },
  { name: "Phone", icon: faPhone, color: "#30b94d" },
  { name: "Mail", icon: faEnvelope, color: "#0a84ff" },
  { name: "Camera", icon: faCamera, color: "#5c5c5e" },
  { name: "Photos", icon: faImage, color: "#ff2d55" },
  { name: "Music", icon: faMusic, color: "#fa2d48" },
  { name: "Maps", icon: faMap, color: "#1aab4f" },
  { name: "Calendar", icon: faCalendar, color: "#ff3b30" },
  { name: "Clock", icon: faClock, color: "#1c1c1e" },
  { name: "Weather", icon: faCloudSun, color: "#0a84ff" },
  { name: "Games", icon: faGamepad, color: "#af52de" },
  { name: "Settings", icon: faGear, color: "#8e8e93" },
];

const Screen = styled.div`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 28px 32px;
  background: #000;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: min-content;
  gap: 20px 12px;
  align-content: start;
  user-select: none;
`;

const Tile = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
`;

const IconBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: ${(p) => p.$color};
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
`;

const Label = styled.span`
  font-size: 11px;
  color: #f5f5f7;
  white-space: nowrap;
`;

function HomeScreen({ onLaunch }) {
  return (
    <Screen>
      {APPS.map((app) => (
        <Tile key={app.name} onClick={() => onLaunch && onLaunch(app)}>
          <IconBox $color={app.color}>
            <FontAwesomeIcon
              icon={app.icon}
              color="#fff"
              style={{ width: 28, height: 28 }}
            />
          </IconBox>
          <Label>{app.name}</Label>
        </Tile>
      ))}
    </Screen>
  );
}

export default HomeScreen;
