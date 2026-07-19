import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TrainerProvider } from "./app/TrainerContext";
import App from "./app/App";
import Community from "./app/pages/Community";
import Builder from "./app/pages/Builder";
import Trainer from "./app/pages/Trainer";
import Lines from "./app/pages/Lines";
import { Toaster } from "./app/components/ui/sonner";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
  <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
    <DndProvider backend={HTML5Backend}>
      <TrainerProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<App />}>
              <Route index element={<Navigate to="/community" replace />} />
              <Route path="community" element={<Community />} />
              <Route path="charts" element={<Builder />} />
              <Route path="lines" element={<Lines />} />
              <Route path="trainer" element={<Trainer />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-center" />
      </TrainerProvider>
    </DndProvider>
  </ThemeProvider>
  </HelmetProvider>
);
