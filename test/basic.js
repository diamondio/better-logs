var assert = require('assert');
var BetterLogs = require('../');

describe('Basic Test', function () {

  it('should only create one controller', function () {
    var controller1 = BetterLogs();
    var controller2 = BetterLogs();
    assert.equal(typeof controller1, 'object');
    assert.equal(controller1, controller2);
  })

})