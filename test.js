var assert = require('assert'), execFile = require('child_process').execFile, fs = require('fs'), path = require('path');
var should = require('should');
var symbol_id = require('./symbol_id');

describe('jsg output', function() {
  [
    {name: 'simple'},
    {name: 'simpler'},
    {name: 'func_local'},
  ].filter(function(test) { return new RegExp(process.env['F'] || '').test(test.name); }).forEach(function(test) {
    it(test.name + ' (with args: ' + (test.args || []).join(' ') + ')', function(done) {
      var expFile = './testdata/' + test.name + '.json';
      var want = fs.existsSync(expFile) ? require(expFile) : {};
      var args = [path.join(__dirname, 'bin/jsg')];
      if (test.args) args.push.apply(args, test.args);
      (test.files || [test.name]).forEach(function(f) { args.push('testdata/' + f + '.coffee'); });
      execFile(process.execPath /* node */, args, function(err, stdout, stderr) {
        if (stderr) console.error(stderr);
        assert.ifError(err);
        if (test.failing) return done();
        var got = JSON.parse(stdout);
        if (process.env['EXP']) {
          var pp = JSON.stringify(got, null, 2);
          fs.writeFile(expFile, pp + '\n', function(err) {
            assert.ifError(err);
            assert(false); // don't let test pass when writing expectation
            done();
          });
          return;
        }

        //Confirm equality
        got.should.eql(want);
        done();
      });
    });
  });
});

describe('symbol_id.parse', function() {
  [
    {id: '!node.a/b`js.c.d', want: {namespace: 'commonjs', module: 'a/b.js', path: 'c.d'}},
    {id: '!node.a/b`js', want: {namespace: 'commonjs', module: 'a/b.js', path: ''}},
    {id: '!requirejs.a/b`js.c.d', want: {namespace: 'requirejs', module: 'a/b.js', path: 'c.d'}},
    {id: '!requirejs.a/b`js', want: {namespace: 'requirejs', module: 'a/b.js', path: ''}},
    {id: '^.a.b', want: {namespace: 'global', path: 'a.b'}},
    {id: '@a/b`js.a.b', want: {namespace: 'file', module: 'a/b.js', path: 'a.b'}},
  ].forEach(function(test) {
    it(test.id, function(done) {
      symbol_id.parse(test.id).should.eql(test.want);
      done();
    });
  });
});
