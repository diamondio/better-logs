//  Diamond Inc (c) 2016

var colors = require('colors');
var extend = require('deep-extend');

var BetterLog  = require('./log');
var controller = require('./controller');

var _console = extend({}, console);

controller.format('log', "{{timestamp}}".grey + " cons".white.dim + " {{message}}".white + " ({{file}}:{{line}})".white.dim + '\n');
controller.format('info', "{{timestamp}}".grey + " info".cyan + " {{message}}".white + " ({{section}})".grey + " ({{file}}:{{line}})".white.dim + '\n');
controller.format('warn', "{{timestamp}}".grey + " warn".yellow + " {{message}}".white + " ({{section}})".grey + " ({{file}}:{{line}})".white.dim + '\n');
controller.format('error', "{{timestamp}} ".grey + "ERR!".inverse.red.bold + " {{message}}".red + "\n  {{fn}} ({{file}}:{{line}})".grey + " ({{section}})".white.dim + "\n{{stack}}".grey + '\n');
controller.format('debug', "{{timestamp}} ".grey + "dbug".inverse.yellow + " {{message}}".yellow + "\n              ({{file}}:{{line}})".grey + " ({{section}})".white.dim + '\n');
controller.format('morgan', ':datefmt'.grey + ' '.white + ':method-pad' + ' :url '.white + ':status-code' + ' :response-time ms'.grey);
controller.mode('silent', { showByDefault: false });


BetterLog.prototype.restoreConsole = function () {
  console = _console;
  Object.keys(_console).forEach(function (key) { console[key] = _console[key] });
}

BetterLog.prototype.overrideConsole = function () {
  var consoleLog = new BetterLog('console');
  consoleLog.stackIndex = 2;
  consoleLog.resume();
  Object.keys(_console).forEach(function (key) {
    if (consoleLog[key]) {
      console[key] = consoleLog[key].bind(consoleLog)
    }
  });
}


// Expose methods
var fns = [
  'display',
  'modes',
  'show',
  'hide',
  'reset',
  'mode',
  'groups',
  'group',
  'formats',
  'format',
  'output',
  'morgan',
];

fns.forEach(function (fnName) {
  BetterLog.prototype[fnName] = controller[fnName];
})

function BetterLogs(section) {
  if (typeof section !== 'string') {
    throw new Error('better-logs needs to be instantiated with a section, like require("better-logs")("section").');
  }
  return new BetterLog(section);
}

module.exports = BetterLogs;

