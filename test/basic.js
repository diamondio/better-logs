var assert = require('assert');
var stream = require('stream');
var isStream = require('is-stream');
var BetterLogs = require('../');

describe('API', function () {

  describe('controller', function () {

    it('should only create one', function () {
      var controller1 = BetterLogs();
      var controller2 = BetterLogs();
      assert.equal(typeof controller1, 'object');
      assert.equal(controller1, controller2);
    })

    it('should have morgan', function () {
      var controller = BetterLogs();
      assert.equal(typeof controller.morgan, 'function');
    })

    it('should be readable', function () {
      var controller = BetterLogs();
      assert.ok(isStream.readable(controller))
    })

  })
  
  describe('log', function () {

    it('should create a log', function () {
      var log = BetterLogs('section');
      assert.equal(typeof log, 'object');
    })

    it('should be readable', function (done) {
      var logs = BetterLogs();
      var log = BetterLogs('section');
      assert.ok(isStream.readable(log))
      logs.type('info', '{{message}}');
      logs.output('info', new (stream.Writable)());
      log.on('data', function (msg) {
        assert.equal(new Buffer(msg).toString(), 'test\n');
        done();
      })
      log.info('test')
    })

    it('should override console', function () {
      var realConsoleLog = console.log;
      BetterLogs({ overrideConsole: true });
      assert.ok(realConsoleLog !== console.log)
      BetterLogs({ overrideConsole: false });
      assert.ok(realConsoleLog === console.log)
    })

  })

  describe('defaults', function () {

    it('should have basic log types', function () {
      var log = BetterLogs('section');
      assert.equal(typeof log.info, 'function')
      assert.equal(typeof log.warn, 'function')
      assert.equal(typeof log.error, 'function')
    })

    it('should have basic modes', function () {
      var logs = BetterLogs();
      assert.ok(logs.modes().indexOf('silent') > -1)
      assert.ok(logs.modes().indexOf('normal') > -1)
      assert.ok(logs.modes().indexOf('verbose') > -1)
    })

  })

})