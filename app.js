/* ==========================================================================
 *  Binu — web version
 *  A single-page app with forum, period + pregnancy tracking, education,
 *  supply requests and emergency contacts. All state persists in localStorage.
 * ========================================================================== */

/* ---------- tiny helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmtDate = (d, opts = { month: "short", day: "numeric" }) =>
  new Date(d).toLocaleDateString(undefined, opts);
const toLocalISO = (d) => {
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
const todayISO = () => toLocalISO(new Date());
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const diffDays = (a, b) =>
  Math.round((new Date(b) - new Date(a)) / 86400000);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const uid = () => Math.random().toString(36).slice(2, 10);

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem("binu:" + key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(key, val) { localStorage.setItem("binu:" + key, JSON.stringify(val)); }
};

const toast = (msg) => {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2200);
};

/* ---------- router ---------- */
const routes = ["home", "forum", "period", "pregnancy", "herahub", "supply", "emergency"];
function go(route) {
  if (!routes.includes(route)) route = "home";
  $$(".route").forEach(r => r.classList.toggle("active", r.dataset.route === route));
  $$(".nav a").forEach(a => a.classList.toggle("active", a.dataset.route === route));
  if (location.hash !== "#" + route) history.replaceState(null, "", "#" + route);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-route]");
  if (!a) return;
  e.preventDefault();
  go(a.dataset.route);
});
window.addEventListener("hashchange", () => go(location.hash.slice(1)));

/* ---------- theme ---------- */
(function initTheme() {
  const saved = store.get("theme", null);
  if (saved) document.documentElement.dataset.theme = saved;
  $("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("theme", next);
  });
})();

/* ==========================================================================
 *  SENTIMENT — lexicon-based classifier, on-device
 *  Mirrors the Swift app: positive (> 0.1) / negative (< -0.1) / neutral.
 * ========================================================================== */
const SENTIMENT = {
  pos: ["love","great","amazing","happy","joy","grateful","safe","proud","calm","relief","hope","better","supported","wonderful","kind","strong","healed","confident","peaceful","excited","thank","brave"],
  neg: ["sad","pain","hurt","scared","anxious","anxiety","depressed","alone","lonely","angry","afraid","panic","worried","worry","cramp","cramps","bleeding","worst","stress","tired","exhausted","ashamed","embarrassed","confused","overwhelmed","sick","terrible","awful","hate","crying","cry"]
};
function classify(text) {
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  let score = 0;
  for (const w of words) {
    if (SENTIMENT.pos.includes(w)) score += 1;
    if (SENTIMENT.neg.includes(w)) score -= 1;
  }
  const norm = words.length ? score / Math.sqrt(words.length) : 0;
  if (norm > 0.25) return { label: "positive", score: norm };
  if (norm < -0.25) return { label: "negative", score: norm };
  return { label: "neutral", score: norm };
}

/* ==========================================================================
 *  FORUM
 * ========================================================================== */
