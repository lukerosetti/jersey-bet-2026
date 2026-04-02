import React, { useState, useEffect, useRef } from 'react';

function DraftOrderReveal({ owners, draftOrder, onComplete }) {
  const [revealIndex, setRevealIndex] = useState(-1);
  const [shuffling, setShuffling] = useState(true);
  const [shuffleNames, setShuffleNames] = useState([]);
  const [done, setDone] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const ownerList = draftOrder.map(id => ({ id, ...owners[id] }));

  // Shuffle animation for 2 seconds
  useEffect(() => {
    if (!shuffling) return;
    const allNames = Object.values(owners).filter(o => o.name).map(o => o.name);
    if (allNames.length === 0) {
      // No named owners yet — skip reveal
      onCompleteRef.current();
      return;
    }
    const interval = setInterval(() => {
      setShuffleNames(allNames.sort(() => Math.random() - 0.5).slice(0, draftOrder.length));
    }, 100);

    const timer = setTimeout(() => {
      setShuffling(false);
      clearInterval(interval);
      setRevealIndex(0);
    }, 2000);

    return () => { clearInterval(interval); clearTimeout(timer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reveal each position one by one
  useEffect(() => {
    if (shuffling || revealIndex < 0) return;
    if (revealIndex >= draftOrder.length) {
      setDone(true);
      // Auto-complete after 3s
      const timer = setTimeout(() => onCompleteRef.current(), 3000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setRevealIndex(prev => prev + 1), 800);
    return () => clearTimeout(timer);
  }, [revealIndex, shuffling, draftOrder.length]);

  return (
    <div className="draft-reveal">
      <div className="draft-reveal-card">
        <h2>Draft Order</h2>
        <p className="draft-subtitle">{done ? 'Ready to draft!' : 'Randomizing...'}</p>
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
                    <span className="draft-reveal-name">{owner?.name || 'Player ' + (idx + 1)}</span>
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
        {/* Always show a skip/start button */}
        <button className="draft-submit-btn" onClick={() => onCompleteRef.current()} style={{ marginTop: 20 }}>
          {done ? 'Start Draft' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

export default DraftOrderReveal;
