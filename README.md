# Diamond Log!

We've found this logger to be immensely useful and flexible for us when we develop and work. Hopefully you would find it useful as well!

```bash
npm install diamond-log
```

### Usage

In your code:
```js
var log = require('diamond-log')('section');
```

Somewhere at the beginning of your code:
```js
log.config({
  mode: 'normal',
  hide: ['section1', 'group']
  overrideConsole: true
})
```

Then when you want to log stuff:
```js
log.info("This is a normal operation.", someVar1, someVar2, "strings");
log.warn("This is a suspicious behaviour...");
log.error("This is a failure!", err);
```

The idea is that you should section your logs based on functionality. For example, all of your syncing code should use one section called 'sync' and the server requests should come in a section called 'server'. This way when you want to hide/show logs, you don't need to actually remove lines of code, you can just edit the log config!

### The Full Config
For people that want to see all the awesome cool features of this logger, here is a the full list of things you can do:

#### Modes
```js
log.config({
  mode: 'normal',
  modes: {
    silent: [],
    production: ['warn', 'error'],
    normal: ['info', 'debug', 'production']
  }
})
```
The `mode` config sets the default mode for the logger. Normal is the default, which will emit all logs. You can define more modes in the `modes` config as we have done above. Note how the normal mode contains another mode in its definition! In fact, you can put modes, sections or groups in this array.

#### Groups
```js
log.config({
  groups: {
    web: ['http', 'server', 'xml', 'json']
  },
  hide: ['web']
})
```
This will hide all logs in the web group!


### Credits
[Diamond Inc.](https://diamond.io)

If you can think of cool things to contribute, please send us a PR!
