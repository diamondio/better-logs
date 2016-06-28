var assert = require('assert');
var stream = require('stream');
var BetterLogs = require('../');

var VOID = new (stream.Writable)();
VOID._write = function(){};

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

  })
  
  describe('log', function () {

    it('should create a log', function () {
      var log = BetterLogs('section');
      assert.equal(typeof log, 'object');
    })

    it('should configure from log', function () {
      var logs = BetterLogs();
      var log = BetterLogs('section');
      log.mode('a');
      assert.equal(log.mode(), 'a')
      assert.equal(logs.mode(), 'a')
    })
    
    it('should be readable', function (done) {
      var logs = BetterLogs();
      var log = BetterLogs('section');
      var output = new (stream.Writable)();
      output._write = function(){};
      output._writev = function(c,cb){cb()};
      var logged = '';
      assert.ok(typeof log.pipe == 'function')
      assert.ok(typeof log.on == 'function')
      logs.format('info', '{{message}}');
      logs.output('section', output);
      log.on('data', function (msg) {
        logged += new Buffer(msg).toString();
        assert.equal(logged, 'test');
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

  describe('reset', function () {

    before(function () {
      var logs = BetterLogs();
      logs.format('simple', '{{message}}');
      logs.format('alternative', '{{message}}');
      logs.output(VOID);
      this.logs = logs;
    })

    it('should reset', function (done) {
      var log = BetterLogs('testReset');
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'b');
        }
        if (writes === 2) {
          assert.equal(written, 'd');
          done();
        }
      });
      log.hide('testReset')
      log.simple('a');
      log.reset('testReset')
      log.simple('b');
      log.hide('testReset')
      log.simple('c');
      log.reset()
      log.simple('d');
    })

  })

})