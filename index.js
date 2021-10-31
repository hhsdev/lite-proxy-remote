const assert = require("assert");
const express = require("express");
const http = require("http");
const { Socket } = require("net");
const { Server } = require("socket.io");
const ProxyConnectionPool = require("./src/proxy-connection-pool");
const Tunnel = require("./src/tunnel");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const connectionPool = new ProxyConnectionPool();

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("data", (data) => {
    console.log("data:", data);
  });

  socket.on("http-init", (message) => {
    connectionPool.addTunnel(
      new Tunnel({
        mode: "http",
        message,
        socket,
      })
    );
  });

  socket.on("https-init", (target) => {
    console.log("https-init");
    connectionPool.addTunnel(
      new Tunnel({
        mode: "https",
        target,
        socket,
      })
    );
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
