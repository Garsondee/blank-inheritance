/**
 * Binary min-heap over integer payloads keyed by a float priority.
 *
 * Exists solely for the Priority-Flood depression filler, which is the hottest
 * loop in the whole generator (every cell is pushed and popped exactly once per
 * fill, and a fill runs many times over an erosion sim). Two typed arrays and
 * no object allocation per entry, rather than a generic comparator-based heap.
 */

export class MinHeap {
  constructor(capacity) {
    this.keys = new Float64Array(capacity);
    this.vals = new Int32Array(capacity);
    this.size = 0;
  }

  push(key, val) {
    let i = this.size++;
    this.keys[i] = key;
    this.vals[i] = val;
    // Sift up.
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= this.keys[i]) break;
      this._swap(i, parent);
      i = parent;
    }
  }

  /** Returns the value with the smallest key, or -1 when empty. */
  pop() {
    if (this.size === 0) return -1;
    const top = this.vals[0];
    this.size--;
    if (this.size > 0) {
      this.keys[0] = this.keys[this.size];
      this.vals[0] = this.vals[this.size];
      // Sift down.
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let smallest = i;
        if (l < this.size && this.keys[l] < this.keys[smallest]) smallest = l;
        if (r < this.size && this.keys[r] < this.keys[smallest]) smallest = r;
        if (smallest === i) break;
        this._swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  /** Key of the entry most recently returned by pop() is not retained; peek instead. */
  peekKey() {
    return this.size === 0 ? Infinity : this.keys[0];
  }

  _swap(a, b) {
    const k = this.keys[a];
    this.keys[a] = this.keys[b];
    this.keys[b] = k;
    const v = this.vals[a];
    this.vals[a] = this.vals[b];
    this.vals[b] = v;
  }
}
