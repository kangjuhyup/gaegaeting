import React from "react";
import ReactDOM from "react-dom/client";
import { InteractionPage } from "@gaegaeting/ui-common/interaction";
import App from "./App.js";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {window.location.pathname === "/admin/interaction" ? (
      <InteractionPage admin />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
