import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./styles/global.css";
import App from "./App";

// Note: no StrictMode here on purpose — its dev-only double-effect would make
// the play-once splash tear down on the phantom first mount.
createRoot(document.getElementById("root")!).render(<App />);
