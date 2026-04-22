/* Pregnancy tracker: 40-week timeline with weekly size/milestone and per-trimester tips + checklist. */
import { $, fmtDate, toLocalISO, addDays, diffDays, clamp, store, toast } from "./utils.js";

const WEEK_INFO = {
  4:  ["poppy seed", "Your baby is implanting — tiny but mighty."],
  5:  ["sesame seed", "Neural tube is forming."],
  6:  ["lentil", "Heart begins to beat — about 110 bpm."],
  7:  ["blueberry", "Tiny arm and leg buds are emerging."],
  8:  ["kidney bean", "Baby is moving, though too small to feel."],
  9:  ["grape", "All essential organs have begun forming."],
  10: ["kumquat", "Fingernails and hair follicles appear."],
  11: ["fig", "Baby is nearly fully formed on a tiny scale."],
  12: ["lime", "End of first trimester — morning sickness often eases."],
  13: ["lemon", "Fingerprints are forming."],
  14: ["peach", "Baby can make facial expressions."],
  15: ["apple", "Baby can sense light through your belly."],
  16: ["avocado", "Eyes can move and tiny bones harden."],
  17: ["pear", "Baby is developing sweat glands."],
  18: ["bell pepper", "You may feel the first flutter — ‘quickening’."],
  19: ["mango", "Baby's senses are developing rapidly."],
  20: ["banana", "Halfway there! Anatomy scan week."],
  21: ["carrot", "Baby can taste what you taste."],
  22: ["spaghetti squash", "Eyebrows are forming."],
  23: ["grapefruit", "Baby can hear your voice and heartbeat."],
  24: ["cantaloupe", "Viability milestone — lungs begin producing surfactant."],
  25: ["rutabaga", "Baby responds to familiar voices."],
  26: ["scallion", "Eyes open for the first time."],
  27: ["cauliflower", "Brain activity is ramping up."],
  28: ["eggplant", "Third trimester begins."],
  29: ["butternut squash", "Baby's bones are fully formed but soft."],
  30: ["cabbage", "Baby can regulate its own temperature."],
  31: ["coconut", "Baby's five senses are all working."],
  32: ["jicama", "Fingernails reach fingertips."],
  33: ["pineapple", "Baby's immune system is maturing."],
  34: ["cantaloupe", "Lungs are nearly mature."],
  35: ["honeydew", "Baby is gaining weight quickly."],
  36: ["romaine lettuce", "Baby drops lower into the pelvis."],
  37: ["swiss chard", "Considered early term."],
  38: ["leek", "Vernix and lanugo begin to shed."],
  39: ["watermelon", "Full term — baby is ready any day."],
  40: ["small pumpkin", "Due date! Every day now is a bonus gift."],
};

const TIPS = {
  1: ["Prenatal vitamins with folic acid daily.", "Gentle hydration — aim for 8 cups.", "Skip raw fish and soft cheeses."],
  2: ["Schedule the anatomy scan around week 20.", "Gentle movement helps — walking or prenatal yoga.", "Eat small frequent meals to manage heartburn."],
  3: ["Start thinking about the birth plan.", "Count kicks daily from about week 28.", "Pre-register at your birthing hospital."],
};

const TODO_BY_TRI = {
  1: ["Book first midwife appointment", "Start prenatal vitamin", "Tell your employer when ready", "Research antenatal classes"],
  2: ["Book the 20-week anatomy scan", "Plan maternity leave", "Start a gentle exercise routine", "Begin a birth plan draft"],
  3: ["Pack hospital bag by week 36", "Install car seat", "Write a postpartum support list", "Stock freezer meals"]
};

let state = store.get("preg:state", null); // { lmpISO, dueISO }
const save = () => store.set("preg:state", state);

const dueFromLmp = (lmp) => addDays(lmp, 280);
const lmpFromDue = (due) => addDays(due, -280);

