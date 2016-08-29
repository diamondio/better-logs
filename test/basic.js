var assert = require('assert');
var stream = require('stream');
var logs = require('../');

var VOID = new (stream.Writable)();
VOID._write = function(){};

describe('API', function () {

  describe('log', function () {

    it('should create a log', function () {
      var log = logs('section');
      assert.equal(typeof log, 'object');
    })
    
    it('should be readable', function (done) {
      var log = logs('section');
      var output = new (stream.Writable)();
      output._write = function(){};
      output._writev = function(c,cb){cb()};
      var logged = '';
      assert.ok(typeof log.pipe == 'function')
      assert.ok(typeof log.on == 'function')
      log.format('info', '{{message}}');
      log.output('section', output);
      log.on('data', function (msg) {
        logged += new Buffer(msg).toString();
        assert.equal(logged, 'test');
        done();
      })
      log.info('test')
    })

    it('should override console', function () {
      var realConsoleLog = console.log;
      var log = logs('test');
      log.overrideConsole();
      assert.ok(realConsoleLog !== console.log)
      log.restoreConsole();
      assert.ok(realConsoleLog === console.log)
    })

  })

  describe('defaults', function () {

    it('should have basic log types', function () {
      var log = logs('section');
      assert.equal(typeof log.info, 'function')
      assert.equal(typeof log.warn, 'function')
      assert.equal(typeof log.error, 'function')
    })

  })

  describe('reset', function () {

    before(function () {
      var log = logs('test');
      log.format('simple', '{{message}}');
      log.format('alternative', '{{message}}');
      log.output(VOID);
      this.log = log;
    })

    it('should reset', function (done) {
      var log = logs('testReset');
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