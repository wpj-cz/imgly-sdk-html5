'use strict'

var through2 = require('through2'),
  sassLint = require('9e-sass-lint'),
  gutil = require('gulp-util'),
  PLUGIN_NAME = require('./package.json').name,
  defaultReporter = require('./reporters/stylish')

function gulp9eSassLint (opts) {
  opts = opts || {}

  function processFile (file, enc, cb) {
    if (file.isNull()) {
      return cb(null, file)
    }

    if (file.isStream()) {
      this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streams are not supported!'))
      return cb()
    }

    sassLint.lint(String(file.contents))
      .then(function (report) {
        file.sassLint = report
        cb(null, file)
      })
      .catch(function (e) {
        cb(e)
      })
  }

  return through2.obj(processFile)
}

gulp9eSassLint.reporter = function (reporter, opts) {
  // Load default reporter
  if (reporter === 'default') return defaultReporter(opts)

  // Load reporter from function
  if (typeof reporter === 'function') return reporter(opts)

  // load built-in reporters
  if (typeof reporter === 'string') {
    try {
      return require('gulp-9e-sass-lint/reporters/' + reporter)(opts)
    } catch (err) {}
  }

  // load full-path or module reporters
  if (typeof reporter === 'string') {
    try {
      return require(reporter)(opts)
    } catch (err) {}
  }
}

module.exports = gulp9eSassLint
