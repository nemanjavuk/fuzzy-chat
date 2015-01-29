#Wundertest
##Technologies
I opted for the Node.js as the technology for implementing this solution for a couple of reasons. First, Node.js is a platform I have the most experience in out of all platforms mentioned in the job post for this position. The other big reason for opting for Node.js is the [Socket.io](http://www.socket.io) library for realtime applications which, at first sight, perfectly fitted the use case presented in the task. Socket.io is the library that directly communicates with network sockets and with it a bi-directional communication between clients and a server is made much more easier. Socket.io fallbacks to WebSockets with polling as a fallback option. It also has libraries for both Android and iOS so the same server could communicate with both Web browser clients as well as with Android and iOS with the same API. A part from Node.js and Socket.io, express was used and MongoDB as a db for storing chat messages.

##Scaling
The code I submitted is, of course, pretty basic because it doesn't take into account scalling the app to multiple Node servers. It even has only a MemoryStore for it's session handling (it should be replaced with Redis for example. We don't want to lose our sessions if the server restarts do we? :)). To scale this application I would layer an architecture in 3 layers:

1. Load-balancer on top of all (Nginx or HAProxy)
2. Node application (multiple ones) under the load balancer (submitted code)
3. A messaging system (Redis, ZeroMQ) to relay messages and basically connect everything.
4. Storage system like MongoDB with sharding in place.

The messaging system (written in Node) would be in place to relay messages obtained at one Node app and passing them to all the other Node apps. If Redis was put in the production we could easily use Pub/Sub to broadcast messages from one server to all the others (and as a bonus, we could use Redis as a session store too).

##Offline messages
As a nice bonus of using socket.io all the messages that are entered from an offline client are internally (handled by socket.io client) queued for resending when a client gets back online.

##Limitations
CLIENT DOESN'T RECEIVE OFFLINE MESSAGES HE LEFT OUT
User sessions are stored in memory so when a server restarts, every user needs to reconnect again. The session store is also a place where memory issues may occur (a standalone store for handling sessions must be set in production!). 
The submitted code is not perfect and I fell victim to "I wanted to impress you with a gazillion features". I wanted to 
##Improvements and Optimizations
##Offline capabilities
##Tradeoffs
Offline capability relies completely on socket.io (transport protocol). I made this tradeoff in order to have full realtime  possible which socket.io (and WebSockets in general) provides. In that way I'm not in full control of when the queued messages are going to go to the server and other clients.
##Merging of offline messages
Every messages has a timestamp (datetime property) which 
##Personal message
##Requirements
Run `npm install` (node and npm need to be installed and Mongo up and running). After installing all dependencies run `node server.js` and then go to `localhost:3000` to login.

