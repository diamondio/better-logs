var assert = require('assert');
var stream = require('stream');
var logs = require('../');

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
      var log = logs('basic');
      log.format('simple', '{{message}}')
      log.output(VOID);
    })

    it('prints null', function (done) {
      var logged = '';
      var log = logs('testBasicNull');
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, 'null');
        done();
      })
      log.simple(null);
    })
    
    it('prints NaN', function (done) {
      var logged = '';
      var log = logs('testBasicNaN');
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, 'NaN');
        done();
      })
      log.simple(NaN);
    })
    
    it('prints undefined', function (done) {
      var logged = '';
      var log = logs('testBasicUndefined');
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, 'undefined');
        done();
      })
      log.simple(undefined);
    })
    
    it('prints string', function (done) {
      var logged = '';
      var log = logs('testBasicString');
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, 'hello');
        done();
      })
      log.simple('hello');
    })

    it('prints number', function (done) {
      var logged = '';
      var log = logs('testBasicNumber');
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, '12.75');
        done();
      })
      log.simple(12.75);
    })

    it('prints object', function (done) {
      var logged = '';
      var log = logs('testBasicObject');
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, '{ x: 1, y: [ \'a\', 2, 3 ], z: Infinity }');
        done();
      })
      log.simple({ x: 1, y: ['a', 2, 3], z: Infinity });
    })
    
    it('prints formatted', function (done) {
      var logged = '';
      var log = logs('testBasicFormatting');
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, '1: null 2: undefined 3: hello 4: 12 5: {"x":1,"y":["a",2,3]} extra');
        done();
      })
      log.simple('1: %s 2: %s 3: %s 4: %d 5: %j', null, undefined, 'hello', 12, { x: 1, y: ['a', 2, 3] }, 'extra');
    })
    
  })

})

