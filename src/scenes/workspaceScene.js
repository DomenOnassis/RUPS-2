import Phaser from "phaser";
import LabScene from "./labScene";
import { Battery } from "../components/battery";
import { Bulb } from "../components/bulb";
import { Wire } from "../components/wire";
import { CircuitGraph } from "../logic/circuit_graph";
import { Node } from "../logic/node";
import { Switch } from "../components/switch";
import { Resistor } from "../components/resistor";

export default class WorkspaceScene extends Phaser.Scene {
  constructor() {
    super("WorkspaceScene");
  }

  init() {
    const savedIndex = localStorage.getItem("currentChallengeIndex");
    this.currentChallengeIndex = savedIndex !== null ? parseInt(savedIndex) : 0;
    
    this.selectedChallengeId = localStorage.getItem("selectedChallengeId");
    this.selectedChallengeTitle = localStorage.getItem("selectedChallengeTitle");
    this.mode = localStorage.getItem("mode") || "sandbox";
  }

  preload() {
    this.graph = new CircuitGraph();
    this.load.image("battery", "src/components/battery.png");
    this.load.image("resistor", "src/components/resistor.png");
    this.load.image("bulb", "src/components/lamp.png");
    this.load.image("switch-on", "src/components/switch-on.png");
    this.load.image("switch-off", "src/components/switch-off.png");
    this.load.image("wire", "src/components/wire.png");
    this.load.image("ammeter", "src/components/ammeter.png");
    this.load.image("voltmeter", "src/components/voltmeter.png");
  }

