import React from 'react';
import { useDraft } from './DraftContext';
import DraftPinLogin from './DraftPinLogin';
import DraftLobby from './DraftLobby';
import SnakeDraft from './SnakeDraft';
import UploadDraft from './UploadDraft';
import DraftComplete from './DraftComplete';

function DraftRouter({ onDraftComplete }) {
  const { draftState, currentUser, loading } = useDraft();

  if (loading) {
    return (
      <div className="draft-loading">
        <div className="draft-spinner"></div>
        <p>Connecting to draft...</p>
      </div>
    );
  }

  if (!draftState) {
    return (
      <div className="draft-loading">
        <p>No draft found. Ask the commissioner to create one.</p>
      </div>
    );
  }

  const status = draftState.config?.status || 'waiting';
  const draftType = draftState.config?.type || 'snake';

  // Not logged in → show PIN login
  if (!currentUser) {
    return <DraftPinLogin />;
  }

  // Draft complete → show results
  if (status === 'complete') {
    return <DraftComplete onContinue={onDraftComplete} />;
  }

  // Upload draft type → show upload UI (commissioner only, no lobby needed)
  if (draftType === 'upload') {
    return <UploadDraft />;
  }

  // Draft waiting → show lobby
  if (status === 'waiting' || status === 'paused') {
    return <DraftLobby />;
  }

  // Draft active → show draft board
  if (status === 'active') {
    if (draftType === 'snake') return <SnakeDraft />;
    // if (draftType === 'auction') return <AuctionDraft />;
    return <SnakeDraft />; // default fallback
  }

  return <DraftLobby />;
}

export default DraftRouter;
