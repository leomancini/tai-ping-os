import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import Simulator from "./Simulator";
import { AppsProvider } from "./apps/AppsContext";
import { AuthGate } from "./auth";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <AuthGate>
    <AppsProvider>
      <Simulator>
        <App />
      </Simulator>
    </AppsProvider>
  </AuthGate>
);

