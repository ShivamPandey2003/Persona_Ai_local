import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ReduxProviders, TanstackProvider } from "@/provider";
import { Toaster } from "sonner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TanstackProvider>
      <ReduxProviders>
        <App />
        <Toaster position="bottom-right" richColors />
      </ReduxProviders>
    </TanstackProvider>
  </StrictMode>,
);
