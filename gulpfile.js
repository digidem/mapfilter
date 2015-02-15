var fs = require('fs')
var join = require('path').join
var gulp = require('gulp')
var gutil = require('gulp-util')
var sourcemaps = require('gulp-sourcemaps')
var source = require('vinyl-source-stream')
var buffer = require('vinyl-buffer')
var watchify = require('watchify')
var browserify = require('browserify')
var del = require('del')
var runSequence = require('gulp-run-sequence')
var connect = require('gulp-connect')
var sass = require('gulp-sass')
var concatCss = require('gulp-concat-css')
var compileTemplates = require('gulp-template-compile')
var concat = require('gulp-concat')
var ChromeExtension = require('crx')
var deployGh = require('gulp-gh-pages')


// primary

gulp.task('default', ['live-dev'])
gulp.task('build', ['build-chrome'])


// util

gulp.task('clean', function clean(cb) {
  del(['dist'], cb)
})


// generic

gulp.task('css', function css(){
  return gulp.src('./app/css/**.css')
    // build bundle
    .pipe(concatCss('bundle.css'))
    .pipe(gulp.dest('./dist/'))
    .pipe(connect.reload())
})

gulp.task('img', function img() {
  return gulp.src('./app/images/**')
    .pipe(gulp.dest('./dist/images'))
    .pipe(connect.reload())
})

gulp.task('templates', function () {
  return gulp.src('./app/html/*.jst')
      .pipe(compileTemplates({
        name: function (file) {
          // rename template w/o extension
          var extension = '.jst'
          return file.relative.slice(0, -extension.length)
        }
      }))
      .pipe(concat('templates.js'))
      .pipe(gulp.dest('dist'))
      .pipe(connect.reload())
})

gulp.task('js', function buildChromeJs() {
  return browserify('./app/js/index.js').bundle()
    // log errors
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    // perform bundle
    .pipe(source('bundle.js'))
    // .pipe(streamify(uglify()))
    .pipe(gulp.dest('./dist/'))
})

gulp.task('html', function devHtml() {
  return gulp.src('./app/index.html')
    .pipe(gulp.dest('./dist/'))
    .pipe(connect.reload())
})

// development

gulp.task('live-dev', ['dev', 'dev-server'], function() {
  gulp.watch('./app/css/**', ['css'])
  gulp.watch('./app/images/**', ['img'])
  gulp.watch('./app/js/**', ['live-js'])
  gulp.watch('./app/html/**', ['templates'])
  gulp.watch('./app/index.html', ['html'])
  gutil.log(gutil.colors.bgGreen('Watching for changes...'))
})

gulp.task('dev', function(callback){
  runSequence('clean', 'build-dev', callback)
})

gulp.task('build-dev', ['js', 'templates', 'css', 'img', 'html'])

gulp.task('dev-server', function startServer() {
  connect.server({
    root: './dist',
    livereload: true,
  })
})

var bundler = watchify(browserify('./app/js/index.js', watchify.args))
// brfs needed for watchify
bundler.transform('brfs')

gulp.task('live-js', function devJs() {
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
})

// chrome packaged app

// not optimized but it works
// still need to hit refresh on chrome extensions page
gulp.task('live-chrome', ['build-chrome', 'dev-server'], function liveChrome() {
  gulp.watch('./app/css/**', ['chrome-package'])
  gulp.watch('./app/images/**', ['chrome-package'])
  gulp.watch('./app/js/**', ['chrome-package'])
  gulp.watch('./app/html/**', ['chrome-package'])
  gulp.watch('./containers/chrome/*', ['chrome-package'])
  gutil.log(gutil.colors.bgGreen('Watching for changes...'))
})

gulp.task('build-chrome', function(callback){
  runSequence('clean', ['chrome-package'], callback)
})

gulp.task('chrome-meta', function buildChromeMeta() {
  return gulp.src('./containers/chrome/**')
    .pipe(gulp.dest('./dist/'))
})

gulp.task('chrome-package', ['chrome-meta', 'templates', 'js', 'css', 'img', 'html'], function buildChromePackage(callback) {
  var packagePath = join(__dirname, 'dist')
  var destPath = join(__dirname, 'dist')
  var keyPath = join(__dirname, 'chrome.pem')

  var crx = new ChromeExtension({
    rootDirectory: packagePath,
    privateKey: fs.readFileSync(keyPath),
  })

  crx.pack().then(function(crxBuffer){
    fs.writeFile(join(destPath, 'map-filter.crx'), crxBuffer, callback)
  }).catch(function(err){
    callback(err)
  })
})


// deploy

gulp.task('deploy', ['dev'], function () {
  return gulp.src('./dist/**/*')
    .pipe(deployGh({
      remote: 'origin',
      branch: 'gh-pages',
    }))
})

