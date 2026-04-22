/* Hash router + theme toggle. */
import { $, $$, store } from "./utils.js";

const ROUTES = ["home", "forum", "period", "pregnancy", "herahub", "supply", "emergency"];

export function go(route) {
  if (!ROUTES.includes(route)) route = "home";
  $$(".route").forEach(r => r.classList.toggle("active", r.dataset.route === route));
  $$(".nav a").forEach(a => a.classList.toggle("active", a.dataset.route === route));
  if (location.hash !== "#" + route) history.replaceState(null, "", "#" + route);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function initRouter() {
  // Only intercept anchor clicks — `<section data-route="...">` also carries the attribute
  // and would otherwise swallow every click inside a route (blocking form submits).
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-route]");
    if (!a) return;
    e.preventDefault();
    go(a.dataset.route);
  });
  window.addEventListener("hashchange", () => go(location.hash.slice(1)));
}

export function initTheme() {
  const saved = store.get("theme", null);
  if (saved) document.documentElement.dataset.theme = saved;
  $("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("theme", next);
  });
}
