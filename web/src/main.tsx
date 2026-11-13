import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ProveedorAvisos } from "./components/Avisos";
import "./styles/variables.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorAvisos>
        <App />
      </ProveedorAvisos>
    </BrowserRouter>
  </StrictMode>,
);
