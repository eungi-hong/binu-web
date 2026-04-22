/* Period tracker: cycle summary, calendar with predictions, daily log.
 * periods: [{ start: "YYYY-MM-DD" }, ...]
 * logs:    { "YYYY-MM-DD": { moods: [], symptoms: [], note: "" } } */
import {
  $, $$, fmtDate, toLocalISO, todayISO, addDays, diffDays, clamp,
  escapeHtml, store, toast
} from "./utils.js";

const MOODS = ["Calm", "Happy", "Anxious", "Sad", "Irritable", "Low energy", "Motivated"];
const SYMPTOMS = ["Cramps", "Headache", "Bloating", "Fatigue", "Tender breasts", "Acne", "Backache", "Nausea"];

let periods = store.get("period:periods", []);
let logs = store.get("period:logs", {});
const viewMonth = new Date(); viewMonth.setDate(1);
let selectedDate = todayISO();
let pendingMoods = new Set();
let pendingSymptoms = new Set();

const save = () => {
  store.set("period:periods", periods);
  store.set("period:logs", logs);
};

function avgCycle() {
  if (periods.length < 2) return 28;
  const sorted = [...periods].sort((a, b) => a.start.localeCompare(b.start));
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(diffDays(sorted[i - 1].start, sorted[i].start));
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

function lastStart() {
  if (!periods.length) return null;
  return [...periods].sort((a, b) => b.start.localeCompare(a.start))[0].start;
}

function summary() {
  const last = lastStart();
  if (!last) return null;
  const cycle = avgCycle();
  const dayInCycle = clamp(diffDays(last, new Date()) + 1, 1, cycle);
  const next = addDays(last, cycle);
  const ov = addDays(last, cycle - 14);
  const fertileStart = addDays(ov, -4);
  const fertileEnd = addDays(ov, 1);
  let phase = "Follicular";
  if (dayInCycle <= 5) phase = "Menstrual";
  else if (dayInCycle >= cycle - 15 && dayInCycle <= cycle - 13) phase = "Ovulatory";
  else if (dayInCycle > cycle - 13) phase = "Luteal";
  return { last, cycle, dayInCycle, next, ov, fertileStart, fertileEnd, phase };
}

function renderSummary() {
  const s = summary();
  if (!s) {
    $("#periodDay").textContent = "—";
    $("#periodPhase").textContent = "Log a period to begin";
    $("#periodCycleLen").textContent = "—";
    $("#periodNext").textContent = "—";
    $("#periodFertile").textContent = "—";
    $("#periodOv").textContent = "—";
    $("#periodRing").setAttribute("stroke-dasharray", "603");
    $("#periodRing").setAttribute("stroke-dashoffset", "603");
    return;
  }
  $("#periodDay").textContent = "Day " + s.dayInCycle;
  $("#periodPhase").textContent = s.phase + " phase";
  $("#periodCycleLen").textContent = s.cycle + " days";
  const daysTilNext = diffDays(new Date(), s.next);
  $("#periodNext").textContent = daysTilNext <= 0 ? "any day now" : `in ${daysTilNext} days (${fmtDate(s.next)})`;
  $("#periodFertile").textContent = `${fmtDate(s.fertileStart)} – ${fmtDate(s.fertileEnd)}`;
  $("#periodOv").textContent = fmtDate(s.ov);
  const C = 2 * Math.PI * 96;
  const pct = s.dayInCycle / s.cycle;
  $("#periodRing").setAttribute("stroke-dasharray", C);
  $("#periodRing").setAttribute("stroke-dashoffset", C * (1 - pct));
}

function renderHero() {
  const s = summary();
  if (!s) return;
  $("#heroDay").textContent = "Day " + s.dayInCycle;
  document.querySelector("#home .cycle-ring-label .small").textContent = s.phase + " phase";
  const daysTilNext = diffDays(new Date(), s.next);
  $("#heroNext").textContent = daysTilNext <= 0 ? "any day now" : `in ${daysTilNext} days`;
  $("#heroFertile").textContent = `${fmtDate(s.fertileStart)} – ${fmtDate(s.fertileEnd)}`;
  const C = 2 * Math.PI * 86;
  $("#heroRing").setAttribute("stroke-dasharray", C);
  $("#heroRing").setAttribute("stroke-dashoffset", C * (1 - s.dayInCycle / s.cycle));
}

function renderCalendar() {
  const cal = $("#calendar");
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  $("#monthLabel").textContent = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday start
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const dows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let html = dows.map(d => `<div class="cal-dow">${d}</div>`).join("");

  const s = summary();
  const today = todayISO();
  const cells = [];

  for (let i = 0; i < startOffset; i++) {
    const day = prevDays - startOffset + 1 + i;
    cells.push({ d: new Date(year, month - 1, day), other: true });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d: new Date(year, month, d), other: false });
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].d;
    cells.push({ d: addDays(last, 1), other: true });
  }

  for (const c of cells) {
    const iso = toLocalISO(c.d);
    const classes = ["cal-day"];
    if (c.other) classes.push("other");
    if (iso === today) classes.push("today");

    for (const p of periods) {
      const d0 = diffDays(p.start, iso);
      if (d0 >= 0 && d0 < 5) classes.push("period");
    }

    if (s) {
      for (let i = 1; i <= 3; i++) {
        const pStart = addDays(s.last, s.cycle * i);
        for (let k = 0; k < 5; k++) {
          if (iso === toLocalISO(addDays(pStart, k))) classes.push("predicted");
        }
      }
      const fs = toLocalISO(s.fertileStart);
      const fe = toLocalISO(s.fertileEnd);
      const ov = toLocalISO(s.ov);
      if (iso >= fs && iso <= fe) classes.push("fertile");
      if (iso === ov) classes.push("ovulation");
    }

    if (logs[iso]) classes.push("has-log");

    html += `<div class="${classes.join(" ")}" data-date="${iso}" title="${fmtDate(c.d)}">${c.d.getDate()}</div>`;
  }
  cal.innerHTML = html;
}

