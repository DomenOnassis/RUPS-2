import Phaser from 'phaser';

export default class LabScene extends Phaser.Scene {
  constructor() {
    super('LabScene');
  }

  preload() {
        this.load.image('avatar1', 'src/avatars/avatar1.png');
        this.load.image('avatar2', 'src/avatars/avatar2.png');
        this.load.image('avatar3', 'src/avatars/avatar3.png');
        this.load.image('avatar4', 'src/avatars/avatar4.png');
        this.load.image('avatar5', 'src/avatars/avatar5.png');
        this.load.image('avatar6', 'src/avatars/avatar6.png');
        this.load.image('avatar7', 'src/avatars/avatar7.png');
        this.load.image('avatar8', 'src/avatars/avatar8.png');
        this.load.image('avatar9', 'src/avatars/avatar9.png');
        this.load.image('avatar10', 'src/avatars/avatar10.png');
        this.load.image('avatar11', 'src/avatars/avatar11.png');
    }

  create() {
    const { width, height } = this.cameras.main;
    
    this.add.rectangle(0, 0, width, height, 0xf0f0f0).setOrigin(0);
    
    this.add.rectangle(0, 0, width, height - 150, 0xe8e8e8).setOrigin(0);
    
    this.add.rectangle(0, height - 150, width, 150, 0xd4c4a8).setOrigin(0);
    
    // miza
    const tableX = width / 2;
    const tableY = height / 2 + 50;
    const tableWidth = 500;
    const tableHeight = 250;
    
    const tableTop = this.add.rectangle(tableX, tableY, tableWidth, 30, 0x8b4513).setOrigin(0.5);
    
    const tableSurface = this.add.rectangle(tableX, tableY + 15, tableWidth - 30, tableHeight - 30, 0xa0826d).setOrigin(0.5, 0);
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x8b7355, 0.3);
    const gridSize = 30;
    const gridStartX = tableX - (tableWidth - 30) / 2;
    const gridStartY = tableY + 15;
    const gridEndX = tableX + (tableWidth - 30) / 2;
    const gridEndY = tableY + 15 + (tableHeight - 30);
    
    for (let x = gridStartX; x <= gridEndX; x += gridSize) {
      gridGraphics.beginPath();
      gridGraphics.moveTo(x, gridStartY);
      gridGraphics.lineTo(x, gridEndY);
      gridGraphics.strokePath();
    }
    for (let y = gridStartY; y <= gridEndY; y += gridSize) {
      gridGraphics.beginPath();
      gridGraphics.moveTo(gridStartX, y);
      gridGraphics.lineTo(gridEndX, y);
      gridGraphics.strokePath();
    }
    
    const legWidth = 20;
    const legHeight = 150;
    this.add.rectangle(tableX - tableWidth/2 + 40, tableY + tableHeight/2 + 20, legWidth, legHeight, 0x654321);
    this.add.rectangle(tableX + tableWidth/2 - 40, tableY + tableHeight/2 + 20, legWidth, legHeight, 0x654321);
    
    const interactiveZone = this.add.zone(tableX, tableY + tableHeight/2, tableWidth, tableHeight)
      .setInteractive({ useHandCursor: true });
    
