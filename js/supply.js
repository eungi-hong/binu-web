/* Supply requests: broadcast a need to nearby peers. Requests auto-expire after 30 minutes. */
import { $, $$, uid, store, toast } from "./utils.js";

const TTL_MS = 30 * 60 * 1000;

const seed = () => [
  { id: uid(), items: ["Pad"], location: "Engineering Block 2, Level 3 restroom", urgency: "high", ts: Date.now() - 7 * 60 * 1000, mine: false },
  { id: uid(), items: ["Pain relief", "Heat pack"], location: "Central library, quiet zone", urgency: "med", ts: Date.now() - 18 * 60 * 1000, mine: false },
];

let reqs = store.get("supply:reqs", seed());
const selected = new Set();
const save = () => store.set("supply:reqs", reqs);

function prune() {
  const before = reqs.length;
  reqs = reqs.filter(r => Date.now() - r.ts < TTL_MS);
  if (reqs.length !== before) save();
}

function minsAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  return m < 1 ? "just now" : m + "m ago";
}

function labelFor(u) { return { low: "Not urgent", med: "Soon", high: "Urgent" }[u] || u; }

function render() {
  prune();
  if (!reqs.length) {
    $("#supplyList").innerHTML = `<div class="glass panel" style="text-align:center;color:var(--mute)">No active requests nearby right now.</div>`;
    return;
  }
  $("#supplyList").innerHTML = [...reqs].sort((a, b) => b.ts - a.ts).map(r => `
    <article class="supply-card" data-id="${r.id}">
      <h4>${r.items.join(" · ")}</h4>
      <div class="meta">📍 ${r.location || "Location not shared"}</div>
      <div class="meta">🕒 ${minsAgo(r.ts)}</div>
      <span class="pill ${r.urgency}">${labelFor(r.urgency)}</span>
      <div class="supply-actions">
        ${r.mine
          ? `<button class="btn ghost" data-act="cancel">Cancel</button>`
          : `<button class="btn primary" data-act="offer">I can help</button>`}
      </div>
    </article>
  `).join("");
}

function bind() {
  $("#supplyItems").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip.item");
    if (!chip) return;
    const item = chip.dataset.item;
    if (selected.has(item)) { selected.delete(item); chip.classList.remove("selected"); }
    else { selected.add(item); chip.classList.add("selected"); }
  });

  $("#supplyForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!selected.size) { toast("Pick at least one item"); return; }
    const location = $("#supplyLocation").value.trim();
    const urgency = $("#supplyUrgency").value;
    reqs.unshift({
      id: uid(), items: [...selected], location, urgency, ts: Date.now(), mine: true
    });
    save();
    selected.clear();
    $$("#supplyItems .chip").forEach(c => c.classList.remove("selected"));
    $("#supplyForm").reset();
    render();
    toast("Request broadcast to nearby peers");
  });

  $("#supplyList").addEventListener("click", (e) => {
    const card = e.target.closest(".supply-card");
    if (!card) return;
    const id = card.dataset.id;
    const act = e.target.dataset.act;
    if (act === "offer") { toast("You've offered to help — check your messages."); }
    else if (act === "cancel") {
      reqs = reqs.filter(r => r.id !== id);
      save(); render();
      toast("Request cancelled");
    }
  });

  setInterval(render, 60000);
}

export function initSupply() {
  bind();
  render();
}
