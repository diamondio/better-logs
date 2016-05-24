//
//  Diamond Inc (c) 2016
//
var colors = require('colors');
var extend = require('deep-extend');

var BetterLog  = require('./log');
var Controller = require('./controller');
var morgan     = require('./morgan');
var controller;

var init = function (opts) {
  if (!controller) {
    controller = new Controller();
    extend(BetterLog.prototype, Controller.prototype, controller);
    controller.config({
      outputs: {
        _default: process.stdout
      },
      groups: {
        
      },
      formats: {
        log: "{{timestamp}}".grey + " info".cyan + " [{{section}}] {{message}}".white + " ({{file}}:{{line}})".grey,
        info: "{{timestamp}}".grey + " info".cyan + " [{{section}}] {{message}}".white + " ({{file}}:{{line}})".grey,
        warn: "{{timestamp}}".grey + " warn".yellow + " [{{section}}] {{message}}".white + " [{{section}}] ({{file}}:{{line}})".grey,
        error: "{{timestamp}}".grey + " err!".red.bold + " [{{ section }}] {{message}}\n  {{method}} [{{section}}] ({{file}}:{{line}})\n{{stack}}".red,
        debug: "------------------------   debug   ------------------------\n({{section}}) {{file}}:{{line}}: {{message}}\n".yellow
      },
      modes: {
        normal:   ['info', 'warn', 'error'],
        verbose:  ['trace', 'normal', 'debug', 'console'],
        test:     ['test'],
        critical: ['error'],
        silent:   [],
      },
      output: 'console',
      mode: 'normal',
      showByDefault: true,
      show: [],
      hide: [],
    });
  }
  if (typeof opts === 'object') {
    controller.config(opts);
  }

  return controller;
}

var create = function (section) {
  if (!controller) {
    init();
  }
  return controller.create(section);
}

function BetterLogs(opts) {

  if (typeof opts === 'string') {
    // opts is the section
    return create(opts);
  }

  return init(opts);
}

BetterLogs.morgan = morgan;

module.exports = BetterLogs;

