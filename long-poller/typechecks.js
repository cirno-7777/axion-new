const connection = require("./connection");
const express = require("express");
const { v4: uuid } = require("uuid");
const events = require("events");
const helmet = require("helmet");

class rlp {
  constructor(settings) {
    const pollServer = settings.customExp || express()
    this.connections = {}

    this.port = settings.port || 2004
    this.password = settings.password || ""
    this.stream = new events.EventEmitter()
    pollServer.use(express.json())
    pollServer.use(helmet())

    pollServer.post("/connection", async (req, res) => {
      if (this.password !== "") {
        if (req.body.password && req.body.password == this.password) {
          const id = uuid()
          this.connections[id] = new connection(id, () => {
            delete this.connections[id]
          })
          this.stream.emit("connection", this.connections[id])
          res.json({
            success: true,
            socketId: id
          })
        } else {
          res.status(401).json({
            success: false,
            reason: "Unauthorized"
          })
        }
      } else {
        const id = uuid()
        this.connections[id] = new connection(id, () => {
          delete this.connections[id]
        })
        this.stream.emit("connection", this.connections[id])
        res.json({
          success: true,
          socketId: id
        })
      }
    })

    pollServer.get("/poll/:id", async (req, res) => {
      const id = req.params.id
      if (this.connections[id] !== undefined) {
        this.connections[id]._get(req, res)
      } else {
        res.status(400).json({
          success: false,
          reason: "Not a valid connection"
        })
      }
    })
    pollServer.post("/poll/:id", async (req, res) => {
      const id = req.params.id
      if (this.connections[id] !== undefined) {
        this.connections[id]._post(req, res)
      } else {
        res.status(400).json({
          success: false,
          reason: "Not a valid connection"
        })
      }
    })

    pollServer.delete("/connection/:id", async (req, res) => {
      const id = req.params.id
      if (this.connections[id] !== undefined) {
        this.connections[id]._disconnect()
      } else {
        res.status(400).json({
          success: false,
          reason: "Not a valid connection"
        })
      }
    })

    if (!settings.customExp) pollServer.listen(this.port)
  }

  on(event, handler) {
    return this.stream.on(event, handler)
  }

  broadcast(name, message) {
    for (const id of Object.keys(this.connections)) {
      this.connections[id].send(name, message)
    }
  }
}
module.exports = rlp