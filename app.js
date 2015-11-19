var express = require('express'),
    app = express(), //cant create express.createServer...the app variable bundles everything needed
    server = require('http').createServer(app), //need an http server object so we manually create it
    io = require('socket.io').listen(server), //create socket functionality and liste to an http server
    nickNames = [],
    users = {};

server.listen(3000); // tell the server what port to listen on

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');

});

// SOCKET FUNCTIONALITY
io.sockets.on('connection', function (socket) { // what happens when user connects

    socket.on('send-message', function (data, callback) { // map to function you defined in client
        var msg = data.trim();
        
        if (msg.substr(0, 3) === '/w ') {
           
            msg = msg.substr(3);
            var index = msg.indexOf(' ');
            if (index != -1) {
                var name = msg.substr(0, index);
                var msg = msg.substr(index + 1);

                if (name in users) {
                    users[name].emit('whisper', { msg: msg, nick: socket.nickname });
                    console.log("whisper");
                } else {
                    callback("Error! Enter a valid user.");
                };
                
            } else {
                callback("Error! Please enter a message for a whisper;")
            };
            
        } else {
            io.sockets.emit('new message', { msg: data, nick: socket.nickname }); // broadcast to all clients/users including yourself
        };

        
        
    });

    socket.on('new-user', function (data, callback) {
        console.log('new-user: ' + data);

        /* VERSION 1
        if (nickNames.indexOf(data) != -1) {
            callback(false);
        }
        else {
            callback(true);
            socket.nickname = data;
            nickNames.push(data);
            io.sockets.emit('usernames', nickNames);
        };
        */

        if (data in users) {
            callback(false);
        } else {
            callback(true);
            socket.nickname = data;
            users[socket.nickname] = socket            
            io.sockets.emit('usernames', Object.keys(users));
        };
    });

    socket.on('disconnect', function (data) {
        if (!socket.nickname) return;

        //nickNames.splice(nickNames.indexOf(socket.nickname), 1);
        delete users[socket.nickname];

        io.sockets.emit('usernames', Object.keys(users));
    });
});