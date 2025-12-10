class Node {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.connected = new Set();
        this.bit_value = 0;
    }
}

export { Node };