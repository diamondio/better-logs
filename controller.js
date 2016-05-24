var _        = require('lodash');
var util     = require('util');
var path     = require('path');
var isStream = require('is-stream');
var datefmt  = require('dateformat');
var extend   = require('deep-extend');

var BetterLog = require('./log');
var morgan    = require('./morgan');

var _console = extend({}, console);

function Controller (opts) {
  opts = opts || {};

  this._mode = 'normal';
  this._unwritten = [];

  this._groups = {};
  this._formats = {};
  this._modes = {};

  this._outputs = {}; // [section|_default][type|_default]
  this._visible = {}; // [section|_default][type|_default]

  if (typeof opts === 'object') {
    this.config(opts);
  }
}

Controller.prototype._dedupe = function (arr) {
  return Object.keys(this._objectify(arr));
}

Controller.prototype._objectify = function (arr) {
  var obj = {};
  arr.forEach(function (k) { obj[k] = true });
  return obj;
}

Controller.prototype._resolveArray = function (sectionsOrGroups) {
  if (!Array.isArray(sectionsOrGroups)) return [];
  var self = this;
  return [].concat.apply([], sectionsOrGroups.map(function (sectionOrGroup) { return self._resolve(sectionOrGroup) }));
}

Controller.prototype._resolve = function (sectionOrGroup) {
  if (typeof sectionOrGroup !== 'string') return [];
  if (this._groups[sectionOrGroup]) {
    return this._resolveArray(this._groups[sectionOrGroup]);
  }
  return [sectionOrGroup];
}

Controller.prototype._writeToOutput = function (section, type, msg) {
  var output = this._getOutputStream(section, type);
  if (output) {
    output.write(String(msg));
  }
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
    output = output.replace(/{{type}}/gi, this.logType);
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
    if (message !== undefined) {
      args.unshift(message);
    }
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
    if (typeof self._formats[type] !== 'function') return;

    self._visible['_default'] = self._visible['_default'] || {};
    self._visible[section] = self._visible[section] || {};
    
    var score = 0;
    var hideByDefault = (self._visible['_default']['_default'] === false);
    var hideSection = (self._visible[section]._default === false);
    var showSection = (self._visible[section]._default === true);
    var hideType = (self._visible['_default'][type] === false);
    var showType = (self._visible['_default'][type] === true);
    var shouldHide = (self._visible[section][type] === false);
    var shouldShow = (self._visible[section][type] === true);


    if (self._modes[self._mode]) {
      self._modes[self._mode].hide = self._modes[self._mode].hide || {};
      self._modes[self._mode].show = self._modes[self._mode].show || {};
      if (self._modes[self._mode].showByDefault !== undefined) {
        hideByDefault = (self._modes[self._mode].showByDefault === false);
      }
      if (self._modes[self._mode].hide[section] !== undefined) {
        hideSection = (self._modes[self._mode].hide[section] === true);
      }
      if (self._modes[self._mode].show[section] !== undefined) {
        showSection = (self._modes[self._mode].show[section] === true);
      }
      if (self._modes[self._mode].hide[type] !== undefined) {
        hideType = (self._modes[self._mode].hide[type] === true);
      }
      if (self._modes[self._mode].show[type] !== undefined) {
        showType = (self._modes[self._mode].show[type] === true);
      }
    }

    score += (hideByDefault ? -1 : 1);
    score += (showType ? 100 : 0);
    score += (hideType ? -100 : 0);
    score += (showSection ? 10 : 0);
    score += (hideSection ? -10 : 0);
    score += (shouldShow ? 1000 : 0);
    score += (shouldHide ? -1000 : 0);

    // console.log(section, type, '\n', hideByDefault, 'score:', score)

    if (score < 0) return;
    var message = self._formats[type].apply(extend({ logType: type }, _.pick(log, ['dateformat', 'section', 'stackIndex', 'maxTraceDepth'])), arguments);
    // console.log('writing', message)
    this.push(message);
    self._writeToOutput(section, type, message);
  }
}

Controller.prototype._getOutputStream = function (section, type) {
  if (typeof section !== 'string') return null;
  if (typeof type !== 'string') return null;
  if (this._outputs[section]) {
    if (this._outputs[section][type]) {
      return this._outputs[section][type];
    }
    if (this._outputs[section]['_default']) {
      return this._outputs[section]['_default'];
    }
  }
  if (this._outputs['_default']) {
    if (this._outputs['_default'][type]) {
      return this._outputs['_default'][type];
    }
    if (this._outputs['_default']['_default']) {
      return this._outputs['_default']['_default'];
    }
  }
  return null;
}

Controller.prototype._setVisibility = function (input, setting) {
  var self = this;
  var parts = input.split('/', 2);
  var sectionOrGroup = parts[0];
  var type = parts.length === 2 ? parts[1] : '_default';
  self._resolve(sectionOrGroup).forEach(function (section) {
    self._visible[section] = self._visible[section] || {};
    if (setting === 'show' || setting == 'hide') {
      self._visible[section][type] = setting === 'show' ? true : false;
    } else {
      delete self._visible[section][type];
    }
  })
}

