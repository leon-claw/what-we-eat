import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initializeDebugConsole } from "./lib/debugConsole";
import "./styles.css";

void initializeDebugConsole(window.location.search);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
