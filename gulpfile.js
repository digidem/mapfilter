var fs = require('fs')
var gulp = require('gulp')
var gutil = require('gulp-util')
var sourcemaps = require('gulp-sourcemaps')
var source = require('vinyl-source-stream')
var buffer = require('vinyl-buffer')
var watchify = require('watchify')
var browserify = require('browserify')
var HtmlInline = require('html-inline')
var del = require('del')
var runSequence = require('gulp-run-sequence')
var connect = require('gulp-connect')
var sass = require('gulp-sass')
var concatCss = require('gulp-concat-css')
var addsrc = require('gulp-add-src')

// primary

gulp.task('default', ['live-dev'])
gulp.task('build', ['build-chrome'])

// util

gulp.task('clean', clean)

// development

gulp.task('live-dev', ['dev', 'dev-server'], function() {
  gulp.watch('./app/css/**', ['dev-css'])
  gulp.watch('./app/js/**', ['dev-js'])
  gulp.watch('./**/*.html', ['dev-html'])
  gutil.log(gutil.colors.bgGreen('Watching for changes...'))
})

gulp.task('dev', function(callback){
  runSequence('clean', ['dev-js', 'dev-css', 'dev-img', 'dev-html'], callback)
})
gulp.task('dev-js', devJs)
gulp.task('dev-css', devCss)
gulp.task('dev-html', devHtml)
gulp.task('dev-img', devImg)

// chrome packaged app

gulp.task('build-chrome', function(callback){
  runSequence('clean', ['build-chrome-meta', 'build-chrome-js', 'build-chrome-css', 'build-chrome-html', 'build-chrome-package'], callback)
})
gulp.task('build-chrome-meta', buildChromeMeta)
gulp.task('build-chrome-js', buildChromeJs)
gulp.task('build-chrome-css', buildChromeCss)
gulp.task('build-chrome-html', ['build-chrome-js', 'build-chrome-css'], buildChromeHtml)
gulp.task('build-chrome-package', ['build-chrome-meta', 'build-chrome-html'], buildChromePackage)

gulp.task('dev-server', startServer)


//
//


// development

function startServer() {
  connect.server({
    root: './dist',
    livereload: true,
  })
}

var bundler = watchify(browserify('./app/js/index.js', watchify.args))
// brfs needed for watchify
bundler.transform('brfs')

function devJs() {
  return bundler.bundle()
    // log errors if they happen
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    // source maps
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write('./'))
    // output
    .pipe(gulp.dest('./dist'))
    // reload
    .pipe(connect.reload())
}

function devCss(){
  return gulp.src('./app/css/**.css')
    // compile sass
    // .pipe(sass())
    // add lib css
    // .pipe(addsrc('./lib/flexboxgrid.css'))
    // build bundle
    .pipe(concatCss('bundle.css'))
    .pipe(gulp.dest('./dist/'))
    .pipe(connect.reload())
}

function devImg() {
  return gulp.src('./app/images/**')
    .pipe(gulp.dest('./dist/images'))
    .pipe(connect.reload())
}

function devHtml() {
  return gulp.src('./containers/dev/index.html')
    .pipe(gulp.dest('./dist/'))
    .pipe(connect.reload())
}

// util

function clean(cb) {
  del(['dist'], cb)
}

// chrome app builds

function buildChromeMeta() {
  return gulp.src('./containers/chrome/package.json')
    .pipe(gulp.dest('./dist/'))
}

function buildChromeJs() {
  return browserify('./containers/chrome/index.js').bundle()
    // log errors
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    // perform bundle
    .pipe(source('bundle.js'))
    // .pipe(streamify(uglify()))
    .pipe(gulp.dest('./dist/'))
}

function buildChromeCss(){
  return gulp.src('./app/css/**.css')
    // compile scss
    // .pipe(sass())
    // add lib css
    // .pipe(addsrc('./lib/flexboxgrid.css'))
    // build bundle
    // .pipe(concatCss('bundle.css'))
    .pipe(gulp.dest('./dist/'))
}

function buildChromeHtml() {
  var inliner = HtmlInline({
    basedir: './dist/',
    ignoreScripts: false,
    ignoreImages: false,
    ignoreStyles: false,
  })
  inliner.on('error', gutil.log.bind(gutil, 'HtmlInline Error'))
  return fs.createReadStream('./app/index.html')
    .pipe(inliner)
    // name it, build it
    .pipe(source('index.html'))
    .pipe(gulp.dest('./dist/'))
}

function buildChromePackage(callback) {
  callback(new Error('not implemented'))
}