Controller.prototype.create = function (section) {
  if (typeof section !== 'string') return null;
  var log = new BetterLog({ section: section });
  Object.keys(this).forEach(key => log[key] = this[key]);
  return log;
}

Controller.prototype.config = function (opts) {
  if (typeof opts !== 'object') return;
  var self = this;
  if (opts.groups) {
    Object.keys(opts.groups).forEach(function (name) { return self.group(name, opts.groups[name]) })
  }
  if (opts.outputs) {
    Object.keys(opts.outputs).forEach(function (name) { return self.output(name, opts.outputs[name]) })
  }
  if (opts.formats) {
    Object.keys(opts.formats).forEach(function (name) { return self.format(name, opts.formats[name]) })
  }
  if (opts.modes) {
    Object.keys(opts.modes).forEach(function (name) { return self.mode(name, opts.modes[name]) })
  }
  if (typeof opts.mode === 'string') {
    if (self._modes[opts.mode]) {
      self._mode = opts.mode;
    }
  }
  if (opts.overrideConsole !== undefined) {
    self.overrideConsole = opts.overrideConsole;
    if (self.overrideConsole) {
      var consoleLog = self.create('console');
      consoleLog.stackIndex = 2;
      consoleLog.resume();
      Object.keys(_console).forEach(function (key) {
        console[key] = function () {
          return consoleLog[key].apply(consoleLog, arguments)
        }
      });
    } else {
      console = _console;
      Object.keys(_console).forEach(function (key) { console[key] = _console[key] });
    }
  }
  if (opts.showByDefault !== undefined) {
    self._visible['_default'] = self._visible['_default'] || {};
    self._visible['_default']['_default'] = opts.showByDefault;
  }
  if (Array.isArray(opts.hide)) {
    opts.hide.forEach(function (elem) { self._setVisibility(elem, 'hide') })
  }
  if (Array.isArray(opts.show)) {
    opts.show.forEach(function (elem) { self._setVisibility(elem, 'show') })
  }
  return self;
}

Controller.prototype.modes = function () {
  return Object.keys(this._modes);
}

Controller.prototype.show = function (sectionOrGroup) {
  return this._setVisibility(sectionOrGroup, 'show');
}

Controller.prototype.hide = function (sectionOrGroup) {
  return this._setVisibility(sectionOrGroup, 'hide');
}

Controller.prototype.reset = function (sectionOrGroup) {
  return this._setVisibility(sectionOrGroup, 'inherit');
}

Controller.prototype.mode = function (modeName, modeOptions) {
  if (typeof modeName !== 'string') return;
  if (!modeOptions) {
    return this._mode = modeName;
  }
  if (typeof modeOptions !== 'object') return;
  var existingMode = this._modes[modeName] || {};
  if (modeOptions.show) {
    extend(modeOptions.show, existingMode.show || {}, this._objectify(this._resolveArray(modeOptions.show)));
  }
  if (modeOptions.hide) {
    extend(modeOptions.hide, existingMode.hide || {}, this._objectify(this._resolveArray(modeOptions.hide)));
  }
  if (modeOptions.showByDefault !== undefined) {
    modeOptions.showByDefault = !!modeOptions.showByDefault;
  }
  this._modes[modeName] = modeOptions;
}

Controller.prototype.removeMode = function (modeName) {
  if (typeof modeName !== 'string') return;
  delete this._modes[modeName];
}

Controller.prototype.group = function (groupName, groupSections) {
  if (typeof groupName !== 'string') return;
  if (!groupSections) return this._groups[groupName] || null;
  if (!Array.isArray(groupSections)) return;
  this._groups[groupName] = this._dedupe(groupSections);
}

Controller.prototype.removeGroup = function (groupName) {
  if (typeof groupName !== 'string') return;
  delete this._groups[groupName];
}

Controller.prototype.formats = function () {
  return Object.keys(this._formats);
}

Controller.prototype.format = function (logTypeName, logFormatter) {
  if (typeof logTypeName !== 'string') return;
  if (!logFormatter) return this._formats[logTypeName] || '';
  if (typeof logFormatter === 'string') {
    logFormatter = this._makeFormatter(logFormatter);
  }
  if (typeof logFormatter !== 'function') return;
  this._formats[logTypeName] = logFormatter;
  BetterLog.prototype[logTypeName] = this._makeLog(logTypeName, logFormatter);
}

Controller.prototype.removeType = function (logTypeName) {
  if (typeof logTypeName !== 'string') return;
  delete BetterLog.prototype[logTypeName];
  delete this._formats[logTypeName];
}

Controller.prototype.output = function () {
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
    self._outputs[section] = self._outputs[section] || {};
    self._outputs[section][type] = outputStream;
  })
}

Controller.prototype.morgan = morgan;

module.exports = Controller;