    const instruction = this.add.text(tableX, tableY - 80, 'Click on the table to choose your workspace!', {
      fontSize: '24px',
      color: '#333',
      fontStyle: 'bold',
      backgroundColor: '#ffffff',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: instruction,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    
    interactiveZone.on('pointerdown', () => {
      this.showWorkspaceSelectionModal();
    });
    
    interactiveZone.on('pointerover', () => {
      tableSurface.setFillStyle(0xb09070);
    });
    
    interactiveZone.on('pointerout', () => {
      tableSurface.setFillStyle(0xa0826d);
    });

    const username = localStorage.getItem('username');
    const token = localStorage.getItem('token');

    const avatarX = 230;
    const avatarY = 55;
    const avatarRadius = 30;
    const borderThickness = 4;

    const borderCircle = this.add.circle(avatarX, avatarY, avatarRadius + borderThickness, 0xcccccc);

    const innerCircle = this.add.circle(avatarX, avatarY, avatarRadius, 0xffffff);

    const avatarImage = this.add.image(avatarX, avatarY, 'avatar1')
        .setDisplaySize(avatarRadius * 2, avatarRadius * 2);

    const mask = innerCircle.createGeometryMask();
    avatarImage.setMask(mask);

    this.add.text(avatarX + 60, avatarY - 10, `Welcome to the lab, ${username}!`, {
        fontSize: '22px',
        color: '#222',
        fontStyle: 'bold'
    });


    const logoutButton = this.add.text(40, 30, '↩ Logout', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#0066ff',
        padding: { x: 20, y: 10 }
    })
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => logoutButton.setStyle({ color: '#0044cc' }))
        .on('pointerout', () => logoutButton.setStyle({ color: '#0066ff' }))
        .on('pointerdown', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('email');
            localStorage.removeItem('username');
            localStorage.removeItem('name');
            this.scene.start('MenuScene');
        });

    const buttonWidth = 180;
    const buttonHeight = 45;
    const cornerRadius = 10;
    const rightMargin = 60;
    const topMargin = 40;

    const scoreButtonBg = this.add.graphics();
    scoreButtonBg.fillStyle(0x3399ff, 1);
    scoreButtonBg.fillRoundedRect(width - buttonWidth - rightMargin, topMargin, buttonWidth, buttonHeight, cornerRadius);

    const scoreButton = this.add.text(width - buttonWidth / 2 - rightMargin, topMargin + buttonHeight / 2, 'Leaderboard', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff'
    })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
            scoreButtonBg.clear();
            scoreButtonBg.fillStyle(0x0f5cad, 1);
            scoreButtonBg.fillRoundedRect(width - buttonWidth - rightMargin, topMargin, buttonWidth, buttonHeight, cornerRadius);
        })
        .on('pointerout', () => {
            scoreButtonBg.clear();
            scoreButtonBg.fillStyle(0x3399ff, 1);
            scoreButtonBg.fillRoundedRect(width - buttonWidth - rightMargin, topMargin, buttonWidth, buttonHeight, cornerRadius);
        })
        .on('pointerdown', () => {
            this.scene.start('ScoreboardScene', {cameFromMenu: true});
        });
  }

  showWorkspaceSelectionModal() {
    const { width, height } = this.cameras.main;
    
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0)
      .setInteractive()
      .setDepth(1000);
    
    const modalWidth = 800;
    const modalHeight = 400;
    const modal = this.add.rectangle(width / 2, height / 2, modalWidth, modalHeight, 0xffffff)
      .setOrigin(0.5)
      .setDepth(1001);
    
    const modalBorder = this.add.graphics();
    modalBorder.lineStyle(3, 0x3399ff, 1);
    modalBorder.strokeRoundedRect(
      width / 2 - modalWidth / 2,
      height / 2 - modalHeight / 2,
      modalWidth,
      modalHeight,
      10
    );
    modalBorder.setDepth(1002);
    
    const title = this.add.text(width / 2, height / 2 - 140, 'Choose Your Workspace', {
      fontSize: '32px',
      color: '#333',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1003);
    
    const electricBtnY = height / 2 - 40;
    const electricBtnBg = this.add.graphics();
    electricBtnBg.fillStyle(0x3399ff, 1);
    electricBtnBg.fillRoundedRect(width / 2 - 300, electricBtnY - 30, 600, 70, 10);
    electricBtnBg.setDepth(1003);
    
    const electricBtn = this.add.text(width / 2, electricBtnY, 'Electric Circuit Workspace', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1004).setInteractive({ useHandCursor: true });
    
    const electricDesc = this.add.text(width / 2, electricBtnY + 25, 'Build circuits with batteries, resistors, bulbs, and switches', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(1004);
    
    const logicBtnY = height / 2 + 80;
    const logicBtnBg = this.add.graphics();
    logicBtnBg.fillStyle(0xff9933, 1);
    logicBtnBg.fillRoundedRect(width / 2 - 300, logicBtnY - 30, 600, 70, 10);
    logicBtnBg.setDepth(1003);
    
    const logicBtn = this.add.text(width / 2, logicBtnY, 'Logic Circuit Workspace', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1004).setInteractive({ useHandCursor: true });
    
    const logicDesc = this.add.text(width / 2, logicBtnY + 25, 'Build logic circuits with AND, OR, NOT, and other logic gates', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(1004);
    
    const closeBtn = this.add.text(width / 2 + 360, height / 2 - 175, '✕', {
      fontSize: '30px',
      color: '#666'
    }).setOrigin(0.5).setDepth(1005).setInteractive({ useHandCursor: true });
    
    electricBtn.on('pointerover', () => {
      electricBtnBg.clear();
      electricBtnBg.fillStyle(0x0f5cad, 1);
      electricBtnBg.fillRoundedRect(width / 2 - 300, electricBtnY - 30, 600, 70, 10);
    });
    
    electricBtn.on('pointerout', () => {
      electricBtnBg.clear();
      electricBtnBg.fillStyle(0x3399ff, 1);
      electricBtnBg.fillRoundedRect(width / 2 - 300, electricBtnY - 30, 600, 70, 10);
    });
    
    electricBtn.on('pointerdown', () => {
      closeModal();
      this.showModeSelectionModal('electric');
    });
    
    logicBtn.on('pointerover', () => {
      logicBtnBg.clear();
      logicBtnBg.fillStyle(0xcc7722, 1);
      logicBtnBg.fillRoundedRect(width / 2 - 300, logicBtnY - 30, 600, 70, 10);
    });
    
    logicBtn.on('pointerout', () => {
      logicBtnBg.clear();
      logicBtnBg.fillStyle(0xff9933, 1);
      logicBtnBg.fillRoundedRect(width / 2 - 300, logicBtnY - 30, 600, 70, 10);
    });
    
    logicBtn.on('pointerdown', () => {
      closeModal();
      this.showModeSelectionModal('logic');
    });
    
    const closeModal = () => {
      overlay.destroy();
      modal.destroy();
      modalBorder.destroy();
      title.destroy();
      electricBtn.destroy();
      electricDesc.destroy();
      electricBtnBg.destroy();
      logicBtn.destroy();
      logicDesc.destroy();
      logicBtnBg.destroy();
      closeBtn.destroy();
    };
    
    closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#333' }));
    closeBtn.on('pointerout', () => closeBtn.setStyle({ color: '#666' }));
    closeBtn.on('pointerdown', closeModal);
    overlay.on('pointerdown', closeModal);
  }

  showModeSelectionModal(workspaceType) {
    const { width, height } = this.cameras.main;
    
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0)
      .setInteractive()
      .setDepth(1000);
    
    const modalWidth = 800;
    const modalHeight = 400;
    const modal = this.add.rectangle(width / 2, height / 2, modalWidth, modalHeight, 0xffffff)
      .setOrigin(0.5)
      .setDepth(1001);
    
    const modalBorder = this.add.graphics();
    modalBorder.lineStyle(3, 0x9966ff, 1);
    modalBorder.strokeRoundedRect(
      width / 2 - modalWidth / 2,
      height / 2 - modalHeight / 2,
      modalWidth,
      modalHeight,
      10
    );
    modalBorder.setDepth(1002);
    
    const title = this.add.text(width / 2, height / 2 - 140, 'Choose Your Mode', {
      fontSize: '32px',
      color: '#333',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1003);
    
    const sandboxBtnY = height / 2 - 40;
    const sandboxBtnBg = this.add.graphics();
    sandboxBtnBg.fillStyle(0x66bb6a, 1);
    sandboxBtnBg.fillRoundedRect(width / 2 - 300, sandboxBtnY - 30, 600, 70, 10);
    sandboxBtnBg.setDepth(1003);
    
    const sandboxBtn = this.add.text(width / 2, sandboxBtnY, 'Sandbox Mode', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1004).setInteractive({ useHandCursor: true });
    
    const sandboxDesc = this.add.text(width / 2, sandboxBtnY + 25, 'Free building without restrictions', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(1004);
    
    const challengeBtnY = height / 2 + 80;
    const challengeBtnBg = this.add.graphics();
    challengeBtnBg.fillStyle(0xff6b6b, 1);
    challengeBtnBg.fillRoundedRect(width / 2 - 300, challengeBtnY - 30, 600, 70, 10);
    challengeBtnBg.setDepth(1003);
    
    const challengeBtn = this.add.text(width / 2, challengeBtnY, 'Challenge Mode', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1004).setInteractive({ useHandCursor: true });
    
    const challengeDesc = this.add.text(width / 2, challengeBtnY + 25, 'Complete specific circuit challenges', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(1004);
    
    const closeBtn = this.add.text(width / 2 + 360, height / 2 - 175, '✕', {
      fontSize: '30px',
      color: '#666'
    }).setOrigin(0.5).setDepth(1005).setInteractive({ useHandCursor: true });

    const backBtn = this.add.text(width / 2 - 360, height / 2 - 175, '←', {
      fontSize: '30px',
      color: '#666'
    }).setOrigin(0.5).setDepth(1005).setInteractive({ useHandCursor: true });
    
    sandboxBtn.on('pointerover', () => {
      sandboxBtnBg.clear();
      sandboxBtnBg.fillStyle(0x4caf50, 1);
      sandboxBtnBg.fillRoundedRect(width / 2 - 300, sandboxBtnY - 30, 600, 70, 10);
    });
    
    sandboxBtn.on('pointerout', () => {
      sandboxBtnBg.clear();
      sandboxBtnBg.fillStyle(0x66bb6a, 1);
      sandboxBtnBg.fillRoundedRect(width / 2 - 300, sandboxBtnY - 30, 600, 70, 10);
    });
    
    sandboxBtn.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        localStorage.setItem('mode', 'sandbox');
        if (workspaceType === 'electric') {
          this.scene.start('WorkspaceScene');
        } else {
          this.scene.start('LogicWorkspaceScene');
        }
      });
    });
    
    challengeBtn.on('pointerover', () => {
      challengeBtnBg.clear();
      challengeBtnBg.fillStyle(0xef5350, 1);
      challengeBtnBg.fillRoundedRect(width / 2 - 300, challengeBtnY - 30, 600, 70, 10);
    });
    
    challengeBtn.on('pointerout', () => {
      challengeBtnBg.clear();
      challengeBtnBg.fillStyle(0xff6b6b, 1);
      challengeBtnBg.fillRoundedRect(width / 2 - 300, challengeBtnY - 30, 600, 70, 10);
    });
    
    challengeBtn.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        localStorage.setItem('mode', 'challenge');
        this.scene.start('ChallengeSelectionScene', { workspaceType });
      });
    });
    
    const closeModal = () => {
      overlay.destroy();
      modal.destroy();
      modalBorder.destroy();
      title.destroy();
      sandboxBtn.destroy();
      sandboxDesc.destroy();
      sandboxBtnBg.destroy();
      challengeBtn.destroy();
      challengeDesc.destroy();
      challengeBtnBg.destroy();
      backBtn.destroy();
    };
    
    closeBtn.on('pointerover', () => closeBtn.setStyle({ color: '#333' }));
    closeBtn.on('pointerout', () => closeBtn.setStyle({ color: '#666' }));
    closeBtn.on('pointerdown', closeModal);
    
    backBtn.on('pointerover', () => backBtn.setStyle({ color: '#333' }));
    backBtn.on('pointerout', () => backBtn.setStyle({ color: '#666' }));
    backBtn.on('pointerdown', () => {
      closeModal();
      this.showWorkspaceSelectionModal();
    });
    
    overlay.on('pointerdown', closeModal);
  }
}
