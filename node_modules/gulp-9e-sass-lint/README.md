## Information

<table>
<tr>
<td>Package</td><td>gulp-9e-sass-lint</td>
</tr>
<tr>
<td>Description</td>
<td>9e-sass-lint plugin for Gulp</td>
</tr>
<tr>
<td>Node Version</td>
<td>>= 0.4</td>
</tr>
</table>

## Screenshot

![](http://i.imgur.com/HTN9cyD.png)

## Install

    npm install gulp-9e-sass-lint --save-dev

## Usage

```js
var sassLint = require('gulp-9e-sass-lint');
var gulp   = require('gulp');

gulp.task('lint', function() {
  return gulp.src('./stylesheets/*.sass')
    .pipe(sassLint())
    .pipe(sassLint.reporter('default', {
      breakOnError: true
    }));
});
```

## LICENSE

The MIT License (MIT)

Copyright (c) 2014 9elements GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
