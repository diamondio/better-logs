var util     = require('util');
var Readable = require('stream').Readable;

function BetterLog (opts) {

  Readable.call(this, opts);

  this.section       = opts.section       || 'general';
  this.stackIndex    = opts.stackIndex    || 1;
  this.maxTraceDepth = opts.maxTraceDepth || 20;
  this.dateformat    = opts.dateformat    || 'yyyy-mm-dd HH:MM:ss';
  
  this.started = false;
  this._unwritten = [];

}

util.inherits(BetterLog, Readable);

BetterLog.prototype._read = function (n) {
  this.started = true;
  this._flush();
}

BetterLog.prototype._flush = function () {
  if (this._unwritten.length) {
    this.push(this._unwritten.join(''));
    this._unwritten = [];
  }
}

BetterLog.prototype._log = function (msg) {
  if (this.started) {
    return this.push(msg);
  }
  this._unwritten.push(msg);
}

module.exports = BetterLog;
