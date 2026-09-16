import { mount } from "svelte";
import App from "./App.svelte";
import { startAnalytics } from "./lib/analytics";
import "./app.css";

// Before the app mounts, so the first screen view is the one the visitor
// actually landed on rather than the one they navigated to next.
startAnalytics();

const target = document.getElementById("app");

if (!target) {
  throw new Error("Root element #app not found");
}

const app = mount(App, {
  target,
});

export default app;
