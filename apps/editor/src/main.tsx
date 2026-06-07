import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import { EditorAuthGate } from "./EditorAuthGate";
import "./styles.css";

// Configure pdf.js worker (bundled, self-hosted)
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EditorAuthGate />
  </StrictMode>,
);
