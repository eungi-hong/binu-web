/* Anonymous forum: compose, filter, like, comment, delete.
 *
 * Posts are stored in Firestore when `js/firebase.js` is configured.
 * Otherwise they fall back to localStorage (single-device), so the app
 * keeps working in dev without any setup. */
import { $, $$, uid, escapeHtml, relTime, store, toast } from "./utils.js";
import { classify } from "./sentiment.js";
import {
  isConfigured, subscribePosts, createPost, likePost, addComment, deletePost
} from "./firebase.js";

const seed = () => [{
  id: uid(), title: "Campus pads ran out again — where do you usually go?",
  body: "The library dispenser has been empty all week. I felt so anxious about it before I found a kind stranger outside Engineering. Where do you all turn when it happens?",
  tags: ["question"], sentiment: "negative", likes: 12, ts: Date.now() - 3600e3 * 22,
  comments: [{ id: uid(), body: "Health centre at UHC always has spares — just walk in.", ts: Date.now() - 3600e3 * 20 }]
}, {
  id: uid(), title: "First cycle after getting off the pill — what helped you?",
  body: "Mood swings have been rough. Any routines that made things gentler? I'd love to hear your stories.",
  tags: ["story", "advice"], sentiment: "neutral", likes: 8, ts: Date.now() - 3600e3 * 48,
  comments: []
}, {
  id: uid(), title: "Finally told my partner I was scared — it helped so much",
  body: "I was anxious about bringing it up, but he listened without judgement and even asked how to help. I feel so supported and grateful. If you're on the fence about telling someone — you're not alone.",
  tags: ["support"], sentiment: "positive", likes: 31, ts: Date.now() - 3600e3 * 6,
  comments: [{ id: uid(), body: "Love this. Communication really is everything.", ts: Date.now() - 3600e3 * 3 }]
}];

const useRemote = isConfigured();

let posts = useRemote ? [] : store.get("forum:posts", seed());
let filter = "all";
let query = "";
const selectedTags = new Set();
const openComments = new Set();
const likedIds = new Set(store.get("forum:liked", [])); // per-user, always local

const saveLocal = () => store.set("forum:posts", posts);
const saveLiked = () => store.set("forum:liked", [...likedIds]);

function render() {
  const list = $("#postList");
  if (!list) return;

  const q = query.trim().toLowerCase();
  const filtered = posts
    .filter(p => filter === "all" || p.sentiment === filter)
    .filter(p => !q || (p.title + " " + p.body).toLowerCase().includes(q))
    .sort((a, b) => b.ts - a.ts);

  if (!filtered.length) {
    list.innerHTML = `<div class="glass panel" style="text-align:center;color:var(--mute)">No posts match your filters yet — try writing the first one.</div>`;
    return;
  }

  list.innerHTML = filtered.map(p => {
    const liked = likedIds.has(p.id);
    return `
      <article class="post" data-id="${p.id}">
        <div class="post-head">
          <span>Anonymous</span>·<span>${relTime(p.ts)}</span>
          <span class="badge ${p.sentiment}">${p.sentiment}</span>
          ${(p.tags || []).map(t => `<span class="badge neutral">#${t}</span>`).join("")}
        </div>
        <h3>${escapeHtml(p.title)}</h3>
        <p class="post-body">${escapeHtml(p.body)}</p>
        <div class="post-footer">
          <button class="icon-btn like ${liked ? "liked" : ""}" data-act="like">♥ ${p.likes ?? 0}</button>
          <button class="icon-btn" data-act="toggle-comments">💬 ${(p.comments || []).length}</button>
          <span class="spacer"></span>
          <button class="icon-btn" data-act="delete" title="Delete">✕</button>
        </div>
        <div class="comments${openComments.has(p.id) ? " open" : ""}">
          ${(p.comments || []).map(c => `
            <div class="comment">
              <div class="comment-meta">Anonymous · ${relTime(c.ts)}</div>
              ${escapeHtml(c.body)}
            </div>
          `).join("")}
          <form class="comment-form" data-act="comment">
            <input type="text" name="reply" placeholder="Reply kindly…" maxlength="400" required />
            <button class="btn ghost" type="submit">Reply</button>
          </form>
        </div>
      </article>
    `;
  }).join("");
}

function setPosts(next) {
  posts = next;
  render();
}

function bindComposer() {
  const form = $("#postForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("#postTitle").value.trim();
    const body = $("#postBody").value.trim();
    if (!title || !body) return;
    const { label } = classify(title + " " + body);
    const draft = {
      title, body,
      tags: [...selectedTags],
      sentiment: label,
      likes: 0,
      comments: [],
    };

    try {
      if (useRemote) {
        await createPost(draft);
        // onSnapshot will update the list
      } else {
        posts.unshift({ id: uid(), ...draft, ts: Date.now() });
        saveLocal();
        render();
      }
      form.reset();
      selectedTags.clear();
      $$("#postTagChips .chip").forEach(c => c.classList.remove("selected"));
      $("#sentimentPreview").innerHTML = "";
      toast("Posted anonymously");
    } catch (err) {
      console.error("[forum] create failed", err);
      toast("Couldn't post — check your connection");
    }
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
}

function bindFilters() {
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
}

function bindList() {
  const list = $("#postList");

  list.addEventListener("click", async (e) => {
    const postEl = e.target.closest(".post");
    if (!postEl) return;
    const id = postEl.dataset.id;
    const p = posts.find(x => x.id === id);
    if (!p) return;
    const act = e.target.dataset.act;

    if (act === "like") {
      const wasLiked = likedIds.has(id);
      if (wasLiked) likedIds.delete(id); else likedIds.add(id);
      saveLiked();
      const delta = wasLiked ? -1 : 1;
      if (useRemote) {
        try { await likePost(id, delta); }
        catch (err) { console.error("[forum] like failed", err); toast("Couldn't save like"); }
      } else {
        p.likes = (p.likes ?? 0) + delta;
        saveLocal();
        render();
      }
    } else if (act === "toggle-comments") {
      if (openComments.has(id)) openComments.delete(id);
      else openComments.add(id);
      postEl.querySelector(".comments").classList.toggle("open");
    } else if (act === "delete") {
      openComments.delete(id);
      if (useRemote) {
        try { await deletePost(id); }
        catch (err) { console.error("[forum] delete failed", err); toast("Couldn't delete"); }
      } else {
        posts = posts.filter(x => x.id !== id);
        saveLocal();
        render();
      }
    }
  });

  list.addEventListener("submit", async (e) => {
    if (!e.target.matches('form[data-act="comment"]')) return;
    e.preventDefault();
    const postEl = e.target.closest(".post");
    const id = postEl.dataset.id;
    const input = e.target.querySelector("input");
    const body = input.value.trim();
    if (!body) return;
    const comment = { id: uid(), body, ts: Date.now() };
    openComments.add(id);
    input.value = "";

    if (useRemote) {
      try { await addComment(id, comment); }
      catch (err) { console.error("[forum] comment failed", err); toast("Couldn't reply"); }
    } else {
      const p = posts.find(x => x.id === id);
      p.comments.push(comment);
      saveLocal();
      render();
    }
  });
}

function showSetupBanner() {
  const banner = $("#forumBanner");
  if (!banner) return;
  banner.hidden = false;
  banner.innerHTML =
    `Forum is running in local-only mode. Add your Firebase config in ` +
    `<code>js/firebase.js</code> to share posts across devices.`;
}

export function initForum() {
  bindComposer();
  bindFilters();
  bindList();

  if (useRemote) {
    subscribePosts(setPosts);
  } else {
    showSetupBanner();
    render();
  }
}
