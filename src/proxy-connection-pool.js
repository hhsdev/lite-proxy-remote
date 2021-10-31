class ProxyConnectionPool {
  constructor() {
    this.max_connections = 16;
    this.connections = new Array(this.max_connections);
    this.curr_connections = 0;
    this._indexLookup = new WeakMap();
  }

  addTunnel(tunnel) {
    this.curr_connections += 1;
    this._expandConnectionsCapacityIfNeeded();
    this.connections[this.curr_connections - 1] = tunnel;
    this._indexLookup.set(tunnel, this.curr_connections-1);
    tunnel.on("close", (tunnelToClose) => {
      this.removeReferenceToTunnel(tunnelToClose);
    });
  }

  removeReferenceToTunnel(tunnelToRemove) {
    // Swap the rightmost unclosed tunnel with the tunnel to close.
    // this way, all the open tunnels will be to the left of the
    // `this.connections` array.
    const tunnelToRemoveIndex = this._indexLookup.get(tunnelToRemove);
    const rightmostOpenTunnelIndex = this.curr_connections - 1;
    const rightmostOpenTunnel = this.connections[rightmostOpenTunnelIndex];

    // Remove the doomed tunnel by overriding its place
    this.connections[tunnelToRemoveIndex] = rightmostOpenTunnel;
    try {
      this._indexLookup.set(rightmostOpenTunnel, tunnelToRemoveIndex);
    } catch (err) {
      console.log(this.curr_connections)
      console.log(this.connections)
      throw err;
    }

    // Remove the former reference of rightmost open tunnel
    this.connections[rightmostOpenTunnelIndex] = undefined;
    this._indexLookup.delete(tunnelToRemove);

    this.curr_connections -= 1;
    console.log("current connections: ", this.curr_connections);
  }

  _expandConnectionsCapacityIfNeeded() {
    if (this.curr_connections > this.max_connections) {
      this.connections.push(new Array(this.max_connections));
      this.max_connections *= 2;
    }
  }
}

module.exports = ProxyConnectionPool;
