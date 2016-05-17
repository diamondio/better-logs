var util     = require('util');
var path     = require('path');
var isStream = require('is-stream');
var datefmt  = require('dateformat');
var extend   = require('deep-extend');

var Readable  = require('stream').Readable;
var BetterLog = require('./log');
var morgan    = require('./morgan');

var _console = global.console;

function Controller (opts) {
  opts = opts || {};

  Readable.call(this, opts);

  this.mode = 'normal';
  this.started = false;
  this._unwritten = [];

  this.groups = {};
  this.types = {};
  this.modes = {};

  this.outputs = {}; // [section|_default][type|_default]
  this.visible = {}; // [section|_default][type|_default]

  if (typeof opts === 'object') {
    this.setOptions(opts);
  }
}

util.inherits(Controller, Readable)

Controller.prototype._dedupe = function (arr) {
  var obj = {};
  arr.forEach(function (k) { obj[k] = true });
  return Object.keys(obj);
}

Controller.prototype._resolveArray = function (sectionsOrGroups) {
  if (!Array.isArray(sectionsOrGroups)) return [];
  var self = this;
  return [].concat.apply([], sectionsOrGroups.map(function (sectionOrGroup) { return self._resolve(sectionOrGroup) }));
}

Controller.prototype._resolve = function (sectionOrGroup) {
  if (typeof sectionOrGroup !== 'string') return [];
  if (this.groups[sectionOrGroup]) {
    return this._resolveArray(this.groups[sectionOrGroup]);
  }
  return [sectionOrGroup];
}

Controller.prototype._read = function (n) {
  this.started = true;
  this._flush();
}

Controller.prototype._flush = function () {
  if (this._unwritten.length) {
    this.push(this._unwritten.join(''));
    this._unwritten = [];
  }
}

Controller.prototype._pushMessage = function (section, type, msg) {
  var output = this.getOutputStream(section, type);
  if (output) {
    output.write(String(msg));
  }
  if (this.started) {
    return this.push(msg);
  }
  this._unwritten.push(msg);
}

Controller.prototype._getStack = function (stackIndex) {
  // get call stack, and analyze it
  // get all file,method and line number
  // https://github.com/v8/v8/wiki/Stack%20Trace%20API
  var stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/i;
  var stackReg2 = /at\s+()(.*):(\d*):(\d*)/i;
  var stacklist = (new Error()).stack.split('\n').slice(3);
  var s = stacklist[stackIndex];
  var sp = stackReg.exec(s) || stackReg2.exec(s);
  var stack = {};
  if (sp && sp.length === 5) {
    stack.fn = sp[1];
    stack.path = sp[2];
    stack.line = sp[3];
    stack.pos = sp[4];
    stack.file = path.basename(stack.path);
    stack.stack = stacklist.join('\n');
  }
  return stack;
}

Controller.prototype._makeFormatter = function (format) {
  var self = this;
  var needStack = /{{(fn|path|line|pos|file|stack)}}/i.test(format);
  return function () {
    var log = this;
    var output = format;
    output = output.replace(/{{timestamp}}/gi, datefmt(log.dateformat));
    output = output.replace(/{{type}}/gi, this.type);
    output = output.replace(/{{section}}/gi, this.section);
    if (needStack) {
      var stack = self._getStack(log.stackIndex);
      output = output.replace(/{{fn}}/gi, stack.fn);
      output = output.replace(/{{path}}/gi, stack.path);
      output = output.replace(/{{line}}/gi, stack.line);
      output = output.replace(/{{pos}}/gi, stack.pos);
      output = output.replace(/{{file}}/gi, stack.file);
      output = output.replace(/{{stack}}/gi, stack.stack);
    }
    var args = Array.prototype.slice.call(arguments);
    if (!args.length) return '';
    if (typeof args[0] === 'string') {
      var message = args.shift().replace(/%[sdjt]/g, function(x) {
        if (!args.length) return x;
        if (x === '%s') {
          return String(args.shift());
        }
        if (x === '%d') {
          return Number(args.shift());
        }
        if (x === '%j') {
          try {
            var obj = args.shift();
            if (obj instanceof Error) {
              return JSON.stringify(obj, ['message', 'stack', 'type', 'name']);
            }
            return JSON.stringify(obj);
          } catch(e) {
            return '[Circular]';
          }
        }
        return x;
      })
    }
    args = args.map(function (arg) {
      if (typeof arg === 'object') {
        try {
          return util.inspect(arg, { depth: log.maxTraceDepth });
        } catch(e) {
          return '[Circular]';
        }
      }
      return String(arg)
    });
    args.unshift(message);
    output = output.replace(/{{message}}/gi, args.join(' '));
    return output + "\n";
  }
}

