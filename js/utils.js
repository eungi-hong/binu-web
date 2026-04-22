/* Shared helpers: DOM selection, dates, storage, toast. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const fmtDate = (d, opts = { month: "short", day: "numeric" }) =>
  new Date(d).toLocaleDateString(undefined, opts);

export const toLocalISO = (d) => {
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

export const todayISO = () => toLocalISO(new Date());

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const diffDays = (a, b) =>
  Math.round((new Date(b) - new Date(a)) / 86400000);

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export const uid = () => Math.random().toString(36).slice(2, 10);

export const escapeHtml = (str) =>
  String(str).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));

export const relTime = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(ts);
};

export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem("binu:" + key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(key, val) { localStorage.setItem("binu:" + key, JSON.stringify(val)); }
};

let _toastTimer;
export const toast = (msg) => {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
};
