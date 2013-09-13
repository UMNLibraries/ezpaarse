/*jslint node: true, maxlen: 100, maxerr: 50, indent: 2 */
'use strict';

var fs     = require('fs');
var assert = require('assert');

var GrowingFileReader = function (options) {
  var self          = this;
  self.stillGrowing = true;

  options             = options || {};
  options.pollingRate = options.pollingRate || 100;
  options.endCallback = options.endCallback || function () {};
  options.onData      = options.onData || function () {};
  assert(options.sourceFilePath);

  self.read = function () {
    fs.open(options.sourceFilePath, 'r', function (err, fd) {
      var readOffsetStart = 0;
      var readOffsetEnd   = 0;
      var buffer;
      
      function readData() {
        readOffsetEnd = fs.fstatSync(fd).size;
        if (readOffsetEnd == readOffsetStart) {
          if (!self.stillGrowing) {
            fs.closeSync(fd);
            options.endCallback();
          } else {
            // if reading the file is faster than writing it
            setTimeout(readData, options.pollingRate);
          }
          return;
        }
        buffer = new Buffer(readOffsetEnd - readOffsetStart);
        fs.read(fd, buffer, 0, buffer.length, readOffsetStart, function (err, bytesRead, buffer) {
          options.onData(buffer);
          readOffsetStart += bytesRead;
          setTimeout(readData, options.pollingRate);
        });
      }
      readData();
    });
  };
};

module.exports = GrowingFileReader;