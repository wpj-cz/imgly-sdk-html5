#!/bin/bash

docker run -it --rm -v "$(pwd)":/usr/src/app -w /usr/src/app node:10 npm i
docker run -it --rm -v "$(pwd)":/usr/src/app -v "$(realpath ../../engine/admin/static/imglyKit)":/usr/src/app/build -w /usr/src/app node:10 ./node_modules/gulp/bin/gulp.js release
chmod 777 ../../engine/admin/static/imglyKit/