describe('Customizations', function () {

  describe('custom log types', function () {

    before(function () {
      var log = logs('customize');
      log.format('simple', '{{message}}')
      log.format('alternative', '{{message}}')
      log.output(VOID);
    })

    it('should format basic', function (done) {
      var log = logs('testSectionName');
      log.format('testFormatBasic', '{{message}}! [{{section}}] type: {{type}} {} {{not_one}}');
      var logged = '';
      log.on('data', function (msg) {
        var logged = new Buffer(msg).toString();
        assert.equal(logged, 'a! [testSectionName] type: testFormatBasic {} {{not_one}}');
        done();
      })
      log.testFormatBasic('a');
    })
    
    it('should format stack', function testFnName(done) {
      var log = logs('section');
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
      var log = logs('testSectionName');
      log.display('dateformat', 'HH:MM year: yyyy')
      log.format('testFormatTime', '{{timestamp}}');
      var logged = '';
      log.on('data', function (msg) {
        var now = new Date();
        var logged = new Buffer(msg).toString();
        assert.equal(logged, pad(now.getHours(), 2) + ':' + pad(now.getMinutes(), 2) + ' year: ' + now.getFullYear());
        done();
      })
      log.testFormatTime('a');
    })
    
  })

  describe('custom output', function () {

    before(function () {
      var log = logs('custom-output');
      log.format('simple', '{{message}}');
      log.format('alternative', '{{message}}');
      log.output(VOID);
    })

    it('should set section output', function (done) {
      var log = logs('testSectionOutput');
      var output = new (stream.Writable)();
      output._write = function (msg) {
        var written = new Buffer(msg).toString();
        assert.equal(written, 'a');
        done();
      };
      log.output('testSectionOutput', output);
      log.simple('a');
    })

    it('should set section/type output', function (done) {
      var log = logs('testSectionTypeOutput');
      var outputSimple = new (stream.Writable)();
      var outputDefault = new (stream.Writable)();
      outputSimple._write = function (msg) {
        var written = new Buffer(msg).toString();
        assert.equal(written, 'a');
      };
      outputDefault._write = function (msg) {
        var written = new Buffer(msg).toString();
        assert.equal(written, 'b');
        done();
      };
      log.output('testSectionTypeOutput', outputDefault);
      log.output('testSectionTypeOutput/simple', outputSimple);
      log.simple('a');
      log.alternative('b');
    })

  })
  
  describe('show and hide', function () {

    before(function () {
      var log = logs('shownhide');
      log.format('simple', '{{message}}');
      log.format('simple1', '{{message}}');
      log.format('simple2', '{{message}}');
      log.format('simple3', '{{message}}');
      log.output(VOID);
    })

    it('by default', function (done) {
      var log = logs('testShowDefault');
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'a');
        }
        if (writes === 2) {
          assert.equal(written, 'c');
          done();
        }
      });
      log.simple('a');
      log.hide()
      log.simple('b');
      log.show()
      log.simple('c');
    })

    it('section', function (done) {
      var log = logs('testShowSection');
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'b');
        }
        if (writes === 2) {
          assert.equal(written, 'e');
          done();
        }
      });
      log.hide()
      log.show('testShowSection')
      log.simple('b');
      log.hide('testShowSection')
      log.simple('c');
      log.show()
      log.hide('testShowSection')
      log.simple('d');
      log.show('testShowSection')
      log.simple('e');
    })

    it('section/type', function (done) {
      var log = logs('testShowSectionType');
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'd');
        }
        if (writes === 2) {
          assert.equal(written, 'f');
        }
        if (writes === 3) {
          assert.equal(written, 'e');
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
      var log = logs('testShowGroups');
      log.group('group1', ['section1', 'section2', 'testShowGroups']);
      log.group('group2', ['section3', 'section4']);
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'b');
        }
        if (writes === 2) {
          assert.equal(written, 'd');
        }
        if (writes === 3) {
          assert.equal(written, 'f');
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
      var log = logs('modes');
      log.format('simple', '{{message}}');
      log.format('simple1', '{{message}}');
      log.format('simple2', '{{message}}');
      log.format('simple3', '{{message}}');
      log.output(VOID);
    })

    it('by default', function (done) {
      var log = logs('testModeDefault');
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'b');
          done();
        }
      });
      log.mode('testMode', { showByDefault: false });
      log.mode('testMode');
      log.simple1('a');
      log.mode('testMode', { showByDefault: true });
      log.mode('testMode');
      log.simple1('b');
    })

    it('section/type', function (done) {
      var log = logs('testModeSection');
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'c');
        }
        if (writes === 2) {
          assert.equal(written, 'd');
        }
        if (writes === 3) {
          assert.equal(written, 'f');
        }
        if (writes === 4) {
          assert.equal(written, 'i');
        }
        if (writes === 5) {
          assert.equal(written, 'k');
          done();
        }
      });
      log.reset();
      log.mode('testMode', { showByDefault: false, hide: ['testModeSection'] });
      log.mode('testMode');
      log.simple1('a');
      log.mode('testMode', { showByDefault: true, hide: ['testModeSection'] });
      log.mode('testMode');
      log.simple1('b');
      log.mode('testMode', { showByDefault: false, show: ['testModeSection'] });
      log.mode('testMode');
      log.simple1('c');
      log.mode('testMode', { showByDefault: false, show: ['testModeSection'] });
      log.mode('testMode');
      log.simple1('d');
      log.mode('testMode', { showByDefault: false, show: ['testModeSection'], hide: ['simple1'] });
      log.mode('testMode');
      log.simple1('e');
      log.simple2('f');
      log.mode('testMode', { showByDefault: false, hide: ['testModeSection'], hide: ['simple1'] });
      log.mode('testMode');
      log.simple1('g');
      log.simple2('h');
      log.mode('testMode', { showByDefault: false, show: ['testModeSection'], show: ['simple1'] });
      log.mode('testMode');
      log.simple1('i');
      log.simple2('j');
      log.mode('testMode', { showByDefault: true, hide: ['testModeSection'], show: ['simple1'] });
      log.mode('testMode');
      log.simple1('k');
      log.simple2('l');
    })

    it('groups', function (done) {
      var log = logs('testModeGroups');
      log.group('testGroup', ['section1', 'section2', 'testModeGroups']);
      log.mode('testMode');
      var writes = 0;
      log.on('data', function (msg) {
        writes++;
        var written = new Buffer(msg).toString();
        if (writes === 1) {
          assert.equal(written, 'c');
        }
        if (writes === 2) {
          assert.equal(written, 'd');
          done();
        }
      });
      log.reset();
      log.mode('testMode', { showByDefault: true, hide: ['testGroup'] });
      log.mode('testMode');
      log.simple1('a');
      log.mode('testMode', { showByDefault: false, hide: ['testGroup'] });
      log.mode('testMode');
      log.simple1('b');
      log.mode('testMode', { showByDefault: true, show: ['testGroup'] });
      log.mode('testMode');
      log.simple1('c');
      log.mode('testMode', { showByDefault: false, show: ['testGroup'] });
      log.mode('testMode');
      log.simple1('d');
    })

  })

})