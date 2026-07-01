import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./pwa"; // register the service worker (startup-only updates)
import Shell from "./Shell";
import { AppsProvider } from "./apps/AppsContext";
import { AuthGate } from "./auth";
import StoreGate from "./StoreGate";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <AuthGate>
    <StoreGate>
      <AppsProvider>
        <Shell />
      </AppsProvider>
    </StoreGate>
  </AuthGate>
);

