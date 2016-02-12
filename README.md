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
  "mode": "normal",
  "hide": ["section1", "group"]
  "overrideConsole": true
})
```
