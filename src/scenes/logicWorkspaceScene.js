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

    // Set up camera controls
    this.setupCameraControls();

    // Create workspace layer (will be affected by camera zoom/pan)
    this.workspaceLayer = this.add.container(0, 0);
    this.workspaceLayer.setDepth(0);

    // Add left panel (not affected by zoom)
    this.add.rectangle(0, 0, 200, height, 0x2a2a2a).setOrigin(0);

    // Add workspace background to workspace layer
    const workspaceBackground = this.add
      .rectangle(200, 0, width * 3, height * 3, 0xf5f5f5)
      .setOrigin(0);
    this.workspaceLayer.add(workspaceBackground);

    // Store grid graphics reference for dynamic updates
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(1);
    this.workspaceLayer.add(this.gridGraphics);
    this.updateGrid();

    // Store workspace offset for panning
    this.workspaceOffsetX = 0;
    this.workspaceOffsetY = 0;

    const panelTitle = this.add
      .text(100, 30, "SANDBOX", {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const components = [
      { type: "input-1", y: 80 },
      { type: "input-0", y: 140 },
      { type: "output", y: 200 },
      { type: "wire", y: 260 },
      { type: "and", y: 330 },
      { type: "or", y: 400 },
      { type: "not", y: 470 },
      { type: "nand", y: 540 },
      { type: "nor", y: 610 },
      { type: "xor", y: 680 },
      { type: "xnor", y: 750 },
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

    // Zoom buttons
    const makeButton = (x, y, label, onClick) => {
      const buttonWidth = 120;
      const buttonHeight = 40;
      const cornerRadius = 8;

      const bg = this.add.graphics();
      bg.fillStyle(0x4a4a4a, 1);
      bg.fillRoundedRect(
        x - buttonWidth / 2,
        y - buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        cornerRadius
      );

      const text = this.add
        .text(x, y, label, {
          fontSize: "18px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          bg.clear();
          bg.fillStyle(0x666666, 1);
          bg.fillRoundedRect(
            x - buttonWidth / 2,
            y - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            cornerRadius
          );
        })
        .on("pointerout", () => {
          bg.clear();
          bg.fillStyle(0x4a4a4a, 1);
          bg.fillRoundedRect(
            x - buttonWidth / 2,
            y - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            cornerRadius
          );
        })
        .on("pointerdown", onClick);

      return { bg, text };
    };

    makeButton(width - 100, height - 280, "Test Circuit", () =>
      this.testCircuit()
    );
    makeButton(width - 100, height - 230, "Clear Output", () =>
      this.clearOutput()
    );
    makeButton(width - 100, height - 180, "Zoom +", () => this.zoomIn());
    makeButton(width - 100, height - 130, "Zoom -", () => this.zoomOut());
    makeButton(width - 100, height - 80, "Reset", () => this.resetZoom());

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

  updateGrid() {
    if (!this.gridGraphics || !this.workspaceLayer) return;

    const { width, height } = this.cameras.main;
    const zoom = this.currentZoom || 1.0;

    // Calculate visible area in workspace coordinates
    const visibleLeft = -this.workspaceOffsetX / zoom;
    const visibleTop = -this.workspaceOffsetY / zoom;
    const visibleRight = visibleLeft + width / zoom;
    const visibleBottom = visibleTop + height / zoom;

    // Clear previous grid
    this.gridGraphics.clear();

    // Adjust grid line width based on zoom
    const lineWidth = Math.max(0.5, 1 / zoom);
    this.gridGraphics.lineStyle(lineWidth, 0xcccccc, 0.3);

    const gridSize = this.gridSize;
    const startX = 200;

    // Calculate grid bounds
    const gridStartX = Math.max(
      startX,
      Math.floor(visibleLeft / gridSize) * gridSize
    );
    const gridStartY = Math.floor(visibleTop / gridSize) * gridSize;
    const gridEndX = Math.ceil(visibleRight / gridSize) * gridSize;
    const gridEndY = Math.ceil(visibleBottom / gridSize) * gridSize;

    // Draw vertical lines
    for (let x = gridStartX; x <= gridEndX; x += gridSize) {
      if (x < startX) continue;
      this.gridGraphics.beginPath();
      this.gridGraphics.moveTo(x, gridStartY);
      this.gridGraphics.lineTo(x, gridEndY);
      this.gridGraphics.strokePath();
    }

    // Draw horizontal lines
    for (let y = gridStartY; y <= gridEndY; y += gridSize) {
      this.gridGraphics.beginPath();
      this.gridGraphics.moveTo(Math.max(startX, gridStartX), y);
      this.gridGraphics.lineTo(gridEndX, y);
      this.gridGraphics.strokePath();
    }
  }

  zoomIn() {
    if (!this.workspaceLayer) return;
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.setZoom(
      Math.min(this.maxZoom, this.currentZoom + 0.1),
      centerX,
      centerY
    );
  }

  zoomOut() {
    if (!this.workspaceLayer) return;
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.setZoom(
      Math.max(this.minZoom, this.currentZoom - 0.1),
      centerX,
      centerY
    );
  }

  resetZoom() {
    if (!this.workspaceLayer) return;
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.setZoom(1.0, centerX, centerY);
  }

  setZoom(newZoom, screenX, screenY) {
    if (!this.workspaceLayer) return;

    // Calculate zoom point in workspace coordinates
    const zoomPointX = (screenX - this.workspaceOffsetX) / this.currentZoom;
    const zoomPointY = (screenY - this.workspaceOffsetY) / this.currentZoom;

    // Update zoom
    this.currentZoom = newZoom;
    this.workspaceLayer.setScale(this.currentZoom);

    // Adjust offset to zoom towards point
    this.workspaceOffsetX = screenX - zoomPointX * this.currentZoom;
    this.workspaceOffsetY = screenY - zoomPointY * this.currentZoom;
    this.workspaceLayer.setPosition(
      this.workspaceOffsetX,
      this.workspaceOffsetY
    );

    this.updateGrid();
  }

  setupCameraControls() {
    // Set initial zoom and limits
    this.minZoom = 0.5;
    this.maxZoom = 2.0;
    this.currentZoom = 1.0;

    // Pan state
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.workspaceStartX = 0;
    this.workspaceStartY = 0;

    // Arrow keys for panning
    this.cursors = this.input.keyboard.createCursorKeys();
    this.panSpeed = 5;

    // Mouse wheel zoom
    this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      // Don't zoom if over UI elements (left panel or buttons)
      if (pointer.x < 200 || pointer.x > this.scale.width - 150) return;
      if (pointer.isDown) return; // Don't zoom while dragging components

      const zoomFactor = 0.1;
      let newZoom = this.currentZoom;

      if (deltaY > 0) {
        newZoom = Math.max(this.minZoom, this.currentZoom - zoomFactor);
      } else if (deltaY < 0) {
        newZoom = Math.min(this.maxZoom, this.currentZoom + zoomFactor);
      }

      if (newZoom !== this.currentZoom) {
        // Calculate zoom point in world coordinates
        const zoomPointX =
          (pointer.x - this.workspaceOffsetX) / this.currentZoom;
        const zoomPointY =
          (pointer.y - this.workspaceOffsetY) / this.currentZoom;

        // Update zoom
        this.currentZoom = newZoom;
        this.workspaceLayer.setScale(this.currentZoom);

        // Adjust offset to zoom towards mouse
        this.workspaceOffsetX = pointer.x - zoomPointX * this.currentZoom;
        this.workspaceOffsetY = pointer.y - zoomPointY * this.currentZoom;
        this.workspaceLayer.setPosition(
          this.workspaceOffsetX,
          this.workspaceOffsetY
        );

        this.updateGrid();
      }
    });

    // Middle mouse button drag for panning
    this.input.on("pointerdown", (pointer) => {
      if (pointer.button === 1) {
        // Middle mouse button
        // Don't pan if over UI elements
        if (pointer.x < 200 || pointer.x > this.scale.width - 150) return;
        this.isPanning = true;
        this.panStartX = pointer.x;
        this.panStartY = pointer.y;
        this.workspaceStartX = this.workspaceOffsetX;
        this.workspaceStartY = this.workspaceOffsetY;
      }
    });

    this.input.on("pointermove", (pointer) => {
      if (this.isPanning && pointer.button === 1) {
        const deltaX = pointer.x - this.panStartX;
        const deltaY = pointer.y - this.panStartY;
        this.workspaceOffsetX = this.workspaceStartX + deltaX;
        this.workspaceOffsetY = this.workspaceStartY + deltaY;
        this.workspaceLayer.setPosition(
          this.workspaceOffsetX,
          this.workspaceOffsetY
        );
        this.updateGrid();
      }
    });

    this.input.on("pointerup", (pointer) => {
      if (pointer.button === 1) {
        this.isPanning = false;
      }
    });
  }

  update() {
    // Arrow key panning
    if (this.cursors && this.workspaceLayer) {
      let moved = false;

      if (this.cursors.left.isDown) {
        this.workspaceOffsetX += this.panSpeed;
        moved = true;
      } else if (this.cursors.right.isDown) {
        this.workspaceOffsetX -= this.panSpeed;
        moved = true;
      }

      if (this.cursors.up.isDown) {
        this.workspaceOffsetY += this.panSpeed;
        moved = true;
      } else if (this.cursors.down.isDown) {
        this.workspaceOffsetY -= this.panSpeed;
        moved = true;
      }

      if (moved) {
        this.workspaceLayer.setPosition(
          this.workspaceOffsetX,
          this.workspaceOffsetY
        );
        this.updateGrid();
      }
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
    const isSmallType =
      checkingType === "wire" ||
      checkingType === "input-1" ||
      checkingType === "input-0" ||
      checkingType === "output";
    const checkingSize = isSmallType ? 80 : 160;
    const halfCheckingSize = checkingSize / 2;

    for (let component of this.placedComponents) {
      if (component === excludeComponent || component.getData("isInPanel"))
        continue;

      const compType = component.getData("type");
      const isCompSmallType =
        compType === "wire" ||
        compType === "input-1" ||
        compType === "input-0" ||
        compType === "output";
      const componentSize = isCompSmallType ? 80 : 160;
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

    const isSmallType =
      s.type === "wire" ||
      s.type === "input-1" ||
      s.type === "input-0" ||
      s.type === "output";
    const displaySize = isSmallType ? 80 : 160;
    const interactiveSize = isSmallType ? 80 : 160;

    let componentImage = null;

    // Handle input types with special visuals (smaller)
    if (s.type === "input-1" || s.type === "input-0") {
      const circleColor = s.type === "input-1" ? 0x00ff00 : 0xff0000;
      const circle = this.add.circle(0, 0, 25, circleColor, 1);
      component.add(circle);

      const inputValue = s.type === "input-1" ? "1" : "0";
      const valueText = this.add
        .text(0, 0, inputValue, {
          fontSize: "28px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      component.add(valueText);

      component.setData("valueText", valueText);
      component.setData("circleGraphic", circle);
    } else if (s.type === "output") {
      const circle = this.add.circle(0, 0, 30, 0x808080, 1);
      circle.setStrokeStyle(3, 0x333333);
      component.add(circle);

      const valueText = this.add
        .text(0, 0, "OUT", {
          fontSize: "16px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      component.add(valueText);

      component.setData("valueText", valueText);
      component.setData("circleGraphic", circle);
      component.setData("outputValue", null);
    } else {
      componentImage = this.add
        .image(0, 0, s.type)
        .setOrigin(0.5)
        .setDisplaySize(displaySize, displaySize);
      component.add(componentImage);
    }
    component.setData("uid", s.uid);
    component.setData("type", s.type);
    component.setData("originalX", s.x);
    component.setData("originalY", s.y);
    component.setData("rotation", s.rotation);
    component.setData("isInPanel", false);
    component.setData("isDragging", false);
    component.setData("dragMoved", false);
    component.setData("lastClickTime", 0);
    component.setData("previousX", s.x);
    component.setData("previousY", s.y);

    component.angle = s.rotation;

    component.setSize(interactiveSize, interactiveSize);
    component.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(component);

    // For special types, there's no componentImage
    const imageRef =
      s.type === "input-1" || s.type === "input-0" || s.type === "output"
        ? null
        : componentImage;
    this.attachEventHandlers(component, imageRef, s.type);

    this.placedComponents.push(component);

    // Add component to workspace layer
    if (this.workspaceLayer) {
      this.workspaceLayer.add(component);
    }

    return component;
  }

  attachEventHandlers(component, componentImage, type) {
    component.on("dragstart", () => {
      component.setData("isDragging", true);
      component.setData("dragMoved", false);
      if (!component.getData("isInPanel")) {
        component.setData("startPos", { x: component.x, y: component.y });
        component.setData("previousX", component.x);
        component.setData("previousY", component.y);
      }
    });

    component.on("drag", (pointer, dragX, dragY) => {
      component.setData("dragMoved", true);
      // If component is in workspace layer, convert screen to workspace coordinates
      if (
        this.workspaceLayer &&
        !component.getData("isInPanel") &&
        component.parentContainer === this.workspaceLayer
      ) {
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        const localX = (worldX - this.workspaceOffsetX) / this.currentZoom;
        const localY = (worldY - this.workspaceOffsetY) / this.currentZoom;
        component.x = localX;
        component.y = localY;
      } else {
        component.x = dragX;
        component.y = dragY;
      }
    });

    component.on("dragend", () => {
      const isInPanel = component.x < 200;

      if (isInPanel && !component.getData("isInPanel")) {
        // Component dragged back to panel - destroy it
        this.placedComponents = this.placedComponents.filter(
          (c) => c !== component
        );
        component.destroy();
      } else if (!isInPanel && component.getData("isInPanel")) {
        // Component dragged from panel to workspace
        // Convert screen coordinates to workspace coordinates
        const screenX = component.x;
        const screenY = component.y;
        const workspaceX = (screenX - this.workspaceOffsetX) / this.currentZoom;
        const workspaceY = (screenY - this.workspaceOffsetY) / this.currentZoom;

        const snapped = this.snapToGrid(workspaceX, workspaceY);

        if (this.isPositionOccupied(snapped.x, snapped.y, component, type)) {
          // Position occupied - return to panel
          component.x = component.getData("originalX");
          component.y = component.getData("originalY");
          component.setData("isDragging", false);
          return;
        }

        component.x = snapped.x;
        component.y = snapped.y;
        component.setData("isInPanel", false);
        component.setData("previousX", snapped.x);
        component.setData("previousY", snapped.y);

        // Resize for regular components (not special types)
        if (componentImage) {
          const newDisplaySize = type === "wire" ? 80 : 160;
          componentImage.setDisplaySize(newDisplaySize, newDisplaySize);
        } else if (type === "input-1" || type === "input-0") {
          // Resize input type elements
          const circle = component.getData("circleGraphic");
          const valueText = component.getData("valueText");
          if (circle) circle.setRadius(25);
          if (valueText) valueText.setFontSize("28px");
        } else if (type === "output") {
          // Resize output elements
          const circle = component.getData("circleGraphic");
          const valueText = component.getData("valueText");
          if (circle) circle.setRadius(30);
          if (valueText) valueText.setFontSize("16px");
        }

        // Create new component in panel to replace the one being placed
        this.createComponent(
          component.getData("originalX"),
          component.getData("originalY"),
          component.getData("type")
        );

        this.placedComponents.push(component);

        // Add component to workspace layer
        if (this.workspaceLayer && !component.getData("isInPanel")) {
          this.workspaceLayer.add(component);
        }

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
        // Component already on workspace - snap to grid
        const start = component.getData("startPos");
        const snapped = this.snapToGrid(component.x, component.y);

        if (!this.isPositionOccupied(snapped.x, snapped.y, component, type)) {
          // Position is free - move to snapped position
          component.x = snapped.x;
          component.y = snapped.y;
          component.setData("previousX", snapped.x);
          component.setData("previousY", snapped.y);

          // Only add to undo stack if actually moved
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
          // Position occupied - revert to previous position
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

    component.on("pointerdown", (pointer) => {
      // Right-click delete
      if (pointer?.rightButtonDown()) {
        pointer.event?.preventDefault?.();
        if (!component.getData("isInPanel")) {
          const snapshot = {
            uid: component.getData("uid"),
            type: component.getData("type"),
            x: component.x,
            y: component.y,
            rotation: component.getData("rotation"),
          };

          this.placedComponents = this.placedComponents.filter(
            (c) => c !== component
          );
          component.destroy();

          this.pushAction({ type: "remove", compRef: component, snapshot });
        }
        return;
      }

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
    const isSmallType =
      type === "wire" ||
      type === "input-1" ||
      type === "input-0" ||
      type === "output";
    const displaySize = isInPanel
      ? type === "input-1" || type === "input-0"
        ? 50
        : 80
      : isSmallType
      ? 80
      : 160;
    const interactiveSize = isSmallType ? 80 : 160;

    const uid = forceUid ?? type + "_" + Math.floor(Math.random() * 999999);
    component.setData("uid", uid);

    let componentImage;

    // Handle input types with special visuals (smaller size)
    if (type === "input-1" || type === "input-0") {
      // Create a colored circle background (smaller)
      const circleColor = type === "input-1" ? 0x00ff00 : 0xff0000;
      const circleRadius = isInPanel ? 15 : 25;
      const circle = this.add.circle(0, 0, circleRadius, circleColor, 1);
      component.add(circle);

      // Add the input value text
      const inputValue = type === "input-1" ? "1" : "0";
      const valueText = this.add
        .text(0, 0, inputValue, {
          fontSize: isInPanel ? "18px" : "28px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      component.add(valueText);

      // Store the text for potential updates
      component.setData("valueText", valueText);
      component.setData("circleGraphic", circle);
    } else if (type === "output") {
      // Create output indicator (gray circle initially)
      const circleRadius = isInPanel ? 20 : 30;
      const circle = this.add.circle(0, 0, circleRadius, 0x808080, 1);
      circle.setStrokeStyle(3, 0x333333);
      component.add(circle);

      // Add "OUT" text
      const valueText = this.add
        .text(0, 0, "OUT", {
          fontSize: isInPanel ? "12px" : "16px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      component.add(valueText);

      // Store for potential updates
      component.setData("valueText", valueText);
      component.setData("circleGraphic", circle);
      component.setData("outputValue", null);
    } else {
      // Use image for logic gates and wires
      componentImage = this.add
        .image(0, 0, type)
        .setOrigin(0.5)
        .setDisplaySize(displaySize, displaySize);
      component.add(componentImage);
    }

    component.setData("type", type);
    component.setData("originalX", x);
    component.setData("originalY", y);
    component.setData("rotation", 0);
    component.setData("isInPanel", isInPanel);
    component.setData("isDragging", false);
    component.setData("dragMoved", false);
    component.setData("lastClickTime", 0);
    component.setData("previousX", x);
    component.setData("previousY", y);

    component.setSize(interactiveSize, interactiveSize);
    component.setInteractive({ draggable: true, useHandCursor: true });

    this.input.setDraggable(component);

    // For special types, pass null as componentImage since they use different visuals
    const imageRef =
      type === "input-1" || type === "input-0" || type === "output"
        ? null
        : componentImage;
    this.attachEventHandlers(component, imageRef, type);
  }

  testCircuit() {
    console.log("=== Testing Circuit ===");

    // Get all components on the workspace
    const workspaceComponents = this.placedComponents.filter(
      (c) => !c.getData("isInPanel")
    );

    console.log("Workspace components:", workspaceComponents.length);

    // Reset all component values
    workspaceComponents.forEach((comp) => {
      comp.setData("logicValue", undefined);
    });

    // Set input values
    workspaceComponents.forEach((comp) => {
      const type = comp.getData("type");
      if (type === "input-1") {
        comp.setData("logicValue", 1);
        console.log("Set input-1 at", comp.x, comp.y, "to 1");
      } else if (type === "input-0") {
        comp.setData("logicValue", 0);
        console.log("Set input-0 at", comp.x, comp.y, "to 0");
      }
    });

    // Build connection graph (which components are connected)
    const connections = this.buildConnectionGraph(workspaceComponents);

    console.log("Connections built:", connections.size);
    connections.forEach((targets, source) => {
      if (targets.length > 0) {
        console.log(
          `${source.getData("type")} at (${source.x},${source.y}) connects to:`,
          targets.map((t) => `${t.getData("type")} at (${t.x},${t.y})`)
        );
      }
    });

    // Evaluate circuit (propagate values through gates)
    const maxIterations = 100;
    let changed = true;
    let iterations = 0;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      workspaceComponents.forEach((comp) => {
        const type = comp.getData("type");
        const currentValue = comp.getData("logicValue");

        // Skip if already has value or is input
        if (type === "input-1" || type === "input-0") {
          return;
        }

        // Get inputs to this component
        const inputs = this.getComponentInputs(comp, connections);

        // Skip if no inputs
        if (inputs.length === 0) {
          return;
        }

        // Skip if not all inputs are ready
        if (inputs.some((v) => v === undefined)) {
          return;
        }

        // Calculate output based on gate type
        let output = undefined;
        switch (type) {
          case "wire":
            output = inputs[0];
            break;
          case "not":
            output = inputs[0] !== undefined ? 1 - inputs[0] : undefined;
            break;
          case "and":
            // AND requires at least 1 input, output 1 only if all are 1
            output = inputs.length > 0 && inputs.every((v) => v === 1) ? 1 : 0;
            break;
          case "or":
            // OR outputs 1 if any input is 1
            output = inputs.some((v) => v === 1) ? 1 : 0;
            break;
          case "nand":
            // NAND is opposite of AND
            output = inputs.length > 0 && inputs.every((v) => v === 1) ? 0 : 1;
            break;
          case "nor":
            // NOR is opposite of OR
            output = inputs.some((v) => v === 1) ? 0 : 1;
            break;
          case "xor":
            // XOR outputs 1 if odd number of 1s
            output = inputs.reduce((a, b) => a ^ b, 0);
            break;
          case "xnor":
            // XNOR outputs 1 if even number of 1s
            output = inputs.reduce((a, b) => a ^ b, 0) === 0 ? 1 : 0;
            break;
          case "output":
            output = inputs[0];
            break;
        }

        if (output !== undefined && output !== currentValue) {
          comp.setData("logicValue", output);
          console.log(
            `✓ Set ${type} at (${comp.x},${comp.y}) to ${output} (inputs: [${inputs}])`
          );
          changed = true;
        }
      });
    }

    console.log(`Circuit evaluated in ${iterations} iterations`);

    // Update visual display of outputs
    this.updateOutputDisplay();
  }

  buildConnectionGraph(components) {
    const connections = new Map();
    const connectionTolerance = 45;

    components.forEach((comp) => {
      connections.set(comp, []);
    });

    // For each component, find what's connected to its output
    components.forEach((comp1) => {
      const type1 = comp1.getData("type");

      // Calculate output position (right side of component)
      const rotation1 = comp1.getData("rotation") || 0;
      const outputOffset = this.getOutputOffset(rotation1);
      const output1X = comp1.x + outputOffset.x;
      const output1Y = comp1.y + outputOffset.y;

      components.forEach((comp2) => {
        if (comp1 === comp2) return;

        const type2 = comp2.getData("type");

        // Get all input positions for comp2 (multi-input gates have multiple)
        const rotation2 = comp2.getData("rotation") || 0;
        const inputOffsets = this.getInputOffsets(type2, rotation2);

        let connected = false;
        inputOffsets.forEach((inputOffset, idx) => {
          const input2X = comp2.x + inputOffset.x;
          const input2Y = comp2.y + inputOffset.y;

          // Check if output of comp1 connects to input of comp2
          const dx = Math.abs(output1X - input2X);
          const dy = Math.abs(output1Y - input2Y);
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionTolerance && !connected) {
            connections.get(comp1).push(comp2);
            connected = true;
            console.log(
              `  ✓ ${type1}(${comp1.x},${comp1.y}) → ${type2}(${comp2.x},${
                comp2.y
              }) input${inputOffsets.length > 1 ? idx + 1 : ""}`
            );
          }
        });
      });
    });

    return connections;
  }

  getOutputOffset(rotation) {
    // Output is on the right side (40px offset) adjusted for rotation
    const angle = (rotation * Math.PI) / 180;
    return {
      x: Math.round(40 * Math.cos(angle)),
      y: Math.round(40 * Math.sin(angle)),
    };
  }

  getInputOffset(rotation) {
    // Input is on the left side (-40px offset) adjusted for rotation
    const angle = (rotation * Math.PI) / 180;
    return {
      x: Math.round(-40 * Math.cos(angle)),
      y: Math.round(-40 * Math.sin(angle)),
    };
  }

  getInputOffsets(componentType, rotation) {
    // Multi-input gates have two input ports
    const multiInputGates = ["and", "or", "nand", "nor", "xor", "xnor"];

    if (multiInputGates.includes(componentType)) {
      // Two inputs: one at top-left, one at bottom-left
      const angle = (rotation * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      return [
        {
          x: Math.round(-40 * cos - 20 * sin),
          y: Math.round(-40 * sin + 20 * cos),
        },
        {
          x: Math.round(-40 * cos + 20 * sin),
          y: Math.round(-40 * sin - 20 * cos),
        },
      ];
    } else {
      // Single input gates (NOT, wire, output)
      return [this.getInputOffset(rotation)];
    }
  }

  getComponentInputs(component, connections) {
    const inputs = [];

    // Find all components that connect to this one
    this.placedComponents.forEach((otherComp) => {
      if (otherComp.getData("isInPanel")) return;

      const connectedComponents = connections.get(otherComp) || [];
      if (connectedComponents.includes(component)) {
        const value = otherComp.getData("logicValue");
        inputs.push(value);
      }
    });

    return inputs;
  }

  updateOutputDisplay() {
    this.placedComponents.forEach((comp) => {
      if (comp.getData("type") === "output") {
        const value = comp.getData("logicValue");
        const circle = comp.getData("circleGraphic");
        const text = comp.getData("valueText");

        if (circle) {
          if (value === 1) {
            circle.setFillStyle(0x00ff00, 1); // Green for 1
            circle.setStrokeStyle(3, 0x00cc00);
            if (text) {
              text.setText("1");
              text.setFontSize("24px");
            }
          } else if (value === 0) {
            circle.setFillStyle(0xff0000, 1); // Red for 0
            circle.setStrokeStyle(3, 0xcc0000);
            if (text) {
              text.setText("0");
              text.setFontSize("24px");
            }
          } else {
            circle.setFillStyle(0x808080, 1); // Gray for undefined
            circle.setStrokeStyle(3, 0x333333);
            if (text) {
              text.setText("OUT");
              text.setFontSize("16px");
            }
          }
        }
      }
    });
  }

  clearOutput() {
    // Reset all logic values
    this.placedComponents.forEach((comp) => {
      comp.setData("logicValue", undefined);
    });

    // Update output display to show default state
    this.updateOutputDisplay();
  }
}
