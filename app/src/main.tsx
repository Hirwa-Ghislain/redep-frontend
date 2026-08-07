import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./styles/global.css";
import { queryClient } from "./lib/queryClient";
import { AppRouter } from "./router";
import { Toaster } from "./components/feedback/Toaster";
import { useI18nStore } from "./stores/i18nStore";

void useI18nStore.getState().init();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRouter />
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
