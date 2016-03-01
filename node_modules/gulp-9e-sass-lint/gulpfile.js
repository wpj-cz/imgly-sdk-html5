var gulp = require('gulp');
var sassLint = require('./');
var Mocha = require('mocha');

gulp.task('lint', function () {
  return gulp.src('test/**/*.sass')
  .pipe(sassLint())
  .pipe(sassLint.reporter('default'));
});
