// Snake draft order: 1-2-3-4, 4-3-2-1, 1-2-3-4, ...
export function getSnakeOrder(draftOrder, totalRounds) {
  const picks = [];
  for (let round = 1; round <= totalRounds; round++) {
    const order = round % 2 === 1 ? [...draftOrder] : [...draftOrder].reverse();
    order.forEach((ownerId, idx) => {
      picks.push({ round, pickIndex: idx, ownerId });
    });
  }
  return picks;
}

// Get the current pick info from the snake order
export function getCurrentPick(snakeOrder, picksMade) {
  if (picksMade >= snakeOrder.length) return null; // draft complete
  return snakeOrder[picksMade];
}

// Get the next N picks for display
export function getUpcomingPicks(snakeOrder, picksMade, count = 8) {
  return snakeOrder.slice(picksMade, picksMade + count);
}

// Auto-pick: best available player by ranking (lowest index in availablePlayers = best)
export function getAutoPick(availablePlayers) {
  if (!availablePlayers || availablePlayers.length === 0) return null;
  return availablePlayers[0]; // first available = highest ranked
}

// Validate a pick
export function validatePick(player, availablePlayers, currentOwnerId, expectedOwnerId) {
  if (currentOwnerId !== expectedOwnerId) return { valid: false, error: 'Not your turn' };
  if (!availablePlayers.includes(player)) return { valid: false, error: 'Player not available' };
  return { valid: true };
}

// Calculate roster size based on participant count and available players
export function calculateRosterSize(numOwners, totalPlayers, maxPerOwner = null) {
  const natural = Math.floor(totalPlayers / numOwners);
  if (maxPerOwner) return Math.min(natural, maxPerOwner);
  return natural;
}

// Get owner's pick positions for display (which overall pick numbers they have)
export function getOwnerPickPositions(snakeOrder, ownerId) {
  return snakeOrder
    .map((pick, idx) => ({ ...pick, overall: idx + 1 }))
    .filter(pick => pick.ownerId === ownerId);
}

// Calculate draft progress
export function getDraftProgress(picksMade, totalPicks) {
  return {
    picksMade,
    totalPicks,
    percent: totalPicks > 0 ? Math.round((picksMade / totalPicks) * 100) : 0,
    isComplete: picksMade >= totalPicks
  };
}

// Auction: validate a bid
export function validateBid(amount, currentBid, ownerBudget, rosterSize, ownerTeamsCount, remainingPlayers) {
  if (amount <= currentBid) return { valid: false, error: 'Bid must be higher than current bid' };
  // Must have enough budget left to fill remaining roster slots at $1 each
  const slotsRemaining = rosterSize - ownerTeamsCount - 1; // -1 for this player
  const minReserve = slotsRemaining; // $1 per remaining slot
  if (amount > ownerBudget - minReserve) return { valid: false, error: `Must reserve $${minReserve} for ${slotsRemaining} remaining picks` };
  return { valid: true };
}
