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

  })
  
  describe('log', function () {

    it('should create a log', function () {
      var log = BetterLogs('section');
      assert.equal(typeof log, 'object');
    })

    it('should be readable', function () {
      var log = BetterLogs('section');
      assert.ok(isStream.readable(log))
    })

  })

  describe('defaults', function () {

    it('should have basic log functions', function () {
    })

    it('should have basic modes', function () {
    })
    
    it('should have stdout output', function () {
    })

  })

})