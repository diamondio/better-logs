var morgan  = require('morgan');
var datefmt = require('dateformat');

morgan.token('method-pad', function (req, res) {
  var output = '';
  if (req.method === 'POST') {
    output = req.method.toLowerCase();
  } else if (req.method === 'OPTIONS') {
    output = ' opt';
  } else if (req.method === 'PATCH') {
    output = ' pat';
  } else {
    output = ' ' + req.method.toLowerCase();
  }
  return statusCodeToColour(output, res);
});

morgan.token('datefmt', function () {
  return datefmt(new Date(), "HH:MM:ss");
});

morgan.token('status-code', function (req, res) {
  return statusCodeToColour(res.statusCode.toString(), res);
});

function statusCodeToColour(output, res) {
  if (res.statusCode >= 500) {
    return output.red;
  } else if (res.statusCode >= 400) {
    return output.yellow;
  } else if (res.statusCode >= 300) {
    return output.cyan;
  }
  return output.green;
}


module.exports = function (opts) {
  opts = opts || {};
  return function () {
    morgan(':datefmt'.grey + ' '.white + ':method-pad' + ' :url '.white + ':status-code' + ' :response-time ms'.grey, opts).apply(this, arguments);
  }
}
