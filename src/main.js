import './style.css'
import Phaser from 'phaser';

import UIScene from './scenes/UIScene';
import PreloadScene from './scenes/preloadScene';
import MenuScene from './scenes/menuScene';
import LabScene from './scenes/labScene';
import TestScene from './scenes/testScene';
import LoginScene from './scenes/loginScene';
import ScoreboardScene from './scenes/scoreboardScene';
import WorkspaceScene from './scenes/workspaceScene';
import LogicWorkspaceScene from './scenes/logicWorkspaceScene';
import ChallengeSelectionScene from './scenes/challengeSelectionScene';

const config = {
  type: Phaser.WEBGL,
  backgroundColor: '#f4f6fa',
  parent: 'game-container',
  render: {
    antialias: true,
    roundPixels: true,
    pixelArt: false
  },
  scene: [
    MenuScene,
    LabScene,
    WorkspaceScene,
    LogicWorkspaceScene,
    ChallengeSelectionScene,
    PreloadScene,
    UIScene,
    TestScene,
    LoginScene,
    ScoreboardScene
  ],
  physics: {
    default: 'arcade',           
    arcade: {
      gravity: { y: 0 },         
      debug: false               
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

const game = new Phaser.Game(config);
export default game;