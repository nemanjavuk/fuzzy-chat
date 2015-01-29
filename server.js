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

var MONGO_PATH = "mongodb://localhost:27017/mydb";
var CHAT_COLLECTION = "chat";

var sessionMiddleware = session({
  name: 'sid',
  store: sessionStore, // MemoryStore; for example Redis should be used for production
  secret: 's3cr37',
  saveUninitialized: true,
  resave: false,
});


//a way to use the same session in both express and socket.io
io.use(function(socket, next) {
  sessionMiddleware(socket.request, socket.request.res, next);
});

app.use(sessionMiddleware);
// parse application/json
app.use(bodyParser.json())

server.listen(port, function() {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// usernames which are currently connected to the chat
var usernames = {};
var numUsers = 0;

var getUsernameFromSession = function(socketRequest) {
  var sessionId = socketRequest.sessionID;
  try {
    var cookie = JSON.parse(socketRequest.sessionStore.sessions[sessionId]);
  } catch (err) {
    return null;
  }
  return cookie.username;
};

app.post('/login', function(req, res){
  req.session.username = req.body.user;
  res.sendStatus(200);
});

app.get('/logout', function(req, res) {
  req.session.username = null
  res.sendStatus(200);
});

io.on('connection', function(socket) {
  console.log('SESSION');
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function(data) {
    var usernameSession = getUsernameFromSession(socket.request);
    var date = new Date();

    mongo.connect(MONGO_PATH, function(err, db) {
      if(!err) {
        // console.log("We are connected");
        var collection = db.collection(CHAT_COLLECTION);
        collection.insert({ username: usernameSession, message: data }, function (err, o) {
          if (err) {
            console.warn(err.message);
          } else {
            console.log("chat inserted into db: " + data.text + "@" + data.datetime);
          }
        });
      }
    });

    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: usernameSession,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function(username) {
    var usernameSession = getUsernameFromSession(socket.request);
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: usernameSession,
      numUsers: numUsers
    });

    mongo.connect(MONGO_PATH, function (err, db) {
      var collection = db.collection(CHAT_COLLECTION);
      collection.find().sort({ "message.datetime" : -1}).limit(10).toArray(function(err, messages){
        if (err){
          return;
        }
        for (var i = messages.length-1; i >= 0; --i) {
          socket.emit('new message', messages[i]);
        }
      });
      console.log('<<<<<<<<<<<<<>>>>>>>>>>>>>>>');
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function() {
    var usernameSession = getUsernameFromSession(socket.request);
    socket.broadcast.emit('typing', {
      username: usernameSession
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function() {
    var usernameSession = getUsernameFromSession(socket.request);
    socket.broadcast.emit('stop typing', {
      username: usernameSession
    });
  });

  // when the user disconnects..
  socket.on('disconnect', function() {
    console.log(socket.username + ' has disconnected');
    var usernameSession = getUsernameFromSession(socket.request);
    if (usernameSession != null){
      --numUsers;
      //inform everyone that this client has left
      socket.broadcast.emit('user left', {
        username: usernameSession,
        numUsers: numUsers
      });
    }
  });

});
