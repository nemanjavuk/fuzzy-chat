// Setup basic express server
var express = require('express'),
    app = express(),
    session = require('express-session'),
    cookieParser = require('cookie-parser'),
    sessionStore = new session.MemoryStore(),
    bodyParser = require('body-parser');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var mongo = require('mongodb').MongoClient;

var sessionMiddleware = session({
  name: 'sid',
  store: sessionStore, // MemoryStore
  secret: 's3cr37',
  saveUninitialized: true,
  resave: true,
});


io.use(function(socket, next) {
  console.log('going through socketio middleware');
  // console.log(socket.request);
  // console.log(socket.request.res);
  sessionMiddleware(socket.request, socket.request.res, next);
});

app.use(sessionMiddleware);
// app.use(cookieParser);
// parse application/json
app.use(bodyParser.json())

server.listen(port, function() {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

// usernames which are currently connected to the chat
var usernames = {};
var numUsers = 0;

app.post('/login', function(req, res){
  req.session.username = req.body.user;
  console.log("REQ.SESSION.USERNAME");
  console.log(req.session);
  res.sendStatus(200);
});

io.on('connection', function(socket) {
  console.log('SESSION');
  console.log(socket.request.session);
  console.log(socket.request.session.username);
  console.log('connection ' + socket.username + ' is in onconnection');
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function(data) {
    console.log('on new msg ' + socket.request.session.username);
    var date = new Date();
    console.log('from ' + socket.request.session.username + ': ' + data.text + ' at ' + data.datetime);
    console.log('server time is ' + date.getTime() + ' and offset ' + date.getTimezoneOffset() + ' and client time is ' + data.datetime + ' with offset ' + data.offset);
    console.log('number of users is ' + Object.keys(usernames).length);

    mongo.connect("mongodb://localhost:27017/mydb", function(err, db) {
      if(!err) {
        // console.log("We are connected");
        var collection = db.collection('chat');
        collection.insert({ username: socket.request.session.username, message: data }, function (err, o) {
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
      username: socket.request.session.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function(username) {
    console.log(username + ' is connected with add user');
    console.log(socket.request.session);
    // we store the username in the socket session for this client
    // socket.username = username;
    // socket.request.session.username = username;
    console.log('ADD USER val from session ' + socket.request.session.username);
    // add the client's username to the global list
    usernames[username] = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.request.session.username,
      numUsers: numUsers
    });

    mongo.connect("mongodb://localhost:27017/mydb", function (err, db) {
      var collection = db.collection('chat')
      var stream = collection.find().sort({ "message.datetime" : -1 }).limit(10).stream();
      stream.on('data', function (elem) {
        // console.log(elem);
        // console.log('broadcasting new message ' + elem.username + ' ' + elem.message.text + ' ' + elem.message.datetime + ' ' + elem.message.offset);
        socket.emit('new message', elem);
      });
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function() {
    socket.broadcast.emit('typing', {
      username: socket.request.session.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function() {
    socket.broadcast.emit('stop typing', {
      username: socket.request.session.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function() {
    // remove the username from global usernames list
    console.log(socket.username + ' has disconnected');
    // if (addedUser) {
    //   delete usernames[socket.username];
    //   --numUsers;
    //   console.log('number of users after delete is ' + Object.keys(usernames).length);
    //
    //   // echo globally that this client has left
    //   socket.broadcast.emit('user left', {
    //     username: socket.username,
    //     numUsers: numUsers
    //   });
    // }
  });

});
