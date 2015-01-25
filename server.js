// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var mongo = require('mongodb').MongoClient;

server.listen(port, function() {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

// usernames which are currently connected to the chat
var usernames = {};
var numUsers = 0;

io.on('connection', function(socket) {
  console.log('connection ' + socket.username + ' is connected');
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function(data) {
    var date = new Date();
    console.log('from ' + socket.username + ': ' + data.text + ' at ' + data.datetime);
    console.log('server time is ' + date.getTime() + ' and offset ' + date.getTimezoneOffset() + ' and client time is ' + data.datetime + ' with offset ' + data.offset);
    console.log('number of users is ' + Object.keys(usernames).length);

    mongo.connect("mongodb://localhost:27017/mydb", function(err, db) {
      if(!err) {
        console.log("We are connected");
        var collection = db.collection('chat');
        collection.insert({ username: socket.username, message: data }, function (err, o) {
          if (err) {
            console.warn(err.message);
          } else {
            console.log("chat message inserted into db: " + data.text);
          }
        });
      }
    });

    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function(username) {
    console.log(username + ' is connected with add user');
    // we store the username in the socket session for this client
    socket.username = username;
    // add the client's username to the global list
    usernames[username] = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });

    mongo.connect("mongodb://localhost:27017/mydb", function (err, db) {
      var collection = db.collection('chat')
      var stream = collection.find().sort({ "message.datetime" : -1 }).limit(10).stream();
      stream.on('data', function (elem) {
        console.log(elem);
        console.log('broadcasting new message ' + elem.username + ' ' + elem.message.text + ' ' + elem.message.datetime + ' ' + elem.message.offset);
        socket.emit('new message', elem);
      });
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function() {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function() {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function() {
    // remove the username from global usernames list
    console.log(socket.username + ' has disconnected');
    if (addedUser) {
      delete usernames[socket.username];
      --numUsers;
      console.log('number of users after delete is ' + Object.keys(usernames).length);

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });

});
