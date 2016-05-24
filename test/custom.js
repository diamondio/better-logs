var assert = require('assert');
var stream = require('stream');
var isStream = require('is-stream');
var BetterLogs = require('../');
var BetterLog = require('../log');

// Output to /dev/null
var VOID = new (stream.Writable)();
VOID._write = function(){};
VOID._writev = function(c,cb){cb()};

// Helper functions
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

describe('Basic', function () {

  describe('log basic types', function () {

    before(function () {
      var logs = BetterLogs();
      logs.format('simple', '{{message}}')
      logs.output(VOID);
    })

    it('prints null', function (done) {
      var logged = '';
      var log = BetterLogs('testBasicNull');
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, 'null\n');
        done();
      })
      log.simple(null);
    })
    
    it('prints NaN', function (done) {
      var logged = '';
      var log = BetterLogs('testBasicNaN');
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, 'NaN\n');
        done();
      })
      log.simple(NaN);
    })
    
    it('prints undefined', function (done) {
      var logged = '';
      var log = BetterLogs('testBasicUndefined');
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, 'undefined\n');
        done();
      })
      log.simple(undefined);
    })
    
    it('prints string', function (done) {
      var logged = '';
      var log = BetterLogs('testBasicString');
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, 'hello\n');
        done();
      })
      log.simple('hello');
    })

    it('prints number', function (done) {
      var logged = '';
      var log = BetterLogs('testBasicNumber');
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, '12.75\n');
        done();
      })
      log.simple(12.75);
    })

    it('prints object', function (done) {
      var logged = '';
      var log = BetterLogs('testBasicObject');
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, '{ x: 1, y: [ \'a\', 2, 3 ], z: Infinity }\n');
        done();
      })
      log.simple({ x: 1, y: ['a', 2, 3], z: Infinity });
    })
    
    it('prints formatted', function (done) {
      var logged = '';
      var log = BetterLogs('testBasicFormatting');
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, '1: null 2: undefined 3: hello 4: 12 5: {"x":1,"y":["a",2,3]} extra\n');
        done();
      })
      log.simple('1: %s 2: %s 3: %s 4: %d 5: %j', null, undefined, 'hello', 12, { x: 1, y: ['a', 2, 3] }, 'extra');
    })
    
  })

})

describe('Customizations', function () {

  describe('custom log types', function () {

    before(function () {
      var logs = BetterLogs();
      logs.output(VOID);
    })

    it('should format basic', function (done) {
      var log = BetterLogs('testSectionName');
      log.format('testFormatBasic', '{{message}}! [{{section}}] type: {{type}} {} {{not_one}}');
      var logged = '';
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, 'a! [testSectionName] type: testFormatBasic {} {{not_one}}\n');
        done();
      })
      log.testFormatBasic('a');
    })
    
    it('should format stack', function testFnName(done) {
      var log = BetterLogs('section');
      log.format('testFormatStack', '{{file}}:{{line}} {{pos}} {{fn}} {{path}}');
      var logged = '';
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        var parts = logged.split(' ', 4);
        assert.equal(parts[0].split(':')[0], 'custom.js');
        assert.ok(isNumeric(parts[0].split(':')[1]));
        assert.ok(isNumeric(parts[1]));
        assert.equal(parts[2], 'Context.testFnName');
        assert.ok(typeof parts[3] === 'string');
        done();
      })
      log.testFormatStack('a');
    })
    
    it('should format time', function (done) {
      var log = BetterLogs('testSectionName');
      log.dateformat = 'HH:MM year: yyyy'
      log.format('testFormatTime', '{{timestamp}}');
      var logged = '';
      log.on('data', function (msg) {
        var now = new Date();
        var logged = new Buffer(msg).toString();
        assert.equal(logged, pad(now.getHours(), 2) + ':' + pad(now.getMinutes(), 2) + ' year: ' + now.getFullYear() + '\n');
        done();
      })
      log.testFormatTime('a');
    })
    
  })

  describe('custom output', function () {

    before(function () {
      var logs = BetterLogs();
      logs.output(VOID);
      this.logs = logs;
    })

    it('should set section output', function (done) {
      var log = BetterLogs('testSectionOutput');
      var output = new (stream.Writable)();
      output._write = function (msg) {
        var written = new Buffer(msg).toString();
        assert.equal(written, 'a\n');
        done();
      };
      output._writev = function(c,cb){cb()};
      log.output('testSectionOutput', output);
      log.simple('a');
    })

    it('should set section/type output', function () {
    })

  })

  describe('show and hide', function () {

    it('should show/hide by default', function () {
    })

    it('should show/hide section', function () {
    })

    it('should show/hide section/type', function () {
    })

    it('should show/hide groups', function () {
    })

    it('should show/hide groups within groups', function () {
    })

  })

  describe('modes', function () {

    it('should show/hide by default', function () {
    })

    it('should show/hide section', function () {
    })

    it('should show/hide section/type', function () {
    })

    it('should show/hide groups', function () {
    })

    it('should show/hide groups within groups', function () {
    })

  })

})