function compute() {
  if (!state) return null;
  const lmp = new Date(state.lmpISO);
  const due = new Date(state.dueISO);
  const daysSinceLmp = diffDays(lmp, new Date());
  const week = clamp(Math.floor(daysSinceLmp / 7) + 1, 1, 42);
  const daysLeft = Math.max(0, diffDays(new Date(), due));
  const trimester = week <= 13 ? 1 : week <= 27 ? 2 : 3;
  const pct = clamp(daysSinceLmp / 280 * 100, 0, 100);
  return { lmp, due, week, daysLeft, trimester, pct };
}

function render() {
  const c = compute();
  if (!c) {
    $("#pregSetup").hidden = false;
    $("#pregOverview").hidden = true;
    $("#pregMilestone").hidden = true;
    $("#pregChecklist").hidden = true;
    $("#pregClear").hidden = true;
    return;
  }
  $("#pregSetup").hidden = true;
  $("#pregOverview").hidden = false;
  $("#pregMilestone").hidden = false;
  $("#pregChecklist").hidden = false;
  $("#pregClear").hidden = false;

  $("#pregWeek").textContent = c.week;
  $("#pregTri").textContent = `Trimester ${c.trimester}`;
  $("#pregFill").style.width = c.pct + "%";
  $("#pregDueOut").textContent = fmtDate(c.due, { year: "numeric", month: "long", day: "numeric" });
  $("#pregDaysLeft").textContent = c.daysLeft + " days";

  const info = WEEK_INFO[c.week] || (c.week < 4 ? ["grain of rice", "Very early — cells are dividing rapidly."] : ["newborn", "Your little one has arrived!"]);
  $("#pregSize").textContent = `about a ${info[0]}`;
  $("#milestoneTitle").textContent = `Week ${c.week} — your baby is about the size of a ${info[0]}`;
  $("#milestoneBody").textContent = info[1];

  const tips = TIPS[c.trimester] || [];
  $("#milestoneTips").innerHTML = tips.map(t => `<div class="tip">${t}</div>`).join("");

  const todoKey = "preg:todo:" + c.trimester;
  const done = new Set(store.get(todoKey, []));
  $("#pregTodo").innerHTML = TODO_BY_TRI[c.trimester].map((t, i) => {
    const id = `${c.trimester}-${i}`;
    const isDone = done.has(id);
    return `<li class="${isDone ? "done" : ""}" data-id="${id}"><input type="checkbox" name="todo-${id}" ${isDone ? "checked" : ""}/> ${t}</li>`;
  }).join("");
  $("#pregTodo").onclick = (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    const id = li.dataset.id;
    const cur = new Set(store.get(todoKey, []));
    if (cur.has(id)) cur.delete(id); else cur.add(id);
    store.set(todoKey, [...cur]);
    render();
  };
}

function bind() {
  $("#pregSave").addEventListener("click", () => {
    const lmp = $("#pregLmp").value;
    const due = $("#pregDue").value;
    if (lmp) state = { lmpISO: lmp, dueISO: toLocalISO(dueFromLmp(new Date(lmp))) };
    else if (due) state = { dueISO: due, lmpISO: toLocalISO(lmpFromDue(new Date(due))) };
    else { toast("Enter a date to begin"); return; }
    save(); render();
    toast("Tracking started");
  });
  $("#pregReset").addEventListener("click", () => {
    if (!confirm("Edit your dates? Your milestone data stays.")) return;
    $("#pregSetup").hidden = false;
    $("#pregOverview").hidden = true;
    $("#pregMilestone").hidden = true;
    $("#pregChecklist").hidden = true;
    if (state) { $("#pregLmp").value = state.lmpISO; $("#pregDue").value = state.dueISO; }
  });
  $("#pregClear").addEventListener("click", () => {
    if (!confirm("Clear all pregnancy data?")) return;
    state = null; save(); render();
  });
}

export function initPregnancy() {
  bind();
  render();
}
