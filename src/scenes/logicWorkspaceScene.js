import Phaser from "phaser";

export default class LogicWorkspaceScene extends Phaser.Scene {
  constructor() {
    super("LogicWorkspaceScene");
    this.placedComponents = [];
    this.predefinedComponents = [];
    this.gridSize = 40;
    this.undoStack = [];
    this.redoStack = [];
    this._hoveredComponent = null;
    this._actionSeq = 0;
    this.maxHistory = 20;
  }

  init() {
    this.selectedChallengeId = localStorage.getItem("selectedChallengeId");
    this.selectedChallengeTitle = localStorage.getItem("selectedChallengeTitle");
    this.mode = localStorage.getItem("mode") || "sandbox";
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
      .text(100, 60, "Components", {
        fontSize: "18px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const components = [
      { type: "input-1", y: 100 },
      { type: "input-0", y: 160 },
      { type: "output", y: 220 },
      { type: "wire", y: 280 },
      { type: "and", y: 350 },
      { type: "or", y: 420 },
      { type: "not", y: 490 },
      { type: "nand", y: 560 },
      { type: "nor", y: 630 },
      { type: "xor", y: 700 },
      { type: "xnor", y: 770 },
    ];

    components.forEach((comp) => {
      this.createComponent(100, comp.y, comp.type);
    });

    // Zoom buttons
    const makeButton = (x, y, label, onClick) => {
      const buttonWidth = 180;
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

    if (this.mode === "challenge") {
      // Buttons below the challenge goal panel (which is created in setupChallenge methods at y=140, height ~180)
      // Challenge panel spans roughly y=50 to y=230, so buttons start at y=310
      makeButton(width - 100, 320, "Test Circuit", () =>
        this.testCircuit()
      );
      makeButton(width - 100, 370, "Clear Output", () =>
        this.clearOutput()
      );
      makeButton(width - 100, 420, "Leaderboard", () =>
        this.scene.start("ScoreboardScene", { cameFromMenu: false })
      );
      makeButton(width - 100, 470, "Reset Challenge", () =>
        this.resetChallenge()
      );
      makeButton(width - 100, 570, "Zoom +", () => this.zoomIn());
      makeButton(width - 100, 620, "Zoom -", () => this.zoomOut());
      makeButton(width - 100, 670, "Reset View", () => this.resetZoom());
    } else {
      makeButton(width - 100, height - 430, "Save Circuit", () =>
        this.openSaveModal()
      );
      makeButton(width - 100, height - 380, "Load Circuit", () =>
        this.openLoadModal()
      );
      makeButton(width - 100, height - 330, "Debug Ports", () =>
        this.toggleDebugPorts()
      );
      makeButton(width - 100, height - 280, "Test Circuit", () =>
        this.testCircuit()
      );
      makeButton(width - 100, height - 230, "Clear Output", () =>
        this.clearOutput()
      );
      makeButton(width - 100, height - 180, "Zoom +", () => this.zoomIn());
      makeButton(width - 100, height - 130, "Zoom -", () => this.zoomOut());
      makeButton(width - 100, height - 80, "Reset", () => this.resetZoom());
    }

    this.initializeChallenge();

    const backButton = this.add
      .text(12, 10, "↩ Back", {
        fontSize: "20px",
        color: "#387affff",
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => backButton.setStyle({ color: "#0054fdff" }))
      .on("pointerout", () => backButton.setStyle({ color: "#387affff" }))
      .on("pointerdown", () => {
        if (this.mode === "challenge") {
          this.scene.start("ChallengeSelectionScene", { workspaceType: "logic" });
        } else {
          this.scene.start("MenuScene");
        }
      });

    // Debug mode
    this.debugPortsVisible = false;
    this.debugGraphics = null;

    this.input.keyboard.on("keydown-DELETE", () => {
      if (this._hoveredComponent) {
        const comp = this._hoveredComponent;
        // Prevent deletion of predefined challenge components
        if (comp.getData("isPredefined")) {
          return;
        }
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

  getAllPortPositions(excludeComponent = null) {
    // Get all input and output port positions from placed components
    const ports = [];
    this.placedComponents.forEach((comp) => {
      if (comp === excludeComponent || comp.getData("isInPanel")) return;

      const type = comp.getData("type");
      const rotation = comp.getData("rotation") || 0;

      // Add output port
      const outputOffset = this.getOutputOffset(rotation);
      const outputPort = {
        x: comp.x + outputOffset.x,
        y: comp.y + outputOffset.y,
      };
      ports.push(outputPort);

      // Add input ports
      const inputOffsets = this.getInputOffsets(type, rotation);
      inputOffsets.forEach((inputOffset, idx) => {
        const inputPort = {
          x: comp.x + inputOffset.x,
          y: comp.y + inputOffset.y,
        };
        ports.push(inputPort);
      });
    });

    if (ports.length > 0) {
      console.log(
        `  Found ${ports.length} nearby ports:`,
        ports
          .slice(0, 5)
          .map((p) => `(${p.x},${p.y})`)
          .join(", ") + (ports.length > 5 ? "..." : "")
      );
    }
    return ports;
  }

  snapToNearbyPort(component, basePos) {
    const type = component.getData("type");
    const rotation = component.getData("rotation") || 0;

    // Get this component's port offsets
    const offsets = [];

    // Add output port
    offsets.push({
      key: "output",
      offset: this.getOutputOffset(rotation),
    });

    // Add input ports
    const inputOffsets = this.getInputOffsets(type, rotation);
    inputOffsets.forEach((inputOffset, idx) => {
      offsets.push({
        key: `input${idx}`,
        offset: inputOffset,
      });
    });

    // Get all nearby port positions
    const nearbyPorts = this.getAllPortPositions(component);
    let best = { dist: Number.POSITIVE_INFINITY, pos: basePos };
    const snapRadius = 25; // Slightly larger than gridSize/2 for easier snapping

    // Try to align any of our ports to any nearby port
    offsets.forEach(({ key, offset }) => {
      const worldPos = { x: basePos.x + offset.x, y: basePos.y + offset.y };
      nearbyPorts.forEach((port) => {
        const dx = port.x - worldPos.x;
        const dy = port.y - worldPos.y;
        const dist = Math.hypot(dx, dy);
        if (dist < best.dist && dist <= snapRadius) {
          const newPos = { x: port.x - offset.x, y: port.y - offset.y };
          console.log(
            `  SNAP: ${type} rot:${rotation}° ${key}(${offset.x},${
              offset.y
            }) → port(${port.x},${port.y}) dist:${dist.toFixed(
              1
            )}px → move to (${newPos.x},${newPos.y})`
          );
          best = {
            dist,
            pos: newPos,
          };
        }
      });
    });

    if (best.dist < Number.POSITIVE_INFINITY) {
      console.log(
        `✓ Snapped ${type} from (${basePos.x},${basePos.y}) to (${best.pos.x},${
          best.pos.y
        }), dist: ${best.dist.toFixed(1)}px`
      );
    }

    return best.pos;
  }

  isPositionOccupied(x, y, excludeComponent = null, checkingType = null) {
    const componentSize = this.gridSize;
    const tolerance = 5;
    const threshold = componentSize - tolerance;

    for (let component of this.placedComponents) {
      if (component === excludeComponent || component.getData("isInPanel"))
        continue;

      const dx = Math.abs(component.x - x);
      const dy = Math.abs(component.y - y);

      if (dx < threshold && dy < threshold) {
        const compType = component.getData("type") || "unknown";
        const compUid = component.getData("uid") || "no-uid";
        console.log(
          `    ✗ Too close to ${compType} (${compUid}) at (${component.x},${
            component.y
          }): dx=${dx}, dy=${dy} (threshold: ${threshold})`
        );
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
        console.log(
          `Placing ${type} from panel: screen:(${screenX.toFixed(
            0
          )},${screenY.toFixed(0)}) → workspace:(${workspaceX.toFixed(
            0
          )},${workspaceY.toFixed(0)}) → grid:(${snapped.x},${snapped.y})`
        );
        const portSnapped = this.snapToNearbyPort(component, snapped);

        const isOccupied = this.isPositionOccupied(
          portSnapped.x,
          portSnapped.y,
          component,
          type
        );
        console.log(
          `  Position (${portSnapped.x},${portSnapped.y}) occupied? ${isOccupied}`
        );

        if (isOccupied) {
          // Position occupied - return to panel
          console.log(`  ✗ Position occupied, returning to panel`);
          component.x = component.getData("originalX");
          component.y = component.getData("originalY");
          component.setData("isDragging", false);
          return;
        }

        component.x = portSnapped.x;
        component.y = portSnapped.y;
        component.setData("isInPanel", false);
        component.setData("previousX", portSnapped.x);
        component.setData("previousY", portSnapped.y);

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

        // Add component to workspace layer BEFORE creating replacement
        // This ensures the component is properly reparented with correct coordinates
        if (this.workspaceLayer && !component.getData("isInPanel")) {
          this.workspaceLayer.add(component);
        }

        // Create new component in panel to replace the one being placed
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
        // Component already on workspace - snap to grid and nearby ports
        const start = component.getData("startPos");
        const snapped = this.snapToGrid(component.x, component.y);
        console.log(
          `Moving ${type} rot:${component.getData(
            "rotation"
          )}° from (${component.x.toFixed(0)},${component.y.toFixed(
            0
          )}) → grid:(${snapped.x},${snapped.y})`
        );
        const portSnapped = this.snapToNearbyPort(component, snapped);

        const isOccupied = this.isPositionOccupied(
          portSnapped.x,
          portSnapped.y,
          component,
          type
        );
        console.log(
          `  Position (${portSnapped.x},${portSnapped.y}) occupied? ${isOccupied} (moving ${type} uid:${component.getData("uid")})`
        );

        if (!isOccupied) {
          // Position is free - move to snapped position
          component.x = portSnapped.x;
          component.y = portSnapped.y;
          component.setData("previousX", portSnapped.x);
          component.setData("previousY", portSnapped.y);

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

    // Interactive size: consistent 70x70 in panel (like workspaceScene)
    const interactiveSize = isInPanel ? 70 : isSmallType ? 80 : 160;

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
    
    return component;
  }

  testCircuit() {
    console.log("=== Testing Circuit ===");

    // Get all components on the workspace
    const workspaceComponents = this.placedComponents.filter(
      (c) => !c.getData("isInPanel")
    );

    console.log("Workspace components:", workspaceComponents.length);

    // Log all component positions and rotations
    workspaceComponents.forEach((comp) => {
      const type = comp.getData("type");
      const rotation = comp.getData("rotation") || 0;
      const outputOffset = this.getOutputOffset(rotation);
      const inputOffsets = this.getInputOffsets(type, rotation);
      console.log(
        `${type} at (${comp.x},${comp.y}) rot:${rotation}° - output:(${
          comp.x + outputOffset.x
        },${comp.y + outputOffset.y}), inputs:[${inputOffsets
          .map((o) => `(${comp.x + o.x},${comp.y + o.y})`)
          .join(", ")}]`
      );
    });

    // Reset all component values
    workspaceComponents.forEach((comp) => {
      comp.setData("logicValue", undefined);
    });

    // Set input values
    workspaceComponents.forEach((comp) => {
      const type = comp.getData("type");
      if (type === "input-1") {
        comp.setData("logicValue", 1);
      } else if (type === "input-0") {
        comp.setData("logicValue", 0);
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

        // For wires at junctions, accept if ANY input is ready
        // For gates, require ALL inputs to be ready
        if (type === "wire") {
          if (!inputs.some((v) => v !== undefined)) {
            return; // All inputs undefined
          }
        } else {
          // Gates need all inputs ready
          if (inputs.some((v) => v === undefined)) {
            return;
          }
        }

        // Calculate output based on gate type
        let output = undefined;
        switch (type) {
          case "wire":
            // Wire passes through any defined input (supports junctions with multiple inputs)
            output = inputs.find((v) => v !== undefined);
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
    const connectionTolerance = 45; // Forgiving tolerance for grid-snapped connections

    components.forEach((comp) => {
      connections.set(comp, []);
    });

    // For each component, find what's connected to its output
    components.forEach((comp1) => {
      const type1 = comp1.getData("type");

      // Calculate output position
      const rotation1 = comp1.getData("rotation") || 0;
      const outputOffset = this.getOutputOffset(rotation1);
      const output1X = comp1.x + outputOffset.x;
      const output1Y = comp1.y + outputOffset.y;

      components.forEach((comp2) => {
        if (comp1 === comp2) return;

        const type2 = comp2.getData("type");
        const rotation2 = comp2.getData("rotation") || 0;

        let connected = false;

        // 1. Standard output-to-input connection
        const inputOffsets = this.getInputOffsets(type2, rotation2);
        inputOffsets.forEach((inputOffset, idx) => {
          const input2X = comp2.x + inputOffset.x;
          const input2Y = comp2.y + inputOffset.y;

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

        // 2. Additional wire-to-wire connections: check ALL port combinations
        if (type1 === "wire" && type2 === "wire" && !connected) {
          const input1Offsets = this.getInputOffsets(type1, rotation1);
          const output2Offset = this.getOutputOffset(rotation2);
          const input2Offsets = this.getInputOffsets(type2, rotation2);

          // Collect all ports for both wires
          const allPorts1 = [
            { x: output1X, y: output1Y, name: "out" },
            ...input1Offsets.map((offset, i) => ({
              x: comp1.x + offset.x,
              y: comp1.y + offset.y,
              name: `in${i}`,
            })),
          ];

          const allPorts2 = [
            {
              x: comp2.x + output2Offset.x,
              y: comp2.y + output2Offset.y,
              name: "out",
            },
            ...input2Offsets.map((offset, i) => ({
              x: comp2.x + offset.x,
              y: comp2.y + offset.y,
              name: `in${i}`,
            })),
          ];

          // Check if ANY other ports align (beyond output-to-input already checked)
          allPorts1.forEach((port1) => {
            allPorts2.forEach((port2) => {
              const dx = Math.abs(port1.x - port2.x);
              const dy = Math.abs(port1.y - port2.y);
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < connectionTolerance && !connected) {
                // Wires connected - bidirectional
                if (!connections.get(comp1).includes(comp2)) {
                  connections.get(comp1).push(comp2);
                }
                if (!connections.get(comp2).includes(comp1)) {
                  connections.get(comp2).push(comp1);
                }
                connected = true;
                console.log(
                  `  ✓ ${type1}(${comp1.x},${comp1.y})[${port1.name}] ⟷ ${type2}(${comp2.x},${comp2.y})[${port2.name}] junction`
                );
              }
            });
          });
        }
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
    const componentType = component.getData("type");

    // Find all components that connect to this one
    this.placedComponents.forEach((otherComp) => {
      if (otherComp.getData("isInPanel")) return;

      const connectedComponents = connections.get(otherComp) || [];
      if (connectedComponents.includes(component)) {
        const value = otherComp.getData("logicValue");

        // For wire-to-wire junctions, only accept defined values
        // This prevents feedback loops
        if (componentType === "wire" && otherComp.getData("type") === "wire") {
          if (value !== undefined) {
            inputs.push(value);
          }
        } else {
          inputs.push(value);
        }
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

  toggleDebugPorts() {
    this.debugPortsVisible = !this.debugPortsVisible;

    if (this.debugPortsVisible) {
      this.showDebugPorts();
    } else {
      this.hideDebugPorts();
    }
  }

  showDebugPorts() {
    // Clear previous debug graphics
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
    }

    this.debugGraphics = this.add.graphics();
    this.debugGraphics.setDepth(1000);

    if (this.workspaceLayer) {
      this.workspaceLayer.add(this.debugGraphics);
    }

    // Draw connection points for all workspace components
    const workspaceComponents = this.placedComponents.filter(
      (c) => !c.getData("isInPanel")
    );

    workspaceComponents.forEach((comp) => {
      const type = comp.getData("type");
      const rotation = comp.getData("rotation") || 0;

      // Draw output port (green)
      const outputOffset = this.getOutputOffset(rotation);
      const outputX = comp.x + outputOffset.x;
      const outputY = comp.y + outputOffset.y;
      this.debugGraphics.fillStyle(0x00ff00, 0.8);
      this.debugGraphics.fillCircle(outputX, outputY, 5);

      // Draw input ports (red)
      const inputOffsets = this.getInputOffsets(type, rotation);
      inputOffsets.forEach((inputOffset) => {
        const inputX = comp.x + inputOffset.x;
        const inputY = comp.y + inputOffset.y;
        this.debugGraphics.fillStyle(0xff0000, 0.8);
        this.debugGraphics.fillCircle(inputX, inputY, 5);
      });

      // Draw component center (blue)
      this.debugGraphics.fillStyle(0x0000ff, 0.5);
      this.debugGraphics.fillCircle(comp.x, comp.y, 3);
    });

    console.log(
      "Debug ports shown: Green = Output, Red = Input, Blue = Center"
    );
  }

  hideDebugPorts() {
    if (this.debugGraphics) {
      this.debugGraphics.clear();
      this.debugGraphics.destroy();
      this.debugGraphics = null;
    }
  }

  resetChallenge() {
    // Remove all user-added components (not predefined)
    const componentsToRemove = this.placedComponents.filter(
      comp => !this.predefinedComponents.includes(comp)
    );
    
    componentsToRemove.forEach(component => {
      // Remove from arrays
      const placedIndex = this.placedComponents.indexOf(component);
      if (placedIndex > -1) {
        this.placedComponents.splice(placedIndex, 1);
      }
      
      // Destroy the visual
      component.destroy();
    });
    
    // Reset predefined components to their original positions
    this.predefinedComponents.forEach(component => {
      const originalX = component.getData("predefinedX");
      const originalY = component.getData("predefinedY");
      const originalRotation = component.getData("predefinedRotation") || 0;
      
      if (originalX !== undefined && originalY !== undefined) {
        component.x = originalX;
        component.y = originalY;
        component.setData("rotation", originalRotation);
        component.angle = originalRotation;
        component.setData("previousX", originalX);
        component.setData("previousY", originalY);
      }
    });
    
    // Clear output displays on all output components
    this.clearOutput();
    
    // Clear undo/redo stacks
    this.undoStack = [];
    this.redoStack = [];
  }

  initializeChallenge() {
    if (this.mode !== "challenge" || !this.selectedChallengeId) return;

    this.resetZoom();

    const challengeId = parseInt(this.selectedChallengeId);
    
    if (challengeId === 11) {
      this.setupChallenge11();
    } else if (challengeId === 12) {
      this.setupChallenge12();
    } else if (challengeId === 13) {
      this.setupChallenge13();
    } else if (challengeId === 14) {
      this.setupChallenge14();
    } else if (challengeId === 15) {
      this.setupChallenge15();
    } else if (challengeId === 16) {
      this.setupChallenge16();
    } else if (challengeId === 17) {
      this.setupChallenge17();
    } else if (challengeId === 18) {
      this.setupChallenge18();
    } else if (challengeId === 19) {
      this.setupChallenge19();
    } else if (challengeId === 20) {
      this.setupChallenge20();
    } else if (challengeId === 21) {
      this.setupChallenge21();
    } else if (challengeId === 22) {
      this.setupChallenge22();
    } else if (challengeId === 23) {
      this.setupChallenge23();
    } else if (challengeId === 24) {
      this.setupChallenge24();
    } else if (challengeId === 25) {
      this.setupChallenge25();
    }
  }

  placeLogicComponent(type, gridX, gridY, isPredefined = true) {
    const worldX = gridX * this.gridSize;
    const worldY = gridY * this.gridSize;
    
    const component = this.createComponent(worldX, worldY, type, null);
    this.workspaceLayer.add(component);
    this.placedComponents.push(component);
    component.setData("isPredefined", isPredefined);
    component.setData("isInPanel", false);
    component.setData("previousX", worldX);
    component.setData("previousY", worldY);
    
    if (isPredefined) {
      // Store original positions for reset
      component.setData("predefinedX", worldX);
      component.setData("predefinedY", worldY);
      component.setData("predefinedRotation", 0);
      this.predefinedComponents.push(component);
    }
    
    return component;
  }

  setupChallenge11() {
    const { width, height } = this.cameras.main;
    
    this.placeLogicComponent("and", 15, 9);
    this.placeLogicComponent("output", 20, 9);
    
    this.createLogicChallengePanel(width, "AND Gate Challenge\nAdd inputs to get output: 1");
  }

  setupChallenge12() {
    const { width, height } = this.cameras.main;
    
    this.placeLogicComponent("or", 15, 9);
    this.placeLogicComponent("output", 20, 9);
    
    this.createLogicChallengePanel(width, "OR Gate Challenge\nAdd inputs to get output: 0");
  }

  setupChallenge13() {
    const { width, height } = this.cameras.main;
    
    this.placeLogicComponent("not", 15, 9);
    this.placeLogicComponent("output", 20, 9);
    
    this.createLogicChallengePanel(width, "NOT Gate Challenge\nAdd input to get output: 0");
  }

  setupChallenge14() {
    const { width, height } = this.cameras.main;
    
    this.placeLogicComponent("nand", 15, 9);
    this.placeLogicComponent("output", 20, 9);
    
    this.createLogicChallengePanel(width, "NAND Gate Challenge\nAdd inputs to get output: 1");
  }

  setupChallenge15() {
    const { width, height } = this.cameras.main;
    
    this.placeLogicComponent("nor", 15, 9);
    this.placeLogicComponent("output", 20, 9);
    
    this.createLogicChallengePanel(width, "NOR Gate Challenge\nAdd inputs to get output: 1");
  }

  setupChallenge16() {
    const { width, height } = this.cameras.main;
    
    this.placeLogicComponent("xor", 15, 9);
    this.placeLogicComponent("output", 20, 9);
    
    this.createLogicChallengePanel(width, "XOR Gate Challenge\nAdd inputs to get output: 1");
  }

  setupChallenge17() {
    const { width, height } = this.cameras.main;
    
    this.placeLogicComponent("xnor", 15, 9);
    this.placeLogicComponent("output", 20, 9);
    
    this.createLogicChallengePanel(width, "XNOR Gate Challenge\nAdd inputs to get output: 0");
  }

  setupChallenge18() {
    const { width, height } = this.cameras.main;
    
    this.placeLogicComponent("and", 15, 7);
    this.placeLogicComponent("and", 15, 11);
    this.placeLogicComponent("or", 20, 9);
    this.placeLogicComponent("output", 25, 9);
    
    this.placeLogicComponent("wire", 17, 7);
    this.placeLogicComponent("wire", 17, 11);
    this.placeLogicComponent("wire", 22, 9);
    
    this.createLogicChallengePanel(width, "Complex Circuit Challenge\nAdd 4 inputs to get output: 1");
  }

  setupChallenge19() {
    const { width, height } = this.cameras.main;
    
    this.placeLogicComponent("not", 13, 7);
    this.placeLogicComponent("not", 13, 11);
    this.placeLogicComponent("and", 18, 9);
    this.placeLogicComponent("output", 23, 9);
    
    this.placeLogicComponent("wire", 15, 7);
    this.placeLogicComponent("wire", 15, 11);
    this.placeLogicComponent("wire", 20, 9);
    
    this.createLogicChallengePanel(width, "NOT-AND Circuit Challenge\nAdd 2 inputs to get output: 0");
  }

  setupChallenge20() {
    const { width, height } = this.cameras.main;
    
    this.placeLogicComponent("xor", 15, 7);
    this.placeLogicComponent("xor", 15, 11);
    this.placeLogicComponent("and", 20, 9);
    this.placeLogicComponent("output", 25, 9);
    
    this.placeLogicComponent("wire", 17, 7);
    this.placeLogicComponent("wire", 17, 11);
    
    this.createLogicChallengePanel(width, "Advanced XOR-AND Challenge\nAdd 4 inputs to get output: 1");
  }

  setupChallenge21() {
    const { width, height } = this.cameras.main;
    
    // Half adder: XOR for sum, AND for carry
    this.placeLogicComponent("xor", 15, 8);
    this.placeLogicComponent("and", 15, 10);
    this.placeLogicComponent("output", 23, 8);
    this.placeLogicComponent("output", 23, 10);
    
    this.createLogicChallengePanel(width, "Half Adder Circuit\nImplement sum (XOR) and carry (AND) outputs");
  }

  setupChallenge22() {
    const { width, height } = this.cameras.main;
    
    // Full adder: XOR gates for sum, AND/OR for carry
    this.placeLogicComponent("xor", 13, 7);
    this.placeLogicComponent("xor", 13, 11);
    this.placeLogicComponent("and", 18, 6);
    this.placeLogicComponent("and", 18, 10);
    this.placeLogicComponent("or", 23, 8);
    this.placeLogicComponent("output", 28, 8);
    this.placeLogicComponent("output", 28, 11);
    
    this.createLogicChallengePanel(width, "Full Adder Circuit\nImplement with XOR, AND, OR gates");
  }

  setupChallenge23() {
    const { width, height } = this.cameras.main;
    
    // 2-to-1 Multiplexer
    this.placeLogicComponent("and", 15, 7);
    this.placeLogicComponent("and", 15, 11);
    this.placeLogicComponent("not", 18, 9);
    this.placeLogicComponent("or", 22, 9);
    this.placeLogicComponent("output", 27, 9);
    
    this.createLogicChallengePanel(width, "2-to-1 Multiplexer\nCreate MUX with select signal");
  }

  setupChallenge24() {
    const { width, height } = this.cameras.main;
    
    // 4-to-2 Priority encoder
    this.placeLogicComponent("or", 13, 6);
    this.placeLogicComponent("or", 13, 9);
    this.placeLogicComponent("and", 18, 7);
    this.placeLogicComponent("and", 18, 11);
    this.placeLogicComponent("not", 23, 8);
    this.placeLogicComponent("output", 28, 7);
    this.placeLogicComponent("output", 28, 11);
    
    this.createLogicChallengePanel(width, "Priority Encoder\nImplement 4-to-2 priority encoder");
  }

  setupChallenge25() {
    const { width, height } = this.cameras.main;
    
    // Master logic circuit: complex combination
    this.placeLogicComponent("and", 12, 6);
    this.placeLogicComponent("or", 12, 9);
    this.placeLogicComponent("xor", 12, 12);
    this.placeLogicComponent("nand", 18, 7);
    this.placeLogicComponent("nor", 18, 11);
    this.placeLogicComponent("xnor", 24, 8);
    this.placeLogicComponent("not", 24, 10);
    this.placeLogicComponent("output", 29, 9);
    
    this.createLogicChallengePanel(width, "Master Logic Challenge\nUltimate complexity: multiple gate types");
  }

  createLogicChallengePanel(width, goalText) {
    // Position at the top right, above all buttons, offset left to avoid edge and back button
    const challengePanel = this.add.container(width - 150, 140);
    challengePanel.setDepth(1001);

    const panelBg = this.add.rectangle(0, 0, 280, 180, 0x2a2a4e, 0.95);
    panelBg.setStrokeStyle(2, 0x3399ff);
    challengePanel.add(panelBg);

    const title = this.add.text(0, -70, "Challenge Goal:", {
      fontSize: "14px",
      color: "#ffff99",
      fontStyle: "bold"
    }).setOrigin(0.5);
    challengePanel.add(title);

    const goal = this.add.text(0, -45, goalText, {
      fontSize: "12px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: 250 }
    }).setOrigin(0.5);
    challengePanel.add(goal);

    const submitBtn = this.add.rectangle(0, 45, 220, 40, 0x4caf50);
    submitBtn.setInteractive({ useHandCursor: true });
    submitBtn.on('pointerover', () => submitBtn.setFillStyle(0x45a049));
    submitBtn.on('pointerout', () => submitBtn.setFillStyle(0x4caf50));
    submitBtn.on('pointerdown', () => this.checkChallengeCompletion());
    challengePanel.add(submitBtn);

    const submitText = this.add.text(0, 45, "Check Solution", {
      fontSize: "14px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    challengePanel.add(submitText);

    this.challengePanel = challengePanel;
  }

  checkChallengeCompletion() {
    if (!this.selectedChallengeId) return;

    const challengeId = parseInt(this.selectedChallengeId);

    if (challengeId === 11) {
      this.checkChallenge11();
    } else if (challengeId === 12) {
      this.checkChallenge12();
    } else if (challengeId === 13) {
      this.checkChallenge13();
    } else if (challengeId === 14) {
      this.checkChallenge14();
    } else if (challengeId === 15) {
      this.checkChallenge15();
    } else if (challengeId === 16) {
      this.checkChallenge16();
    } else if (challengeId === 17) {
      this.checkChallenge17();
    } else if (challengeId === 18) {
      this.checkChallenge18();
    } else if (challengeId === 19) {
      this.checkChallenge19();
    } else if (challengeId === 20) {
      this.checkChallenge20();
    }
  }

  checkChallenge11() {
    this.testCircuit();
    
    const outputs = this.placedComponents.filter(comp => comp.getData("type") === "output");
    
    if (outputs.length === 0) {
      this.showChallengeMessage("Add an output component!", 0xff6b6b);
      return;
    }

    const outputValue = outputs[0].getData("logicValue");
    if (outputValue === undefined) {
      this.showChallengeMessage("Connect wires to create output!\nMake sure all connections are properly linked.", 0xff6b6b);
      return;
    }

    if (outputValue !== 1) {
      this.showChallengeMessage(`Output is ${outputValue}, but must be 1!\\nFor AND gate: use two input-1 components.`, 0xff6b6b);
      return;
    }

    this.completeLogicChallengeSuccess();
  }

  checkChallenge12() {
    this.testCircuit();
    
    const outputs = this.placedComponents.filter(comp => comp.getData("type") === "output");
    
    if (outputs.length === 0) {
      this.showChallengeMessage("Add an output component!", 0xff6b6b);
      return;
    }

    const outputValue = outputs[0].getData("logicValue");
    if (outputValue === undefined) {
      this.showChallengeMessage("Connect wires to create output!\\nMake sure all connections are properly linked.", 0xff6b6b);
      return;
    }

    if (outputValue !== 0) {
      this.showChallengeMessage(`Output is ${outputValue}, but must be 0!\\nFor OR gate to output 0: use two input-0 components.`, 0xff6b6b);
      return;
    }

    this.completeLogicChallengeSuccess();
  }

  checkChallenge13() {
    this.testCircuit();
    
    const outputs = this.placedComponents.filter(comp => comp.getData("type") === "output");
    
    if (outputs.length === 0) {
      this.showChallengeMessage("Add an output component!", 0xff6b6b);
      return;
    }

    const outputValue = outputs[0].getData("logicValue");
    if (outputValue === undefined) {
      this.showChallengeMessage("Connect wires to create output!\\nMake sure all connections are properly linked.", 0xff6b6b);
      return;
    }

    if (outputValue !== 0) {
      this.showChallengeMessage(`Output is ${outputValue}, but must be 0!\\nFor NOT gate to output 0: use one input-1 component.`, 0xff6b6b);
      return;
    }

    this.completeLogicChallengeSuccess();
  }

  checkChallenge14() {
    this.testCircuit();
    
    const outputs = this.placedComponents.filter(comp => comp.getData("type") === "output");
    
    if (outputs.length === 0) {
      this.showChallengeMessage("Add an output component!", 0xff6b6b);
      return;
    }

    const outputValue = outputs[0].getData("logicValue");
    if (outputValue === undefined) {
      this.showChallengeMessage("Connect wires to create output!\\nMake sure all connections are properly linked.", 0xff6b6b);
      return;
    }

    if (outputValue !== 1) {
      this.showChallengeMessage(`Output is ${outputValue}, but must be 1!\\nFor NAND gate to output 1: avoid two input-1s.`, 0xff6b6b);
      return;
    }

    this.completeLogicChallengeSuccess();
  }

  checkChallenge15() {
    this.testCircuit();
    
    const outputs = this.placedComponents.filter(comp => comp.getData("type") === "output");
    
    if (outputs.length === 0) {
      this.showChallengeMessage("Add an output component!", 0xff6b6b);
      return;
    }

    const outputValue = outputs[0].getData("logicValue");
    if (outputValue === undefined) {
      this.showChallengeMessage("Connect wires to create output!\\nMake sure all connections are properly linked.", 0xff6b6b);
      return;
    }

    if (outputValue !== 1) {
      this.showChallengeMessage(`Output is ${outputValue}, but must be 1!\\nFor NOR gate to output 1: use two input-0 components.`, 0xff6b6b);
      return;
    }

    this.completeLogicChallengeSuccess();
  }

  checkChallenge16() {
    this.testCircuit();
    
    const outputs = this.placedComponents.filter(comp => comp.getData("type") === "output");
    
    if (outputs.length === 0) {
      this.showChallengeMessage("Add an output component!", 0xff6b6b);
      return;
    }

    const outputValue = outputs[0].getData("logicValue");
    if (outputValue === undefined) {
      this.showChallengeMessage("Connect wires to create output!\\nMake sure all connections are properly linked.", 0xff6b6b);
      return;
    }

    if (outputValue !== 1) {
      this.showChallengeMessage(`Output is ${outputValue}, but must be 1!\\nFor XOR gate to output 1: use different inputs.`, 0xff6b6b);
      return;
    }

    this.completeLogicChallengeSuccess();
  }

  checkChallenge17() {
    this.testCircuit();
    
    const outputs = this.placedComponents.filter(comp => comp.getData("type") === "output");
    
    if (outputs.length === 0) {
      this.showChallengeMessage("Add an output component!", 0xff6b6b);
      return;
    }

    const outputValue = outputs[0].getData("logicValue");
    if (outputValue === undefined) {
      this.showChallengeMessage("Connect wires to create output!\\nMake sure all connections are properly linked.", 0xff6b6b);
      return;
    }

    if (outputValue !== 0) {
      this.showChallengeMessage(`Output is ${outputValue}, but must be 0!\\nFor XNOR gate to output 0: use different inputs.`, 0xff6b6b);
      return;
    }

    this.completeLogicChallengeSuccess();
  }

  checkChallenge18() {
    this.testCircuit();
    
    const outputs = this.placedComponents.filter(comp => comp.getData("type") === "output");
    
    if (outputs.length === 0) {
      this.showChallengeMessage("Add an output component!", 0xff6b6b);
      return;
    }

    const outputValue = outputs[0].getData("logicValue");
    if (outputValue === undefined) {
      this.showChallengeMessage("Connect wires to create output!\\nMake sure all connections are properly linked.", 0xff6b6b);
      return;
    }

    if (outputValue !== 1) {
      this.showChallengeMessage(`Output is ${outputValue}, but must be 1!\\nCheck your 4 input combinations.`, 0xff6b6b);
      return;
    }

    this.completeLogicChallengeSuccess();
  }

  checkChallenge19() {
    this.testCircuit();
    
    const outputs = this.placedComponents.filter(comp => comp.getData("type") === "output");
    
    if (outputs.length === 0) {
      this.showChallengeMessage("Add an output component!", 0xff6b6b);
      return;
    }

    const outputValue = outputs[0].getData("logicValue");
    if (outputValue === undefined) {
      this.showChallengeMessage("Connect wires to create output!\\nMake sure all connections are properly linked.", 0xff6b6b);
      return;
    }

    if (outputValue !== 0) {
      this.showChallengeMessage(`Output is ${outputValue}, but must be 0!\\nCheck your 2 input combinations.`, 0xff6b6b);
      return;
    }

    this.completeLogicChallengeSuccess();
  }

  checkChallenge20() {
    this.testCircuit();
    
    const outputs = this.placedComponents.filter(comp => comp.getData("type") === "output");
    
    if (outputs.length === 0) {
      this.showChallengeMessage("Add an output component!", 0xff6b6b);
      return;
    }

    const outputValue = outputs[0].getData("logicValue");
    console.log("Challenge 20 - Output value:", outputValue);
    
    if (outputValue === undefined) {
      this.showChallengeMessage("Connect wires to create output!\nMake sure all connections are properly linked.", 0xff6b6b);
      return;
    }

    if (outputValue !== 1) {
      this.showChallengeMessage(`Output is ${outputValue}, but must be 1!\nCheck your inputs.`, 0xff6b6b);
      return;
    }

    this.completeLogicChallengeSuccess();
  }

  completeLogicChallengeSuccess() {
    // Mark challenge as complete on server
    const token = localStorage.getItem('token');
    const challengeId = parseInt(this.selectedChallengeId);
    
    fetch(`http://localhost:8000/challenges/complete/${challengeId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json())
    .then(data => {
      console.log('Challenge marked complete, points awarded:', data.points_awarded);
    })
    .catch(err => console.error('Error marking challenge complete:', err));
    
    this.showChallengeMessage("Challenge Complete! 🎉", 0x4caf50);
    this.time.delayedCall(2000, () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start("ChallengeSelectionScene", { workspaceType: "logic" });
      });
    });
  }

  checkANDGate() {
    const andGates = this.placedComponents.filter(comp => comp.getData("type") === "and");

    if (andGates.length === 0) {
      this.showChallengeMessage("No AND gate found!", 0xff6b6b);
      return;
    }

    // For AND gate challenge, check that there are at least 2 input components
    const inputComponents = this.placedComponents.filter(comp => 
      comp.getData("type") === "input-1" || comp.getData("type") === "input-0"
    );

    if (inputComponents.length < 2) {
      this.showChallengeMessage("Add at least 2 inputs to the AND gate", 0xffa500);
      return;
    }

    // Check if there's an output component
    const outputComponents = this.placedComponents.filter(comp => comp.getData("type") === "output");
    if (outputComponents.length === 0) {
      this.showChallengeMessage("Add an output component to show the result", 0xffa500);
      return;
    }

    this.showChallengeMessage("Challenge Complete! 🎉", 0x4caf50);
    this.time.delayedCall(2000, () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start("ChallengeSelectionScene", { workspaceType: "logic" });
      });
    });
  }

  showChallengeMessage(text, color) {
    const { width, height } = this.cameras.main;
    
    if (this.challengeMessage) {
      this.challengeMessage.destroy();
    }
    if (this.challengeMessageText) {
      this.challengeMessageText.destroy();
    }

    this.challengeMessage = this.add.rectangle(width / 2, height / 2 - 150, 600, 100, color, 0.9);
    this.challengeMessage.setStrokeStyle(3, 0xffffff);
    this.challengeMessage.setDepth(2000);

    this.challengeMessageText = this.add.text(width / 2, height / 2 - 150, text, {
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: 550 }
    }).setOrigin(0.5).setDepth(2001);

    this.tweens.add({
      targets: this.challengeMessage,
      alpha: 1,
      duration: 300
    });

    // Auto-hide message after 3 seconds
    this.time.delayedCall(3000, () => {
      if (this.challengeMessage) {
        this.tweens.add({
          targets: [this.challengeMessage, this.challengeMessageText],
          alpha: 0,
          duration: 300,
          onComplete: () => {
            if (this.challengeMessage) this.challengeMessage.destroy();
            if (this.challengeMessageText) this.challengeMessageText.destroy();
          }
        });
      }
    });
  }

  openSaveModal() {
    const { width, height } = this.cameras.main;

    this.saveModalBg = this.add
      .rectangle(width / 2, height / 2, 450, 300, 0x000000, 0.9)
      .setDepth(1003);

    this.saveModalText = this.add
      .text(width / 2, height / 2 - 40, "Circuit Name:", {
        fontSize: "20px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(1004);

    // HTML INPUT FIELD
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Enter circuit name";
    input.style.position = "absolute";
    input.style.top = height / 2 - 10 + "px";
    input.style.left = width / 2 - 120 + "px";
    input.style.width = "240px";
    input.style.fontSize = "18px";
    input.id = "saveCircuitInput";
    document.body.appendChild(input);

    this.saveConfirm = this.add
      .text(width / 2, height / 2 + 50, "Save", {
        fontSize: "22px",
        backgroundColor: "#ffffff",
        color: "#000000",
        padding: { x: 15, y: 5 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(1004)
      .on("pointerdown", () => {
        const name = input.value.trim();
        if (name.length > 0) {
          this.saveCircuit(name);
        }
        this.closeSaveModal();
      });

    this.saveCancel = this.add
      .text(width / 2, height / 2 + 100, "Cancel", {
        fontSize: "20px",
        color: "#ff6666",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(1004)
      .on("pointerdown", () => this.closeSaveModal());
  }

  closeSaveModal() {
    const input = document.getElementById("saveCircuitInput");
    if (input) input.remove();

    this.saveModalBg?.destroy();
    this.saveModalText?.destroy();
    this.saveConfirm?.destroy();
    this.saveCancel?.destroy();
  }

  saveCircuit(name) {
    const components = this.placedComponents
      .filter((c) => !c.getData("isInPanel"))
      .map((c) => ({
        type: c.getData("type"),
        x: c.x,
        y: c.y,
        rotation: c.getData("rotation") || 0,
      }));

    fetch("http://localhost:8000/circuits/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify({
        name: name,
        components: components,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to save circuit");
        return r.json();
      })
      .then(() => {
        console.log("Circuit saved!");
        alert("Circuit saved successfully!");
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to save circuit: " + err.message);
      });
  }

  openLoadModal() {
    const { width, height } = this.cameras.main;
    this.loadCircuitTexts = [];

    // background
    this.loadBg = this.add
      .rectangle(width / 2, height / 2, 500, 350, 0x000000, 0.85)
      .setOrigin(0.5)
      .setDepth(2000);

    this.loadTitle = this.add
      .text(width / 2, height / 2 - 150, "Load Circuit", {
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(2001);

    fetch("http://localhost:8000/circuits/", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    })
      .then((r) => r.json())
      .then((circuits) => {
        let y = height / 2 - 100;

        circuits.forEach((circuit) => {
          let entry = this.add
            .text(width / 2, y, circuit.name, {
              fontSize: "20px",
              color: "#aaddff",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setDepth(2002)
            .on("pointerdown", () => {
              this.fetchAndLoadCircuit(circuit.id);
              this.closeLoadModal();
            });
          this.loadCircuitTexts.push(entry);
          y += 40;
        });
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to load circuits list: " + err.message);
      });

    this.loadClose = this.add
      .text(width / 2, height / 2 + 150, "Close", {
        fontSize: "20px",
        color: "#ff6666",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(2002)
      .on("pointerdown", () => this.closeLoadModal());
  }

  closeLoadModal() {
    this.loadBg?.destroy();
    this.loadTitle?.destroy();
    this.loadCircuitTexts?.forEach((t) => t.destroy());
    this.loadCircuitTexts = [];
    this.loadClose?.destroy();
  }

  fetchAndLoadCircuit(id) {
    fetch(`http://localhost:8000/circuits/${id}`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    })
      .then((r) => r.json())
      .then((circuit) => {
        this.loadCircuit(circuit.data.components);
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to load circuit: " + err.message);
      });
  }

  loadCircuit(components) {
    // Clear existing placed components (not panel components)
    this.placedComponents
      .filter((c) => !c.getData("isInPanel"))
      .forEach((c) => c.destroy());
    this.placedComponents = this.placedComponents.filter((c) =>
      c.getData("isInPanel")
    );

    // Create components from loaded data
    components.forEach((comp) => {
      const newComp = this.createPlacedFromSnapshot({
        uid: comp.type + "_" + Math.floor(Math.random() * 999999),
        type: comp.type,
        x: comp.x,
        y: comp.y,
        rotation: comp.rotation,
      });
    });

    console.log("Circuit loaded!");
    alert("Circuit loaded successfully!");
  }
}


