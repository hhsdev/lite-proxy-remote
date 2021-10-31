const net = require("net");
const EventEmitter = require("./event-emitter");

class Tunnel extends EventEmitter {
  constructor(options) {
    super();
    if (!options.mode) {
      throw Error("mode is undefined");
    }
    this.tunnelClosed = false;

    if (options.mode === "http") {
      this._initHttp(options);
    } else if (options.mode === "https") {
      console.log("here");
      this._initHttps(options);
    } else {
      throw Error(`Unrecognized value for mode: "${options.mode}"`);
    }
  }

  _initHttp(options) {
    const { message, socket } = options;
    this.clientSocket = socket;
    this.remoteSocket = new net.Socket();
    this._addSocketEventListeners();
    let { host, port } = this._parseHostAndPort(message);
    if (!port) port = 80;
    console.log(`Attemption connection to ${host}:${port}`);
    this.remoteSocket.connect(port, host, () => {
      this.remoteSocket.write(message, (err) => {
        if (err) {
          this._handleRemoteSocketError(err);
        } else {
          this._checkClientAndEmit("init-ok");
        }
      });
    });
  }

  _initHttps(options) {
    const { target, socket } = options;
    const [host, port] = target.split(":");
    this.clientSocket = socket;
    this.remoteSocket = new net.Socket();
    this._addSocketEventListeners();
    console.log(`Attemption connection to ${host}:${port}`);
    this.remoteSocket.connect(port, host, () => {
      this._checkClientAndEmit("https-init-ok");
    });
  }

  _addSocketEventListeners() {
    this.clientSocket.on("relay", (buffer) => {
      this.relayToRemote(buffer);
    });
    this.clientSocket.on("error", (err) => this._handleClientSocketError(err));
    this.clientSocket.on("disconnect", () => {
      this._closeTunnel();
    });

    this.remoteSocket.on("error", (err) => this._handleRemoteSocketError(err));
    this.remoteSocket.on("data", (buffer) => {
      this.relayToClient(buffer);
    });
    this.remoteSocket.on("end", () => {
      this._closeTunnel();
    });
  }

  _parseHostAndPort(message) {
    const requestLine = message.split("\r\n")[0];
    const target = requestLine.split(" ")[1];
    const url = new URL(target);
    const { host, port } = url;
    return { host, port };
  }

  _handleRemoteSocketError(err) {
    if (!err) return;
    console.warn("Remote error: ", err);
    if (err.code == "ECONNRESET") {
      this._closeTunnel();
      return;
    } else if (err.code == "ENOTFOUND" || err.code == "ETIMEOUT") {
      return;
    }
    throw err;
  }

  _handleClientSocketError(err) {
    // TODO: Fill out this function
    console.warn("Client error:", err);
  }

  relayToRemote(data) {
    if (this.remoteSocket.destroyed) {
      this._closeTunnel();
    } else {
      this.remoteSocket.write(data, (err) =>
        this._handleRemoteSocketError(err)
      );
    }
  }

  relayToClient(data) {
    this._checkClientAndEmit("relay", data);
  }

  _closeTunnel() {
    if (this.tunnelClosed) return;
    console.log(`Closing tunnel`);
    this.tunnelClosed = true;
    if (!this.clientSocket.disconnected) this.clientSocket.disconnect();
    if (!this.remoteSocket.destroyed) this.remoteSocket.destroy();
    this.emit("close");
  }

  _checkClientAndEmit(event, ...args) {
    if (this.clientSocket.disconnected) {
      this._closeTunnel();
    } else {
      this.clientSocket.emit(event, ...args);
    }
  }
}

module.exports = Tunnel;