'use strict';

var InitError = require('../initerror.js');
var ezJobs    = require('../jobs.js');
var Writer    = require('../outputformats/writer.js');
var iconv     = require('iconv-lite');
var path      = require('path');
var fs        = require('fs');
var redis     = require('redis');
var client    = redis.createClient();

/**
 * Creates a writer depending on the required data format (json, csv..)
 * @param  {Object}   req      the request stream
 * @param  {Object}   res      the response stream
 * @param  {Function} callback returns the writer
 */
module.exports = function (req, res, callback) {
  var job = ezJobs[req._jobID];
  job.logger.verbose('Initializing EC writer');

  function getWriterOutputStream(resType, ext) {
    if (job.resIsDeferred) {
      job.logger.info("Deferred response requested: ECs will be writen in a temp file");

      // create a file writer stream to store ECs into
      job.ecsPath     = job.jobPath + '/job-ecs.' + ext;
      var jobRedisKey = 'job:' + req._jobID;
      client.hmset(jobRedisKey, {
        ecsPath: job.ecsPath,
        contentType: resType
      });

      var jobPath = job.jobPath;
      var reg     = /^job-ecs\.([a-z]+)$/;
      var files   = fs.readdirSync(jobPath);

      files.forEach(function (file) {
        if (reg.test(file)) {
          fs.unlink(path.join(jobPath, file));
        }
      });
      
      var stream   = fs.createWriteStream(job.ecsPath);
      var _write   = stream.write;
      stream.write = function (data) {
        return _write.call(this, iconv.encode(data, job.outputCharset || 'utf-8'));
      };
      stream.on('end', function () {
        job.logger.info("Temp file for deferred download completly writen");
      });

      job.resultFileStream = stream;
      stream.write('');
      return stream;
    } else {
      return res;
    }
  }

  // configure the correct Writer depending on the "Accept" HTTP header
  // example : "Accept: text/csv"
  var accept = req.header('Accept') || 'text/csv';
  switch (accept) {
  case '*/*':
  case 'text/csv':
    job.logger.info("CSV requested for response");
    job.headers['Content-Type'] = 'text/csv';
    job.writer = new Writer(getWriterOutputStream('text/csv', 'csv'), 'csv');
    callback(null);
    break;
  case 'application/json':
    job.logger.info("JSON requested for response");
    job.headers['Content-Type'] = 'application/json';
    job.writer = new Writer(getWriterOutputStream('application/json', 'json'), 'json');
    callback(null);
    break;
  default:
    job.logger.warn("Requested content-type '"
                + req.header('accept')
                + "' not acceptable for response");
    callback(new InitError(406, 4006));
  }
};