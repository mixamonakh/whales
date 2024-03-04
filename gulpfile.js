const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const browserSync = require('browser-sync');
const concat = require('gulp-concat');
const uglify = require('gulp-uglifyjs');
const cssnano = require('gulp-cssnano');
const rename = require('gulp-rename');
const clean = require('gulp-clean');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const cache = require('gulp-cache');
const autoprefixer = require('gulp-autoprefixer');
const webp = require('gulp-webp');
const uncss = require('gulp-uncss');
const svgSprite = require('gulp-svg-sprite');
const svgmin = require('gulp-svgmin');
const cheerio = require('gulp-cheerio');
const replace = require('gulp-replace');
const panini = require('panini');

// tasks

gulp.task('panini', function() {
    panini.refresh(); // Очистка кэша Panini перед каждой сборкой
    return gulp.src('app/panini/pages/**/*.html')
      .pipe(panini({
        root: 'app/panini/pages/',
        layouts: 'app/panini/layouts/',
        partials: 'app/panini/partials/',
        data: 'app/panini/data/'
      }))
      .pipe(gulp.dest('app'));
  });
  gulp.task('copy-foundation', function() {
    return gulp.src('node_modules/foundation-sites/dist/**/*')
      .pipe(gulp.dest('app/vendor/foundation'));
  });

// лайв сервер
gulp.task('browser-sync', function(){
    browserSync({
        server: {
            baseDir: 'app'
        },
        notify: false
    });
});

// следим за изменениями js
gulp.task('scripts', function(){
    return gulp.src('app/js/script.js')
        .pipe(browserSync.reload({stream: true}))
});

// собираем библиотеки и минифицируем
gulp.task('libs', function(){
    return gulp.src([
        'app/libs/jquery/dist/jquery.min.js',
        'app/libs/swiper/swiper.min.js'
    ])
    .pipe(concat('libs.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('app/js'))
});

// следим за изменениями html
gulp.task('code', function(){
    return gulp.src('app/*.html')
        .pipe(browserSync.reload({stream: true})) // Обновляем HTML на странице при изменении
});

// компилируем sass/scss в css
gulp.task('scss', function(){
    return gulp.src('app/scss/**/*.scss')
        .pipe(sass())
        .pipe(cache(cssnano()))
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('app/css'))
        .pipe(browserSync.reload({stream: true})) // Обновляем CSS на странице при изменении
});

// минифиццируем css
gulp.task('css-nano', function(){
    return gulp.src('app/scss/*.scss')
        .pipe(sass())
        .pipe(autoprefixer(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
        .pipe(cssnano())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('app/css'));
});

// gulp buid

// чистим папку dist
gulp.task('clean', function(){
    return gulp.src('dist', {allowEmpty: true}).pipe(clean());
});

// ! чистим неиспользуемый css
gulp.task('uncss', function () {
    return gulp.src('app/css/kit-style.min.css') // ! Из этого файла стилей
        .pipe(uncss({
            html: ["app/*.html"]
        }))
        .pipe(gulp.dest('app/css'));
});

// сжатие картиночек
gulp.task('img', function(){
    return gulp.src('app/image/**/*.+(jpg|png)')
    .pipe(cache(imagemin({
        interlaced: true,
        progressive: true,
        svgoPlugins: [{removeViewBox: false}],
        use: [pngquant()]
    })))
    .pipe(webp())
    .pipe(gulp.dest('app/image'));
});

// переносим файлы в buld
gulp.task('prebuild', async function(){
    const buildCss = gulp.src([
        'app/css/*.min.css',
        'app/css/fonts.css'
    ])
    .pipe(gulp.dest('dist/css'))

    const buildFonts = gulp.src([
        'app/fonts/**/*'
    ])
    .pipe(gulp.dest('dist/fonts'))

    const buildJs = gulp.src([
        'app/js/**/*'
    ])
    .pipe(gulp.dest('dist/js'))

    const buildHtml = gulp.src([
        'app/*.html'
    ])
    .pipe(gulp.dest('dist'));

    const buildIcons = gulp.src([
        'app/icons/**/*'
    ])
    .pipe(gulp.dest('dist/icons'));

    const buildImage = gulp.src([
        'app/image/**/*.{webp,svg}'
    ])
    .pipe(gulp.dest('dist/image'));

    // const buildSprite = gulp.src([
    //     'app/icons/sprite.svg'
    // ])
    // .pipe(gulp.dest('dist/icons'));
});

// чистим кэш
gulp.task('clear', function (callback) {
	return cache.clearAll();
})

// gulp.watch
gulp.task('watch', function(){
    gulp.watch('app/scss/**/*.scss', gulp.parallel('scss')); //следим за scss файлами
    gulp.watch('app/js/script.js', gulp.parallel('scripts')); //следим за js
    gulp.watch('app/*.html', gulp.parallel('code')); //следим за html
    gulp.watch(['app/panini/pages/**/*.html', 'app/panini/layouts/**/*.html', 'app/panini/partials/**/*.html', 'app/panini/data/**/*.json'], gulp.series('panini'));
});

gulp.task('default', gulp.parallel( 'panini', 'copy-foundation', 'scss', 'css-nano', 'libs', 'img', 'browser-sync', 'watch'));
gulp.task('build', gulp.series('clean', 'css-nano', 'uncss', 'prebuild', 'libs'));



// делаем svg
const appDir = 'app/';
gulp.task('svgSpriteBuild', function () {
	return gulp.src(appDir + 'icons/sprites/*.svg')
	// минифицируем svg
		.pipe(svgmin({
			js2svg: {
				pretty: true
			}
		}))
		// удаляем лишние атрибуты
		.pipe(cheerio({
			run: function ($) {
				$('[fill]').removeAttr('fill');
				$('[stroke]').removeAttr('stroke');
				$('[style]').removeAttr('style');
			},
			parserOptions: {xmlMode: true}
		}))
		// правим баг (иногда он преобразовывает символ ‘>’ в кодировку '&gt;')
		.pipe(replace('&gt;', '>'))
		// делем спрайт
		.pipe(svgSprite({
			mode: {
				symbol: {
					sprite: "../sprite.svg"
				}
			}
		}))
		.pipe(gulp.dest(appDir + '/icons'));
});