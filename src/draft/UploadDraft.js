import React, { useState } from 'react';
import { useDraft } from './DraftContext';

function UploadDraft() {
  const { draftState, uploadDraftResults, isCommissioner } = useDraft();
  const [assignments, setAssignments] = useState({});
  const [uploading, setUploading] = useState(false);

  const owners = draftState?.owners || {};
  const available = draftState?.availablePlayers || [];
  const ownerList = Object.entries(owners).map(([id, data]) => ({ id, ...data }));
  const rosterSize = draftState?.config?.rosterSize || 10;

  // Track which players are already assigned
  const assignedPlayers = new Set(Object.values(assignments).flat());
  const unassigned = available.filter(p => !assignedPlayers.has(p));

  const addPlayer = (ownerId, player) => {
    const current = assignments[ownerId] || [];
    if (current.length >= rosterSize) return;
    setAssignments(prev => ({
      ...prev,
      [ownerId]: [...(prev[ownerId] || []), player]
    }));
  };

  const removePlayer = (ownerId, player) => {
    setAssignments(prev => ({
      ...prev,
      [ownerId]: (prev[ownerId] || []).filter(p => p !== player)
    }));
  };

  const handleSubmit = async () => {
    // Validate all owners have rosters
    const incomplete = ownerList.filter(o => (assignments[o.id] || []).length === 0);
    if (incomplete.length > 0) {
      alert(`These owners have no players assigned: ${incomplete.map(o => o.name).join(', ')}`);
      return;
    }
    setUploading(true);
    try {
      await uploadDraftResults(assignments);
    } catch (err) {
      alert('Error uploading draft: ' + err.message);
    }
    setUploading(false);
  };

  if (!isCommissioner) {
    return (
      <div className="upload-draft">
        <div className="draft-login-card">
          <h2>Upload Draft</h2>
          <p>Only the commissioner can upload draft results.</p>
        </div>
      </div>
    );
  }

  const totalAssigned = Object.values(assignments).flat().length;

  return (
    <div className="upload-draft">
      <div className="upload-header">
        <h2>Upload Draft</h2>
        <p>Assign players to each owner manually. {totalAssigned} players assigned, {unassigned.length} remaining.</p>
      </div>

      <div className="upload-grid">
        {/* Owner columns */}
        <div className="upload-owners">
          {ownerList.map(owner => {
            const ownerPlayers = assignments[owner.id] || [];
            return (
              <div key={owner.id} className="upload-owner-card">
                <div className="upload-owner-header">
                  <span className="upload-owner-dot" style={{ background: owner.color }}></span>
                  <span className="upload-owner-name">{owner.name}</span>
                  <span className="upload-owner-count">{ownerPlayers.length}/{rosterSize}</span>
                </div>
                <div className="upload-owner-players">
                  {ownerPlayers.map(player => (
                    <div key={player} className="upload-player-chip">
                      <span>{player}</span>
                      <button className="upload-remove" onClick={() => removePlayer(owner.id, player)}>&times;</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Available players */}
        <div className="upload-available">
          <div className="upload-available-title">Available Players ({unassigned.length})</div>
          <div className="upload-player-list">
            {unassigned.map(player => (
              <div key={player} className="upload-available-player">
                <span>{player}</span>
                <div className="upload-assign-btns">
                  {ownerList.map(owner => (
                    <button
                      key={owner.id}
                      className="upload-assign-btn"
                      style={{ background: owner.color }}
                      onClick={() => addPlayer(owner.id, player)}
                      disabled={(assignments[owner.id] || []).length >= rosterSize}
                      title={`Assign to ${owner.name}`}
                    >
                      {owner.initials}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button className="draft-submit-btn" onClick={handleSubmit} disabled={uploading}>
        {uploading ? 'Saving...' : 'Save Draft Results'}
      </button>
    </div>
  );
}

export default UploadDraft;
