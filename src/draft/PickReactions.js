import React, { useState, useEffect } from 'react';
import { db, ref, onValue } from '../firebase';
import { getDatabase, update } from 'firebase/database';

const REACTIONS = [
  { emoji: '\uD83D\uDD25', label: 'Fire' },
  { emoji: '\uD83D\uDE2C', label: 'Reach' },
  { emoji: '\uD83D\uDC40', label: 'Eyes' },
  { emoji: '\uD83D\uDC4D', label: 'Nice' },
  { emoji: '\uD83D\uDE02', label: 'Lol' },
];

function PickReactions({ draftId, pickIndex, currentUser }) {
  const [reactions, setReactions] = useState({});
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!draftId || pickIndex == null) return;
    const reactRef = ref(db, `drafts/${draftId}/reactions/${pickIndex}`);
    const unsub = onValue(reactRef, (snapshot) => {
      setReactions(snapshot.val() || {});
    });
    return () => unsub();
  }, [draftId, pickIndex]);

  const addReaction = (emoji) => {
    if (!currentUser) return;
    const reactRef = ref(db, `drafts/${draftId}/reactions/${pickIndex}`);
    const current = reactions[emoji] || [];
    if (current.includes(currentUser.ownerId)) return; // already reacted
    update(reactRef, { [emoji]: [...current, currentUser.ownerId] });
    setShowPicker(false);
  };

  const reactionCounts = Object.entries(reactions).filter(([k, v]) => Array.isArray(v) && v.length > 0);

  return (
    <div className="pick-reactions">
      {reactionCounts.map(([emoji, users]) => (
        <span key={emoji} className={`pick-reaction ${users.includes(currentUser?.ownerId) ? 'mine' : ''}`} onClick={() => addReaction(emoji)}>
          {emoji} {users.length}
        </span>
      ))}
      <button className="pick-reaction-add" onClick={() => setShowPicker(!showPicker)}>+</button>
      {showPicker && (
        <div className="pick-reaction-picker">
          {REACTIONS.map(r => (
            <button key={r.emoji} className="pick-reaction-option" onClick={() => addReaction(r.emoji)} title={r.label}>
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { REACTIONS };
export default PickReactions;
