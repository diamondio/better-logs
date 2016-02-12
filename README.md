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
  modes: {
    normal: ['section', 'web']
  },
  groups: {
    web: ['http', 'server', 'json'],
    useless: ['xml', 'polling']
  },
  hide: ['spam', 'useless']
  overrideConsole: true
})
```

Then when you want to log stuff:
```js
log.info("This is a normal operation.", someVar1, someVar2, "strings");
log.warn("This is a suspicious behaviour...");
log.error("This is a failure!", err);
```

For more about this awesome logger, [see the full docs](https://github.com/diamondio/log/wiki/Documentation)!


### Credits
[Diamond Inc.](https://diamond.io)

If you can think of cool things to contribute, please send us a PR!