Controller.prototype._makeLog = function (type) {
  if (typeof type !== 'string') return;
  var self = this;
  return function () {
    var log = this;
    var section = log.section;
    if (typeof section !== 'string') return;
    if (typeof self.types[type] !== 'function') return;
    var visibility = self.visible[section]
    
    var hideByDefault = (self.visible['_default'] && self.visible['_default']['_default'] === false)
    var explicitHide = (self.visible[section] && (self.visible[section]._default === false || self.visible[section][type] === false));
    var explicitShow = (self.visible[section] && (self.visible[section]._default === true  || self.visible[section][type] === true));

    if (self.modes[self.mode]) {
      if (self.modes[self.mode].hide && self.modes[self.mode].hide.indexOf(section) > -1) {
        explicitHide = true;
      }
      if (self.modes[self.mode].show && self.modes[self.mode].show.indexOf(section) > -1) {
        explicitShow = true;
      }
      if (self.modes[self.mode].showByDefault === false) {
        hideByDefault = true;
      }
      if (self.modes[self.mode].showByDefault === true) {
        hideByDefault = false;
      }
    }

    if (explicitHide) return;
    if (hideByDefault && !explicitShow) return;

    var message = self.types[type].apply(extend({ type: type }, log), arguments);
    this.push(message);
    self._pushMessage(section, type, message);
  }
}

Controller.prototype.create = function (section) {
  if (typeof section !== 'string') return null;
  return new BetterLog({ section: section });
}

Controller.prototype.setOptions = function (opts) {
  if (typeof opts !== 'object') return;
  var self = this;
  if (opts.groups) {
    Object.keys(opts.groups).forEach(function (name) { return self.addGroup(name, opts.groups[name]) })
  }
  if (opts.outputs) {
    Object.keys(opts.outputs).forEach(function (name) { return self.setOutput(name, opts.outputs[name]) })
  }
  if (opts.types) {
    Object.keys(opts.types).forEach(function (name) { return self.addLogType(name, opts.types[name]) })
  }
  if (opts.modes) {
    Object.keys(opts.modes).forEach(function (name) { return self.addMode(name, opts.modes[name]) })
  }
  if (typeof opts.mode === 'string') {
    if (self.modes[opts.mode]) {
      self.mode = opts.mode;
    }
  }
  if (opts.overrideConsole !== undefined) {
    self.overrideConsole = opts.overrideConsole;
    if (self.overrideConsole) {
      var consoleLog = self.create('console');
      consoleLog.stackIndex = 2;
      consoleLog.resume();
      Object.keys(_console).forEach(function (key) { console[key] = function () { return consoleLog[key].apply(consoleLog, arguments) } });
    } else {
      Object.keys(_console).forEach(function (key) { console[key] = _console[key] });
    }
  }
  if (opts.showByDefault !== undefined) {
    self.visible['_default'] = self.visible['_default'] || {};
    self.visible['_default']['_default'] = opts.showByDefault;
  }
  if (Array.isArray(opts.hide)) {
    opts.hide.forEach(function (elem) { self.setVisibility(elem, 'hide') })
  }
  if (Array.isArray(opts.show)) {
    opts.show.forEach(function (elem) { self.setVisibility(elem, 'show') })
  }
}

Controller.prototype.setMode = function (newMode) {
  this.mode = newMode;
}

Controller.prototype.setVisibility = function (input, setting) {
  var self = this;
  var parts = input.split('/', 2);
  var sectionOrGroup = parts[0];
  var type = parts.length === 2 ? parts[1] : '_default';
  self._resolve(sectionOrGroup).forEach(function (section) {
    self.visible[section] = self.visible[section] || {};
    if (setting === 'show' || setting == 'hide') {
      self.visible[section][type] = setting === 'show' ? true : false;
    } else {
      delete self.visible[section][type];
    }
  })
}

