// my-reporter.js
var StackTraceParser = require('stacktrace-parser');
var path = require('path');
var mocha = require('mocha');
module.exports = MyReporter;

function MyReporter(runner) {
    mocha.reporters.Spec.call(this, runner);

    runner.on('fail', function (test, err) {
        var lines = StackTraceParser.parse(err.stack);
        // if (lines && lines.length > 1) {
        //     debugger;
        // }
        // we are only interested in the place in the test which originated the error
        // var line = lines.find(line => line.file.startsWith('test'))
        var line = lines.length ? lines[0] : undefined;
        // var line = lines.length ? lines.at(-1) : undefined;
        if (line) {
            //   console.log(`${line.file}(${line.lineNumber},${line.column}): error TS0000: ${err.message.split('\n')[0]}`)
            let testNames = [test.title];
            let parent = test.parent;
            while (parent.root === undefined || parent.root === false) {
                testNames.push(parent.title);
                parent = parent.parent;
            }
            const testName = testNames.reverse().join(' > ');
            const lastLine = lines.at(-1);
            const testFile = lastLine ? `${path.basename(lastLine.file)}(${lastLine.lineNumber},${lastLine.column})` : ''

            console.log(`${line.file}(${line.lineNumber},${line.column}): error TS0000: ${testFile} ${testName} ${err.message}`)
        }
    });

}

// To have this reporter "extend" a built-in reporter uncomment the     following line:
mocha.utils.inherits(MyReporter, mocha.reporters.Spec);