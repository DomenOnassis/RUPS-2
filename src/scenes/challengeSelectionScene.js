import Phaser from "phaser";

export default class ChallengeSelectionScene extends Phaser.Scene {
  constructor() {
    super("ChallengeSelectionScene");
  }

  init(data) {
    this.workspaceType = data.workspaceType || 'electric';
    this.challenges = [];
  }

  create() {
    const { width, height } = this.cameras.main;

    this.add.rectangle(0, 0, width, height, 0x1a1a2e)
      .setOrigin(0)
      .setDepth(0);

    this.add.text(width / 2, 40, `${this.workspaceType === 'electric' ? 'Electric' : 'Logic'} Circuit Challenges`, {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const backBtn = this.add.text(30, 40, '← Back', {
      fontSize: '18px',
      color: '#3399ff',
      fontStyle: 'bold'
    }).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setStyle({ color: '#66ccff' }));
    backBtn.on('pointerout', () => backBtn.setStyle({ color: '#3399ff' }));
    backBtn.on('pointerdown', () => {
      this.scene.start('LabScene');
    });

    this.loadChallenges();
  }

  loadChallenges() {
    const token = localStorage.getItem('token');
    const { width, height } = this.cameras.main;

    fetch(`http://localhost:8000/challenges/by-workspace/${this.workspaceType}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(challenges => {
        this.challenges = challenges;
        this.displayChallenges();
      })
      .catch(error => {
        console.error('Failed to load challenges:', error);
        this.displayPlaceholderChallenges();
      });
  }

  displayPlaceholderChallenges() {
    const { width, height } = this.cameras.main;
    const challenges = this.generatePlaceholderChallenges();
    this.renderChallengeGrid(challenges);
  }

  generatePlaceholderChallenges() {
    if (this.workspaceType === 'electric') {
      return [
        { id: 1, title: 'Simple Circuit', description: 'Connect a battery and a bulb', difficulty: 1 },
        { id: 2, title: 'Series Circuit', description: 'Connect 2 bulbs in series', difficulty: 2 },
        { id: 3, title: 'Parallel Circuit', description: 'Connect 2 bulbs in parallel', difficulty: 3 },
        { id: 4, title: 'Switch Control', description: 'Add a switch to control the bulb', difficulty: 4 },
        { id: 5, title: 'Resistor Network', description: 'Build a circuit with resistors', difficulty: 5 },
        { id: 6, title: 'Complex Series', description: 'Multiple components in series', difficulty: 6 },
        { id: 7, title: 'Mixed Circuit', description: 'Combine series and parallel', difficulty: 7 },
        { id: 8, title: 'Voltage Division', description: 'Create voltage divider circuit', difficulty: 8 },
        { id: 9, title: 'Bridge Circuit', description: 'Build a Wheatstone bridge', difficulty: 9 },
        { id: 10, title: 'Advanced Design', description: 'Complex multi-component circuit', difficulty: 10 }
      ];
    } else {
      return [
        { id: 11, title: 'AND Gate', description: 'Implement an AND logic gate', difficulty: 1 },
        { id: 12, title: 'OR Gate', description: 'Implement an OR logic gate', difficulty: 2 },
        { id: 13, title: 'NOT Gate', description: 'Implement a NOT logic gate', difficulty: 3 },
        { id: 14, title: 'XOR Gate', description: 'Implement an XOR logic gate', difficulty: 4 },
        { id: 15, title: 'Truth Table 1', description: 'Match the given truth table', difficulty: 5 },
        { id: 16, title: 'Truth Table 2', description: 'Design circuit for complex truth table', difficulty: 6 },
        { id: 17, title: 'Multi-Gate', description: 'Combine multiple gate types', difficulty: 7 },
        { id: 18, title: 'Adder Circuit', description: 'Build a binary adder', difficulty: 8 },
        { id: 19, title: 'Multiplexer', description: 'Design a multiplexer circuit', difficulty: 9 },
        { id: 20, title: 'Advanced Logic', description: 'Complex logic design challenge', difficulty: 10 }
      ];
    }
  }

  displayChallenges() {
    if (this.challenges.length === 0) {
      this.displayPlaceholderChallenges();
    } else {
      this.renderChallengeGrid(this.challenges);
    }
  }

  renderChallengeGrid(challenges) {
    const { width, height } = this.cameras.main;
    const cardWidth = 180;
    const cardHeight = 220;
    const padding = 20;
    const cols = Math.floor((width - 60) / (cardWidth + padding));
    const startX = (width - (cols * cardWidth + (cols - 1) * padding)) / 2;
    const startY = 120;

    challenges.forEach((challenge, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardWidth + padding);
      const y = startY + row * (cardHeight + padding);

      this.createChallengeCard(challenge, x, y, cardWidth, cardHeight);
    });
  }

  createChallengeCard(challenge, x, y, width, height) {
    const card = this.add.rectangle(x, y, width, height, 0x2a2a4e)
      .setOrigin(0)
      .setStrokeStyle(2, 0x3399ff);

    const difficultyColor = this.getDifficultyColor(challenge.difficulty);
    const diffBg = this.add.rectangle(x + width - 30, y + 10, 25, 25, difficultyColor)
      .setOrigin(0.5);

    this.add.text(x + width - 30, y + 10, challenge.difficulty, {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const title = this.add.text(x + 10, y + 15, challenge.title, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      wordWrap: { width: width - 50 }
    });

    const desc = this.add.text(x + 10, y + 50, challenge.description, {
      fontSize: '12px',
      color: '#cccccc',
      wordWrap: { width: width - 20 }
    });

    const selectBtnBg = this.add.rectangle(x, y + height - 40, width, 40, 0x3399ff)
      .setOrigin(0);

    const selectBtn = this.add.text(x + width / 2, y + height - 20, 'Select', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    card.setInteractive();
    
    card.on('pointerover', () => {
      card.setStrokeStyle(2, 0x66ccff);
      selectBtnBg.setFillStyle(0x0f5cad);
    });

    card.on('pointerout', () => {
      card.setStrokeStyle(2, 0x3399ff);
      selectBtnBg.setFillStyle(0x3399ff);
    });

    selectBtn.on('pointerover', () => {
      selectBtnBg.setFillStyle(0x0f5cad);
    });

    selectBtn.on('pointerout', () => {
      selectBtnBg.setFillStyle(0x3399ff);
    });

    selectBtn.on('pointerdown', () => {
      this.startChallenge(challenge);
    });

    card.on('pointerdown', () => {
      this.startChallenge(challenge);
    });
  }

  getDifficultyColor(difficulty) {
    if (difficulty <= 2) return 0x4caf50;
    if (difficulty <= 4) return 0x2196f3;
    if (difficulty <= 6) return 0xff9800;
    if (difficulty <= 8) return 0xf44336;
    return 0x9c27b0;
  }

  startChallenge(challenge) {
    localStorage.setItem('selectedChallengeId', challenge.id);
    localStorage.setItem('selectedChallengeTitle', challenge.title);
    
    const sceneKey = this.workspaceType === 'electric' ? 'WorkspaceScene' : 'LogicWorkspaceScene';
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start(sceneKey);
    });
  }
}
