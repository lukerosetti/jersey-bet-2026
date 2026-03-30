import React, { useState, useEffect } from 'react';

function DraftOrderReveal({ owners, draftOrder, onComplete }) {
  const [revealIndex, setRevealIndex] = useState(-1);
  const [shuffling, setShuffling] = useState(true);
  const [shuffleNames, setShuffleNames] = useState([]);

  const ownerList = draftOrder.map(id => ({ id, ...owners[id] }));

  // Shuffle animation
  useEffect(() => {
    if (!shuffling) return;
    const allNames = Object.values(owners).map(o => o.name);
    const interval = setInterval(() => {
      setShuffleNames(allNames.sort(() => Math.random() - 0.5).slice(0, draftOrder.length));
    }, 100);

    // Stop shuffling after 2 seconds, start revealing
    const timer = setTimeout(() => {
      setShuffling(false);
      clearInterval(interval);
      setRevealIndex(0);
    }, 2000);

    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [shuffling, owners, draftOrder]);

  // Reveal each position one by one
  useEffect(() => {
    if (shuffling || revealIndex < 0) return;
    if (revealIndex >= draftOrder.length) {
      // All revealed — auto-complete after 2s
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setRevealIndex(prev => prev + 1), 800);
    return () => clearTimeout(timer);
  }, [revealIndex, shuffling, draftOrder.length, onComplete]);

  return (
    <div className="draft-reveal">
      <div className="draft-reveal-card">
        <h2>Draft Order</h2>
        <p className="draft-subtitle">Randomizing...</p>
        <div className="draft-reveal-slots">
          {draftOrder.map((id, idx) => {
            const owner = owners[id];
            const isRevealed = !shuffling && revealIndex > idx;
            const isRevealing = !shuffling && revealIndex === idx;
            return (
              <div key={idx} className={`draft-reveal-slot ${isRevealed ? 'revealed' : ''} ${isRevealing ? 'revealing' : ''}`}>
                <span className="draft-reveal-num">{idx + 1}</span>
                {isRevealed || isRevealing ? (
                  <div className="draft-reveal-owner">
                    <span className="draft-reveal-dot" style={{ background: owner?.color || '#555' }}></span>
                    <span className="draft-reveal-name">{owner?.name}</span>
                  </div>
                ) : (
                  <div className="draft-reveal-shuffle">
                    <span className="draft-reveal-name">{shuffleNames[idx] || '???'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {revealIndex >= draftOrder.length && (
          <button className="draft-submit-btn" onClick={onComplete} style={{ marginTop: 20 }}>
            Start Draft
          </button>
        )}
      </div>
    </div>
  );
}

export default DraftOrderReveal;
