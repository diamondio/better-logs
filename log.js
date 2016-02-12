var _ = require('lodash');
var util = require('util');
var colors = require('colors');
var tracer = require('tracer');
var morgan = require('morgan');
var extend = require('extend');
var dateformat = require('dateformat');

var core = require('../..');
var config = core.config();

var realConsoleLog = console.log;

morgan.token('methodpad', function (req, res) {
  var output = '';
  if (req.method === 'POST') {
    output = req.method.toLowerCase();
  } else if (req.method === 'OPTIONS') {
    output = ' opt';
  } else if (req.method === 'PATCH') {
    output = ' pat';
  } else {
    output = ' ' + req.method.toLowerCase();
  }
  return statusCodeToColour(output, res);
});

morgan.token('datefmt', function () {
  return dateformat(new Date(), "HH:MM:ss");
});

morgan.token('statusCode', function (req, res) {
  return statusCodeToColour(res.statusCode.toString(), res);
});

function statusCodeToColour(output, res) {
  if (res.statusCode >= 500) {
    return output.red;
  } else if (res.statusCode >= 400) {
    return output.yellow;
  } else if (res.statusCode >= 300) {
    return output.cyan;
  }
  return output.green;
}

// Make sure mode is valid
if (!config.log.modes[config.log.mode]) {
  config.log.mode = 'normal';
}

// Expand groups
var dedupe = function (arr) {
  var obj = {};
  arr.forEach(function (k) { obj[k] = true });
  return Object.keys(obj);
}
var expandGroups = function (arr) {
  var result = [];
  arr.forEach(function (module) {
    if (config.log.groups[module]) {
      result = result.concat(config.log.groups[module]);
    } else if (config.log.modes[module]) {
      result = result.concat(config.log.modes[module]);
    } else {
      result.push(module);
    }
  })
  return dedupe(result);
}
var hiddenModules = expandGroups(config.log.hide);
var allowedModules = expandGroups(config.log.allow);
for (var group in config.log.groups) {
  config.log.groups[group] = expandGroups(config.log.groups[group]);
}
for (var mode in config.log.modes) {
  config.log.modes[mode] = expandGroups(config.log.modes[mode]);
}
if (config.log.modes[config.log.mode]) {
  allowedModules = allowedModules.concat(expandGroups(config.log.modes[config.log.mode]))
}
if (config.log.mode === 'test') {
  config.log.showByDefault = false;
}

var noop = function(){};
var noLog = {
  info: noop,
  warn: noop,
  error: noop,
  debug: noop,
  morgan: function(req, res, next) { next() },
}

function makeLog(section) {

  if (!config.log.showByDefault && allowedModules.indexOf(section) === -1) return noLog;
  if (config.log.showByDefault && hiddenModules.indexOf(section) > -1) return noLog;

  function makeLogBind(type) {
    return function () {
      if (config.log.output === 'tracer') {
        var logger = tracer.colorConsole({
          stackIndex: 1,
          format: [
            "{{timestamp}}".grey + " " + "{{title}}".cyan + " [{{ section }}] {{message}}".white,
            {
              info: "{{timestamp}}".grey + " info".cyan + " {{message}}".white + " [{{section}}] ({{file}}:{{line}})".grey,
              warn: "{{timestamp}}".grey + " warn".yellow + " [{{ section }}] {{message}}".white + " [{{section}}] ({{file}}:{{line}})".grey,
              error: "{{timestamp}}".grey + " err!".red.bold + " [{{ section }}] {{message}}\n  {{method}} [{{section}}] ({{file}}:{{line}})\n{{stack}}".red,
              debug: "------------------------   debug   ------------------------\n({{section}}) {{file}}:{{line}}: {{message}}\n".yellow
            }
          ],
          transport: function (data) {
            realConsoleLog(data.output);
          },
          preprocess: function (data) {
            data.section = section;
            data.timestamp = data.timestamp.grey;
          },
          dateformat : "HH:MM:ss",
        })
        logger[type].apply(logger[type], arguments);
      } else if (config.log.output === 'console') {
        console.log(' [%s]', type, util.format.apply(this, arguments));
      }
    }
  }

  return {
    info: (allowedModules.indexOf('info') > -1) ? makeLogBind('info') : noop,
    warn: (allowedModules.indexOf('warn') > -1) ? makeLogBind('warn') : noop,
    error: (allowedModules.indexOf('error') > -1) ? makeLogBind('error') : noop,
    debug: (allowedModules.indexOf('debug') > -1) ? makeLogBind('debug') : noop,
    morgan: function (req, res, next) {
      if (req.path.indexOf('/files') === 0) return next();
      morgan(':datefmt'.grey + ' '.white + ':methodpad' + ' :url '.white + ':statusCode' + ' :response-time ms'.grey, {
        skip: function (req, res) {
          return _.startsWith(req.originalUrl, '/items/modified-after') && req.method === 'GET';
        }
      })(req, res, next);
    }
  }
}

if (config.log.overrideConsole) {
  var consoleLog = makeLog('console');
  console.log = consoleLog.info;
  console.info = consoleLog.info;
  console.warn = consoleLog.warn;
  console.error = consoleLog.error;
  console.debug = consoleLog.debug;
}

module.exports = makeLog;

