import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { owners } from './data/bracketData';
import { useLiveScores } from './data/useESPN';
import { buildResolvedGames } from './logic/helpers';
import { TournamentProvider } from './context/TournamentContext';
import config from './tournaments/active';

// Shared components
import LiveGamesTicker from './views/shared/LiveGamesTicker';
import LiveIndicator from './views/shared/LiveIndicator';
import GameModal from './views/shared/GameModal';
import ScheduleView from './views/shared/ScheduleView';
import Leaderboard from './views/shared/Leaderboard';
import TeamSearch from './views/shared/TeamSearch';
import Achievements from './views/shared/Achievements';
import Portfolio from './views/shared/Portfolio';
import Graveyard from './views/shared/Graveyard';
import ProjectionTool from './views/shared/ProjectionTool';
import HeadToHead from './views/shared/HeadToHead';
import BracketHistory from './views/shared/BracketHistory';
import OtherCoolStuff from './views/shared/OtherCoolStuff';
import Settings from './views/shared/Settings';

// Bracket components
import RegionsView from './views/bracket/RegionsView';
import BracketView from './views/bracket/BracketView';

function App() {
  const [currentTab, setCurrentTab] = useState('regions');
  const [currentUser, setCurrentUser] = useState(owners[0]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [coolStuffSubView, setCoolStuffSubView] = useState(null);
  const [customizations, setCustomizations] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jerseyBetCustomizations')) || {};
    } catch { return {}; }
  });
  const { liveGames, playInWinners, lastUpdate, isLoading, error, refetch } = useLiveScores();

  // Pull-to-refresh
  const [ptrVisible, setPtrVisible] = useState(false);
  const [ptrRefreshing, setPtrRefreshing] = useState(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
    const onTouchMove = (e) => {
      if (window.scrollY === 0 && e.touches[0].clientY - touchStartY.current > 60 && !ptrRefreshing) {
        setPtrVisible(true);
      }
    };
    const onTouchEnd = async () => {
      if (ptrVisible && !ptrRefreshing) {
        setPtrRefreshing(true);
        await refetch();
        setPtrRefreshing(false);
        setPtrVisible(false);
      }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [ptrVisible, ptrRefreshing, refetch]);

  useEffect(() => {
    if (selectedGame || showSettings || showSearch) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [selectedGame, showSettings, showSearch]);

  const getUserColor = (user) => customizations[user.id]?.color || user.color;
  const getUserInitials = (user) => customizations[user.id]?.initials || user.initials;

  const handleGameClick = (game, region) => setSelectedGame({ ...game, region });
  const resolvedAll = useMemo(() => buildResolvedGames(liveGames, playInWinners), [liveGames, playInWinners]);
  const hasLiveGames = Object.values(resolvedAll).some(game => game.status === 'live' || game.status === 'halftime');

  const renderCoolStuffContent = () => {
    if (coolStuffSubView === 'achievements') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><Achievements liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} /></>;
    if (coolStuffSubView === 'portfolio') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><Portfolio liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} onGameClick={handleGameClick} resolvedMap={resolvedAll} /></>;
    if (coolStuffSubView === 'projection') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><ProjectionTool liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} /></>;
    if (coolStuffSubView === 'graveyard') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><Graveyard liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} /></>;
    if (coolStuffSubView === 'h2h') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><HeadToHead liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} /></>;
    if (coolStuffSubView === 'history') return <><button className="back-btn" onClick={() => setCoolStuffSubView(null)}>← Back</button><BracketHistory liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} /></>;
    return <OtherCoolStuff liveGames={liveGames} playInWinners={playInWinners} setSubView={setCoolStuffSubView} resolvedMap={resolvedAll} />;
  };

  return (
    <TournamentProvider>
    <div className="app">
      <div className={`ptr-indicator ${ptrVisible ? 'visible' : ''} ${ptrRefreshing ? 'refreshing' : ''}`}><div className="ptr-spinner"></div></div>
      <div className="glass-header-bar" />
      <header className="header">
        <div><img src="/logo.png" alt="Jersey Bets" className="header-logo" /><div className="header-sub">{config.name.toUpperCase()}</div></div>
        <div className="header-right">
          <button className="settings-btn" onClick={() => setShowSearch(true)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
          <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙</button>
          <div className="user-avatar" style={{ background: getUserColor(currentUser) }}>{getUserInitials(currentUser)}</div>
        </div>
      </header>
      <nav className="nav-tabs">
        <button className={`nav-tab ${currentTab === 'regions' ? 'active' : ''}`} onClick={() => { setCurrentTab('regions'); setCoolStuffSubView(null); }}>Regions{hasLiveGames && <span className="live-dot"></span>}</button>
        <button className={`nav-tab ${currentTab === 'schedule' ? 'active' : ''}`} onClick={() => { setCurrentTab('schedule'); setCoolStuffSubView(null); }}>Schedule</button>
        <button className={`nav-tab ${currentTab === 'bracket' ? 'active' : ''}`} onClick={() => { setCurrentTab('bracket'); setCoolStuffSubView(null); }}>Bracket</button>
        <button className={`nav-tab ${currentTab === 'standings' ? 'active' : ''}`} onClick={() => { setCurrentTab('standings'); setCoolStuffSubView(null); }}>Standings</button>
        <button className={`nav-tab ${currentTab === 'coolstuff' ? 'active' : ''}`} onClick={() => { setCurrentTab('coolstuff'); setCoolStuffSubView(null); }}>More</button>
      </nav>
      <LiveIndicator lastUpdate={lastUpdate} isLoading={isLoading} error={error} />
      <LiveGamesTicker resolvedGames={resolvedAll} liveGames={liveGames} playInWinners={playInWinners} onGameClick={handleGameClick} customizations={customizations} />
      <main>
        {currentTab === 'regions' && <RegionsView onGameClick={handleGameClick} liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} />}
        {currentTab === 'schedule' && <ScheduleView resolvedMap={resolvedAll} onGameClick={handleGameClick} customizations={customizations} liveGames={liveGames} />}
        {currentTab === 'bracket' && <BracketView onGameClick={handleGameClick} liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} />}
        {currentTab === 'standings' && <Leaderboard liveGames={liveGames} playInWinners={playInWinners} customizations={customizations} resolvedMap={resolvedAll} />}
        {currentTab === 'coolstuff' && renderCoolStuffContent()}
      </main>
      <div className="legend">{owners.map(owner => (<div key={owner.id} className="legend-item"><div className="legend-dot" style={{ background: getUserColor(owner) }}></div>{owner.name}</div>))}</div>
      {selectedGame && <GameModal game={selectedGame} onClose={() => setSelectedGame(null)} customizations={customizations} liveGames={liveGames} />}
      {showSettings && <div className="modal-bg" onClick={() => setShowSettings(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-handle"></div><div className="modal-head"><span className="modal-title">Settings</span><button className="modal-close" onClick={() => setShowSettings(false)}>×</button></div><div className="modal-body"><Settings currentUser={currentUser} setCurrentUser={setCurrentUser} customizations={customizations} setCustomizations={setCustomizations} /></div></div></div>}
      {showSearch && <TeamSearch resolvedMap={resolvedAll} customizations={customizations} onGameClick={(g, r) => { setShowSearch(false); handleGameClick(g, r); }} onClose={() => setShowSearch(false)} />}
    </div>
    </TournamentProvider>
  );
}

export default App;
