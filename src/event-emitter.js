class EventEmitter {
  constructor() {
    this.eventListeners = {};
  }

  on(eventName, listener) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].push(listener);
    } else {
      this.eventListeners[eventName] = [listener];
    }
  }

  emit(eventName) {
    if (!this.eventListeners[eventName]) return;
    for (const listener of this.eventListeners[eventName]) {
      listener(this);
    }
  }
}

module.exports = EventEmitter;