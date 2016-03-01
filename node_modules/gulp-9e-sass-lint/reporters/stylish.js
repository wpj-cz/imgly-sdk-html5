'use strict'

var path = require('path'),
  through2 = require('through2'),
  gutil = require('gulp-util'),
  colors = require('colors/safe'),
  logSymbols = require('log-symbols'),
  appRoot = require('app-root-path'),
  PLUGIN_NAME = require('../package.json').name

function Stylish (options) {
  // Default options
  var opts = {
    breakOnError: false
  },
  totalErrorCount = 0

  // Extend and override default options with the ones user has set
  for (var attr in options) { opts[attr] = options[attr] }

  // File specific reporter
  function reportFile (filepath, data) {
    var lines = []

    // Filename
    lines.push(colors.magenta.underline(path.relative(appRoot.path, filepath)))

    // Loop file specific error/warning messages
    data.forEach(function (result) {
      var line = colors.yellow('line ' + result.position.line + ':' + result.position.column) + '\t' + colors.cyan(result.error)
      lines.push(line)
    })

    // Error/Warning count
    lines.push(logSymbols.error + ' ' + colors.red(data.length + ' error' + (data.length === 1 ? 's' : '')))

    return lines.join('\n') + '\n'
  }

  // Reporter header
  function reportHeader () {
    console.log(colors.green('9e-sass-lint results'))
    console.log('======================================\n')
  }

  // Reporter footer
  function reportFooter () {
    if (totalErrorCount === 0) {
      console.log(logSymbols.success + ' ' + colors.green('All OK!'))
    } else {
      console.log('======================================')
      console.log(logSymbols.error + colors.red(' Errors total: ' + totalErrorCount))
    }
  }

  reportHeader()

  return through2.obj(function (file, enc, cb) {
    if (file.isNull()) {
      return cb(null, file)
    }

    if (file.isStream()) {
      this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streams are not supported!'))
      return cb()
    }

    // Report file specific stuff only when there are some errors/warnings
    if (file.sassLint && file.sassLint.length) {
      totalErrorCount += file.sassLint.length

      console.log(reportFile(file.path, file.sassLint))
    }

    cb()
  })
    .on('end', function () {
      reportFooter()

      // If user wants gulp to break execution on reported errors or warnings
      if (totalErrorCount && opts.breakOnError) {
        this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Linter errors occurred!'))
      }
    })
}

module.exports = Stylish