function renderMoodSymptoms() {
  $("#moodRow").innerHTML = MOODS.map(m =>
    `<button type="button" class="mood ${pendingMoods.has(m) ? "on" : ""}" data-m="${m}">${m}</button>`
  ).join("");
  $("#symptomRow").innerHTML = SYMPTOMS.map(s =>
    `<button type="button" class="symptom ${pendingSymptoms.has(s) ? "on" : ""}" data-s="${s}">${s}</button>`
  ).join("");
}

function renderLogList() {
  const entries = Object.entries(logs).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30);
  if (!entries.length) {
    $("#logList").innerHTML = `<li class="log-item" style="color:var(--mute)">No logs yet — note how you feel, and patterns will appear here.</li>`;
    return;
  }
  $("#logList").innerHTML = entries.map(([date, l]) => `
    <li class="log-item">
      <span class="log-date">${fmtDate(date)}</span>
      ${l.moods.map(m => `<span class="log-tags">· ${m}</span>`).join("")}
      ${l.symptoms.map(s => `<span class="log-tags">· ${s}</span>`).join("")}
      ${l.note ? `<div style="margin-top:4px;color:var(--mute)">“${escapeHtml(l.note)}”</div>` : ""}
    </li>
  `).join("");
}

function setSelected(iso) {
  selectedDate = iso;
  const l = logs[iso] || { moods: [], symptoms: [], note: "" };
  pendingMoods = new Set(l.moods);
  pendingSymptoms = new Set(l.symptoms);
  $("#noteInput").value = l.note || "";
  renderMoodSymptoms();
}

function bind() {
  $("#logPeriodBtn").addEventListener("click", () => {
    const iso = todayISO();
    if (!periods.find(p => p.start === iso)) {
      periods.push({ start: iso });
      save();
      toast("Period logged for today");
      renderSummary(); renderCalendar(); renderHero();
    } else toast("Already logged today");
  });

  $("#logPeriodCustomBtn").addEventListener("click", () => {
    const input = prompt("Enter period start date (YYYY-MM-DD):", todayISO());
    if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return;
    if (!periods.find(p => p.start === input)) {
      periods.push({ start: input });
      save();
      toast("Period logged");
      renderSummary(); renderCalendar(); renderHero();
    }
  });

  $("#prevMonth").addEventListener("click", () => { viewMonth.setMonth(viewMonth.getMonth() - 1); renderCalendar(); });
  $("#nextMonth").addEventListener("click", () => { viewMonth.setMonth(viewMonth.getMonth() + 1); renderCalendar(); });

  $("#calendar").addEventListener("click", (e) => {
    const d = e.target.closest(".cal-day");
    if (!d) return;
    setSelected(d.dataset.date);
    toast("Editing " + fmtDate(d.dataset.date));
  });

  $("#moodRow").addEventListener("click", (e) => {
    const b = e.target.closest(".mood");
    if (!b) return;
    const m = b.dataset.m;
    if (pendingMoods.has(m)) pendingMoods.delete(m); else pendingMoods.add(m);
    b.classList.toggle("on");
  });
  $("#symptomRow").addEventListener("click", (e) => {
    const b = e.target.closest(".symptom");
    if (!b) return;
    const s = b.dataset.s;
    if (pendingSymptoms.has(s)) pendingSymptoms.delete(s); else pendingSymptoms.add(s);
    b.classList.toggle("on");
  });

  $("#saveLogBtn").addEventListener("click", () => {
    const note = $("#noteInput").value.trim();
    const hasAny = pendingMoods.size || pendingSymptoms.size || note;
    if (!hasAny) { delete logs[selectedDate]; }
    else logs[selectedDate] = { moods: [...pendingMoods], symptoms: [...pendingSymptoms], note };
    save();
    renderLogList(); renderCalendar();
    toast("Log saved for " + fmtDate(selectedDate));
  });
}

export function initPeriod() {
  bind();
  setSelected(todayISO());
  renderSummary();
  renderCalendar();
  renderLogList();
  renderHero();
}
