var _        = require('lodash');
var util     = require('util');
var fs       = require('fs');
var path     = require('path');
var datefmt  = require('dateformat');
var extend   = require('deep-extend');

var BetterLog = require('./log');
var morgan    = require('./morgan');

var _mode = '';      // The current mode
var _morgan = null;  // The real morgan object
var _groups = {};    // Map group => array of sections
var _modes = {};     // Map mode => mode options
var _formats = {};   // Map type => format function

// Display options
var _display = {
  dateformat: 'yyyy-mm-dd HH:MM:ss',
  stackIndex: 1,
  maxTraceDepth: 20,
};

// Map section => Map type => Writable
var _outputs = {
  _default: {
    _default: process.stdout,
    error: process.stderr,
  }
};

// Map [section|type] => Boolean
var _visible = {
  '_default/_default': true
};


// Helper methods

var _objectify = function (arr, val) {
  var obj = {};
  arr.forEach(function (k) { obj[k] = val });
  return obj;
}

var _dedupe = function (arr) {
  return Object.keys(_objectify(arr, true));
}

var _resolveSections = function (sectionsOrGroups) {
  if (!Array.isArray(sectionsOrGroups)) return [];
  return [].concat.apply([], sectionsOrGroups.map(function (sectionOrGroup) { return _resolveSection(sectionOrGroup) }));
}

var _resolveSection = function (sectionOrGroup) {
  if (typeof sectionOrGroup !== 'string') return [];
  if (_groups[sectionOrGroup]) {
    return _resolveSections(_groups[sectionOrGroup]);
  }
  return [sectionOrGroup];
}

var _writeToOutput = function (section, type, msg) {
  var output = _getOutputStream(section, type);
  if (output) {
    output.write(String(msg));
  }
}

var _isWritable = function (stream) {
  return (stream &&
    typeof stream.write === 'function' &&
    typeof stream.end === 'function')
}

var _getStack = function (stackIndex) {
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
    stack.fn = sp[1] || '<anonymous>';
    stack.path = sp[2];
    stack.line = sp[3];
    stack.pos = sp[4];
    stack.file = path.basename(stack.path);
    stack.stack = stacklist.join('\n');
  }
  return stack;
}

