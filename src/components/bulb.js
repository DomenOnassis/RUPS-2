import { Component } from './component.js';

class Bulb extends Component {
    constructor(id, start, end) {
        super(id, 'bulb', start, end, 'src/components/lamp.png', true);
        this.is_on = true;
    }
}

export { Bulb };