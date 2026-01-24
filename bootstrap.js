"use strict";

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { BASE_PATH } = require("./config");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  path: BASE_PATH ? `${BASE_PATH}/socket.io` : "/socket.io",
  cors: { origin: true, credentials: true },
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

module.exports = { app, server, io };
