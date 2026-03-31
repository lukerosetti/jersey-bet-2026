// Sanitize a name for use as a Firebase key (no . # $ / [ ])
export const sanitizeKey = (key) => key.replace(/[.#$/\[\]]/g, '_');

// Look up player data using sanitized key
export const getPlayerData = (playerData, name) => {
  if (!playerData || !name) return {};
  // Try exact match first, then sanitized
  return playerData[name] || playerData[sanitizeKey(name)] || {};
};

// Convert country code to flag emoji
export const getFlag = (countryCode) => {
  if (!countryCode) return '';
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return '';
  return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

// Get ESPN headshot URL (returns null if no espnId)
export const getHeadshotUrl = (playerData, name) => {
  const data = getPlayerData(playerData, name);
  if (data?.espnId) return `https://a.espncdn.com/i/headshots/golf/players/full/${data.espnId}.png`;
  return null;
};

// Get OWGR for a player
export const getOwgr = (playerData, name) => {
  return getPlayerData(playerData, name)?.owgr || '';
};
