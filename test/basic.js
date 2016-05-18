var assert = require('assert');
var isStream = require('is-stream');
var BetterLogs = require('../');

describe('API Test', function () {

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

    it('should set options', function () {
      // Check setting multiple times
    })

  })
  
  describe('log', function () {

    it('should create a log', function () {
      var log = BetterLogs('section');
      assert.equal(typeof log, 'object');
    })

    it('should be readable', function () {
      var log = BetterLogs('section');
      assert.ok(isStream.readable(log))
      // Hook and test
    })

    it('should override console', function () {
    })

  })

  describe('defaults', function () {

    it('should have basic log types', function () {
    })

    it('should have basic modes', function () {
    })
    
    it('should have stdout output', function () {
    })

  })

  describe('custom log types', function () {

    it('should format basic', function () {
      // Try all formats
    })
    
    it('should format stack', function () {
    })
    
    it('should format function', function () {
    })
    
  })

  describe('custom output', function () {

    it('should set default output', function () {
    })

    it('should set section output', function () {
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