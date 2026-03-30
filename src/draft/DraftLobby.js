import React from 'react';
import { useDraft } from './DraftContext';

function DraftLobby() {
  const { draftState, currentUser, startDraft, isCommissioner, logout } = useDraft();
  const config = draftState?.config || {};
  const owners = draftState?.owners || {};
  const ownerList = Object.entries(owners).map(([id, data]) => ({ id, ...data }));
  const onlineCount = ownerList.filter(o => o.online).length;
  const totalOwners = ownerList.length;

  const draftTypeLabel = config.type === 'snake' ? 'Snake Draft' : config.type === 'auction' ? 'Auction Draft' : 'Draft';

  return (
    <div className="draft-lobby">
      <div className="draft-lobby-card">
        <h2>{config.name || 'Draft Lobby'}</h2>
        <p className="draft-subtitle">{draftTypeLabel} &middot; {config.rosterSize || '?'} picks per person &middot; {config.timerSeconds || 120}s timer</p>

        <div className="lobby-status">
          <span className="lobby-online">{onlineCount}/{totalOwners} online</span>
        </div>

        <div className="lobby-owners">
          {ownerList.map(owner => (
            <div key={owner.id} className={`lobby-owner ${owner.online ? 'online' : ''} ${owner.id === currentUser?.ownerId ? 'you' : ''}`}>
              <div className="lobby-owner-dot" style={{ background: owner.online ? '#22c55e' : '#555' }}></div>
              <span className="lobby-owner-avatar" style={{ background: owner.color }}>{owner.initials}</span>
              <span className="lobby-owner-name">
                {owner.name}
                {owner.id === currentUser?.ownerId && <span className="lobby-you-badge">You</span>}
                {owner.id === config.commissioner && <span className="lobby-comm-badge">Commissioner</span>}
              </span>
              <span className="lobby-owner-status">{owner.online ? 'Ready' : 'Offline'}</span>
            </div>
          ))}
        </div>

        {config.draftOrder && (
          <div className="lobby-order">
            <div className="lobby-order-title">Draft Order</div>
            <div className="lobby-order-list">
              {config.draftOrder.map((ownerId, idx) => {
                const owner = owners[ownerId];
                return (
                  <div key={ownerId} className="lobby-order-item">
                    <span className="lobby-order-num">{idx + 1}</span>
                    <span className="lobby-order-dot" style={{ background: owner?.color || '#555' }}></span>
                    <span>{owner?.name || ownerId}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="lobby-actions">
          {isCommissioner && (
            <button className="draft-start-btn" onClick={startDraft} disabled={onlineCount < 1}>
              Start Draft
            </button>
          )}
          {!isCommissioner && (
            <p className="lobby-waiting">Waiting for the commissioner to start the draft...</p>
          )}
          <button className="draft-logout-btn" onClick={logout}>Leave Lobby</button>
        </div>
      </div>
    </div>
  );
}

export default DraftLobby;
