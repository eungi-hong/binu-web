/* HeraHub: curated education cards with category filter. */
import { $ } from "./utils.js";

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
  $("#heraFilters").innerHTML = cats.map(c =>
    `<button class="chip ${c === activeCat ? "active" : ""}" data-cat="${c}">${c}</button>`
  ).join("");
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

export function initHeraHub() {
  bind();
  render();
}
