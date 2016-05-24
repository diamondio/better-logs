var assert = require('assert');
var stream = require('stream');
var isStream = require('is-stream');
var BetterLogs = require('../');
var BetterLog = require('../log');

// Output to /dev/null
var VOID = new (stream.Writable)();
VOID._write = function(){};

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
      logs.format('simple', '{{message}}')
      logs.format('alternative', '{{message}}')
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
      logs.format('simple', '{{message}}');
      logs.format('alternative', '{{message}}');
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
      log.output('testSectionOutput', output);
      log.simple('a');
    })

    it('should set section/type output', function (done) {
      var log = BetterLogs('testSectionTypeOutput');
      var outputSimple = new (stream.Writable)();
      var outputDefault = new (stream.Writable)();
      outputSimple._write = function (msg) {
        var written = new Buffer(msg).toString();
        assert.equal(written, 'a\n');
      };
      outputDefault._write = function (msg) {
        var written = new Buffer(msg).toString();
        assert.equal(written, 'b\n');
        done();
      };
      log.output('testSectionTypeOutput', outputDefault);
      log.output('testSectionTypeOutput/simple', outputSimple);
      log.simple('a');
      log.alternative('b');
    })

  })

  describe('reset', function () {
    // TODO
  })

  describe('show and hide', function () {

    before(function () {
      var logs = BetterLogs();
      logs.format('simple', '{{message}}');
      logs.format('simple1', '{{message}}');
      logs.format('simple2', '{{message}}');
      logs.format('simple3', '{{message}}');
      logs.output(VOID);
      this.logs = logs;
    })

    it('by default', function (done) {
      var log = BetterLogs('testShowDefault');
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'a\n');
        }
        if (writes === 2) {
          assert.equal(written, 'c\n');
          done();
        }
      });
      log.simple('a');
      log.config({ showByDefault: false })
      log.simple('b');
      log.config({ showByDefault: true })
      log.simple('c');
    })

    it('section', function (done) {
      var log = BetterLogs('testShowSection');
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'b\n');
        }
        if (writes === 2) {
          assert.equal(written, 'e\n');
          done();
        }
      });
      log.config({ showByDefault: false })
      log.show('testShowSection')
      log.simple('b');
      log.hide('testShowSection')
      log.simple('c');
      log.config({ showByDefault: true })
      log.hide('testShowSection')
      log.simple('d');
      log.show('testShowSection')
      log.simple('e');
    })

    it('section/type', function (done) {
      var log = BetterLogs('testShowSectionType');
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'd\n');
        }
        if (writes === 2) {
          assert.equal(written, 'f\n');
        }
        if (writes === 3) {
          assert.equal(written, 'e\n');
          done();
        }
      });
      log.hide('testShowSectionType')
      log.show('testShowSectionType/simple2')
      log.simple1('c');
      log.simple2('d');
      log.reset()
      log.show('testShowSectionType')
      log.hide('_default/simple2')
      log.simple2('f');
      log.simple1('e');
    })

    it('groups', function (done) {
      var log = BetterLogs('testShowGroups');
      log.group('group1', ['section1', 'section2', 'testShowGroups']);
      log.group('group2', ['section3', 'section4']);
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'b\n');
        }
        if (writes === 2) {
          assert.equal(written, 'd\n');
        }
        if (writes === 3) {
          assert.equal(written, 'f\n');
          done();
        }
      });
      log.hide('group1')
      log.simple1('a');
      log.show('group1')
      log.simple1('b');
      log.hide('group1')
      log.show('group1/simple2')
      log.simple1('c');
      log.simple2('d');
      log.show('group2')
      log.hide('group2/simple2')
      log.simple1('e');
      log.hide('group2/group1')
      log.simple2('f');
    })

  })

  describe('modes', function () {

    before(function () {
      var logs = BetterLogs();
      logs.format('simple', '{{message}}');
      logs.format('simple1', '{{message}}');
      logs.format('simple2', '{{message}}');
      logs.format('simple3', '{{message}}');
      logs.output(VOID);
      this.logs = logs;
    })

    it('by default', function (done) {
      var log = BetterLogs('testModeDefault');
      log.mode('testMode');
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'b\n');
          done();
        }
      });
      log.mode('testMode', { showByDefault: false });
      log.simple1('a');
      log.mode('testMode', { showByDefault: true });
      log.simple1('b');
    })

    it('section/type', function (done) {
      var log = BetterLogs('testModeSection');
      log.mode('testMode');
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'c\n');
        }
        if (writes === 2) {
          assert.equal(written, 'd\n');
        }
        if (writes === 3) {
          assert.equal(written, 'f\n');
        }
        if (writes === 4) {
          assert.equal(written, 'i\n');
        }
        if (writes === 5) {
          assert.equal(written, 'k\n');
          done();
        }
      });
      log.reset();
      log.mode('testMode', null);
      log.mode('testMode', { showByDefault: false, hide: ['testModeSection'] });
      log.simple1('a');
      log.mode('testMode', null);
      log.mode('testMode', { showByDefault: true, hide: ['testModeSection'] });
      log.simple1('b');
      log.mode('testMode', null);
      log.mode('testMode', { showByDefault: false, show: ['testModeSection'] });
      log.simple1('c');
      log.mode('testMode', null);
      log.mode('testMode', { showByDefault: false, show: ['testModeSection'] });
      log.simple1('d');
      log.mode('testMode', null);
      log.mode('testMode', { showByDefault: false, show: ['testModeSection'], hide: ['simple1'] });
      log.simple1('e');
      log.simple2('f');
      log.mode('testMode', null);
      log.mode('testMode', { showByDefault: false, hide: ['testModeSection'], hide: ['simple1'] });
      log.simple1('g');
      log.simple2('h');
      log.mode('testMode', null);
      log.mode('testMode', { showByDefault: false, show: ['testModeSection'], show: ['simple1'] });
      log.simple1('i');
      log.simple2('j');
      log.mode('testMode', null);
      log.mode('testMode', { showByDefault: true, hide: ['testModeSection'], show: ['simple1'] });
      log.simple1('k');
      log.simple2('l');
    })

    it('groups', function (done) {
      var log = BetterLogs('testModeGroups');
      log.group('testGroup', ['section1', 'section2', 'testModeGroups']);
      log.mode('testMode');
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'c\n');
        }
        if (writes === 2) {
          assert.equal(written, 'd\n');
          done();
        }
      });
      log.reset();
      log.mode('testMode', null);
      log.mode('testMode', { showByDefault: true, hide: ['testGroup'] });
      log.simple1('a');
      log.mode('testMode', null);
      log.mode('testMode', { showByDefault: false, hide: ['testGroup'] });
      log.simple1('b');
      log.mode('testMode', null);
      log.mode('testMode', { showByDefault: true, show: ['testGroup'] });
      log.simple1('c');
      log.mode('testMode', null);
      log.mode('testMode', { showByDefault: false, show: ['testGroup'] });
      log.simple1('d');
    })

  })

})