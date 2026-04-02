import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, push, update, remove } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDGFoLFHUuK_FZQkvIlKJ_VMCnsQtUoK_4",
  authDomain: "draftpool-30e4a.firebaseapp.com",
  databaseURL: "https://draftpool-30e4a-default-rtdb.firebaseio.com",
  projectId: "draftpool-30e4a",
  storageBucket: "draftpool-30e4a.firebasestorage.app",
  messagingSenderId: "1051667041146",
  appId: "1:1051667041146:web:6b1766daa7009973f5a4c3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ── Draft Helpers ─────────────────────────────────────────────

// Create a new draft
// Expects: { config: {...}, owners: {...}, availablePlayers: [...] }
// Sanitize keys for Firebase (no . # $ / [ ])
const sanitizeKey = (key) => key.replace(/[.#$/\[\]]/g, '_');

export async function createDraft(draftId, data) {
  // Sanitize playerData keys (names like "J.J. Spaun" have dots)
  let sanitizedPlayerData = null;
  if (data.playerData) {
    sanitizedPlayerData = {};
    Object.entries(data.playerData).forEach(([name, val]) => {
      sanitizedPlayerData[sanitizeKey(name)] = { ...val, originalName: name };
    });
  }

  await set(ref(db, `drafts/${draftId}`), {
    config: data.config || {},
    owners: data.owners || {},
    availablePlayers: data.availablePlayers || [],
    playerData: sanitizedPlayerData,
    picks: [],
    currentPick: null,
    createdAt: Date.now()
  });
  return draftId;
}

// Subscribe to full draft state (real-time)
export function subscribeToDraft(draftId, callback) {
  const draftRef = ref(db, `drafts/${draftId}`);
  return onValue(draftRef, (snapshot) => {
    callback(snapshot.val());
  });
}

// Get draft state once
export async function getDraft(draftId) {
  const snapshot = await get(ref(db, `drafts/${draftId}`));
  return snapshot.val();
}

// Make a pick
export async function makePick(draftId, pickData) {
  const draft = await getDraft(draftId);
  if (!draft) throw new Error('Draft not found');

  const picks = draft.picks || [];
  picks.push(pickData);

  // Remove player from available list
  const available = (draft.availablePlayers || []).filter(p => p !== pickData.player);

  // Add player to owner's team
  const ownerTeams = draft.owners[pickData.ownerId]?.teams || [];
  ownerTeams.push(pickData.player);

  await update(ref(db, `drafts/${draftId}`), {
    picks,
    availablePlayers: available,
    [`owners/${pickData.ownerId}/teams`]: ownerTeams,
    currentPick: pickData.nextPick || null
  });
}

// Update draft config/status
export async function updateDraftConfig(draftId, updates) {
  await update(ref(db, `drafts/${draftId}/config`), updates);
}

// Update current pick (for timer, advancing turns)
export async function updateCurrentPick(draftId, currentPick) {
  await update(ref(db, `drafts/${draftId}`), { currentPick });
}

// Mark owner as online/offline
export async function setOwnerOnline(draftId, ownerId, isOnline) {
  const updates = { online: isOnline, lastSeen: Date.now() };
  // Clear AFK flag when owner comes back online
  if (isOnline) updates.afk = false;
  await update(ref(db, `drafts/${draftId}/owners/${ownerId}`), updates);
}

export async function setOwnerAFK(draftId, ownerId, isAfk) {
  await update(ref(db, `drafts/${draftId}/owners/${ownerId}`), { afk: isAfk });
}

// Upload a completed draft (commissioner manual entry)
export async function uploadDraft(draftId, ownerTeams) {
  const updates = {};
  Object.entries(ownerTeams).forEach(([ownerId, teams]) => {
    updates[`owners/${ownerId}/teams`] = teams;
  });
  updates['config/status'] = 'complete';
  updates['availablePlayers'] = [];
  await update(ref(db, `drafts/${draftId}`), updates);
}

// List all drafts (shallow - just keys and config, not full player data)
export async function listDrafts() {
  const snapshot = await get(ref(db, 'drafts'));
  return snapshot.val() || {};
}

// Check if a specific draft exists (efficient single-key lookup)
export async function getDraftExists(draftId) {
  const snapshot = await get(ref(db, `drafts/${draftId}/config`));
  return snapshot.val();
}

// Delete a draft
export async function deleteDraft(draftId) {
  await remove(ref(db, `drafts/${draftId}`));
}

export { db, ref, onValue };
