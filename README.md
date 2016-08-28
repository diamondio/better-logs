Even Better Logs for NodeJS
-------------------------

[![npm package](https://nodei.co/npm/better-logs.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/better-logs/)

[![Build status](https://img.shields.io/travis/diamondio/better-logs.svg?style=flat-square)](https://travis-ci.org/diamondio/better-logs)
[![Dependency Status](https://img.shields.io/david/diamondio/better-logs.svg?style=flat-square)](https://david-dm.org/diamondio/better-logs)
[![Known Vulnerabilities](https://snyk.io/test/npm/better-logs/badge.svg?style=flat-square)](https://snyk.io/test/npm/better-logs)
[![Gitter](https://img.shields.io/badge/gitter-join_chat-blue.svg?style=flat-square)](https://gitter.im/diamondio/better-logs?utm_source=badge)


We've found this logger to be immensely useful and flexible for us when we develop and work. Hopefully you would find it useful as well!

```bash
npm install --save better-logs
```

## Usage

```js
var log = require('better-logs')('section');

log.format('awesome', '{{timestamp}} AWESOME: {{message}}\n');
log.awesome('custom format');

log.info('test');
log.warn('warning');
log.error('error with stack');
```

## Sections

In your module, you should distinguish between different types of logs.
```js
// server.js
var log = require('better-logs')('server');

// download.js
var log = require('better-logs')('download');

// etc.
```

This way, when logs for a certain module get spammy, you can hide them (or show them when you are debugging.) To do this, it's quite simple:

```
log.hide('server');
```

Then to re-enable it:

```
log.show('server');
```

## Groups

This can get kind of tedious if you have lots of files/sections, so you can define a group to refer to several sections.

```
log.group('http', ['server', 'download', 'upload']);
```

Now, instead of hiding/showing individual sections, you can do:
```
log.hide('http');
```

You can get even finer control:
```
log.show('http');      // Show all http logs
log.hide('http/warn'); // ... except warnings

// Now:
httpLog.info('This will be shown.');
httpLog.warn('This will be hidden.');
```


## Modes

Having to show and hide modules can get annoying if you tend to switch between looking at different things. So we've defined modes to automatically set hide/show settings for you.

```
log.mode('silent', {
	showByDefault: false,
	hide: ['http'],
	show: ['other-modules']
})
```

You can then switch between modes using:
```
log.mode('silent')
```

## Formats

By default, we've defined a few formats for convenience, but you can go a step further and define your own formats too.

```
log.dateformat = 'HH:MM';
log.format('custom', '{{file}}:{{line}} custom: {{message}} {{timestamp}}');
```

Then to invoke it:
```
log.custom('hello');
```

## Reading and writing outputs

All logs are `stream.Readable`, so you can simply pipe them to whatever you want. Alternatively, you can also write output to any Writable stream:

```
log.output(fs.createWriteStream('logs.txt'));
log.output('section', myWriteStream);
log.output('section/error', myErrorStream); // Hides all log.error
```


## Full Documentation

- `config(options)` - Takes an object of options. Valid properties are:
     - `overrideConsole` (boolean) - allows the user to override the console to use `better-logs` instead.
     - `showByDefault` (boolean) - show logs by default (if false, hides by default)
     - `mode` (string) - active mode
     - `modes` (object) - object where the key is the mode name, and the value is an object containing: `showByDefault`, `hide` and/or `show`.
- `hide([section])` - Hides all logs. If a section/group string is provided, it would only hide those logs.
- `show([section])` - Shows all logs. If a section/group string is provided, it would only show those logs.
- `reset()` - Resets all visibility back to its default state.
- `reset([section])` - Resets the visibility state back to the default inherited state. If a section/group string is provided, it would only reset those logs.
- `modes()` - Returns all defined modes
- `mode()` - Returns current active mode
- `mode(modeName)` - Sets the active mode
- `mode(modeName, options)` - Defines `modeName` mode with options. Note that if `options` is `null` or `false` this will delete the mode.
- `groups()` - Returns all defined groups
- `group(groupName)` - Returns the sections/groups in `groupName`
- `group(groupName, members)` - Defines `groupName` to be a group containing `members`. This is an array of strings representing a section or another group.
- `formats()` - Returns all defined formats
- `format(logType, formatter)` - Defines a format for `logType` (string). `formatter` may be a string or a function that runs when the log is called. The function gets passed along the arguments from the log call.
- `output([section], writable)` - Optionally define a group, section or section/log-type string. Whenever logs happen, they will be written to the writable stream. If no section string is defined then it will write all logs to the writable stream.


Contributions welcome!

### Credits
This library was initially made by the awesome team of engineers at [Diamond](https://diamond.io).

If you haven't already, make sure you install Diamond!


