import baseConfig from './march-madness-2026';

// Check for completed draft results and merge into tournament config
function loadWithDraftResults(config) {
  try {
    const draftKey = localStorage.getItem('jerseyBetActiveDraft');
    if (!draftKey) return config;
    const draft = JSON.parse(localStorage.getItem(`jerseyBetDraft_${draftKey}`));
    if (!draft?.owners || draft.owners.length === 0) return config;

    // Merge draft rosters into config owners
    const mergedOwners = draft.owners.map(draftOwner => {
      const existing = config.owners.find(o => o.id === draftOwner.id);
      return {
        ...(existing || {}),
        ...draftOwner,
        teams: draftOwner.teams || []
      };
    });

    return { ...config, owners: mergedOwners };
  } catch {
    return config;
  }
}

export default loadWithDraftResults(baseConfig);
