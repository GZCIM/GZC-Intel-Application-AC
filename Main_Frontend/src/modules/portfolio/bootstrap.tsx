import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";
(window as any).IS_SHELL_CONTEXT = false;
const container = document.getElementById("root");
if (!container) throw new Error("Root container not found");

const root = createRoot(container);
root.render(<App />);
