/*jslint node: true, maxlen: 100, maxerr: 50, indent: 2 */
'use strict';

var EventEmitter = require('events').EventEmitter;
var util         = require('util');

/**
 * Provides methods to write ECs into a stream in JSON format.
 * @param {Object} outputStream the stream to write into
 */
var Writer = function (outputStream) {
  var self      = this;
  var delimiter = '';
  self.output   = outputStream;

  outputStream.on('drain', function () {
    self.emit('drain');
  });

  outputStream.on('end', function () {
    self.emit('end');
  });

  /**
   * Called before writing the first EC
   */
  self.start = function () {
    outputStream.write('[');
  };

  /**
   * Called at at the end of writing
   */
  self.end = function () {
    outputStream.write(']');
  };

  /**
   * Write an EC
   * @param {Object} ec the EC to write
   */
  self.write = function (ec) {
    ec._clean();
    if (!outputStream.write(delimiter + JSON.stringify(ec, null, 2))) {
      self.emit('saturated');
    }
    if (delimiter === '') { delimiter = ','; }
  };
};

util.inherits(Writer, EventEmitter);
module.exports = Writer;