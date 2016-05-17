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
var logs = require('better-logs')(options);
```

In your code:
```js
var log = require('better-logs')('section');
```

Then when you want to log stuff:
```js
log.info("This is a normal operation.", someVar1, someVar2, "strings");
log.warn("This is a suspicious behaviour...");
log.error("This is a failure!", err);
```

For more about this awesome logger, [see the full docs](https://github.com/diamondio/log/wiki/Documentation).

Contributions welcome!

### Credits
This library was initially made by the awesome team of engineers at [Diamond](https://diamond.io).

If you haven't already, make sure you install Diamond!


