import React from 'react';
import { useDraft } from './DraftContext';
import { registerDraftTournament, setActiveTournamentId } from '../tournaments/registry';
import DraftGrades from './DraftGrades';

function DraftComplete({ onContinue }) {
  const { draftState } = useDraft();
  const owners = draftState?.owners || {};
  const picks = draftState?.picks || [];
  const config = draftState?.config || {};
  const ownerList = Object.entries(owners).map(([id, data]) => ({ id, ...data }));

  const handleSaveAndContinue = () => {
    // Save draft results to localStorage for tournament use
    const draftResults = ownerList.map(owner => ({
      id: owner.id,
      name: owner.name,
      color: owner.color,
      initials: owner.initials,
      teams: owner.teams || []
    }));
    const tournamentId = config.tournamentId || 'draft';
    localStorage.setItem(`jerseyBetDraft_${tournamentId}`, JSON.stringify({ owners: draftResults, completedAt: Date.now() }));

    // Register as a switchable tournament in the registry
    registerDraftTournament({
      id: tournamentId,
      name: config.name || 'Draft Pool',
      sport: config.sport || 'custom',
      templateId: config.templateId || null,
      espnEventId: config.espnEventId || null,
      owners: draftResults,
    });

    // Set as active tournament and switch to it
    setActiveTournamentId(tournamentId);
    if (onContinue) onContinue(tournamentId);
  };

  return (
    <div className="draft-complete">
      <div className="draft-complete-header">
        <div className="draft-complete-icon">&#127942;</div>
        <h2>Draft Complete!</h2>
        <p>{config.name || 'Draft'} &middot; {picks.length} picks made</p>
      </div>

      <div className="draft-complete-rosters">
        {ownerList.map(owner => {
          const teams = owner.teams || [];
          return (
            <div key={owner.id} className="draft-complete-roster">
              <div className="draft-complete-roster-header">
                <span className="draft-complete-avatar" style={{ background: owner.color }}>{owner.initials}</span>
                <span className="draft-complete-name">{owner.name}</span>
                <span className="draft-complete-count">{teams.length} picks</span>
              </div>
              <div className="draft-complete-team-list">
                {teams.map((team, idx) => {
                  const pickInfo = picks.find(p => p.ownerId === owner.id && p.player === team);
                  return (
                    <div key={idx} className="draft-complete-team">
                      <span className="draft-complete-num">R{pickInfo?.round || '?'}</span>
                      <span className="draft-complete-team-name">{team}</span>
                      {pickInfo?.autoPick && <span className="auto-badge">Auto</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature #7: Draft Grades */}
      <DraftGrades owners={owners} picks={picks} playerData={draftState?.playerData || {}} />

      {/* Pick history */}
      {picks.length > 0 && (
        <div className="draft-complete-history">
          <h3>Pick History</h3>
          <div className="draft-history-list">
            {picks.map((pick, idx) => (
              <div key={idx} className="draft-history-item">
                <span className="draft-history-num">#{idx + 1}</span>
                <span className="draft-history-dot" style={{ background: owners[pick.ownerId]?.color || '#555' }}></span>
                <span className="draft-history-owner">{owners[pick.ownerId]?.name || pick.ownerId}</span>
                <span className="draft-history-player">{pick.player}</span>
                {pick.autoPick && <span className="auto-badge">Auto</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="draft-submit-btn" onClick={handleSaveAndContinue}>
        Continue to Tournament &#8594;
      </button>
    </div>
  );
}

export default DraftComplete;
