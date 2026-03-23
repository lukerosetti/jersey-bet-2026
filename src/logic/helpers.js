import { regions as staticRegions, finalFourGames } from '../data/bracketData';
import { resolveAllGames } from '../data/useESPN';

// Build resolved games map for all rounds (call once, pass to mergeWithLiveData as 4th arg)
export function buildResolvedGames(liveGames, playInWinners) {
  const allGames = [];
  Object.values(staticRegions).forEach(r => allGames.push(...r.games));
  allGames.push(...finalFourGames);
  return resolveAllGames(allGames, liveGames, playInWinners);
}

export const getCustomColor = (owner, customizations) => customizations?.[owner.id]?.color || owner.color;
export const getCustomInitials = (owner, customizations) => customizations?.[owner.id]?.initials || owner.initials;
