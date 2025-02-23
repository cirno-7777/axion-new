const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const roblox_server = require('./long-poller/typechecks')

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users
const users = new Map();

console.log(roblox_server)
const poller = new roblox_server({
    port: 8000,
})
poller.on('connection', (connection) => {
    console.log('New connection', connection.id);// Will fire when a new connection is active, and include this IP address.
    poller.broadcast("new connection", connection.id); // Will broadcast to all active sockets that this one has joined the part.

    connection.send('welcome', 'hello there!') // Will send a welcome message to the new socket.
    connection.on('display', (data) => {//On a event we will handle the hello message
        io.emit('command-response', data)
    })

    connection.on('internal_ping', () => {
        // nothing!
    })

    connection.on('disconnect', () => { // Fired when the game sends a disconnect command, or our timeout is fired.
        console.log('Disconnection', connection.id)
        poller.broadcast("disconnection", connection.id);
    })
})

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Add user to the list
    const username = `User${users.size + 1}`
    users.set(socket.id, { id: socket.id, name: username });

    // Broadcast updated user list
    io.emit('command-response', `${username} has joined!`);;

    // Handle chat messagesy
    socket.on('chat-message', (message) => {
        if (!(message === "")) {
            io.emit('chat-message', { user: username, message });
            poller.broadcast('chat-message', JSON.stringify({name: username, message: message}))
        }
    });

    // Handle commands
    socket.on('command', (command) => {
        console.log(`Command received from ${username}: ${command}`);

        // Process commands (e.g., freeze, kill)
        switch (command) {
            case 'freeze':
                io.emit('command-response', `Response to ${username}: Executed '${command}' successfully!`);
                break;
            case 'kill':
                io.emit('command-response', `Response to ${username}: Executed '${command}' successfully!`);
                break;
            default:
                io.emit('command-response', `Response to ${username}: Unknown command`);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const user = users.get(socket.id).name;
        users.delete(socket.id);
        io.emit('command-response', `${user} has left!`);
        console.log('A user disconnected:', socket.id);
    });
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});