  create() {
    const { width, height } = this.cameras.main;

    this.setupCameraControls();

    this.workspaceLayer = this.add.container(0, 0);
    this.workspaceLayer.setDepth(0);

    const desk = this.add
      .rectangle(0, 0, width * 3, height * 3, 0xe0c9a6)
      .setOrigin(0);
    this.workspaceLayer.add(desk);

    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(1);
    this.workspaceLayer.add(this.gridGraphics);
    this.updateGrid();

    this.workspaceOffsetX = 0;
    this.workspaceOffsetY = 0;

    this.infoWindow = this.add.container(0, 0);
    this.infoWindow.setDepth(1000);
    this.infoWindow.setVisible(false);

    const infoBox = this.add.rectangle(0, 0, 200, 80, 0x2c2c2c, 0.95);
    infoBox.setStrokeStyle(2, 0xffffff);
    const infoText = this.add
      .text(0, 0, "", {
        fontSize: "14px",
        color: "#ffffff",
        align: "left",
        wordWrap: { width: 180 },
      })
      .setOrigin(0.5);

    this.infoWindow.add([infoBox, infoText]);
    this.infoText = infoText;

    this.challenges = [
      {
        prompt: "Build a simple circuit with a battery and a bulb.",
        requiredComponents: [
          "battery",
          "bulb",
          "wire",
          "wire",
          "wire",
          "wire",
          "wire",
          "wire",
        ],
        theory: [
          "A basic circuit needs a power source (battery) and consumers (bulb). The circuit must be closed for current to flow through the conductors (wires).",
        ],
      },
      {
        prompt: "Build an open circuit with a battery, bulb, and switch.",
        requiredComponents: ["battery", "bulb", "wire", "switch-off"],
        theory: [
          "In an open circuit, the switch is open, meaning the current is interrupted. The bulb does not light up.",
        ],
      },
      {
        prompt: "Build a closed circuit with a battery, bulb, and switch.",
        requiredComponents: ["battery", "bulb", "wire", "switch-on"],
        theory: [
          "In a closed circuit, the switch is closed, allowing current to flow freely. The bulb lights up.",
        ],
      },
      {
        prompt: "Build a circuit with a battery, bulb, and switch that you can turn on and off.",
        requiredComponents: [
          "battery",
          "bulb",
          "wire",
          "switch-on",
          "switch-off",
        ],
        theory: [
          "A switch allows control over current flow. When closed, current flows and the bulb lights. When open, current stops and the bulb turns off.",
        ],
      },
      {
        prompt: "Build a circuit with two batteries and a bulb.",
        requiredComponents: ["battery", "battery", "bulb", "wire"],
        theory: [
          "When batteries are connected in series, voltages add up. Higher voltage means higher current, so the bulb shines brighter.",
        ],
      },
      {
        prompt: "Connect two bulbs in series to a battery.",
        requiredComponents: ["battery", "bulb", "bulb", "wire"],
        type: "series",
        theory: [
          "In a series connection, the same current flows through all bulbs. If one bulb fails, it breaks the circuit for the other.",
        ],
      },
      {
        prompt: "Connect two bulbs in parallel to a battery.",
        requiredComponents: ["battery", "bulb", "bulb", "wire"],
        type: "parallel",
        theory: [
          "In a parallel connection, each bulb has the same voltage as the battery. If one fails, the other still works.",
        ],
      },
      {
        prompt: "Build a circuit with a bulb and a resistor.",
        requiredComponents: ["battery", "bulb", "wire", "resistor"],
        theory: [
          "A resistor limits current in a circuit. Higher resistance means lower current. Ohm's law: I = V / R. The bulb shines less brightly.",
        ],
      },
    ];

    this.promptText = this.add
      .text(
        width / 1.8,
        height - 30,
        this.challenges[this.currentChallengeIndex].prompt,
        {
          fontSize: "20px",
          color: "#333",
          fontStyle: "bold",
          backgroundColor: "#ffffff88",
          padding: { x: 15, y: 8 },
        }
      )
      .setOrigin(0.5);
    
    if (this.mode === "challenge") {
      this.promptText.setVisible(false);
    }

    this.checkText = this.add
      .text(width / 2, height - 70, "", {
        fontSize: "18px",
        color: "#cc0000",
        fontStyle: "bold",
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5);

    const buttonWidth = 180;
    const buttonHeight = 45;
    const cornerRadius = 10;

    const makeButton = (x, y, label, onClick) => {
      const bg = this.add.graphics();
      bg.fillStyle(0x3399ff, 1);
      bg.fillRoundedRect(
        x - buttonWidth / 2,
        y - buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        cornerRadius
      );

      const text = this.add
        .text(x, y, label, {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          bg.clear();
          bg.fillStyle(0x0f5cad, 1);
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
          bg.fillStyle(0x3399ff, 1);
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
      // Buttons below the challenge goal panel (which is created in setupChallenge methods at y=200, height ~150)
      // Challenge panel spans roughly y=125 to y=275, so buttons start at y=300
      makeButton(width - 140, 310, "Simulate", () =>
        this.runSimulationAndCheck()
      );
      makeButton(width - 140, 360, "Leaderboard", () =>
        this.scene.start("ScoreboardScene", { cameFromMenu: false })
      );
      makeButton(width - 140, 410, "Reset Challenge", () =>
        this.resetChallenge()
      );
      makeButton(width - 140, 510, "+", () => this.zoomIn());
      makeButton(width - 140, 560, "-", () => this.zoomOut());
      makeButton(width - 140, 610, "Reset View", () => this.resetZoom());
    } else {
      makeButton(width - 140, 75, "Leaderboard", () =>
        this.scene.start("ScoreboardScene", { cameFromMenu: false })
      );
      makeButton(width - 140, 125, "Simulate", () =>
        this.runSimulationAndCheck()
      );
      makeButton(width - 140, 175, "Save Circuit", () => this.openSaveModal());
      makeButton(width - 140, 225, "Load Circuit", () => this.openLoadModal());
      makeButton(width - 140, 325, "+", () => this.zoomIn());
      makeButton(width - 140, 375, "-", () => this.zoomOut());
      makeButton(width - 140, 425, "Reset", () => this.resetZoom());
    }

    const panelWidth = 150;
    this.add.rectangle(0, 0, panelWidth, height, 0xc0c0c0).setOrigin(0);
    this.add.rectangle(0, 0, panelWidth, height, 0x000000, 0.2).setOrigin(0);

    this.add
      .text(panelWidth / 2, 60, "Components", {
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.createComponent(panelWidth / 2, 100, "battery", 0xffcc00);
    this.createComponent(panelWidth / 2, 180, "resistor", 0xff6600);
    this.createComponent(panelWidth / 2, 260, "bulb", 0xff0000);
    this.createComponent(panelWidth / 2, 340, "switch-on", 0x666666);
    this.createComponent(panelWidth / 2, 420, "switch-off", 0x666666);
    this.createComponent(panelWidth / 2, 500, "wire", 0x0066cc);
    this.createComponent(panelWidth / 2, 580, "ammeter", 0x00cc66);
    this.createComponent(panelWidth / 2, 660, "voltmeter", 0x00cc66);

    const backButton = this.add
      .text(12, 10, "↩ Back", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#387affff",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => backButton.setStyle({ color: "#0054fdff" }))
      .on("pointerout", () => backButton.setStyle({ color: "#387affff" }))
      .on("pointerdown", () => {
        this.cameras.main.fade(300, 0, 0, 0);
        this.time.delayedCall(300, () => {
          if (this.mode === "challenge") {
            this.scene.start("ChallengeSelectionScene", { workspaceType: "electric" });
          } else {
            this.scene.start("LabScene");
          }
        });
      });

    // Initialize arrays before challenge setup
    this.placedComponents = [];
    this.predefinedComponents = [];
    this.gridSize = 40;
    this.selectedComponent = null;
    
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistorySize = 10;

    this.initializeChallenge();

    if (this.mode !== "challenge") {
      this.add
        .text(
          width / 2 + 50,
          30,
          "Drag components to the workspace and build your circuit!",
          {
            fontSize: "20px",
            color: "#333",
            fontStyle: "bold",
            align: "center",
            backgroundColor: "#ffffff88",
            padding: { x: 15, y: 8 },
          }
        )
        .setOrigin(0.5);
    }
    
    this.saveState('initial_state');

    console.log(JSON.parse(localStorage.getItem("users")));
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
    const camera = this.cameras.main;

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

    // Delete key for component deletion
    this.input.keyboard.on('keydown-DELETE', () => {
      if (this.selectedComponent && !this.selectedComponent.getData('isInPanel')) {
        this.deleteComponent(this.selectedComponent);
        this.selectedComponent = null;
      }
    });

    // Undo/Redo keyboard shortcuts
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

    // Mouse wheel zoom
    this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      // Don't zoom if over UI elements (left panel or buttons)
      if (pointer.x < 200 || pointer.x > this.scale.width - 200) return;
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
        if (pointer.x < 200 || pointer.x > this.scale.width - 200) return;
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
    this.gridGraphics.lineStyle(lineWidth, 0x8b7355, 0.35);

    // Calculate grid bounds
    const startX = Math.floor(visibleLeft / this.gridSize) * this.gridSize;
    const startY = Math.floor(visibleTop / this.gridSize) * this.gridSize;
    const endX = Math.ceil(visibleRight / this.gridSize) * this.gridSize;
    const endY = Math.ceil(visibleBottom / this.gridSize) * this.gridSize;

    // Draw vertical lines
    for (let x = startX; x <= endX; x += this.gridSize) {
      this.gridGraphics.beginPath();
      this.gridGraphics.moveTo(x, startY);
      this.gridGraphics.lineTo(x, endY);
      this.gridGraphics.strokePath();
    }

    // Draw horizontal lines
    for (let y = startY; y <= endY; y += this.gridSize) {
      this.gridGraphics.beginPath();
      this.gridGraphics.moveTo(startX, y);
      this.gridGraphics.lineTo(endX, y);
      this.gridGraphics.strokePath();
    }
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
    this.placedComponents.forEach(c => {
      if (this.workspaceLayer) {
        this.workspaceLayer.remove(c);
      }
      c.destroy();
    });
    this.placedComponents = [];
    this.selectedComponent = null;

    // Recreate components from state
    state.components.forEach((item) => {
      const component = this.createComponent(
        item.x,
        item.y,
        item.type,
        null,
        true
      );

      if (!component) return;

      component.x = item.x;
      component.y = item.y;

      if (item.rotation) {
        component.setData("rotation", item.rotation);
        component.angle = item.rotation;
      }

      component.setData("isInPanel", false);
      component.setData("componentId", item.id);
      
      if (this.workspaceLayer) {
        this.workspaceLayer.add(component);
      }
      
      this.placedComponents.push(component);
    });

    // Rebuild graph
    this.rebuildGraph();
  }

  getComponentDetails(type) {
    const details = {
      battery: "Voltage: 3.3 V\nPower source",
      resistor: "Limits current flow\nMeasured in ohms (Ω)",
      bulb: "Converts electrical energy to light",
      "switch-on": "Allows current flow",
      "switch-off": "Blocks current flow",
      wire: "Connects components\nClick to rotate",
      ammeter: "Measures electric current\nUnit: amperes (A)",
      voltmeter: "Measures voltage\nUnit: volts (V)",
    };
    return details[type] || "Component";
  }

  createGrid() {
    const { width, height } = this.cameras.main;
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(2, 0x8b7355, 0.4);

    const gridSize = 40;
    const startX = 200;

    // vertikalne črte
    for (let x = startX; x < width; x += gridSize) {
      gridGraphics.beginPath();
      gridGraphics.moveTo(x, 0);
      gridGraphics.lineTo(x, height);
      gridGraphics.strokePath();
    }

    // horizontalne črte
    for (let y = 0; y < height; y += gridSize) {
      gridGraphics.beginPath();
      gridGraphics.moveTo(startX, y);
      gridGraphics.lineTo(width, y);
      gridGraphics.strokePath();
    }
  }

  snapToGrid(x, y) {
    const gridSize = this.gridSize;
    const startX = 200;

    // komponeta se postavi na presečišče
    const snappedX = Math.round((x - startX) / gridSize) * gridSize + startX;
    const snappedY = Math.round(y / gridSize) * gridSize;

    return { x: snappedX, y: snappedY };
  }

  getNearbyNodePositions(excludeComponent = null) {
    const nodes = [];
    if (!this.placedComponents) return nodes;
    
    this.placedComponents.forEach((comp) => {
      if (comp === excludeComponent) return;
      const logic = comp.getData("logicComponent");
      if (!logic) return;
      if (logic.start) nodes.push({ x: logic.start.x, y: logic.start.y });
      if (logic.end) nodes.push({ x: logic.end.x, y: logic.end.y });
    });
    return nodes;
  }

  alignToNearbyNodes(component, basePos) {
    const logic = component.getData("logicComponent");
    if (!logic) return basePos;

    const theta =
      typeof component.rotation === "number" && component.rotation
        ? component.rotation
        : Phaser.Math.DegToRad(component.angle || 0);
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const rotate = (p) => ({
      x: Math.round(p.x * cos - p.y * sin),
      y: Math.round(p.x * sin + p.y * cos),
    });

    const offsets = [];
    if (logic.start)
      offsets.push({
        key: "start",
        offset: rotate(logic.localStart || { x: -40, y: 0 }),
      });
    if (logic.end)
      offsets.push({
        key: "end",
        offset: rotate(logic.localEnd || { x: 40, y: 0 }),
      });

    const nearbyNodes = this.getNearbyNodePositions(component);
    let best = { dist: Number.POSITIVE_INFINITY, pos: basePos };
    const snapRadius = this.gridSize / 2;

    offsets.forEach(({ offset }) => {
      const worldPos = { x: basePos.x + offset.x, y: basePos.y + offset.y };
      nearbyNodes.forEach((node) => {
        const dx = node.x - worldPos.x;
        const dy = node.y - worldPos.y;
        const dist = Math.hypot(dx, dy);
        if (dist < best.dist && dist <= snapRadius) {
          best = {
            dist,
            pos: { x: node.x - offset.x, y: node.y - offset.y },
          };
        }
      });
    });

    return best.pos;
  }

  isPositionOccupied(x, y, excludeComponent = null) {
    const componentSize = this.gridSize; // allow neighbors on adjacent grid cells
    const tolerance = 5;

    for (let component of this.placedComponents) {
      if (component === excludeComponent || component.getData("isInPanel"))
        continue;

      const dx = Math.abs(component.x - x);
      const dy = Math.abs(component.y - y);

      if (dx < componentSize - tolerance && dy < componentSize - tolerance) {
        return true;
      }
    }
    return false;
  }

  getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
  }

  rebuildGraph() {
    this.graph = new CircuitGraph();
    this.placedComponents.forEach((component) => {
      const comp = component.getData("logicComponent");
      if (!comp) return;
      this.updateLogicNodePositions(component);
      this.graph.addComponent(comp);
      if (comp.start) this.graph.addNode(comp.start);
      if (comp.end) this.graph.addNode(comp.end);
    });
    // Check circuit state and update bulb visuals in real-time
    this.checkCircuitState();
  }

  checkCircuitState() {
    // Run simulation to check if circuit is closed
    if (this.graph.components.length > 0) {
      this.connected = this.graph.simulate();
      this.sim = this.connected === 1;
    } else {
      this.connected = undefined;
      this.sim = undefined;
    }
    // Update bulb visuals based on current circuit state
    this.updateBulbVisuals();
  }

  deleteComponent(component) {
    // Prevent deletion of predefined challenge components
    if (component.getData("isPredefined")) {
      return;
    }
    
    const idx = this.placedComponents.indexOf(component);
    if (idx !== -1) this.placedComponents.splice(idx, 1);
    component.destroy();
    this.rebuildGraph(); // This will check circuit state and update bulbs
    this.checkText.setText("");
    this.saveState('component_deleted');
  }

  turnOffAllBulbs() {
    this.placedComponents.forEach((component) => {
      const logicComp = component.getData("logicComponent");
      if (!logicComp || logicComp.type !== "bulb") return;

      const bulbImage = component.getData("bulbImage");
      const bulbGlow = component.getData("bulbGlow");

      if (bulbImage) {
        bulbImage.clearTint();
      }
      if (bulbGlow) {
        this.tweens.killTweensOf(bulbGlow);
        bulbGlow.setVisible(false);
        bulbGlow.setAlpha(0.3);
      }
    });
  }

  runSimulationAndCheck() {
    this.connected = this.graph.simulate();
    this.sim = this.connected === 1;

    // Update bulb visuals based on circuit state
    this.updateBulbVisuals();

    this.checkCircuit();
  }

  updateBulbVisuals() {
    const isCircuitClosed = this.connected === 1;

    // Find visual components for each bulb
    this.placedComponents.forEach((component) => {
      const logicComp = component.getData("logicComponent");
      if (!logicComp || logicComp.type !== "bulb") return;

      const bulbImage = component.getData("bulbImage");
      const bulbGlow = component.getData("bulbGlow");

      // Kill any existing glow tweens first
      if (bulbGlow) {
        this.tweens.killTweensOf(bulbGlow);
      }

      if (isCircuitClosed && bulbImage) {
        // Turn on: add yellow tint and show glow
        bulbImage.setTint(0xffff88);
        if (bulbGlow) {
          bulbGlow.setVisible(true);
          bulbGlow.setAlpha(0.3);
          // Animate glow pulsing
          this.tweens.add({
            targets: bulbGlow,
            alpha: { from: 0.3, to: 0.6 },
            duration: 800,
            yoyo: true,
            repeat: -1,
          });
        }
      } else {
        // Turn off: remove tint and hide glow
        if (bulbImage) {
          bulbImage.clearTint();
        }
        if (bulbGlow) {
          bulbGlow.setVisible(false);
          bulbGlow.setAlpha(0.3);
        }
      }
    });
  }

  classifyBulbArrangement() {
    const battery = this.graph.components.find((c) => c.type === "battery");
    if (!battery) return "unknown";

    const bulbs = this.graph.components.filter((c) => c.type === "bulb");
    if (bulbs.length < 2) return "unknown";

    const paths = [];
    const dfs = (node, target, visitedComps, path) => {
      if (!node || !target) return;
      if (this.graph.sameNode(node, target)) {
        paths.push([...path]);
        return;
      }

      for (const comp of this.graph.getConnections(node)) {
        if (!this.graph.componentConducts(comp) || visitedComps.has(comp))
          continue;
        visitedComps.add(comp);
        const next = this.graph.sameNode(comp.start, node)
          ? comp.end
          : comp.start;
        if (next) {
          dfs(next, target, visitedComps, [...path, comp]);
        }
        visitedComps.delete(comp);
      }
    };

    dfs(battery.start, battery.end, new Set(), []);
    if (!paths.length) return "unknown";

    const bulbCounts = paths.map(
      (p) => p.filter((c) => c.type === "bulb").length
    );

    if (bulbCounts.some((count) => count >= 2)) return "series";

    const bulbsCovered = bulbCounts.reduce((a, b) => a + b, 0);
    const pathsWithBulb = bulbCounts.filter((c) => c > 0).length;
    if (paths.length >= 2 && bulbsCovered >= 2 && pathsWithBulb >= 2) {
      return "parallel";
    }

    return "unknown";
  }

  updateLogicNodePositions(component) {
    const comp = component.getData("logicComponent");
    if (!comp) return;

    // derive local offsets: prefer comp-local offsets, else use half display
    const halfW = 40;
    const halfH = 40;

    const localStart = comp.localStart || { x: -halfW, y: 0 };
    const localEnd = comp.localEnd || { x: halfW, y: 0 };

    // get container angle in radians (Phaser keeps both .angle and .rotation)
    const theta =
      typeof component.rotation === "number" && component.rotation
        ? component.rotation
        : Phaser.Math.DegToRad(component.angle || 0);

    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const rotate = (p) => ({
      x: Math.round(p.x * cos - p.y * sin),
      y: Math.round(p.x * sin + p.y * cos),
    });

    const rStart = rotate(localStart);
    const rEnd = rotate(localEnd);

    const worldStart = { x: component.x + rStart.x, y: component.y + rStart.y };
    const worldEnd = { x: component.x + rEnd.x, y: component.y + rEnd.y };

    const snappedStart = this.snapToGrid(worldStart.x, worldStart.y);
    const snappedEnd = this.snapToGrid(worldEnd.x, worldEnd.y);

    if (comp.start) {
      comp.start.x = snappedStart.x;
      comp.start.y = snappedStart.y;
      if (!comp.start.connected) comp.start.connected = new Set();
      this.graph.addNode(comp.start);
    }
    if (comp.end) {
      comp.end.x = snappedEnd.x;
      comp.end.y = snappedEnd.y;
      if (!comp.end.connected) comp.end.connected = new Set();
      this.graph.addNode(comp.end);
    }

    // debug dots are top-level objects (not children). update their positions
    const startDot = component.getData("startDot");
    const endDot = component.getData("endDot");
    if (startDot && comp.start) {
      startDot.x = comp.start.x;
      startDot.y = comp.start.y;
    }
    if (endDot && comp.end) {
      endDot.x = comp.end.x;
      endDot.y = comp.end.y;
    }
  }

  createComponent(x, y, type, color, fromLoad = false) {
    const component = this.add.container(x, y);

    let comp = null;
    let componentImage;
    let id;

    switch (type) {
      case "battery":
        id = "bat_" + this.getRandomInt(1000, 9999);
        comp = new Battery(
          id,
          new Node(id + "_start", -40, 0),
          new Node(id + "_end", 40, 0),
          3.3
        );
        comp.type = "battery";
        comp.localStart = { x: -40, y: 0 };
        comp.localEnd = { x: 40, y: 0 };
        componentImage = this.add
          .image(0, 0, "battery")
          .setOrigin(0.5)
          .setDisplaySize(80, 80);
        component.add(componentImage);
        component.setData("logicComponent", comp);
        break;

      case "resistor":
        id = "res_" + this.getRandomInt(1000, 9999);
        comp = new Resistor(
          id,
          new Node(id + "_start", -40, 0),
          new Node(id + "_end", 40, 0),
          1.5
        );
        comp.type = "resistor";
        comp.localStart = { x: -40, y: 0 };
        comp.localEnd = { x: 40, y: 0 };
        componentImage = this.add
          .image(0, 0, "resistor")
          .setOrigin(0.5)
          .setDisplaySize(80, 80);
        component.add(componentImage);
        component.setData("logicComponent", comp);
        break;

      case "bulb":
        id = "bulb_" + this.getRandomInt(1000, 9999);
        comp = new Bulb(
          id,
          new Node(id + "_start", -40, 0),
          new Node(id + "_end", 40, 0)
        );
        comp.type = "bulb";
        comp.localStart = { x: -40, y: 0 };
        comp.localEnd = { x: 40, y: 0 };
        // Create glow effect (initially hidden)
        const glowCircle = this.add.circle(0, 0, 50, 0xffff00, 0.3);
        glowCircle.setVisible(false);
        component.add(glowCircle);
        component.setData("bulbGlow", glowCircle);
        // Then add the bulb image on top
        componentImage = this.add
          .image(0, 0, "bulb")
          .setOrigin(0.5)
          .setDisplaySize(80, 80);
        component.add(componentImage);
        component.setData("logicComponent", comp);
        component.setData("bulbImage", componentImage);
        break;

      case "switch-on":
        id = "switch_" + this.getRandomInt(1000, 9999);
        comp = new Switch(
          id,
          new Node(id + "_start", -40, 0),
          new Node(id + "_end", 40, 0),
          true
        );
        comp.type = "switch";
        comp.localStart = { x: -40, y: 0 };
        comp.localEnd = { x: 40, y: 0 };
        componentImage = this.add
          .image(0, 0, "switch-on")
          .setOrigin(0.5)
          .setDisplaySize(80, 80);
        component.add(componentImage);
        component.setData("logicComponent", comp);
        break;

      case "switch-off":
        id = "switch_" + this.getRandomInt(1000, 9999);
        comp = new Switch(
          id,
          new Node(id + "_start", -40, 0),
          new Node(id + "_end", 40, 0),
          false
        );
        comp.type = "switch";
        comp.localStart = { x: -40, y: 0 };
        comp.localEnd = { x: 40, y: 0 };
        componentImage = this.add
          .image(0, 0, "switch-off")
          .setOrigin(0.5)
          .setDisplaySize(80, 80);
        component.add(componentImage);
        component.setData("logicComponent", comp);
        break;

      case "wire":
        id = "wire_" + this.getRandomInt(1000, 9999);
        comp = new Wire(
          id,
          new Node(id + "_start", -40, 0),
          new Node(id + "_end", 40, 0)
        );
        comp.type = "wire";
        comp.localStart = { x: -40, y: 0 };
        comp.localEnd = { x: 40, y: 0 };
        componentImage = this.add
          .image(0, 0, "wire")
          .setOrigin(0.5)
          .setDisplaySize(80, 80);
        component.add(componentImage);
        component.setData("logicComponent", comp);
        break;
      case "ammeter":
        id = "ammeter_" + this.getRandomInt(1000, 9999);
        componentImage = this.add
          .image(0, 0, "ammeter")
          .setOrigin(0.5)
          .setDisplaySize(80, 80);
        component.add(componentImage);
        component.setData("logicComponent", null);
        break;
      case "voltmeter":
        id = "voltmeter_" + this.getRandomInt(1000, 9999);
        componentImage = this.add
          .image(0, 0, "voltmeter")
          .setOrigin(0.5)
          .setDisplaySize(80, 80);
        component.add(componentImage);
        component.setData("logicComponent", null);
        break;
    }

    component.on("pointerover", () => {
      this.selectedComponent = component;
      if (this.mode === "sandbox") {
        if (component.getData("isInPanel")) {
          const details = this.getComponentDetails(type);
          this.infoText.setText(details);
          this.infoWindow.x = x + 120;
          this.infoWindow.y = y;
          this.infoWindow.setVisible(true);
        } else {
          const details = this.getComponentDetails(type) + "\n\nPress Delete to remove";
          this.infoText.setText(details);
          this.infoWindow.x = component.x;
          this.infoWindow.y = component.y - 100;
          this.infoWindow.setVisible(true);
        }
      }
      component.setScale(1.1);
    });

    component.on("pointerout", () => {
      if (this.selectedComponent === component) {
        this.selectedComponent = null;
      }
      this.infoWindow.setVisible(false);
      component.setScale(1);
    });

    // Label
    const label = this.add
      .text(0, 30, type, {
        fontSize: "11px",
        color: "#fff",
        backgroundColor: "#00000088",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);
    component.add(label);

    component.setSize(70, 70);
    component.setInteractive({ draggable: true, useHandCursor: true });

    // shrani originalno pozicijo in tip
    component.setData("originalX", x);
    component.setData("originalY", y);
    component.setData("type", type);
    component.setData("color", color);
    component.setData("isInPanel", !fromLoad);
    component.setData("rotation", 0);
    component.setData("componentId", id); // Unique ID for undo/redo
    if (comp) component.setData("logicComponent", comp);
    component.setData("isDragging", false);
    component.setData("dragMoved", false);
    component.setData("lastClickTime", 0);

    if (fromLoad) {
      component.setData("originalX", x);
      component.setData("originalY", y);
    }

    this.input.setDraggable(component);

    component.on("dragstart", () => {
      component.setData("isDragging", true);
      component.setData("dragMoved", false);
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
      // Convert screen position to workspace coordinates for panel check
      const screenX = component.x;
      const isInPanel = screenX < 200;

      if (isInPanel && !component.getData("isInPanel")) {
        // Dragged back to panel - destroy it
        // Prevent deletion of predefined challenge components
        if (component.getData("isPredefined")) {
          // Return to previous position
          const previousX = component.getData("previousX") || component.getData("originalX");
          const previousY = component.getData("previousY") || component.getData("originalY");
          component.x = previousX;
          component.y = previousY;
          component.setData("isDragging", false);
          return;
        }
        this.placedComponents = this.placedComponents.filter(c => c !== component);
        component.destroy();
        this.rebuildGraph();
      } else if (!isInPanel && component.getData("isInPanel")) {
        // Component dragged from panel to workspace
        // Convert screen coordinates to workspace coordinates
        const workspaceX = (screenX - this.workspaceOffsetX) / this.currentZoom;
        const workspaceY = (component.y - this.workspaceOffsetY) / this.currentZoom;
        
        const snapped = this.snapToGrid(workspaceX, workspaceY);
        const aligned = this.alignToNearbyNodes(component, snapped);

        if (this.isPositionOccupied(aligned.x, aligned.y, component)) {
          component.x = component.getData("originalX");
          component.y = component.getData("originalY");
          component.setData("isDragging", false);
          return;
        }

        // Store workspace coordinates (component will be added to workspace layer)
        component.x = aligned.x;
        component.y = aligned.y;

        const comp = component.getData("logicComponent");
        if (comp) {
          console.log("Component: " + comp);
          this.graph.addComponent(comp);

          // Add start/end nodes to graph if they exist
          if (comp.start) this.graph.addNode(comp.start);
          if (comp.end) this.graph.addNode(comp.end);
        }

        this.updateLogicNodePositions(component);

        component.setData("isRotated", false);
        component.setData("isInPanel", false);

        // Add component to workspace layer BEFORE creating replacement
        // This ensures the component is properly reparented with correct coordinates
        if (this.workspaceLayer && !component.getData("isInPanel")) {
          this.workspaceLayer.add(component);
        }

        this.createComponent(
          component.getData("originalX"),
          component.getData("originalY"),
          component.getData("type"),
          component.getData("color")
        );

        this.placedComponents.push(component);
        // Rebuild graph and check circuit state for real-time bulb updates
        this.rebuildGraph();
        this.saveState('component_placed');
      } else if (!component.getData("isInPanel")) {
        // na mizi in se postavi na mrežo
        const snapped = this.snapToGrid(component.x, component.y);
        const aligned = this.alignToNearbyNodes(component, snapped);

        if (this.isPositionOccupied(aligned.x, aligned.y, component)) {
          const previousX = component.getData("previousX") || component.x;
          const previousY = component.getData("previousY") || component.y;
          component.x = previousX;
          component.y = previousY;
        } else {
          component.setData("previousX", component.x);
          component.setData("previousY", component.y);
          component.x = aligned.x;
          component.y = aligned.y;
        }

        this.updateLogicNodePositions(component);
        // Rebuild graph and check circuit state for real-time bulb updates
        this.rebuildGraph();
        this.saveState('component_moved');
      } else {
        // postavi se nazaj na originalno mesto
        component.x = component.getData("originalX");
        component.y = component.getData("originalY");

        this.updateLogicNodePositions(component);
      }

      this.time.delayedCall(500, () => {
        component.setData("isDragging", false);
      });
    });

    component.on("pointerdown", (pointer) => {
      if (pointer?.rightButtonDown()) {
        pointer.event?.preventDefault?.();
        if (!component.getData("isInPanel")) {
          this.deleteComponent(component);
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
          component.setData("rotation", newRotation);
          component.setData("isRotated", !component.getData("isRotated"));

          this.tweens.add({
            targets: component,
            angle: newRotation,
            duration: 150,
            ease: "Cubic.easeOut",
            onComplete: () => {
              // Update node positions after rotation and check circuit state
              this.updateLogicNodePositions(component);
              this.rebuildGraph();
              this.saveState('component_rotated');
            },
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

    // hover efekt
    component.on("pointerover", () => {
      component.setScale(1.1);
    });

    component.on("pointerout", () => {
      component.setScale(1);
    });
    return component;
  }

  checkCircuit() {
    const currentChallenge = this.challenges[this.currentChallengeIndex];
    const placedTypes = this.placedComponents.map((comp) =>
      comp.getData("type")
    );
    console.log("components", placedTypes);
    if (this.mode === "sandbox") {
      this.checkText.setStyle({ color: "#cc0000" });
    }

    if (this.sim === undefined) {
      if (this.mode === "sandbox") {
        this.checkText.setText("Run simulation");
      }
      return;
    }

    if (this.sim == false) {
      if (this.mode === "sandbox") {
        if (this.connected == -1) {
          this.checkText.setText("Missing battery");
        } else if (this.connected == -2) {
          this.checkText.setText("Switch is off");
        } else {
          this.checkText.setText(
            "Circuit is not closed. Check your connections"
          );
        }
      }
      return;
    }

    if (
      !currentChallenge.requiredComponents.every((req) =>
        placedTypes.includes(req)
      )
    ) {
      if (this.mode === "sandbox") {
        this.checkText.setText("Missing components for circuit.");
      }
      return;
    }

    if (currentChallenge.type) {
      const arrangement = this.classifyBulbArrangement();
      if (arrangement !== currentChallenge.type) {
        if (this.mode === "sandbox") {
          this.checkText.setText(
            currentChallenge.type === "series"
              ? "Connection must be in series."
              : "Connection must be in parallel."
          );
        }
        return;
      }
    }

    if (this.mode === "sandbox") {
      this.checkText.setStyle({ color: "#00aa00" });
      this.checkText.setText("Congratulations! Circuit is correct.");
      this.addPoints(10);

      if (currentChallenge.theory) {
        this.showTheory(currentChallenge.theory);
      } else {
        this.checkText.setStyle({ color: "#00aa00" });
        this.checkText.setText("Congratulations! Circuit is correct.");
        this.addPoints(10);
        this.time.delayedCall(2000, () => this.nextChallenge());
      }
    }
    // this.placedComponents.forEach(comp => comp.destroy());
    // this.placedComponents = [];
    // this.time.delayedCall(2000, () => this.nextChallenge());
    // const isCorrect = currentChallenge.requiredComponents.every(req => placedTypes.includes(req));
    // if (isCorrect) {
    //   this.checkText.setText('Čestitke! Krog je pravilen.');
    //   this.addPoints(10);
    //   this.time.delayedCall(2000, () => this.nextChallenge());
    // }
    // else {
    //   this.checkText.setText('Krog ni pravilen. Poskusi znova.');
    // }
  }

  nextChallenge() {
    this.currentChallengeIndex++;
    localStorage.setItem(
      "currentChallengeIndex",
      this.currentChallengeIndex.toString()
    );
    this.checkText.setText("");

    if (this.currentChallengeIndex < this.challenges.length) {
      this.promptText.setText(
        this.challenges[this.currentChallengeIndex].prompt
      );
    } else {
      this.promptText.setText("All tasks completed successfully! Congratulations!");
      localStorage.removeItem("currentChallengeIndex");
    }
  }

  addPoints(points) {
    const user = localStorage.getItem("username");
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const userData = users.find((u) => u.username === user);
    if (userData) {
      userData.score = (userData.score || 0) + points;
    }
    localStorage.setItem("users", JSON.stringify(users));
  }

  showTheory(theoryText) {
    const { width, height } = this.cameras.main;

    this.theoryBack = this.add
      .rectangle(width / 2, height / 2, width - 100, 150, 0x000000, 0.8)
      .setOrigin(0.5)
      .setDepth(10);

    this.theoryText = this.add
      .text(width / 2, height / 2, theoryText, {
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: width - 150 },
      })
      .setOrigin(0.5)
      .setDepth(11);

    this.continueButton = this.add
      .text(width / 2, height / 2 + 70, "Continue", {
        fontSize: "18px",
        color: "#0066ff",
        backgroundColor: "#ffffff",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () =>
        this.continueButton.setStyle({ color: "#0044cc" })
      )
      .on("pointerout", () =>
        this.continueButton.setStyle({ color: "#0066ff" })
      )
      .on("pointerdown", () => {
        this.hideTheory();
        this.placedComponents.forEach((comp) => comp.destroy());
        this.placedComponents = [];
        this.nextChallenge();
      });
  }

  hideTheory() {
    if (this.theoryBack) {
      this.theoryBack.destroy();
      this.theoryBack = null;
    }
    if (this.theoryText) {
      this.theoryText.destroy();
      this.theoryText = null;
    }
    if (this.continueButton) {
      this.continueButton.destroy();
      this.continueButton = null;
    }
  }
  openSaveModal() {
    const { width, height } = this.cameras.main;

    this.saveModalBg = this.add.rectangle(
      width / 2,
      height / 2,
      450,
      300,
      0x000000,
      0.9
    );

    this.saveModalText = this.add
      .text(width / 2, height / 2 - 40, "Circuit Name:", {
        fontSize: "20px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(1004);

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
    const components = this.placedComponents.map((c) => ({
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
      })
      .catch((err) => console.error(err));
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
      .catch((err) => console.error(err));
  }

  closeLoadModal() {
    this.loadBg?.destroy();
    this.loadTitle?.destroy();
    this.loadClose?.destroy();
    this.loadCircuitTexts?.forEach((t) => t.destroy());
    this.loadCircuitTexts = [];
  }
  loadCircuit(components) {
    components.forEach((item) => {
      const component = this.createComponent(
        item.x,
        item.y,
        item.type,
        null,
        true
      );

      if (!component) return;

      component.x = item.x;
      component.y = item.y;

      if (item.rotation) {
        component.setData("rotation", item.rotation);
        component.angle = item.rotation;
      }

      component.setData("isInPanel", false);
      
      if (this.workspaceLayer) {
        this.workspaceLayer.add(component);
      }
      
      this.placedComponents.push(component);
    });
    
    // Rebuild graph in check circuit state after loading
    this.rebuildGraph();
  }

  resetChallenge() {
    // Remove all user-added components (not predefined)
    const componentsToRemove = this.placedComponents.filter(
      comp => !this.predefinedComponents.includes(comp)
    );
    
    componentsToRemove.forEach(component => {
      // Remove from graph
      const logicComp = component.getData("logicComponent");
      if (logicComp) {
        this.graph.removeComponent(logicComp);
      }
      
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
        
        // Update logic node positions
        this.updateLogicNodePositions(component);
      }
    });
    
    // Rebuild graph to update connections
    this.rebuildGraph();
    
    // Clear undo/redo stacks
    this.undoStack = [];
    this.redoStack = [];
  }

  initializeChallenge() {
    console.log("initializeChallenge called - mode:", this.mode, "challengeId:", this.selectedChallengeId);
    
    if (this.mode !== "challenge" || !this.selectedChallengeId) {
      console.log("Skipping challenge initialization - mode or ID not set");
      return;
    }

    this.resetZoom();

    const challengeId = parseInt(this.selectedChallengeId);
    console.log("Setting up electric challenge:", challengeId);
    
    if (challengeId === 1) {
      this.setupChallenge1();
    } else if (challengeId === 2) {
      this.setupChallenge2();
    } else if (challengeId === 3) {
      this.setupChallenge3();
    } else if (challengeId === 4) {
      this.setupChallenge4();
    } else if (challengeId === 5) {
      this.setupChallenge5();
    } else if (challengeId === 6) {
      this.setupChallenge6();
    } else if (challengeId === 7) {
      this.setupChallenge7();
    } else if (challengeId === 8) {
      this.setupChallenge8();
    } else if (challengeId === 9) {
      this.setupChallenge9();
    } else if (challengeId === 10) {
      this.setupChallenge10();
    }
  }

  placeComponentOnGrid(type, gridX, gridY, isPredefined = true) {
    const worldX = gridX * this.gridSize;
    const worldY = gridY * this.gridSize;
    
    let color;
    switch(type) {
      case "battery": color = 0xffcc00; break;
      case "bulb": color = 0xff0000; break;
      case "resistor": color = 0xff6600; break;
      case "switch-on": color = 0x666666; break;
      case "switch-off": color = 0x666666; break;
      case "wire": color = 0x0066cc; break;
      default: color = 0xffffff;
    }
    
    const component = this.createComponent(worldX, worldY, type, color, true);
    this.workspaceLayer.add(component);
    this.placedComponents.push(component);
    component.setData("type", type);
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
    
    const comp = component.getData("logicComponent");
    if (comp) {
      this.graph.addComponent(comp);
    }
    
    return component;
  }

  setupChallenge1() {
    const { width, height } = this.cameras.main;
    
    this.placeComponentOnGrid("battery", 15, 9);
    this.placeComponentOnGrid("bulb", 25, 9);
    
    this.createChallengePanel(width, "Connect the battery to the bulb\nto light it up using wires");
  }

  setupChallenge2() {
    const { width, height } = this.cameras.main;
    
    this.placeComponentOnGrid("battery", 15, 9);
    this.placeComponentOnGrid("bulb", 25, 9);
    this.placeComponentOnGrid("switch-off", 20, 9);
    
    this.createChallengePanel(width, "Build an open circuit\nSwitch should be OFF (open)");
  }

  setupChallenge3() {
    const { width, height } = this.cameras.main;
    
    this.placeComponentOnGrid("battery", 15, 9);
    this.placeComponentOnGrid("bulb", 25, 9);
    this.placeComponentOnGrid("switch-on", 20, 9);
    
    this.createChallengePanel(width, "Build a closed circuit\nSwitch should be ON (closed)");
  }

  setupChallenge4() {
    const { width, height } = this.cameras.main;
    
    this.placeComponentOnGrid("battery", 15, 9);
    this.placeComponentOnGrid("bulb", 25, 9);
    this.placeComponentOnGrid("switch-on", 20, 7);
    
    this.createChallengePanel(width, "Add a switch you can turn on/off\nUse both switch states");
  }

  setupChallenge5() {
    const { width, height } = this.cameras.main;
    
    this.placeComponentOnGrid("battery", 15, 9);
    this.placeComponentOnGrid("battery", 18, 9);
    this.placeComponentOnGrid("bulb", 25, 9);
    
    this.createChallengePanel(width, "Connect two batteries in series\nwith the bulb");
  }

  setupChallenge6() {
    const { width, height } = this.cameras.main;
    
    this.placeComponentOnGrid("battery", 15, 9);
    this.placeComponentOnGrid("bulb", 22, 7);
    this.placeComponentOnGrid("bulb", 22, 11);
    
    this.createChallengePanel(width, "Connect two bulbs in series\nto the battery");
  }

  setupChallenge7() {
    const { width, height } = this.cameras.main;
    
    this.placeComponentOnGrid("battery", 15, 9);
    this.placeComponentOnGrid("bulb", 25, 7);
    this.placeComponentOnGrid("bulb", 25, 11);
    
    this.createChallengePanel(width, "Connect two bulbs in parallel\nto the battery");
  }

  setupChallenge8() {
    const { width, height } = this.cameras.main;
    
    this.placeComponentOnGrid("battery", 15, 9);
    this.placeComponentOnGrid("resistor", 20, 9);
    this.placeComponentOnGrid("bulb", 25, 9);
    
    this.createChallengePanel(width, "Connect battery, resistor, and bulb\nin a complete circuit");
  }

  setupChallenge9() {
    const { width, height } = this.cameras.main;
    
    this.placeComponentOnGrid("battery", 15, 9);
    this.placeComponentOnGrid("resistor", 18, 9);
    this.placeComponentOnGrid("resistor", 21, 9);
    this.placeComponentOnGrid("bulb", 25, 9);
    
    this.createChallengePanel(width, "Complex Series Circuit\nConnect battery, two resistors, and bulb in series");
  }

  setupChallenge10() {
    const { width, height } = this.cameras.main;
    
    this.placeComponentOnGrid("battery", 15, 9);
    this.placeComponentOnGrid("bulb", 22, 6);
    this.placeComponentOnGrid("bulb", 22, 9);
    this.placeComponentOnGrid("bulb", 22, 12);
    
    this.createChallengePanel(width, "Mixed Circuit Challenge\nCombine series and parallel connections");
  }

  createChallengePanel(width, goalText) {
    // Position at the top right, above all buttons, offset left by 10px from edge
    const challengePanel = this.add.container(width - 150, 140);
    challengePanel.setDepth(1001);

    const panelBg = this.add.rectangle(0, 0, 280, 150, 0x2a2a4e, 0.95);
    panelBg.setStrokeStyle(2, 0x3399ff);
    challengePanel.add(panelBg);

    const title = this.add.text(0, -55, "Challenge Goal:", {
      fontSize: "14px",
      color: "#ffff99",
      fontStyle: "bold"
    }).setOrigin(0.5);
    challengePanel.add(title);

    const goal = this.add.text(0, -35, goalText, {
      fontSize: "12px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: 250 }
    }).setOrigin(0.5);
    challengePanel.add(goal);

    const submitBtn = this.add.rectangle(0, 35, 220, 40, 0x4caf50);
    submitBtn.setInteractive({ useHandCursor: true });
    submitBtn.on('pointerover', () => submitBtn.setFillStyle(0x45a049));
    submitBtn.on('pointerout', () => submitBtn.setFillStyle(0x4caf50));
    submitBtn.on('pointerdown', () => this.checkChallengeCompletion());
    challengePanel.add(submitBtn);

    const submitText = this.add.text(0, 35, "Check Solution", {
      fontSize: "14px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    challengePanel.add(submitText);

    this.challengePanel = challengePanel;
  }

  setupSimpleCircuitChallenge() {
    const { width, height } = this.cameras.main;
    
    // Don't pre-place components - let users build from scratch
    // Just show the challenge panel with instructions
    
    // Position aligned with Lestvica button on the right
    const challengePanel = this.add.container(width - 140, 200);
    challengePanel.setDepth(1001);

    const panelBg = this.add.rectangle(0, 0, 280, 150, 0x2a2a4e, 0.95);
    panelBg.setStrokeStyle(2, 0x3399ff);
    challengePanel.add(panelBg);

    const title = this.add.text(0, -55, "Challenge Goal:", {
      fontSize: "14px",
      color: "#ffff99",
      fontStyle: "bold"
    }).setOrigin(0.5);
    challengePanel.add(title);

    const goal = this.add.text(0, -35, "Connect the battery to the bulb\nto light it up using wires", {
      fontSize: "12px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: 250 }
    }).setOrigin(0.5);
    challengePanel.add(goal);

    const submitBtn = this.add.rectangle(0, 35, 220, 40, 0x4caf50);
    submitBtn.setInteractive({ useHandCursor: true });
    submitBtn.on('pointerover', () => submitBtn.setFillStyle(0x45a049));
    submitBtn.on('pointerout', () => submitBtn.setFillStyle(0x4caf50));
    submitBtn.on('pointerdown', () => this.checkChallengeCompletion());
    challengePanel.add(submitBtn);

    const submitText = this.add.text(0, 35, "Check Solution", {
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

    if (challengeId === 1) {
      this.checkChallenge1();
    } else if (challengeId === 2) {
      this.checkChallenge2();
    } else if (challengeId === 3) {
      this.checkChallenge3();
    } else if (challengeId === 4) {
      this.checkChallenge4();
    } else if (challengeId === 5) {
      this.checkChallenge5();
    } else if (challengeId === 6) {
      this.checkChallenge6();
    } else if (challengeId === 7) {
      this.checkChallenge7();
    } else if (challengeId === 8) {
      this.checkChallenge8();
    }
  }

  checkChallenge1() {
    this.runSimulationAndCheck();

    if (!this.sim) {
      this.showChallengeMessage("Circuit not complete!", 0xff6b6b);
      return;
    }

    const bulbs = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "bulb"
    );

    if (bulbs.length === 0) {
      this.showChallengeMessage("No bulbs found!", 0xff6b6b);
      return;
    }

    const batteries = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "battery"
    );

    if (batteries.length === 0) {
      this.showChallengeMessage("No battery found!", 0xff6b6b);
      return;
    }

    const anyBulbLit = bulbs.some(bulb => {
      const glow = bulb.getData("bulbGlow");
      return glow && glow.visible;
    });

    if (!anyBulbLit) {
      this.showChallengeMessage("Bulb is not lit! Check connections.", 0xff6b6b);
      return;
    }

    this.completeChallengeSuccess();
  }

  checkChallenge2() {
    this.runSimulationAndCheck();

    const switches = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "switch"
    );

    if (switches.length === 0) {
      this.showChallengeMessage("Add a switch!", 0xff6b6b);
      return;
    }

    const bulbs = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "bulb"
    );

    const anyBulbLit = bulbs.some(bulb => {
      const glow = bulb.getData("bulbGlow");
      return glow && glow.visible;
    });

    if (anyBulbLit) {
      this.showChallengeMessage("Circuit should be open! Switch must be OFF.", 0xff6b6b);
      return;
    }

    this.completeChallengeSuccess();
  }

  checkChallenge3() {
    this.runSimulationAndCheck();

    if (!this.sim) {
      this.showChallengeMessage("Circuit not complete!", 0xff6b6b);
      return;
    }

    const switches = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "switch"
    );

    if (switches.length === 0) {
      this.showChallengeMessage("Add a switch!", 0xff6b6b);
      return;
    }

    const bulbs = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "bulb"
    );

    const anyBulbLit = bulbs.some(bulb => {
      const glow = bulb.getData("bulbGlow");
      return glow && glow.visible;
    });

    if (!anyBulbLit) {
      this.showChallengeMessage("Circuit should be closed! Switch must be ON.", 0xff6b6b);
      return;
    }

    this.completeChallengeSuccess();
  }

  checkChallenge4() {
    this.runSimulationAndCheck();

    const switches = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "switch"
    );

    if (switches.length < 1) {
      this.showChallengeMessage("Add at least one switch!", 0xff6b6b);
      return;
    }

    this.completeChallengeSuccess();
  }

  checkChallenge5() {
    this.runSimulationAndCheck();

    if (!this.sim) {
      this.showChallengeMessage("Circuit not complete!", 0xff6b6b);
      return;
    }

    const batteries = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "battery"
    );

    if (batteries.length < 2) {
      this.showChallengeMessage("Need 2 batteries!", 0xff6b6b);
      return;
    }

    const bulbs = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "bulb"
    );

    const anyBulbLit = bulbs.some(bulb => {
      const glow = bulb.getData("bulbGlow");
      return glow && glow.visible;
    });

    if (!anyBulbLit) {
      this.showChallengeMessage("Connect batteries in series!", 0xff6b6b);
      return;
    }

    this.completeChallengeSuccess();
  }

  checkChallenge6() {
    this.runSimulationAndCheck();

    if (!this.sim) {
      this.showChallengeMessage("Circuit not complete!", 0xff6b6b);
      return;
    }

    const bulbs = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "bulb"
    );

    if (bulbs.length < 2) {
      this.showChallengeMessage("Need 2 bulbs!", 0xff6b6b);
      return;
    }

    const bulbsLit = bulbs.filter(bulb => {
      const glow = bulb.getData("bulbGlow");
      return glow && glow.visible;
    }).length;

    if (bulbsLit < 2) {
      this.showChallengeMessage("Both bulbs should be lit in series!", 0xff6b6b);
      return;
    }

    this.completeChallengeSuccess();
  }

  checkChallenge7() {
    this.runSimulationAndCheck();

    if (!this.sim) {
      this.showChallengeMessage("Circuit not complete!", 0xff6b6b);
      return;
    }

    const bulbs = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "bulb"
    );

    if (bulbs.length < 2) {
      this.showChallengeMessage("Need 2 bulbs!", 0xff6b6b);
      return;
    }

    const bulbsLit = bulbs.filter(bulb => {
      const glow = bulb.getData("bulbGlow");
      return glow && glow.visible;
    }).length;

    if (bulbsLit < 2) {
      this.showChallengeMessage("Both bulbs should be lit in parallel!", 0xff6b6b);
      return;
    }

    this.completeChallengeSuccess();
  }

  checkChallenge8() {
    this.runSimulationAndCheck();

    if (!this.sim) {
      this.showChallengeMessage("Circuit not complete!", 0xff6b6b);
      return;
    }

    const resistors = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "resistor"
    );

    if (resistors.length === 0) {
      this.showChallengeMessage("Add a resistor!", 0xff6b6b);
      return;
    }

    const bulbs = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "bulb"
    );

    const anyBulbLit = bulbs.some(bulb => {
      const glow = bulb.getData("bulbGlow");
      return glow && glow.visible;
    });

    if (!anyBulbLit) {
      this.showChallengeMessage("Complete the circuit!", 0xff6b6b);
      return;
    }

    this.completeChallengeSuccess();
  }

  completeChallengeSuccess() {
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
        this.scene.start("ChallengeSelectionScene", { workspaceType: "electric" });
      });
    });
  }

  checkSimpleCircuit() {
    this.runSimulationAndCheck();

    if (!this.sim) {
      this.showChallengeMessage("Circuit not complete!", 0xff6b6b);
      return;
    }

    const bulbs = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "bulb"
    );

    if (bulbs.length === 0) {
      this.showChallengeMessage("No bulbs found!", 0xff6b6b);
      return;
    }

    const batteries = this.placedComponents.filter(
      comp => comp.getData("logicComponent")?.type === "battery"
    );

    if (batteries.length === 0) {
      this.showChallengeMessage("No battery found!", 0xff6b6b);
      return;
    }

    this.showChallengeMessage("Challenge Complete! 🎉", 0x4caf50);
    this.time.delayedCall(2000, () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start("ChallengeSelectionScene", { workspaceType: "electric" });
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

    this.challengeMessage = this.add.rectangle(width / 2, height / 2 - 150, 400, 80, color, 0.9);
    this.challengeMessage.setStrokeStyle(3, 0xffffff);
    this.challengeMessage.setDepth(2000);

    this.challengeMessageText = this.add.text(width / 2, height / 2 - 150, text, {
      fontSize: "24px",
      color: "#ffffff",
      fontStyle: "bold",
      align: "center"
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
}


const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: "game-container",
  backgroundColor: "#f0f0f0",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [LabScene, WorkspaceScene],
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
};
