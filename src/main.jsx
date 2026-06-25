import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import Simulator from "./Simulator";
import { AppsProvider } from "./apps/AppsContext";
import { AuthGate } from "./auth";
import StoreGate from "./StoreGate";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <AuthGate>
    <StoreGate>
      <AppsProvider>
        <Simulator>
          <App />
        </Simulator>
      </AppsProvider>
    </StoreGate>
  </AuthGate>
);

