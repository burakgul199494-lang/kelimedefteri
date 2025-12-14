import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "cropperjs/dist/cropper.css";   // 🔥 EKLEDİĞİMİZ SATIR
import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
