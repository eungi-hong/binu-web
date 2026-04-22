/* Firebase Firestore backend for the forum.
 *
 * SETUP (one-time, ~3 minutes):
 *   1. Create a Firebase project at https://console.firebase.google.com
 *   2. In "Project settings → Your apps", register a Web app and copy the
 *      snippet it gives you into the `firebaseConfig` object below.
 *   3. In "Build → Firestore Database", click "Create database" and start
 *      in test mode for dev. Before going public, paste these rules:
 *
 *        rules_version = '2';
 *        service cloud.firestore {
 *          match /databases/{database}/documents {
 *            match /posts/{postId} {
 *              // anonymous forum — anyone reads, anyone writes small payloads
 *              allow read: if true;
 *              allow create: if request.resource.data.title is string
 *                         && request.resource.data.title.size() <= 120
 *                         && request.resource.data.body is string
 *                         && request.resource.data.body.size() <= 4000;
 *              allow update, delete: if true; // tighten when you add auth
 *            }
 *          }
 *        }
 *
 * The `firebaseConfig` values are safe to commit — Firestore security is
 * enforced by rules, not by hiding the API key.
 * If the placeholders below are left in place, the forum falls back to
 * localStorage so the app still works out of the box. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, arrayUnion, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5rNMZJNE-t1KqpnzjqnMG859dSv6mlso",
  authDomain: "binu-web.firebaseapp.com",
  projectId: "binu-web",
  storageBucket: "binu-web.firebasestorage.app",
  messagingSenderId: "131267347127",
  appId: "1:131267347127:web:cd9650763c5008f34d4332"
};

export const isConfigured = () =>
  !Object.values(firebaseConfig).some((v) => String(v).includes("REPLACE_ME"));

const app = isConfigured() ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;
const postsCol = () => collection(db, "posts");
const postDoc = (id) => doc(db, "posts", id);

export function subscribePosts(onChange) {
  if (!db) return () => {};
  const q = query(postsCol(), orderBy("ts", "desc"));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function createPost(post) {
  return addDoc(postsCol(), { ...post, ts: Date.now() });
}

export function likePost(id, delta) {
  return updateDoc(postDoc(id), { likes: increment(delta) });
}

export function addComment(id, comment) {
  return updateDoc(postDoc(id), { comments: arrayUnion(comment) });
}

export function deletePost(id) {
  return deleteDoc(postDoc(id));
}
