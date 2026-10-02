import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import { InteractionPage } from "@gaegaeting/ui-common/interaction";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {window.location.pathname === "/interaction" ? <InteractionPage /> : <App />}
  </React.StrictMode>,
);
