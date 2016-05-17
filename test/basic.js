var assert = require('assert');
var BetterLogs = require('../');

describe('API Test', function () {

  it('should only create one controller', function () {
    var controller1 = BetterLogs();
    var controller2 = BetterLogs();
    assert.equal(typeof controller1, 'object');
    assert.equal(controller1, controller2);
  })

  it('should have morgan', function () {
    var controller = BetterLogs();
    assert.equal(typeof controller.morgan, 'function');
  })
  
  it('should create a log', function () {
    var log = BetterLogs('section');
    assert.equal(typeof log, 'object');
  })

})