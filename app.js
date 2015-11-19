var express = require('express'),
    app = express(), //cant create express.createServer...the app variable bundles everything needed
    server = require('http').createServer(app), //need an http server object so we manually create it
    io = require('socket.io').listen(server), //create socket functionality and liste to an http server
    mongoose = require('mongoose'),
    nickNames = [],
    users = {};

server.listen(3000); // tell the server what port to listen on

// MONGO FUNCTIONALITY
mongoose.connect('mongodb://localhost/chat', function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log("connected to mongo!");
    };
});

var chatSchema = mongoose.Schema({
    nick: String,
    msg: String,
    created: {type: Date, default: Date.now}
});

// 1st param is the collection name or table name, 2nd is schema
var chatModel = mongoose.model('Message', chatSchema);

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');

});

// SOCKET FUNCTIONALITY
io.sockets.on('connection', function (socket) { // what happens when user connects
    var query = chatModel.find({});
    query.sort('-created').limit(3).exec(function (err, docs) {
        if (err) throw err;
        console.log("sending old messages...");
        socket.emit('load old msgs', docs);
    });

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
            var newMsg = new chatModel({ msg: msg, nick: socket.nickname }); // save to mongodb
            newMsg.save(function (err) {
                if (err) throw err;
                io.sockets.emit('new message', { msg: data, nick: socket.nickname }); // broadcast to all clients/users including yourself
            });
            
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