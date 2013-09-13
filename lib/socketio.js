'use strict';

var socketio   = require('socket.io');
var redis      = require('redis');
var RedisStore = require('socket.io/lib/stores/redis');

/**
 * Singleton used for an easier access to IO sockets
 */
var SocketIO = function () {
  var self = this;
  var io;

  /**
   * Configure socket.io
   * @param  {Object} server  the server to listen
   */
  self.listen = function (server) {
    io = socketio.listen(server, { log: false });

    io.set("store", new RedisStore(
      redis.createClient(),
      redis.createClient(),
      redis.createClient()
    ));

    // Send the socket ID to the client on connection
    // This ID is used to identify the client on AJAX requests
    io.sockets.on('connection', function (socket) {
      socket.emit('connected', socket.id);
    });
  };

  /**
   * Get a socket with a specific ID
   * @param  {String} id
   * @return {Object} socket
   */
  self.getSocket = function (id) {
    return io.sockets.socket(id);
  };
};

module.exports = new SocketIO();