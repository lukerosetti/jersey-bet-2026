import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToDraft, makePick as firebaseMakePick, updateCurrentPick, setOwnerOnline, createDraft, uploadDraft as firebaseUploadDraft, updateDraftConfig } from '../firebase';
import { saveMyPool } from './PoolSelect';
import { getSnakeOrder, getCurrentPick, getAutoPick } from './draftLogic';
import { applyTheme } from './draftTemplates';

const DraftContext = createContext(null);

export function DraftProvider({ draftId, children }) {
  const [draftState, setDraftState] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // { ownerId, name, pin }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subscribe to real-time draft updates from Firebase
  useEffect(() => {
    if (!draftId) { setLoading(false); return; }
    const unsubscribe = subscribeToDraft(draftId, (data) => {
      setDraftState(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [draftId]);

  // Apply tournament theme when draft loads with a templateId
  const themeApplied = useRef(false);
  useEffect(() => {
    if (draftState?.config?.templateId && !themeApplied.current) {
      applyTheme(draftState.config.templateId);
      themeApplied.current = true;
    }
  }, [draftState]);

  // Set owner online status
  useEffect(() => {
    if (!draftId || !currentUser) return;
    setOwnerOnline(draftId, currentUser.ownerId, true);
    const handleBeforeUnload = () => setOwnerOnline(draftId, currentUser.ownerId, false);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      handleBeforeUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [draftId, currentUser]);

  // Restore session from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('draftUser');
    if (saved) {
      try { setCurrentUser(JSON.parse(saved)); } catch {}
    }
  }, []);

  // Login with PIN
  const login = useCallback((ownerId, pin) => {
    if (!draftState?.owners?.[ownerId]) return { success: false, error: 'Owner not found' };
    const ownerPin = draftState.owners[ownerId].pin;
    // If owner has a PIN set, require it. If no PIN, allow direct login.
    if (ownerPin && ownerPin !== pin) return { success: false, error: 'Wrong PIN' };
    const user = { ownerId, name: draftState.owners[ownerId].name, pin };
    setCurrentUser(user);
    sessionStorage.setItem('draftUser', JSON.stringify(user));
    // Save pool identity for dashboard
    const config = draftState.config || {};
    saveMyPool(draftId, {
      name: config.name || draftId,
      ownerId,
      ownerName: draftState.owners[ownerId].name,
      sport: config.sport || '',
      templateId: config.templateId || ''
    });
    return { success: true };
  }, [draftState]);

  // Claim an open slot (new user joining)
  const claimSlot = useCallback(async (slotId, name) => {
    if (!draftId || !draftState?.owners?.[slotId]) throw new Error('Invalid slot');
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const ownerId = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    // Update the slot in Firebase
    const { update, ref: dbRef } = await import('firebase/database');
    const { db } = await import('../firebase');

    const existingSlot = draftState.owners[slotId];
    await update(dbRef(db, `drafts/${draftId}/owners/${slotId}`), {
      name,
      initials,
      claimed: true,
      color: existingSlot.color
    });

    // Commissioner is set at creation (slot_1). Don't override.

    // Auto-login after claiming
    const user = { ownerId: slotId, name, pin: '' };
    setCurrentUser(user);
    sessionStorage.setItem('draftUser', JSON.stringify(user));
    saveMyPool(draftId, { name: config.name || draftId, ownerId: slotId, ownerName: name, sport: config.sport || '', templateId: config.templateId || '' });
  }, [draftId, draftState]);

  const logout = useCallback(() => {
    if (currentUser && draftId) setOwnerOnline(draftId, currentUser.ownerId, false);
    setCurrentUser(null);
    sessionStorage.removeItem('draftUser');
  }, [currentUser, draftId]);

  // Make a pick (snake draft)
  const makeSnakePick = useCallback(async (player) => {
    if (!draftState || !currentUser) return;
    const config = draftState.config;
    const picks = draftState.picks || [];
    const ownerIds = config.draftOrder || Object.keys(draftState.owners);
    const snakeOrder = getSnakeOrder(ownerIds, config.rosterSize || 10);
    const current = getCurrentPick(snakeOrder, picks.length);
    if (!current || current.ownerId !== currentUser.ownerId) return;

    const nextPickInfo = getCurrentPick(snakeOrder, picks.length + 1);
    await firebaseMakePick(draftId, {
      round: current.round,
      pick: picks.length + 1,
      ownerId: current.ownerId,
      player,
      timestamp: Date.now(),
      nextPick: nextPickInfo ? {
        round: nextPickInfo.round,
        pickIndex: nextPickInfo.pickIndex,
        ownerId: nextPickInfo.ownerId,
        deadline: Date.now() + ((config.timerSeconds || 120) * 1000)
      } : null
    });

    // If draft is complete after this pick
    if (!nextPickInfo) {
      await updateDraftConfig(draftId, { status: 'complete' });
    }
  }, [draftState, currentUser, draftId]);

  // Auto-pick for timer expiry
  const autoPick = useCallback(async () => {
    if (!draftState) return;
    const available = draftState.availablePlayers || [];
    const pick = getAutoPick(available);
    if (pick) {
      const config = draftState.config;
      const picks = draftState.picks || [];
      const ownerIds = config.draftOrder || Object.keys(draftState.owners);
      const snakeOrder = getSnakeOrder(ownerIds, config.rosterSize || 10);
      const current = getCurrentPick(snakeOrder, picks.length);
      if (!current) return;

      const nextPickInfo = getCurrentPick(snakeOrder, picks.length + 1);
      await firebaseMakePick(draftId, {
        round: current.round,
        pick: picks.length + 1,
        ownerId: current.ownerId,
        player: pick,
        timestamp: Date.now(),
        autoPick: true,
        nextPick: nextPickInfo ? {
          round: nextPickInfo.round,
          pickIndex: nextPickInfo.pickIndex,
          ownerId: nextPickInfo.ownerId,
          deadline: Date.now() + ((config.timerSeconds || 120) * 1000)
        } : null
      });

      if (!nextPickInfo) {
        await updateDraftConfig(draftId, { status: 'complete' });
      }
    }
  }, [draftState, draftId]);

  // Start the draft (commissioner only)
  const startDraft = useCallback(async () => {
    if (!draftState) return;
    const config = draftState.config;
    const ownerIds = config.draftOrder || Object.keys(draftState.owners);
    const snakeOrder = getSnakeOrder(ownerIds, config.rosterSize || 10);
    const firstPick = snakeOrder[0];

    await updateDraftConfig(draftId, { status: 'active' });
    await updateCurrentPick(draftId, {
      round: firstPick.round,
      pickIndex: firstPick.pickIndex,
      ownerId: firstPick.ownerId,
      deadline: Date.now() + ((config.timerSeconds || 120) * 1000)
    });
  }, [draftState, draftId]);

  // Upload draft (commissioner)
  const uploadDraftResults = useCallback(async (ownerTeams) => {
    await firebaseUploadDraft(draftId, ownerTeams);
  }, [draftId]);

  // Check if current user is commissioner (first owner in draft order)
  const isCommissioner = currentUser && draftState?.config?.commissioner === currentUser.ownerId;

  const updateConfig = useCallback(async (updates) => {
    if (!draftId) return;
    await updateDraftConfig(draftId, updates);
  }, [draftId]);

  const value = {
    draftState,
    currentUser,
    loading,
    error,
    login,
    logout,
    claimSlot,
    makeSnakePick,
    autoPick,
    startDraft,
    uploadDraftResults,
    updateConfig,
    isCommissioner,
    draftId
  };

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used within DraftProvider');
  return ctx;
}
