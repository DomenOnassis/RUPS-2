import { CircuitGraph } from './circuit_graph.js';
import { Battery } from '../components/battery.js';
import { Bulb } from './components/bulb.js';
import { Wire } from '../components/wire.js';
import { Node } from './node.js';

const circuit = new CircuitGraph();
const battery = new Battery('bat', new Node('bat_pos', 440, 480), new Node('bat_neg', 440, 400));
const wire1 = new Wire("wire1", new Node('bat_pos', 440, 480));
const wire2 = new Wire(wire1.end, new Node('B'));
const bulb = new Bulb('blb', wire8.end, new Node('H'));

console.log(`Adding components to circuit:`);
console.log(battery);
console.log(wire1);
console.log(wire2);

circuit.addComponent(battery);
circuit.addComponent(wire1);
circuit.addComponent(wire2);
circuit.addComponent(wire3);
circuit.addComponent(wire4);
circuit.addComponent(wire5);
circuit.addComponent(wire6);
circuit.addComponent(wire7);
circuit.addComponent(wire8);
circuit.addComponent(bulb);
circuit.addComponent(wire9);
circuit.simulate();