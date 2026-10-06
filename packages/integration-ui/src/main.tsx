import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import { InteractionPage } from "@gaegaeting/ui-common/interaction";
import { beginLogin, publicConfig } from "@gaegaeting/ui-common";
import { SignupPage } from "./pages/SignupPage.js";
import "./styles.css";

const interactionConfig = {
  issuer: publicConfig.issuer, clientId: publicConfig.clientId,
  accountUrl: publicConfig.accountUrl, gatewayUrl: publicConfig.gatewayUrl,
  redirectUri: `${window.location.origin}/login`,
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {window.location.pathname === "/interaction" ? <InteractionPage renderExternalSignup={(social, resume) => (
      <SignupPage config={interactionConfig} social={social} onSocialComplete={resume}
        onLogin={() => beginLogin(interactionConfig, { prompt: "login" })} />
    )} /> : <App />}
  </React.StrictMode>,
);