const Forum = (() => {
  const seed = () => [{
    id: uid(), title: "Campus pads ran out again — where do you usually go?",
    body: "The library dispenser has been empty all week. I felt so anxious about it before I found a kind stranger outside Engineering. Where do you all turn when it happens?",
    tags: ["question"], sentiment: "negative", likes: 12, liked: false, ts: Date.now() - 3600e3*22,
    comments: [{ id: uid(), body: "Health centre at UHC always has spares — just walk in.", ts: Date.now() - 3600e3*20 }]
  }, {
    id: uid(), title: "First cycle after getting off the pill — what helped you?",
    body: "Mood swings have been rough. Any routines that made things gentler? I'd love to hear your stories.", tags: ["story","advice"], sentiment: "neutral", likes: 8, liked: false, ts: Date.now() - 3600e3*48,
    comments: []
  }, {
    id: uid(), title: "Finally told my partner I was scared — it helped so much",
    body: "I was anxious about bringing it up, but he listened without judgement and even asked how to help. I feel so supported and grateful. If you're on the fence about telling someone — you're not alone.",
    tags: ["support"], sentiment: "positive", likes: 31, liked: false, ts: Date.now() - 3600e3*6,
    comments: [{ id: uid(), body: "Love this. Communication really is everything.", ts: Date.now() - 3600e3*3 }]
  }];

  let posts = store.get("forum:posts", seed());
  let filter = "all";
  let query = "";
  let selectedTags = new Set();
  const save = () => store.set("forum:posts", posts);

  function render() {
    const list = $("#postList");
    const q = query.trim().toLowerCase();
    const filtered = posts
      .filter(p => filter === "all" || p.sentiment === filter)
      .filter(p => !q || (p.title + " " + p.body).toLowerCase().includes(q))
      .sort((a, b) => b.ts - a.ts);

    if (!filtered.length) {
      list.innerHTML = `<div class="glass panel" style="text-align:center;color:var(--mute)">No posts match your filters yet — try writing the first one.</div>`;
      return;
    }

    list.innerHTML = filtered.map(p => `
      <article class="post" data-id="${p.id}">
        <div class="post-head">
          <span>Anonymous</span>·<span>${relTime(p.ts)}</span>
          <span class="badge ${p.sentiment}">${p.sentiment}</span>
          ${p.tags.map(t => `<span class="badge neutral">#${t}</span>`).join("")}
        </div>
        <h3>${escape(p.title)}</h3>
        <p class="post-body">${escape(p.body)}</p>
        <div class="post-footer">
          <button class="icon-btn like ${p.liked ? "liked" : ""}" data-act="like">♥ ${p.likes}</button>
          <button class="icon-btn" data-act="toggle-comments">💬 ${p.comments.length}</button>
          <span class="spacer"></span>
          <button class="icon-btn" data-act="delete" title="Delete">✕</button>
        </div>
        <div class="comments">
          ${p.comments.map(c => `
            <div class="comment">
              <div class="comment-meta">Anonymous · ${relTime(c.ts)}</div>
              ${escape(c.body)}
            </div>
          `).join("")}
          <form class="comment-form" data-act="comment">
            <input type="text" placeholder="Reply kindly…" maxlength="400" required />
            <button class="btn ghost" type="submit">Reply</button>
          </form>
        </div>
      </article>
    `).join("");
  }

  function relTime(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
    return fmtDate(ts);
  }

  function escape(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[ch]));
  }

  function bind() {
    $("#postForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = $("#postTitle").value.trim();
      const body = $("#postBody").value.trim();
      if (!title || !body) return;
      const { label } = classify(title + " " + body);
      posts.unshift({
        id: uid(), title, body,
        tags: [...selectedTags],
        sentiment: label, likes: 0, liked: false, ts: Date.now(), comments: []
      });
      save();
      $("#postForm").reset();
      selectedTags.clear();
      $$("#postTagChips .chip").forEach(c => c.classList.remove("selected"));
      $("#sentimentPreview").innerHTML = "";
      render();
      toast("Posted anonymously");
    });

    $("#postBody").addEventListener("input", (e) => {
      const title = $("#postTitle").value;
      const body = e.target.value;
      if ((title + body).length < 8) { $("#sentimentPreview").innerHTML = ""; return; }
      const { label } = classify(title + " " + body);
      $("#sentimentPreview").innerHTML = `Tone <span class="badge ${label}">${label}</span>`;
    });

    $("#postTagChips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const tag = chip.dataset.tag;
      if (selectedTags.has(tag)) { selectedTags.delete(tag); chip.classList.remove("selected"); }
      else { selectedTags.add(tag); chip.classList.add("selected"); }
    });

    $(".filter-bar .chips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip.filter");
      if (!chip) return;
      $$(".chip.filter").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      filter = chip.dataset.filter;
      render();
    });

    $("#forumSearch").addEventListener("input", (e) => {
      query = e.target.value;
      render();
    });

    $("#postList").addEventListener("click", (e) => {
      const post = e.target.closest(".post");
      if (!post) return;
      const id = post.dataset.id;
      const p = posts.find(x => x.id === id);
      if (!p) return;
      const act = e.target.dataset.act;
      if (act === "like") {
        p.liked = !p.liked;
        p.likes += p.liked ? 1 : -1;
        save(); render();
      } else if (act === "toggle-comments") {
        post.querySelector(".comments").classList.toggle("open");
      } else if (act === "delete") {
        posts = posts.filter(x => x.id !== id);
        save(); render();
      }
    });

    $("#postList").addEventListener("submit", (e) => {
      if (!e.target.matches('form[data-act="comment"]')) return;
      e.preventDefault();
      const post = e.target.closest(".post");
      const p = posts.find(x => x.id === post.dataset.id);
      const input = e.target.querySelector("input");
      const body = input.value.trim();
      if (!body) return;
      p.comments.push({ id: uid(), body, ts: Date.now() });
      save(); render();
      post.querySelector(".comments").classList.add("open");
    });
  }

  return { init() { bind(); render(); } };
})();

/* ==========================================================================
 *  PERIOD TRACKER
 *  - `periods`: [{ start: "YYYY-MM-DD" }, ...] sorted ascending
 *  - `logs`: { "YYYY-MM-DD": { moods: [], symptoms: [], note: "" } }
 * ========================================================================== */
const Period = (() => {
  const MOODS = ["Calm","Happy","Anxious","Sad","Irritable","Low energy","Motivated"];
  const SYMPTOMS = ["Cramps","Headache","Bloating","Fatigue","Tender breasts","Acne","Backache","Nausea"];

  let periods = store.get("period:periods", []);
  let logs = store.get("period:logs", {});
  let viewMonth = new Date(); viewMonth.setDate(1);
  let selectedDate = todayISO();
  let pendingMoods = new Set();
  let pendingSymptoms = new Set();

  const save = () => { store.set("period:periods", periods); store.set("period:logs", logs); };

  function avgCycle() {
    if (periods.length < 2) return 28;
    const gaps = [];
    const sorted = [...periods].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i++) gaps.push(diffDays(sorted[i-1].start, sorted[i].start));
    return Math.round(gaps.reduce((a,b)=>a+b,0) / gaps.length);
  }

  function lastStart() {
    if (!periods.length) return null;
    return [...periods].sort((a,b) => b.start.localeCompare(a.start))[0].start;
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

    const dows = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
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

      // period days based on logged periods (5-day bleed)
      for (const p of periods) {
        const d0 = diffDays(p.start, iso);
        if (d0 >= 0 && d0 < 5) classes.push("period");
      }

      // predictions
      if (s) {
        // predicted next periods (up to 3 cycles ahead)
        for (let i = 1; i <= 3; i++) {
          const pStart = addDays(s.last, s.cycle * i);
          for (let k = 0; k < 5; k++) {
            if (iso === toLocalISO(addDays(pStart, k))) classes.push("predicted");
          }
        }
        // fertile window / ovulation
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
    $("#moodRow").innerHTML = MOODS.map(m => `<button type="button" class="mood ${pendingMoods.has(m) ? "on" : ""}" data-m="${m}">${m}</button>`).join("");
    $("#symptomRow").innerHTML = SYMPTOMS.map(s => `<button type="button" class="symptom ${pendingSymptoms.has(s) ? "on" : ""}" data-s="${s}">${s}</button>`).join("");
  }

  function renderLogList() {
    const entries = Object.entries(logs).sort((a,b) => b[0].localeCompare(a[0])).slice(0, 30);
    if (!entries.length) { $("#logList").innerHTML = `<li class="log-item" style="color:var(--mute)">No logs yet — note how you feel, and patterns will appear here.</li>`; return; }
    $("#logList").innerHTML = entries.map(([date, l]) => `
      <li class="log-item">
        <span class="log-date">${fmtDate(date)}</span>
        ${l.moods.map(m => `<span class="log-tags">· ${m}</span>`).join("")}
        ${l.symptoms.map(s => `<span class="log-tags">· ${s}</span>`).join("")}
        ${l.note ? `<div style="margin-top:4px;color:var(--mute)">“${escapeHtml(l.note)}”</div>` : ""}
      </li>
    `).join("");
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }

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

    $("#prevMonth").addEventListener("click", () => { viewMonth.setMonth(viewMonth.getMonth()-1); renderCalendar(); });
    $("#nextMonth").addEventListener("click", () => { viewMonth.setMonth(viewMonth.getMonth()+1); renderCalendar(); });

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

  return {
    init() {
      bind();
      setSelected(todayISO());
      renderSummary();
      renderCalendar();
      renderLogList();
      renderHero();
    }
  };
})();

/* ==========================================================================
 *  PREGNANCY TRACKER
 *  40-week timeline. Baby size & weekly milestones.
 * ========================================================================== */
const Pregnancy = (() => {
  // size/milestone data (abbreviated but covers weeks 4–40)
  const WEEK_INFO = {
    4:  ["poppy seed","Your baby is implanting — tiny but mighty."],
    5:  ["sesame seed","Neural tube is forming."],
    6:  ["lentil","Heart begins to beat — about 110 bpm."],
    7:  ["blueberry","Tiny arm and leg buds are emerging."],
    8:  ["kidney bean","Baby is moving, though too small to feel."],
    9:  ["grape","All essential organs have begun forming."],
    10: ["kumquat","Fingernails and hair follicles appear."],
    11: ["fig","Baby is nearly fully formed on a tiny scale."],
    12: ["lime","End of first trimester — morning sickness often eases."],
    13: ["lemon","Fingerprints are forming."],
    14: ["peach","Baby can make facial expressions."],
    15: ["apple","Baby can sense light through your belly."],
    16: ["avocado","Eyes can move and tiny bones harden."],
    17: ["pear","Baby is developing sweat glands."],
    18: ["bell pepper","You may feel the first flutter — ‘quickening’."],
    19: ["mango","Baby's senses are developing rapidly."],
    20: ["banana","Halfway there! Anatomy scan week."],
    21: ["carrot","Baby can taste what you taste."],
    22: ["spaghetti squash","Eyebrows are forming."],
    23: ["grapefruit","Baby can hear your voice and heartbeat."],
    24: ["cantaloupe","Viability milestone — lungs begin producing surfactant."],
    25: ["rutabaga","Baby responds to familiar voices."],
    26: ["scallion","Eyes open for the first time."],
    27: ["cauliflower","Brain activity is ramping up."],
    28: ["eggplant","Third trimester begins."],
    29: ["butternut squash","Baby's bones are fully formed but soft."],
    30: ["cabbage","Baby can regulate its own temperature."],
    31: ["coconut","Baby's five senses are all working."],
    32: ["jicama","Fingernails reach fingertips."],
    33: ["pineapple","Baby's immune system is maturing."],
    34: ["cantaloupe","Lungs are nearly mature."],
    35: ["honeydew","Baby is gaining weight quickly."],
    36: ["romaine lettuce","Baby drops lower into the pelvis."],
    37: ["swiss chard","Considered early term."],
    38: ["leek","Vernix and lanugo begin to shed."],
    39: ["watermelon","Full term — baby is ready any day."],
    40: ["small pumpkin","Due date! Every day now is a bonus gift."],
  };
  const TIPS = {
    1: ["Prenatal vitamins with folic acid daily.","Gentle hydration — aim for 8 cups.","Skip raw fish and soft cheeses."],
    2: ["Schedule the anatomy scan around week 20.","Gentle movement helps — walking or prenatal yoga.","Eat small frequent meals to manage heartburn."],
    3: ["Start thinking about the birth plan.","Count kicks daily from about week 28.","Pre-register at your birthing hospital."],
  };
  const TODO_BY_TRI = {
    1: ["Book first midwife appointment","Start prenatal vitamin","Tell your employer when ready","Research antenatal classes"],
    2: ["Book the 20-week anatomy scan","Plan maternity leave","Start a gentle exercise routine","Begin a birth plan draft"],
    3: ["Pack hospital bag by week 36","Install car seat","Write a postpartum support list","Stock freezer meals"]
  };

  let state = store.get("preg:state", null); // {lmpISO, dueISO}
  const save = () => store.set("preg:state", state);

  function dueFromLmp(lmp) { return addDays(lmp, 280); }
  function lmpFromDue(due) { return addDays(due, -280); }

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
      return `<li class="${isDone ? "done" : ""}" data-id="${id}"><input type="checkbox" ${isDone ? "checked" : ""}/> ${t}</li>`;
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

  return { init() { bind(); render(); } };
})();

/* ==========================================================================
 *  HERAHUB — curated education cards
 * ========================================================================== */
const HeraHub = (() => {
  const CARDS = [
    { cat: "Periods", icon: "🌸", title: "Understanding Your Menstrual Cycle",
      src: "HealthHub SG", summary: "A gentle primer on the four phases of the cycle and what's happening hormonally.",
      link: "https://www.healthhub.sg/live-healthy/understanding_your_menstrual_cycle" },
    { cat: "Periods", icon: "🩸", title: "Painful Periods: When to Seek Help",
      src: "NHS", summary: "Distinguishing typical cramps from signs of endometriosis or PCOS.",
      link: "https://www.nhs.uk/conditions/periods/period-pain/" },
    { cat: "Relationships", icon: "💛", title: "Supporting a Partner on Their Period",
      src: "UN Women", summary: "Empathy-first ways to show up — the asks partners say matter most.",
      link: "https://www.unwomen.org" },
    { cat: "Relationships", icon: "🗝️", title: "Consent: More Than Just Yes or No",
      src: "Planned Parenthood", summary: "Understanding enthusiastic, ongoing, and informed consent.",
      link: "https://www.plannedparenthood.org/learn/relationships/sexual-consent" },
    { cat: "Pregnancy", icon: "🤰", title: "Early Pregnancy: What to Expect",
      src: "Mayo Clinic", summary: "Symptoms, nutrition, and first-trimester checkpoints.",
      link: "https://www.mayoclinic.org/healthy-lifestyle/pregnancy-week-by-week" },
    { cat: "Pregnancy", icon: "🍼", title: "Postpartum Mental Health",
      src: "WHO", summary: "Recognising the difference between baby blues and postpartum depression.",
      link: "https://www.who.int/news-room/fact-sheets/detail/maternal-mental-health" },
    { cat: "Mental", icon: "🫶", title: "Managing Anxiety Through Your Cycle",
      src: "Mind.org.uk", summary: "Why anxiety can spike at certain cycle phases and what to try.",
      link: "https://www.mind.org.uk" },
    { cat: "Mental", icon: "☁️", title: "A Quiet Guide to Pelvic Floor Health",
      src: "HealthHub SG", summary: "Why it matters at every age, and gentle daily exercises.",
      link: "https://www.healthhub.sg" },
    { cat: "Safety", icon: "🛡️", title: "Knowing the Signs of Toxic Shock Syndrome",
      src: "CDC", summary: "Symptoms to watch for with tampon use, and safer practices.",
      link: "https://www.cdc.gov" },
    { cat: "Safety", icon: "📍", title: "Staying Safe on Campus After Dark",
      src: "Singapore Police Force", summary: "Practical steps: emergency contacts, share-location etiquette.",
      link: "https://www.police.gov.sg" },
    { cat: "Sexual Health", icon: "🌷", title: "Birth Control Options Compared",
      src: "Planned Parenthood", summary: "Hormonal vs non-hormonal, effectiveness, side effects.",
      link: "https://www.plannedparenthood.org/learn/birth-control" },
    { cat: "Sexual Health", icon: "🪷", title: "STI Screening: Who, When and Why",
      src: "HealthHub SG", summary: "A no-shame guide to when testing is recommended.",
      link: "https://www.healthhub.sg" },
  ];

  let activeCat = "All";

  function render() {
    const cats = ["All", ...new Set(CARDS.map(c => c.cat))];
    $("#heraFilters").innerHTML = cats.map(c => `<button class="chip ${c === activeCat ? "active" : ""}" data-cat="${c}">${c}</button>`).join("");
    const list = activeCat === "All" ? CARDS : CARDS.filter(c => c.cat === activeCat);
    $("#heraGrid").innerHTML = list.map(c => `
      <article class="hera-card">
        <div class="hera-img">${c.icon}</div>
        <div class="hera-body">
          <span class="src">${c.src}</span>
          <h3>${c.title}</h3>
          <p>${c.summary}</p>
          <a href="${c.link}" target="_blank" rel="noopener">Read more →</a>
        </div>
      </article>
    `).join("");
  }

  function bind() {
    $("#heraFilters").addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      activeCat = b.dataset.cat;
      render();
    });
  }

  return { init() { bind(); render(); } };
})();

/* ==========================================================================
 *  SUPPLY REQUESTS
 * ========================================================================== */
const Supply = (() => {
  const TTL_MS = 30 * 60 * 1000; // 30 minutes

  const seed = () => [
    { id: uid(), items: ["Pad"], location: "Engineering Block 2, Level 3 restroom", urgency: "high", ts: Date.now() - 7 * 60 * 1000, mine: false },
    { id: uid(), items: ["Pain relief","Heat pack"], location: "Central library, quiet zone", urgency: "med", ts: Date.now() - 18 * 60 * 1000, mine: false },
  ];

  let reqs = store.get("supply:reqs", seed());
  let selected = new Set();
  const save = () => store.set("supply:reqs", reqs);

  function prune() {
    const before = reqs.length;
    reqs = reqs.filter(r => Date.now() - r.ts < TTL_MS);
    if (reqs.length !== before) save();
  }

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

  function minsAgo(ts) {
    const m = Math.floor((Date.now() - ts) / 60000);
    return m < 1 ? "just now" : m + "m ago";
  }
  function labelFor(u) { return { low:"Not urgent", med:"Soon", high:"Urgent" }[u] || u; }

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

    // auto-refresh every minute so "X mins ago" stays fresh & expired items drop
    setInterval(() => render(), 60000);
  }

  return { init() { bind(); render(); } };
})();

/* ==========================================================================
 *  EMERGENCY CONTACTS
 * ========================================================================== */
const Emergency = (() => {
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
    $("#emergencyFilters").innerHTML = cats.map(c => `<button class="chip ${c === activeCat ? "active" : ""}" data-cat="${c}">${c}</button>`).join("");
    const list = activeCat === "All" ? CONTACTS : CONTACTS.filter(c => c.cat === activeCat);
    $("#emergencyGrid").innerHTML = list.map(c => `
      <article class="em-card">
        <div class="em-ic">${c.ic}</div>
        <h4>${c.name}</h4>
        <div class="em-meta">${c.note}</div>
        <a class="btn primary" href="tel:${c.number.replace(/\s+/g,"")}">Call ${c.number}</a>
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

  return { init() { bind(); render(); } };
})();

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  Forum.init();
  Period.init();
  Pregnancy.init();
  HeraHub.init();
  Supply.init();
  Emergency.init();
  go(location.hash.slice(1) || "home");
});
