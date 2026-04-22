/* Emergency contacts: tap-to-call directory. */
import { $ } from "./utils.js";

const CONTACTS = [
  { cat: "Medical", ic: "🚑", name: "Ambulance (SG)", number: "995", note: "Life-threatening medical emergencies." },
  { cat: "Medical", ic: "🏥", name: "KK Women's & Children's Hospital", number: "+6562255554", note: "24/7 obstetric & gynaecological emergencies." },
  { cat: "Medical", ic: "🏥", name: "NUH Women's Centre", number: "+6567795555", note: "Women's health outpatient & emergency line." },
  { cat: "Mental", ic: "🫂", name: "Samaritans of Singapore (SOS)", number: "1767", note: "24/7 emotional support & suicide prevention." },
  { cat: "Mental", ic: "📞", name: "IMH Mental Health Helpline", number: "+6563892222", note: "Institute of Mental Health 24-hour line." },
  { cat: "Mental", ic: "💬", name: "CHAT (Community Health Assessment Team)", number: "+6563214100", note: "For young adults (16–30) navigating mental health." },
  { cat: "Safety", ic: "🚨", name: "Police (SG)", number: "999", note: "Immediate danger or crimes in progress." },
  { cat: "Safety", ic: "🛡", name: "AWARE Women's Helpline", number: "+6517377", note: "Sexual assault, harassment, and relationship abuse." },
  { cat: "Safety", ic: "🌙", name: "PAVE Family Violence Support", number: "+6565550390", note: "Confidential help for those facing domestic violence." },
  { cat: "Peer", ic: "🎓", name: "NUS UHC (University Health Centre)", number: "+6565162880", note: "On-campus medical care for NUS students." },
  { cat: "Peer", ic: "🎓", name: "NTU Medical Centre", number: "+6567904763", note: "On-campus medical care for NTU students." },
  { cat: "Peer", ic: "🌷", name: "Big Love Child Protection", number: "+6580002121", note: "Support if you or someone you know is unsafe." },
];

let activeCat = "All";

function render() {
  const cats = ["All", ...new Set(CONTACTS.map(c => c.cat))];
  $("#emergencyFilters").innerHTML = cats.map(c =>
    `<button class="chip ${c === activeCat ? "active" : ""}" data-cat="${c}">${c}</button>`
  ).join("");
  const list = activeCat === "All" ? CONTACTS : CONTACTS.filter(c => c.cat === activeCat);
  $("#emergencyGrid").innerHTML = list.map(c => `
    <article class="em-card">
      <div class="em-ic">${c.ic}</div>
      <h4>${c.name}</h4>
      <div class="em-meta">${c.note}</div>
      <a class="btn primary" href="tel:${c.number.replace(/\s+/g, "")}">Call ${c.number}</a>
    </article>
  `).join("");
}

function bind() {
  $("#emergencyFilters").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    activeCat = b.dataset.cat;
    render();
  });
}

export function initEmergency() {
  bind();
  render();
}
