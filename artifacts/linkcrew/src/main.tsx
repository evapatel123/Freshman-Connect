import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Wire up Bearer token from localStorage for all API calls
setAuthTokenGetter(() => localStorage.getItem("linkcrew_token"));

createRoot(document.getElementById("root")!).render(<App />);
