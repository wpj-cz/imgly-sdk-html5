/* globals it, describe */

var fs = require('fs')
var should = require('should')
var gutil = require('gulp-util')
var sassLint = require('../')

require('mocha')

var testFile1 = fs.readFileSync('test/fixtures/test.sass')

describe('gulp-9e-sass-lint', function () {
  it('should lint files', function (done) {
    var stream = sassLint()
    var fakeFile = new gutil.File({
      base: 'test/fixtures',
      cwd: 'test/',
      path: 'test/fixtures/test.sass',
      contents: testFile1
    })
    stream.once('data', function (newFile) {
      should.exist(newFile)
      should.exist(newFile.sassLint)
      newFile.sassLint[0].error
        .should.equal('Property `top` should not be defined after property `color` in line 3')
      newFile.sassLint[1].error
        .should.equal('Property `left` should not be defined after property `color` in line 3')
      newFile.sassLint[2].error
        .should.equal('Mixin should not be defined after property `color` in line 8')
      done()
    })
    stream.write(fakeFile)
    stream.end()
  })
})
