#Test
##Technologies
I opted for the Node.js as the technology for implementing this solution for a couple of reasons. First, Node.js is a platform I have the most experience in out of all platforms mentioned in the job post for this position. The other big reason for opting for Node.js is the [Socket.io](http://www.socket.io) library for realtime applications which, at first sight, perfectly fitted the use case presented in the task. Socket.io is the library that directly communicates with network sockets and with it a bi-directional communication between clients and a server is made much more easier. Socket.io fallbacks to WebSockets with polling as a fallback option. It also has libraries for both Android and iOS so the same server could communicate with both Web browser clients as well as with Android and iOS with the same API. Wunderlist would benefit from this because it has clients in both of these technologies. A part from Node.js and Socket.io, express was used and MongoDB as a db for storing chat messages.

##Socket.io custom events
* `new message` : when a client sends a message the server gets it and broadcasts it to all other clients
* `add user` : when a client logs in to inform all other clients
* `back online` : when a client gets back online
* `typing` : when a client starts to type
* `stop typing` : when a client stops typing
* `disconnect` : when a client disconnects
Other events are default socket.io events.


##Scaling
The code I submitted is, of course, pretty basic because it doesn't take into account scalling the app to multiple Node servers. It even has only a MemoryStore for it's session handling (it should be replaced with Redis for example. We don't want to lose our sessions if the server restarts do we? :)). To scale this application I would layer an architecture in 3 layers:

1. Load-balancer on top of all (Nginx or HAProxy)
2. Node application (multiple ones) under the load balancer (base for this is submitted code)
3. A messaging system (Redis, ZeroMQ) to relay messages and basically connect everything.
4. Storage system like MongoDB with sharding in place.

The messaging system (written in Node) would be in place to relay messages obtained at one Node app and passing them to all the other Node apps. If Redis was put in the production we could easily use Pub/Sub to broadcast messages from one server to all the others (and as a bonus, we could use Redis as a session store too).

##Tradeoffs
Offline capability relies completely on socket.io (transport protocol). I made this tradeoff in order to have full realtime  possible which socket.io (and WebSockets in general) provides. In that way I'm not in full control of when the queued messages are going to go to the server and other clients.
##Merging of offline messages
As a nice bonus of using socket.io all the messages that are entered from an offline client are internally (handled by socket.io client) queued for resending when a client gets back online. When a client gets back online the messages from the queue will be sent out with original timestamps, the server will then get them and push them to all other clients. After receiving the new message clients will, based on datetime param, decide how to sort all the messages.
Client always keeps track of what was the last message datetime he received from someone so he can submit a request to server when he gets online (`socket.on('reconnect')`).

Every messages has a timestamp (datetime property) which is value in Epoch time calculated like this: 

	datetime.getTime() + (datetime.getTimezoneOffset() * 60000)
	
In that way every client gets a normalized time for each messages based on which it can sort existing messages. Current Web client (`public/main.js`) uses jQuery to sort a ul based on these timestamps.

##Improvements and Optimizations
The submitted code is not perfect and I fell victim to "I wanted to impress you with a gazillion features". I wanted to implement both the Web client and [Android](https://github.com/nemanjavuk/fuzzy-chat-android) versions of the client but in the end ended up submitting issue request on GitHub and going through the source code of the Android library to do a pull request. I also spent a lot of time figuring out how to share the express session with the socket one. Having all that in mind I feel like this code I'm submitting looks underwhelming.

User sessions are stored in memory so when a server restarts, every user needs to reconnect again - a standalone store for handling sessions must be set in production.

As you may see in the code I defined a lot more events than just pure `new message` (`user joined`, `user is typing`, `user left` etc.). These events would improve the overall UX of the chat app. But because of lack of time I commented them all in order to fully support merging of offline messages in the stream. 

And of course, the scaling of the application, that is, writting the proxy configuration and relaying of messages of Node instances.

##Requirements
Run `npm install` (node and npm need to be installed and Mongo up and running). After installing all dependencies run `node server.js` and then go to `localhost:3000` (or whatever your local IP address is) to login and start chatting.

