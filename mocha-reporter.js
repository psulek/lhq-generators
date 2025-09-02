// my-reporter.js
var StackTraceParser = require('stacktrace-parser');
var path = require('path');
var mocha = require('mocha');
module.exports = MyReporter;

function MyReporter(runner) {
  mocha.reporters.Spec.call(this, runner);

  runner.on('fail', function(test, err){
    var lines = StackTraceParser.parse(err.stack);
    // if (lines && lines.length > 1) {
    //     debugger;
    // }
    // we are only interested in the place in the test which originated the error
    // var line = lines.find(line => line.file.startsWith('test'))
    var line = lines.length ? lines[0] : undefined;
    if (line) {
      console.log(`${line.file}(${line.lineNumber},${line.column}): error TS0000: ${err.message.split('\n')[0]}`)
    }
  });

}

// To have this reporter "extend" a built-in reporter uncomment the     following line:
mocha.utils.inherits(MyReporter, mocha.reporters.Spec);