Controller.prototype.getModes = function () {
  return Object.keys(this.modes);
}

Controller.prototype.getMode = function (modeName) {
  if (typeof modeName !== 'string') return null;
  if (this.modes[modeName]) {
    return this.modes[modeName];
  }
  return null;
}

Controller.prototype.addMode = function (modeName, modeOptions) {
  if (typeof modeName !== 'string') return;
  if (typeof modeOptions !== 'object') return;
  if (modeOptions.show) {
    modeOptions.show = this._resolveArray(modeOptions.show);
  }
  if (modeOptions.hide) {
    modeOptions.hide = this._resolveArray(modeOptions.hide);
  }
  if (modeOptions.showByDefault !== undefined) {
    modeOptions.showByDefault = !!modeOptions.showByDefault;
  }
  this.modes[modeName] = modeOptions;
}

Controller.prototype.removeMode = function (modeName) {
  if (typeof modeName !== 'string') return;
  delete this.modes[modeName];

}

Controller.prototype.getGroups = function () {
  return Object.keys(this.groups);
}

Controller.prototype.getGroup = function (groupName) {
  if (typeof groupName !== 'string') return null;
  if (this.groups[groupName]) {
    return this.groups[groupName];
  }
  return null;
}

Controller.prototype.addGroup = function (groupName, groupSections) {
  if (typeof groupName !== 'string') return;
  if (!Array.isArray(groupSections)) return;
  this.groups[groupName] = this._dedupe(groupSections);
}

Controller.prototype.removeGroup = function (groupName) {
  if (typeof groupName !== 'string') return;
  delete this.groups[groupName];
}

Controller.prototype.getLogTypes = function () {
  return Object.keys(this.types);
}

Controller.prototype.getLogType = function (logTypeName) {
  if (typeof logTypeName !== 'string') return '';
  if (this.types[logTypeName]) {
    return this.types[logTypeName];
  }
  return '';
}

Controller.prototype.addLogType = function (logTypeName, logFormatter) {
  if (typeof logTypeName !== 'string') return;
  if (typeof logFormatter === 'string') {
    logFormatter = this._makeFormatter(logFormatter);
  }
  if (typeof logFormatter !== 'function') return;
  this.types[logTypeName] = logFormatter;
  BetterLog.prototype[logTypeName] = this._makeLog(logTypeName, logFormatter);
}

Controller.prototype.removeLogType = function (logTypeName) {
  if (typeof logTypeName !== 'string') return;
  delete BetterLog.prototype[logTypeName];
  delete this.types[logTypeName];
}

Controller.prototype.getOutputStream = function (section, type) {
  if (typeof section !== 'string') return null;
  if (typeof type !== 'string') return null;
  if (this.outputs[section]) {
    if (this.outputs[section][type]) {
      return this.outputs[section][type];
    }
    if (this.outputs[section]['_default']) {
      return this.outputs[section]['_default'];
    }
  }
  if (this.outputs['_default']) {
    if (this.outputs['_default'][type]) {
      return this.outputs['_default'][type];
    }
    if (this.outputs['_default']['_default']) {
      return this.outputs['_default']['_default'];
    }
  }
  return null;
}

Controller.prototype.setOutput = function () {
  var self = this;
  if (arguments.length < 1 || arguments.length > 2) return false;
  if (arguments.length === 1 && !isStream.writable(arguments[0])) return false;
  if (arguments.length === 2 && (typeof arguments[0] !== 'string' || !isStream.writable(arguments[1]))) return false;
  var input = arguments.length === 1 ? '_default' : arguments[0];
  var outputStream = arguments[arguments.length-1];
  var parts = input.split('/', 2);
  var sectionOrGroup = parts[0];
  var type = parts.length === 2 ? parts[1] : '_default';
  self._resolve(sectionOrGroup).forEach(function (section) {
    self.outputs[section] = self.outputs[section] || {};
    self.outputs[section][type] = outputStream;
  })
}

Controller.prototype.morgan = morgan;
Controller.morgan = morgan;

module.exports = Controller;
