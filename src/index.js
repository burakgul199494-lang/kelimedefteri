import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css"; // 🔥 EN ÖNEMLİ KISIM: Stilleri projeye dahil ediyoruz
import "cropperjs/dist/cropper.css";
import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
