import Phaser from 'phaser';

export default class LogicWorkspaceScene extends Phaser.Scene {
  constructor() {
    super('LogicWorkspaceScene');
    this.placedComponents = [];
    this.gridSize = 40;
  }

  preload() {
    this.load.image('and', 'src/components/logic/and.png');
    this.load.image('nand', 'src/components/logic/nand.png');
    this.load.image('nor', 'src/components/logic/nor.png');
    this.load.image('not', 'src/components/logic/not.png');
    this.load.image('or', 'src/components/logic/or.png');
    this.load.image('xnor', 'src/components/logic/xnor.png');
    this.load.image('xor', 'src/components/logic/xor.png');
    this.load.image('wire', 'src/components/wire.png');
  }

  create() {
    const { width, height } = this.cameras.main;

    this.add.rectangle(0, 0, 200, height, 0x2a2a2a).setOrigin(0);
    this.add.rectangle(200, 0, width - 200, height, 0xf5f5f5).setOrigin(0);

    this.createGrid(width, height);

    const panelTitle = this.add.text(100, 30, 'SANDBOX', {
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    const components = [
      { type: 'and', y: 80 },
      { type: 'or', y: 160 },
      { type: 'not', y: 240 },
      { type: 'nand', y: 320 },
      { type: 'nor', y: 400 },
      { type: 'xor', y: 480 },
      { type: 'xnor', y: 560 },
      { type: 'wire', y: 640 }
    ];

    components.forEach(comp => {
      this.createComponent(100, comp.y, comp.type);
    });

    const backButton = this.add.text(40, height - 60, '↩ Back', {
      fontSize: '20px',
      color: '#ffffff'
    })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backButton.setStyle({ color: '#aaaaaa' }))
      .on('pointerout', () => backButton.setStyle({ color: '#ffffff' }))
      .on('pointerdown', () => this.scene.start('MenuScene'));
  }

  createGrid(width, height) {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0xcccccc, 0.3);
    const gridSize = this.gridSize;
    const startX = 200;

    for (let x = startX; x < width; x += gridSize) {
      graphics.beginPath();
      graphics.moveTo(x, 0);
      graphics.lineTo(x, height);
      graphics.strokePath();
    }

    for (let y = 0; y < height; y += gridSize) {
      graphics.beginPath();
      graphics.moveTo(startX, y);
      graphics.lineTo(width, y);
      graphics.strokePath();
    }
  }

  snapToGrid(x, y) {
    const gridSize = this.gridSize;
    const startX = 200;

    const snappedX = Math.round((x - startX) / gridSize) * gridSize + startX;
    const snappedY = Math.round(y / gridSize) * gridSize;

    return { x: snappedX, y: snappedY };
  }

  isPositionOccupied(x, y, excludeComponent = null, checkingType = null) {
    const checkingSize = checkingType === 'wire' ? 80 : 160;
    const halfCheckingSize = checkingSize / 2;

    for (let component of this.placedComponents) {
      if (component === excludeComponent || component.getData('isInPanel')) continue;
      
      const componentSize = component.getData('type') === 'wire' ? 80 : 160;
      const halfComponentSize = componentSize / 2;
      
      const dx = Math.abs(component.x - x);
      const dy = Math.abs(component.y - y);
      
      const minDistance = halfCheckingSize + halfComponentSize;
      
      if (dx < minDistance && dy < minDistance) {
        return true;
      }
    }
    return false;
  }

  createComponent(x, y, type) {
    const component = this.add.container(x, y);
    
    const isInPanel = x < 200;
    const displaySize = isInPanel ? 80 : (type === 'wire' ? 80 : 160);
    const componentSize = type === 'wire' ? 80 : 160;
    
    const componentImage = this.add.image(0, 0, type)
      .setOrigin(0.5)
      .setDisplaySize(displaySize, displaySize);
    
    component.add(componentImage);
    
    component.setData('type', type);
    component.setData('originalX', x);
    component.setData('originalY', y);
    component.setData('rotation', 0);
    component.setData('isInPanel', isInPanel);
    component.setData('isDragging', false);
    component.setData('dragMoved', false);
    component.setData('lastClickTime', 0);

    component.setSize(displaySize, displaySize);
    const hitArea = new Phaser.Geom.Rectangle(-displaySize/2, -displaySize/2, displaySize, displaySize);
    component.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains, { draggable: true, useHandCursor: true });

    this.input.setDraggable(component);

    component.on('dragstart', () => {
      component.setData('isDragging', true);
      component.setData('dragMoved', false);
    });

    component.on('drag', (pointer, dragX, dragY) => {
      component.setData('dragMoved', true);
      component.x = dragX;
      component.y = dragY;
    });

    component.on('dragend', () => {
      const isInPanel = component.x < 200;

      if (isInPanel && !component.getData('isInPanel')) {
        component.destroy();
      } else if (!isInPanel && component.getData('isInPanel')) {
        const snapped = this.snapToGrid(component.x, component.y);
        
        if (this.isPositionOccupied(snapped.x, snapped.y, component, type)) {
          component.x = component.getData('originalX');
          component.y = component.getData('originalY');
          component.setData('isDragging', false);
          return;
        }

        component.x = snapped.x;
        component.y = snapped.y;
        component.setData('isInPanel', false);
        
        const newDisplaySize = type === 'wire' ? 80 : 160;
        componentImage.setDisplaySize(newDisplaySize, newDisplaySize);
        component.setSize(newDisplaySize, newDisplaySize);
        
        component.removeInteractive();
        const newHitArea = new Phaser.Geom.Rectangle(-newDisplaySize/2, -newDisplaySize/2, newDisplaySize, newDisplaySize);
        component.setInteractive(newHitArea, Phaser.Geom.Rectangle.Contains, { draggable: true, useHandCursor: true });
        this.input.setDraggable(component);

        this.createComponent(
          component.getData('originalX'),
          component.getData('originalY'),
          component.getData('type')
        );

        this.placedComponents.push(component);

      } else if (!component.getData('isInPanel')) {
        const snapped = this.snapToGrid(component.x, component.y);
        
        if (this.isPositionOccupied(snapped.x, snapped.y, component, type)) {
          const previousX = component.getData('previousX') || component.x;
          const previousY = component.getData('previousY') || component.y;
          component.x = previousX;
          component.y = previousY;
        } else {
          component.setData('previousX', component.x);
          component.setData('previousY', component.y);
          component.x = snapped.x;
          component.y = snapped.y;
        }

      } else {
        component.x = component.getData('originalX');
        component.y = component.getData('originalY');
      }

      this.time.delayedCall(500, () => {
        component.setData('isDragging', false);
      });
    });

    component.on('pointerdown', () => {
      if (!component.getData('isInPanel') && !component.getData('dragMoved')) {
        const currentTime = this.time.now;
        const lastClickTime = component.getData('lastClickTime');
        const timeDiff = currentTime - lastClickTime;
        
        if (timeDiff < 300) {
          const currentRotation = component.getData('rotation');
          const newRotation = (currentRotation + 90) % 360;
          component.setData('rotation', newRotation);

          this.tweens.add({
            targets: component,
            angle: newRotation,
            duration: 150,
            ease: 'Cubic.easeOut',
          });
          
          component.setData('lastClickTime', 0);
        } else {
          component.setData('lastClickTime', currentTime);
        }
      }
    });

    component.on('pointerup', () => {
      this.time.delayedCall(100, () => {
        component.setData('dragMoved', false);
      });
    });

    component.on('pointerover', () => {
      component.setScale(1.1);
    });

    component.on('pointerout', () => {
      component.setScale(1);
    });
  }
}
