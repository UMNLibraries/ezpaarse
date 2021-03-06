'use strict';


exports.EcMaker = function () {
  var fs      = require('graceful-fs');
  var path    = require('path');
  var ecmaker = require('../../lib/ecmake.js');
  var outpath;

  var optimist = require('optimist')
    .usage('Inject a file to ezPAARSE (for batch purpose)' +
      '\n  Usage: $0 [-fhiovH] LOG_FILE RESULT_FILE')
    .boolean(['v', 'f'])
    .string('header')
    .alias('verbose', 'v')
    .alias('force', 'f')
    .alias('header', 'H')
    .describe('force', 'override existing result (default false).')
    .describe('header', 'header parameter to use.')
    .describe('verbose', 'Shows detailed operations.');
  var argv = optimist.argv;

  // show usage if --help option is used
  if (argv.help || argv.h || argv._.length < 2) {
    optimist.showHelp();
    process.exit(0);
  }

  var logFile    = path.resolve(argv._[0]);
  var resultFile = path.resolve(argv._[1]);
  var headers    = { 'Reject-Files': 'none'};

  if (argv.header) {
    if (!Array.isArray(argv.header)) { argv.header = [argv.header]; }

    argv.header.forEach(function (item) {
      var i = item.indexOf(':');
      if (i !== -1) {
        headers[item.substr(0, i)] = item.substr(i + 1).trim();
      } else {
        console.error("Error : bad header syntax => %s", item);
        process.exit(1);
      }
    });
  }

  if (outpath) {
    if (! fs.existsSync(outpath)) {
      console.error("Error : " + outpath + " doesn't exist");
      process.exit(1);
    }
    if (argv.verbose) { console.log("Output to " + outpath + " directory"); }
  }

  ecmaker()
  .file(logFile)
  .result(resultFile)
  .options({ headers: headers })
  .process(function (err) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
  });
};

