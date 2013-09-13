'use strict';

/**
 * This module handles a parser list and is used to find a parser using a domain.
 */

var fs           = require('fs');
var path         = require('path');
var async        = require('async');
var csvextractor = require('./csvextractor.js');
var redis        = require('redis');
var client       = redis.createClient();

var missFile = path.join(__dirname, '../domains.miss.csv');

var ParserList = function () {
  var self    = this;

  /**
   * Extract missing domains from domains.miss.csv
   * or generate the file if it does not exist
   */
  fs.exists(missFile, function (exists) {
    if (exists) {
      var firstLine = fs.readFileSync(missFile, 'utf-8').split('\n')[0].trim();
      if (firstLine == 'domain') {
        csvextractor.extract(missFile, [], function (records) {
          records.forEach(function (record) {
            self.addMiss(record.domain);
          });
        });
      } else {
        fs.writeFileSync(missFile, 'domain');
      }
    } else {
      fs.writeFileSync(missFile, 'domain');
    }
  });

  var missQueue = async.queue(function (domain, callback) {
    fs.appendFile(missFile, '\n' + domain, callback);
  }, 1);

  /**
   * Add a domain as unknown
   * @param  {String} domain
   */
  self.addMiss = function (domain, callback) {
    client.sadd('unknown-domains', domain, callback);
  };

  /**
   * Link a parser to a domain
   * @param  {String}  domain
   * @param  {String}  file      path to the parser file
   * @param  {Boolean} isNode    is the parser written with node.js ?
   * @param  {String}  platform  platform name
   */
  self.add = function (domain, file, isNode, platform, callback) {
    callback = callback || function () {};
    client.hgetall('domains:' + domain, function (err, parser) {
      if (!parser) {
        client.hmset('domains:' + domain,
          { file: file, isNode: isNode, platform: platform }, callback);
      } else {
        callback(null);
      }
    });
  };

  /**
   * Look for a parser for a given domain
   * @param  {String} domain
   * @return {Object} the corresponding parser or false
   */
  self.get = function (domain, callback) {
    client.hgetall('domains:' + domain, function (err, parser) {
      if (err) { callback(err); return; }
      if (parser) {
        callback(null, parser);
      } else {
        client.sismember('unknown-domains', domain, function (err, ismember) {
          if (err) { callback(err); return; }
          if (ismember) {
            callback(null, false);
          } else {

            self.addMiss(domain, function (err, wasAdded) {
              if (wasAdded) { missQueue.push(domain); }
              callback(null, false);
            });
          }
        });
      }
    });
  };
};

module.exports = new ParserList();