/* Binu — entry point. Wires routing, theme, and each feature module. */
import { go, initRouter, initTheme } from "./router.js";
import { initForum } from "./forum.js";
import { initPeriod } from "./period.js";
import { initPregnancy } from "./pregnancy.js";
import { initHeraHub } from "./herahub.js";
import { initSupply } from "./supply.js";
import { initEmergency } from "./emergency.js";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initRouter();
  initForum();
  initPeriod();
  initPregnancy();
  initHeraHub();
  initSupply();
  initEmergency();
  go(location.hash.slice(1) || "home");
});
