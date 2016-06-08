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

  this._morgan = null; // The real morgan object
  this._visible = {};  // Map section => Map type => Boolean
  this._outputs = {};  // Map section => Map type => Writable
  this._groups = {};   // Map group => array of sections
  this._formats = {};  // Map type => format function
  this._modes = {};    // Map mode => mode options
  this._display = {};  // Display options

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
    return output;
  }
}

Controller.prototype._makeLog = function (type) {
  if (typeof type !== 'string') return;
  return function () {
    var log = this;
    var ctl = this.controller;
    var section = log.section;
    if (typeof section !== 'string') return;
    if (typeof ctl._formats[type] !== 'function') return;

    ctl._visible['_default'] = ctl._visible['_default'] || {};
    ctl._visible[section] = ctl._visible[section] || {};
    
    var score = 0;
    var hideByDefault = (ctl._visible['_default']['_default'] === false);
    var hideSection = (ctl._visible[section]._default === false);
    var showSection = (ctl._visible[section]._default === true);
    var hideType = (ctl._visible['_default'][type] === false);
    var showType = (ctl._visible['_default'][type] === true);
    var shouldHide = (ctl._visible[section][type] === false);
    var shouldShow = (ctl._visible[section][type] === true);

    if (ctl._modes[ctl._mode]) {
      ctl._modes[ctl._mode].hide = ctl._modes[ctl._mode].hide || {};
      ctl._modes[ctl._mode].show = ctl._modes[ctl._mode].show || {};
      if (ctl._modes[ctl._mode].showByDefault !== undefined) {
        hideByDefault = (ctl._modes[ctl._mode].showByDefault === false);
      }
      if (ctl._modes[ctl._mode].hide[section] !== undefined) {
        hideSection = (ctl._modes[ctl._mode].hide[section] === true);
      }
      if (ctl._modes[ctl._mode].show[section] !== undefined) {
        showSection = (ctl._modes[ctl._mode].show[section] === true);
      }
      if (ctl._modes[ctl._mode].hide[type] !== undefined) {
        hideType = (ctl._modes[ctl._mode].hide[type] === true);
      }
      if (ctl._modes[ctl._mode].show[type] !== undefined) {
        showType = (ctl._modes[ctl._mode].show[type] === true);
      }
    }

    score += (hideByDefault ? -1 : 1);
    score += (showType ? 10 : 0);
    score += (hideType ? -10 : 0);
    score += (showSection ? 10 : 0);
    score += (hideSection ? -10 : 0);
    score += (shouldShow ? 100 : 0);
    score += (shouldHide ? -100 : 0);

    // console.log(ctl._mode, section, type, '\ntype:', showType, hideType, '\nsection:', showSection, hideSection, '\ndefault:', hideByDefault, 'score:', score)

    if (score < 0) return;

    var message = ctl._formats[type].apply(extend({ section: log.section, logType: type }, ctl._display, log._display), arguments);
    // console.log('writing', message)
    
    log.push(message);
    ctl._writeToOutput(section, type, message);
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
  var controller = this;
  var log = new BetterLog({
    controller: controller,
    section: section
  });
  ['config', 'modes', 'show', 'hide', 'reset', 'mode', 'group', 'formats', 'format', 'output'].forEach(function (fnName) {
    BetterLog.prototype[fnName] = Controller.prototype[fnName].bind(controller);
  })
  return log;
}

Controller.prototype.config = function (opts) {
  if (typeof opts !== 'object') return;
  var self = this;
  if (typeof opts.display === 'object') {
    extend(self._display, opts.display);
  }
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
        if (consoleLog[key]) {
          console[key] = consoleLog[key].bind(consoleLog)
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

Controller.prototype.display = function (key, val) {
  if (typeof key !== 'string') return;
  this._display[key] = val;
}

Controller.prototype.modes = function () {
  return Object.keys(this._modes);
}

Controller.prototype.show = function (sectionOrGroup) {
  if (!sectionOrGroup) {
    this.reset();
    return this._setVisibility('_default', 'show');
  }
  return this._setVisibility(sectionOrGroup, 'show');
}

Controller.prototype.hide = function (sectionOrGroup) {
  if (!sectionOrGroup) {
    this.reset();
    return this._setVisibility('_default', 'hide');
  }
  return this._setVisibility(sectionOrGroup, 'hide');
}

Controller.prototype.reset = function (sectionOrGroup) {
  if (!sectionOrGroup) {
    return this._visible = {};
  }
  return this._setVisibility(sectionOrGroup, 'inherit');
}

Controller.prototype.mode = function (modeName, modeOptions) {
  if (arguments.length === 0) return this._mode;
  if (typeof modeName !== 'string') return;
  if (modeOptions === undefined) {
    return this._mode = modeName;
  } else if (!modeOptions) {
    return delete this._modes[modeName];
  }
  if (typeof modeOptions !== 'object') return;
  var existingMode = this._modes[modeName] || {};
  if (modeOptions.show) {
    modeOptions.show = extend(existingMode.show || {}, this._objectify(this._resolveArray(modeOptions.show)));
  }
  if (modeOptions.hide) {
    modeOptions.hide = extend(existingMode.hide || {}, this._objectify(this._resolveArray(modeOptions.hide)));
  }
  if (modeOptions.showByDefault !== undefined) {
    modeOptions.showByDefault = !!modeOptions.showByDefault;
  }
  this._modes[modeName] = modeOptions;
}

Controller.prototype.groups = function () {
  return Object.keys(this._groups);
}

Controller.prototype.group = function (groupName, groupSections) {
  if (typeof groupName !== 'string') return;
  if (groupSections === undefined) {
    return this._groups[groupName] || null;
  } else if (!groupSections) {
    return delete this._groups[groupName];
  }
  if (!Array.isArray(groupSections)) return;
  this._groups[groupName] = this._dedupe(groupSections);
}

Controller.prototype.formats = function () {
  return Object.keys(this._formats);
}

Controller.prototype.format = function (logTypeName, logFormatter) {
  if (typeof logTypeName !== 'string') return;
  if (logFormatter === undefined) {
    return this._formats[logTypeName] || '';
  } else if (!logFormatter) {
    delete BetterLog.prototype[logTypeName];
    delete this._formats[logTypeName];
  }
  if (logTypeName === 'morgan') {
    return this._formats[logTypeName] = logFormatter;
  }
  if (typeof logFormatter === 'string') {
    logFormatter = this._makeFormatter(logFormatter);
  }
  if (typeof logFormatter !== 'function') return;
  this._formats[logTypeName] = logFormatter;
  BetterLog.prototype[logTypeName] = this._makeLog(logTypeName, logFormatter);
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
    if (section === '_default' && !self._outputs['morgan']) {
      self._refreshMorgan();
    }
    self._outputs[section] = self._outputs[section] || {};
    self._outputs[section][type] = outputStream;
  })
}

Controller.prototype._refreshMorgan = function () {
  var self = this;
  if (!self.format('morgan')) {
    self.format('morgan', ':datefmt'.grey + ' '.white + ':method-pad' + ' :url '.white + ':status-code' + ' :response-time ms'.grey);
  }
  self._morgan = morgan(self.format('morgan'), {
    stream: self._getOutputStream('morgan', 'morgan')
  })
}

Controller.prototype.morgan = function (opts) {
  var self = this;
  self._refreshMorgan();
  return function (req, res, next) {
    self._morgan(req, res, next);
  }
}

module.exports = Controller;
