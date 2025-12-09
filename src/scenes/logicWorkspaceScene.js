import Phaser from "phaser";

export default class LogicWorkspaceScene extends Phaser.Scene {
  constructor() {
    super("LogicWorkspaceScene");
    this.placedComponents = [];
    this.gridSize = 40;
    this.undoStack = [];
    this.redoStack = [];
    this._hoveredComponent = null;
    this._actionSeq = 0;
    this.maxHistory = 20;
  }

  preload() {
    this.load.image("and", "src/components/logic/and.png");
    this.load.image("nand", "src/components/logic/nand.png");
    this.load.image("nor", "src/components/logic/nor.png");
    this.load.image("not", "src/components/logic/not.png");
    this.load.image("or", "src/components/logic/or.png");
    this.load.image("xnor", "src/components/logic/xnor.png");
    this.load.image("xor", "src/components/logic/xor.png");
    this.load.image("wire", "src/components/wire.png");
  }

  create() {
    const { width, height } = this.cameras.main;

    this.add.rectangle(0, 0, 200, height, 0x2a2a2a).setOrigin(0);
    this.add.rectangle(200, 0, width - 200, height, 0xf5f5f5).setOrigin(0);

    this.createGrid(width, height);

    const panelTitle = this.add
      .text(100, 30, "SANDBOX", {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const components = [
      { type: "and", y: 110 },
      { type: "or", y: 200 },
      { type: "not", y: 290 },
      { type: "nand", y: 380 },
      { type: "nor", y: 470 },
      { type: "xor", y: 560 },
      { type: "xnor", y: 650 },
      { type: "wire", y: 740 },
    ];

    components.forEach((comp) => {
      this.createComponent(100, comp.y, comp.type);
    });

    const backButton = this.add
      .text(40, height - 60, "↩ Back", {
        fontSize: "20px",
        color: "#ffffff",
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => backButton.setStyle({ color: "#aaaaaa" }))
      .on("pointerout", () => backButton.setStyle({ color: "#ffffff" }))
      .on("pointerdown", () => this.scene.start("MenuScene"));

    this.input.keyboard.on("keydown-DELETE", () => {
      if (this._hoveredComponent) {
        const comp = this._hoveredComponent;
        const snapshot = {
          uid: comp.getData("uid"),
          type: comp.getData("type"),
          x: comp.x,
          y: comp.y,
          rotation: comp.getData("rotation"),
        };

        this.placedComponents = this.placedComponents.filter((c) => c !== comp);
        comp.destroy();

        this.pushAction({ type: "remove", compRef: comp, snapshot });
      }
    });

    this.input.keyboard.on("keydown-Z", (e) => {
      if (e.ctrlKey) this.undo();
    });
    this.input.keyboard.on("keydown-Y", (e) => {
      if (e.ctrlKey) this.redo();
    });
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
    const checkingSize = checkingType === "wire" ? 80 : 160;
    const halfCheckingSize = checkingSize / 2;

    for (let component of this.placedComponents) {
      if (component === excludeComponent || component.getData("isInPanel"))
        continue;

      const componentSize = component.getData("type") === "wire" ? 80 : 160;
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
  pushAction(action) {
    if (!action) return;

    this.undoStack.push(action);

  
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }


    this.redoStack = [];
  }
undo() {
  if (!this.undoStack.length) return;
  
  const action = this.undoStack.pop();
  
  if (action.type === "add") {
    const comp = action.compRef;
    if (comp) {
      this.placedComponents = this.placedComponents.filter((c) => c !== comp);
      comp.destroy();
    }
    
  } else if (action.type === "remove") {
   
    const newComp = this.createPlacedFromSnapshot(action.snapshot);
    action.compRef = newComp; 
    
  } else if (action.type === "move") {
    const comp = action.compRef;
    if (comp && !comp.destroyed) { 
     
      comp.x = action.from.x;
      comp.y = action.from.y;
     
    }
    
  } else if (action.type === "rotate") {
    const comp = action.compRef;
    if (comp && !comp.destroyed) {
      comp.setData("rotation", action.from);
      comp.angle = action.from; 
    }
  }
  
  this.redoStack.push(action);
}

redo() {
  if (!this.redoStack.length) return;
  
  const action = this.redoStack.pop();
  
  if (action.type === "add") {
    const newComp = this.createPlacedFromSnapshot(action.snapshot);
    action.compRef = newComp;
    
  } else if (action.type === "remove") {
    const comp = action.compRef;
    if (comp && !comp.destroyed) {
      this.placedComponents = this.placedComponents.filter((c) => c !== comp);
      comp.destroy();
    }
    
  } else if (action.type === "move") {
    const comp = action.compRef;
    if (comp && !comp.destroyed) {
      comp.x = action.to.x;
      comp.y = action.to.y;
    }
    
  } else if (action.type === "rotate") {
    const comp = action.compRef;
    if (comp && !comp.destroyed) {
      comp.setData("rotation", action.to);
      comp.angle = action.to;
    }
  }
  
  this.undoStack.push(action);
}


createPlacedFromSnapshot(s) {
  const component = this.add.container(s.x, s.y);
  
  const displaySize = s.type === "wire" ? 80 : 160;
  const interactiveSize = s.type === "wire" ? 80 : 160;
  
  const componentImage = this.add
    .image(0, 0, s.type)
    .setOrigin(0.5)
    .setDisplaySize(displaySize, displaySize);
  
  component.add(componentImage);
  component.setData("uid", s.uid);
  component.setData("type", s.type);
  component.setData("originalX", s.x);
  component.setData("originalY", s.y);
  component.setData("rotation", s.rotation);
  component.setData("isInPanel", false);
  component.setData("isDragging", false);
  component.setData("dragMoved", false);
  component.setData("lastClickTime", 0);
  
  component.angle = s.rotation;
  
  component.setSize(interactiveSize, interactiveSize);
  component.setInteractive({ draggable: true, useHandCursor: true });
  this.input.setDraggable(component);
  
  this.attachEventHandlers(component, componentImage, s.type);
  
  this.placedComponents.push(component);
  
  return component;
}
attachEventHandlers(component, componentImage, type) {
  component.on("dragstart", () => {
    component.setData("isDragging", true);
    component.setData("dragMoved", false);
    if (!component.getData("isInPanel")) {
      component.setData("startPos", { x: component.x, y: component.y });
    }
  });

  component.on("drag", (pointer, dragX, dragY) => {
    component.setData("dragMoved", true);
    component.x = dragX;
    component.y = dragY;
  });

  component.on("dragend", () => {
    const isInPanel = component.x < 200;

    if (isInPanel && !component.getData("isInPanel")) {
      component.destroy();
      
    } else if (!isInPanel && component.getData("isInPanel")) {
      const snapped = this.snapToGrid(component.x, component.y);

      if (this.isPositionOccupied(snapped.x, snapped.y, component, type)) {
        component.x = component.getData("originalX");
        component.y = component.getData("originalY");
        component.setData("isDragging", false);
        return;
      }

      component.x = snapped.x;
      component.y = snapped.y;
      component.setData("isInPanel", false);

      const newDisplaySize = type === "wire" ? 80 : 160;
      componentImage.setDisplaySize(newDisplaySize, newDisplaySize);

      this.createComponent(
        component.getData("originalX"),
        component.getData("originalY"),
        component.getData("type")
      );

      this.placedComponents.push(component);
      
      this.pushAction({
        type: "add",
        compRef: component,
        snapshot: {
          uid: component.getData("uid"),
          type: component.getData("type"),
          x: component.x,
          y: component.y,
          rotation: component.getData("rotation"),
        },
      });
      
    } else if (!component.getData("isInPanel")) {
      const start = component.getData("startPos");
      const snapped = this.snapToGrid(component.x, component.y);

      if (!this.isPositionOccupied(snapped.x, snapped.y, component, type)) {
        component.x = snapped.x;
        component.y = snapped.y;

        if (start && (start.x !== component.x || start.y !== component.y)) {
          this.pushAction({
            type: "move",
            compRef: component,
            uid: component.getData("uid"),
            from: start,
            to: { x: component.x, y: component.y },
          });
        }
      } else {
        if (start) {
          component.x = start.x;
          component.y = start.y;
        }
      }
    }

    this.time.delayedCall(500, () => {
      component.setData("isDragging", false);
    });
  });

  component.on("pointerdown", () => {
    if (!component.getData("isInPanel") && !component.getData("dragMoved")) {
      const currentTime = this.time.now;
      const lastClickTime = component.getData("lastClickTime");
      const timeDiff = currentTime - lastClickTime;

      if (timeDiff < 300) {
        const currentRotation = component.getData("rotation");
        const newRotation = (currentRotation + 90) % 360;
        
        this.pushAction({
          type: "rotate",
          compRef: component,
          uid: component.getData("uid"),
          from: currentRotation,
          to: newRotation,
        });
        
        component.setData("rotation", newRotation);

        this.tweens.add({
          targets: component,
          angle: newRotation,
          duration: 150,
          ease: "Cubic.easeOut",
        });

        component.setData("lastClickTime", 0);
      } else {
        component.setData("lastClickTime", currentTime);
      }
    }
  });

  component.on("pointerup", () => {
    this.time.delayedCall(100, () => {
      component.setData("dragMoved", false);
    });
  });

  component.on("pointerover", () => {
    component.setScale(1.1);
    this._hoveredComponent = component;
  });
  
  component.on("pointerout", () => {
    component.setScale(1);
    if (this._hoveredComponent === component) this._hoveredComponent = null;
  });
}
  createComponent(x, y, type, forceUid = null) {
    const component = this.add.container(x, y);

    const isInPanel = x < 200;
    const displaySize = isInPanel ? 80 : type === "wire" ? 80 : 160;
    const interactiveSize = type === "wire" ? 80 : 160;

    const componentImage = this.add
      .image(0, 0, type)
      .setOrigin(0.5)
      .setDisplaySize(displaySize, displaySize);

    const uid = forceUid ?? type + "_" + Math.floor(Math.random() * 999999);

    component.setData("uid", uid);

    component.add(componentImage);

    component.setData("type", type);
    component.setData("originalX", x);
    component.setData("originalY", y);
    component.setData("rotation", 0);
    component.setData("isInPanel", isInPanel);
    component.setData("isDragging", false);
    component.setData("dragMoved", false);
    component.setData("lastClickTime", 0);

    component.setSize(interactiveSize, interactiveSize);
    component.setInteractive({ draggable: true, useHandCursor: true });

    this.input.setDraggable(component);

    this.attachEventHandlers(component, componentImage, type);

    // component.on("dragstart", () => {
    //   component.setData("isDragging", true);
    //   component.setData("dragMoved", false);
    //   if (!component.getData("isInPanel")) {
    //     component.setData("startPos", { x: component.x, y: component.y });
    //   }
    // });

    // component.on("drag", (pointer, dragX, dragY) => {
    //   component.setData("dragMoved", true);
    //   component.x = dragX;
    //   component.y = dragY;
    // });

    // component.on("dragend", () => {
    //   const isInPanel = component.x < 200;
    //   const skipHistory = component.getData("skipHistory");

    //   if (isInPanel && !component.getData("isInPanel")) {
    //     component.destroy();
    //   } else if (!isInPanel && component.getData("isInPanel")) {
    //     const snapped = this.snapToGrid(component.x, component.y);

    //     if (this.isPositionOccupied(snapped.x, snapped.y, component, type)) {
    //       component.x = component.getData("originalX");
    //       component.y = component.getData("originalY");
    //       component.setData("isDragging", false);
    //       return;
    //     }

    //     component.x = snapped.x;
    //     component.y = snapped.y;
    //     component.setData("isInPanel", false);

    //     const newDisplaySize = type === "wire" ? 80 : 160;
    //     componentImage.setDisplaySize(newDisplaySize, newDisplaySize);

    //     this.createComponent(
    //       component.getData("originalX"),
    //       component.getData("originalY"),
    //       component.getData("type")
    //     );

        

    //     if (!skipHistory) {
    //     this.placedComponents.push(component);
    //       this.pushAction({
    //         type: "add",
    //         compRef: component,
    //         snapshot: {
    //           uid: component.getData("uid"),
    //           type: component.getData("type"),
    //           x: component.x,
    //           y: component.y,
    //           rotation: component.getData("rotation"),
    //         },
    //       });
    //     }
    //   } else if (!component.getData("isInPanel")) {
    //     const start = component.getData("startPos");
    //     const snapped = this.snapToGrid(component.x, component.y);

    //     if (!this.isPositionOccupied(snapped.x, snapped.y, component, type)) {
    //       const oldX = component.x;
    //       const oldY = component.y;

    //       component.x = snapped.x;
    //       component.y = snapped.y;

    //       // če se je dejansko premaknila
    //       if (
    //         start &&
    //         (start.x !== component.x || start.y !== component.y) &&
    //         !skipHistory
    //       ) {
    //         this.pushAction({
    //           type: "move",
    //           compRef: component,
    //           uid: component.getData("uid"),
    //           from: start,
    //           to: { x: component.x, y: component.y },
    //         });
    //       }
    //     } else {
    //       // vrni na začetno lokacijo
    //       if (start) {
    //         component.x = start.x;
    //         component.y = start.y;
    //       }
    //     }
    //   }

    //   this.time.delayedCall(500, () => {
    //     component.setData("isDragging", false);
    //   });
    // });

    // component.on("pointerdown", () => {
    //   if (!component.getData("isInPanel") && !component.getData("dragMoved")) {
    //     const currentTime = this.time.now;
    //     const lastClickTime = component.getData("lastClickTime");
    //     const timeDiff = currentTime - lastClickTime;
    //     const skipHistory = component.getData("skipHistory");

    //     if (timeDiff < 300) {
    //       const currentRotation = component.getData("rotation");
    //       const newRotation = (currentRotation + 90) % 360;
    //       if (!skipHistory) {
    //         this.pushAction({
    //           type: "rotate",
    //           compRef: component,
    //           uid: component.getData("uid"),
    //           from: currentRotation,
    //           to: newRotation,
    //         });
    //       }
    //       component.setData("rotation", newRotation);

    //       this.tweens.add({
    //         targets: component,
    //         angle: newRotation,
    //         duration: 150,
    //         ease: "Cubic.easeOut",
    //       });

    //       component.setData("lastClickTime", 0);
    //     } else {
    //       component.setData("lastClickTime", currentTime);
    //     }
    //   }
    // });

    // component.on("pointerup", () => {
    //   this.time.delayedCall(100, () => {
    //     component.setData("dragMoved", false);
    //   });
    // });

    // component.on("pointerover", () => {
    //   component.setScale(1.1);
    //   this._hoveredComponent = component;
    // });
    // component.on("pointerout", () => {
    //   component.setScale(1);
    //   if (this._hoveredComponent === component) this._hoveredComponent = null;
    // });
  }
}
