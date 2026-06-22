import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faCameraRotate } from "@fortawesome/free-solid-svg-icons";

export const meta = {
  id: "camera",
  name: "Camera",
  icon: faCamera,
  color: "#3a3a3c",
};

const Wrap = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Mirror the front camera so it reads like a selfie preview. */
  transform: ${(p) => (p.$mirror ? "scaleX(-1)" : "none")};
`;

const Message = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: #8e8e93;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 15px;
`;

const Flip = styled.button`
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: 64px;
  height: 64px;
  border: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: filter 0.12s ease;
  &:active {
    filter: brightness(1.5);
  }
`;

function Camera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  // "environment" = back camera, "user" = front camera.
  const [facing, setFacing] = useState("environment");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    // Stop whatever stream is currently running before opening another.
    const stop = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    async function start() {
      stop();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera isn't available on this device.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        if (!cancelled) {
          setError("Couldn't access the camera. Check the site's permissions.");
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing]);

  return (
    <Wrap>
      <Video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        $mirror={facing === "user"}
      />
      {error && <Message>{error}</Message>}
      <Flip
        onClick={() =>
          setFacing((f) => (f === "user" ? "environment" : "user"))
        }
        aria-label="Switch camera"
      >
        <FontAwesomeIcon icon={faCameraRotate} style={{ width: 26, height: 26 }} />
      </Flip>
    </Wrap>
  );
}

export default Camera;
