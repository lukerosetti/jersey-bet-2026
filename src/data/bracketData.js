// Thin re-export from active tournament config
// All tournament data now lives in src/tournaments/march-madness-2026.js
import config from '../tournaments/active';

export const owners = config.owners;
export const regions = config.regions;
export const playInGames = config.playInGames;
export const finalFourGames = config.finalFourGames;
export const teamColors = config.teamColors;
export const espnTeamIds = config.espnTeamIds;
export const scoringSystem = config.scoringSystem;
export const badges = config.badges;
export const networkStreaming = config.networkStreaming;

export const getOwner = (teamName) => config.getOwner(teamName);
export const getTeamColor = (teamName) => config.getTeamColor(teamName);
export const getTeamLogo = (teamName) => config.getTeamLogo(teamName);
export const getStreaming = (network) => config.getStreaming(network);
