var fs = require('fs')
var join = require('path').join
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
var ChromeExtension = require('crx')
var CONFIG = require('./config.json')


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


// development

gulp.task('live-dev', ['dev', 'dev-server'], function() {
  gulp.watch('./app/css/**', ['css'])
  gulp.watch('./app/images/**', ['img'])
  gulp.watch('./app/js/**', ['live-js'])
  gulp.watch('./**/*.html', ['dev-html'])
  gutil.log(gutil.colors.bgGreen('Watching for changes...'))
})

gulp.task('dev', function(callback){
  runSequence('clean', ['live-js', 'css', 'img', 'dev-html'], callback)
})

gulp.task('dev-server', function startServer() {
  connect.server({
    root: './dist',
    livereload: true,
  })
})

gulp.task('live-js', function devJs() {
  var bundler = watchify(browserify('./app/js/index.js', watchify.args))
  // brfs needed for watchify
  bundler.transform('brfs')
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

gulp.task('dev-html', function devHtml() {
  return gulp.src('./containers/dev/index.html')
    .pipe(gulp.dest('./dist/'))
    .pipe(connect.reload())
})


// chrome packaged app

gulp.task('build-chrome', function(callback){
  runSequence('clean', ['chrome-meta', 'chrome-js', 'css', 'img', 'chrome-html', 'chrome-package'], callback)
})

gulp.task('chrome-meta', function buildChromeMeta() {
  return gulp.src('./containers/chrome/**')
    .pipe(gulp.dest('./dist/'))
})

gulp.task('chrome-js', function buildChromeJs() {
  return browserify('./app/js/index.js').bundle()
    // log errors
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    // perform bundle
    .pipe(source('bundle.js'))
    // .pipe(streamify(uglify()))
    .pipe(gulp.dest('./dist/'))
})

gulp.task('chrome-html', ['chrome-js', 'css', 'img'], function buildChromeHtml() {
  var inliner = HtmlInline({
    basedir: './dist/',
    ignoreScripts: false,
    ignoreImages: false,
    ignoreStyles: false,
  })
  inliner.on('error', gutil.log.bind(gutil, 'HtmlInline Error'))
  return fs.createReadStream('./containers/chrome/index.html')
    .pipe(inliner)
    // name it, build it
    .pipe(source('index.html'))
    .pipe(gulp.dest('./dist/'))
})

gulp.task('chrome-package', ['chrome-meta', 'chrome-html'], function buildChromePackage(callback) {
  var packagePath = join(__dirname, 'dist')
  var destPath = join(__dirname, 'dist')
  var keyPath = join(__dirname, 'chrome.pem')

  var crx = new ChromeExtension({
    rootDirectory: packagePath,
    // codebase: 'http://localhost:8000/myFirstExtension.crx',
    privateKey: fs.readFileSync(keyPath),
  })

  crx.pack().then(function(crxBuffer){
    // var updateXML = crx.generateUpdateXML()
    // fs.writeFile(join(destPath, 'update.xml'), updateXML)
    fs.writeFile(join(destPath, 'map-filter.crx'), crxBuffer, callback)
  }).catch(function(err){
    callback(err)
  })
})