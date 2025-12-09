import Phaser from 'phaser';

export default class LogicWorkspaceScene extends Phaser.Scene {
  constructor() {
    super('LogicWorkspaceScene');
    this.placedComponents = [];
    this.gridSize = 40;
    this.selectedComponent = null;
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistorySize = 10;
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
      { type: 'and', y: 110 },
      { type: 'or', y: 200 },
      { type: 'not', y: 290 },
      { type: 'nand', y: 380 },
      { type: 'nor', y: 470 },
      { type: 'xor', y: 560 },
      { type: 'xnor', y: 650 },
      { type: 'wire', y: 740 }
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

    // Keyboard shortcuts for Delete, Undo, Redo
    this.input.keyboard.on('keydown-DELETE', () => {
      if (this.selectedComponent && !this.selectedComponent.getData('isInPanel')) {
        this.deleteComponent(this.selectedComponent);
        this.selectedComponent = null;
      }
    });

    this.input.keyboard.on('keydown-Z', (event) => {
      if (event.ctrlKey) {
        event.preventDefault();
        this.undo();
      }
    });

    this.input.keyboard.on('keydown-Y', (event) => {
      if (event.ctrlKey) {
        event.preventDefault();
        this.redo();
      }
    });

    // Save initial empty state
    this.saveState('initial_state');
  }

  // Undo/Redo history management
  saveState(action) {
    // Clear redo stack when new action is performed
    this.redoStack = [];
    
    // Save current state
    const state = {
      action: action,
      components: this.placedComponents.map(c => ({
        type: c.getData("type"),
        x: c.x,
        y: c.y,
        rotation: c.getData("rotation") || 0,
        id: c.getData("componentId"),
      }))
    };
    
    this.undoStack.push(state);
    
    // Maintain max history size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  undo() {
    if (this.undoStack.length === 0) return;
    
    // Save current state to redo stack
    const currentState = {
      action: 'state',
      components: this.placedComponents.map(c => ({
        type: c.getData("type"),
        x: c.x,
        y: c.y,
        rotation: c.getData("rotation") || 0,
        id: c.getData("componentId"),
      }))
    };
    this.redoStack.push(currentState);
    
    // Restore previous state
    const previousState = this.undoStack.pop();
    this.restoreState(previousState);
  }

  redo() {
    if (this.redoStack.length === 0) return;
    
    // Save current state to undo stack
    const currentState = {
      action: 'state',
      components: this.placedComponents.map(c => ({
        type: c.getData("type"),
        x: c.x,
        y: c.y,
        rotation: c.getData("rotation") || 0,
        id: c.getData("componentId"),
      }))
    };
    this.undoStack.push(currentState);
    
    // Restore next state
    const nextState = this.redoStack.pop();
    this.restoreState(nextState);
  }

  restoreState(state) {
    // Destroy all current components
    this.placedComponents.forEach(c => c.destroy());
    this.placedComponents = [];
    this.selectedComponent = null;

    // Recreate components from state
    state.components.forEach((item) => {
      const component = this.add.container(item.x, item.y);
      const type = item.type;
      
      const displaySize = type === 'wire' ? 80 : 160;
      const interactiveSize = type === 'wire' ? 80 : 160;
      
      const componentImage = this.add.image(0, 0, type)
        .setOrigin(0.5)
        .setDisplaySize(displaySize, displaySize);
      
      component.add(componentImage);
      
      component.setData('type', type);
      component.setData('originalX', item.x);
      component.setData('originalY', item.y);
      component.setData('rotation', item.rotation || 0);
      component.setData('isInPanel', false);
      component.setData('isDragging', false);
      component.setData('dragMoved', false);
      component.setData('lastClickTime', 0);
      component.setData('componentId', item.id);

      component.angle = item.rotation || 0;

      component.setSize(interactiveSize, interactiveSize);
      component.setInteractive({ draggable: true, useHandCursor: true });

      this.input.setDraggable(component);

      // Add drag events
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
          this.deleteComponent(component);
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

          this.createComponent(
            component.getData('originalX'),
            component.getData('originalY'),
            component.getData('type')
          );

          this.placedComponents.push(component);
          this.saveState('component_placed');

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
            this.saveState('component_moved');
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
        this.selectedComponent = component;
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
              onComplete: () => {
                this.saveState('component_rotated');
              },
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
        this.selectedComponent = component;
        component.setScale(1.1);
      });

      component.on('pointerout', () => {
        if (this.selectedComponent === component) {
          this.selectedComponent = null;
        }
        component.setScale(1);
      });

      this.placedComponents.push(component);
    });
  }

  deleteComponent(component) {
    const idx = this.placedComponents.indexOf(component);
    if (idx !== -1) this.placedComponents.splice(idx, 1);
    component.destroy();
    this.saveState('component_deleted');
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
    const interactiveSize = type === 'wire' ? 80 : 160;
    
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
    component.setData('componentId', type + '_' + Math.random().toString(36).substr(2, 9));

    component.setSize(interactiveSize, interactiveSize);
    component.setInteractive({ draggable: true, useHandCursor: true });

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

        this.createComponent(
          component.getData('originalX'),
          component.getData('originalY'),
          component.getData('type')
        );

        this.placedComponents.push(component);
        this.saveState('component_placed');

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
          this.saveState('component_moved');
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
      this.selectedComponent = component;
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
            onComplete: () => {
              this.saveState('component_rotated');
            },
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
      this.selectedComponent = component;
      component.setScale(1.1);
    });

    component.on('pointerout', () => {
      if (this.selectedComponent === component) {
        this.selectedComponent = null;
      }
      component.setScale(1);
    });

    return component;
  }
}
