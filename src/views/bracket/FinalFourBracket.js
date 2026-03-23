import React from 'react';
import { finalFourGames } from '../../data/bracketData';
import BracketGame from './BracketGame';

function FinalFourBracket({ resolved, onGameClick, customizations }) {
  const ff1 = resolved['ff1'] || finalFourGames[0];
  const ff2 = resolved['ff2'] || finalFourGames[1];
  const champ = resolved['champ'] || finalFourGames[2];
  return (
    <div className="bracket-region bracket-ff">
      <div className="bracket-scroll">
        <div className="bracket-track bracket-track-ff">
          <div className="round-col round-col-ff">
            <div className="round-header"><div className="round-name">Final Four</div></div>
            <div className="round-games round-games-ff">
              <div className="bracket-slot">
                <BracketGame game={ff1} onGameClick={onGameClick} customizations={customizations} regionName="finalfour" />
                <div className="bracket-connector-right"></div>
              </div>
              <div className="bracket-slot">
                <BracketGame game={ff2} onGameClick={onGameClick} customizations={customizations} regionName="finalfour" />
                <div className="bracket-connector-right"></div>
              </div>
            </div>
          </div>
          <div className="round-col round-col-champ">
            <div className="round-header"><div className="round-name">Championship</div></div>
            <div className="round-games round-games-champ">
              <div className="bracket-slot">
                <div className="bracket-connector-left"></div>
                <BracketGame game={champ} onGameClick={onGameClick} customizations={customizations} regionName="finalfour" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinalFourBracket;