var _makeFormatter = function (format) {
  var needStack = /{{(fn|path|line|pos|file|stack)}}/i.test(format);
  return function () {
    var display = this;
    var output = format;
    output = output.replace(/{{timestamp}}/gi, datefmt(display.dateformat));
    output = output.replace(/{{type}}/gi, display.logType);
    output = output.replace(/{{section}}/gi, display.section);
    if (needStack) {
      var stack = _getStack(display.stackIndex);
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
          return util.inspect(arg, { depth: display.maxTraceDepth });
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

var _shouldShow = function (section, type) {
  var combined = section + '/' + type;
  var type = '_default/' + type;
  var section = section + '/_default';
  var def = '_default/_default';
  if (_visible[combined] !== undefined) return _visible[combined];
  if (_visible[section] !== undefined && _visible[type] !== undefined) {
    if (_visible[section] && _visible[type]) return true;
    if (!_visible[section] && !_visible[type]) return false;
    return _visible[def];
  }
  if (_visible[section] !== undefined) return _visible[section];
  if (_visible[type] !== undefined) return _visible[type];
  return _visible[def];
}

var _makeLog = function (type) {
  if (typeof type !== 'string') return;
  return function () {
    var log = this;
    var section = log.section;
    if (!_shouldShow(section, type)) return;
    var message = _formats[type].apply(extend({ section: log.section, logType: type }, _display), arguments);
    log.push(message);
    _writeToOutput(section, type, message);
  }
}

var _getOutputStream = function (section, type) {
  if (typeof section !== 'string') return null;
  if (typeof type !== 'string') return null;
  if (_outputs[section]) {
    if (_outputs[section][type]) {
      return _outputs[section][type];
    }
    if (_outputs[section]['_default']) {
      return _outputs[section]['_default'];
    }
  }
  if (_outputs['_default']) {
    if (_outputs['_default'][type]) {
      return _outputs['_default'][type];
    }
    if (_outputs['_default']['_default']) {
      return _outputs['_default']['_default'];
    }
  }
  return null;
}

var _refreshMorgan = function (opts) {
  opts = opts || {};
  opts.stream = _getOutputStream('morgan', 'morgan')
  morgan.token('datefmt', function () {
    return datefmt(new Date(), _display.dateformat);
  });
  _morgan = morgan(exports.format('morgan'), opts);
}

exports.display = function (key, val) {
  if (typeof key !== 'string') return;
  _display[key] = val;
}

exports.modes = function () {
  return Object.keys(_modes);
}

exports.show = function (input) {
  if (!input) {
    _visible = {
      '_default/_default': true
    }
    return;
  }
  if (typeof input !== 'string') return;
  var parts = input.split('/', 2);
  var section = parts[0];
  var type = parts[1] || '_default';
  if (_formats[section] && parts.length === 1) {
    type = section;
    section = '_default';
  }
  extend(_visible, _objectify(_resolveSection(section).map(function (section) { return section + '/' + type; }), true));
}

exports.hide = function (input) {
  if (!input) {
    _visible = {
      '_default/_default': false
    }
    return;
  }
  if (typeof input !== 'string') return;
  var parts = input.split('/', 2);
  var section = parts[0];
  var type = parts[1] || '_default';
  if (_formats[section] && parts.length === 1) {
    type = section;
    section = '_default';
  }
  extend(_visible, _objectify(_resolveSection(section).map(function (section) { return section + '/' + type; }), false));
}

exports.reset = function () {
  _visible = {
    '_default/_default': true
  };
}

exports.mode = function (modeName, modeOptions) {
  if (arguments.length === 0) return _mode;
  if (typeof modeName !== 'string') return;
  if (modeOptions === undefined) {
    var modeOptions = _modes[modeName];
    if (typeof modeOptions !== 'object') return;
    _mode = modeName;
    _visible = {};
    if (modeOptions.show) {
      modeOptions.show.forEach(function (section) {
        exports.show(section);
      })
    }
    if (modeOptions.hide) {
      modeOptions.hide.forEach(function (section) {
        exports.hide(section);
      })
    }
    if (modeOptions.showByDefault !== undefined) {
      _visible['_default/_default'] = modeOptions.showByDefault;
    } else {
      _visible['_default/_default'] = true;
    }
  } else if (!modeOptions) {
    return delete _modes[modeName];
  }
  if (typeof modeOptions !== 'object') return;
  _modes[modeName] = modeOptions;
}

exports.groups = function () {
  return Object.keys(_groups);
}

exports.group = function (groupName, groupSections) {
  if (typeof groupName !== 'string') return;
  if (groupSections === undefined) {
    return _groups[groupName] || null;
  } else if (!groupSections) {
    return delete _groups[groupName];
  }
  if (!Array.isArray(groupSections)) return;
  _groups[groupName] = _dedupe(groupSections);
}

exports.formats = function () {
  return Object.keys(_formats);
}

exports.format = function (logTypeName, logFormatter) {
  if (typeof logTypeName !== 'string') return;
  if (logFormatter === undefined) {
    return _formats[logTypeName] || '';
  } else if (!logFormatter) {
    delete BetterLog.prototype[logTypeName];
    delete _formats[logTypeName];
  }
  if (logTypeName === 'morgan') {
    _formats[logTypeName] = logFormatter;
    return _refreshMorgan();
  }
  if (typeof logFormatter === 'string') {
    logFormatter = _makeFormatter(logFormatter);
  }
  if (typeof logFormatter !== 'function') return;
  _formats[logTypeName] = logFormatter;
  BetterLog.prototype[logTypeName] = _makeLog(logTypeName);
}

// Usage:
//  - output(writeable)
//  - output(section, writeable)
//  - output(type, writeable)
//  - output('section/type', writeable)
exports.output = function (section, stream) {
  if (section === undefined) return;
  if (typeof section !== 'string' || stream === undefined) {
    stream = section;
    section = '_default';
  }
  if (typeof stream === 'string') {
    stream = fs.createWriteStream(stream, { flags: 'a' });
  }
  if (!_isWritable(stream)) {
    throw new Error('output is not writable');
  }
  if (_formats[section]) {
    section = '_default/' + section;
  }
  var parts = section.split('/', 2);
  var sectionOrGroup = parts[0];
  var type = parts.length === 2 ? parts[1] : '_default';
  _resolveSection(sectionOrGroup).forEach(function (section) {
    if (section === 'morgan' || (section === '_default' && !_outputs['morgan'])) {
      _refreshMorgan();
    }
    _outputs[section] = _outputs[section] || {};
    _outputs[section][type] = stream;
  })
}

exports.morgan = function (opts) {
  _refreshMorgan(opts);
  return function (req, res, next) {
    _morgan(req, res, next);
  }
}

