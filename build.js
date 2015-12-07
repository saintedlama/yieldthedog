'use strict';

const metalsmith = require('metalsmith');
const markdown = require('metalsmith-markdown');
const layouts = require('metalsmith-layouts');
const render = require('metalsmith-in-place');
const collections = require('metalsmith-collections');
const permalinks = require('metalsmith-permalinks');
const branch = require('metalsmith-branch');
const feed = require('metalsmith-feed');
const archive = require('metalsmith-archive');
const moment = require('moment');

require('shelljs/global');

metalsmith(__dirname)
  .metadata({
    site: {
      title: 'Yield the Dog',
      url: 'https://yieldthedog.github.io/',
      author: 'The Dog'
    }
  })
  .use(fixCategories())
  .use(fixDates())
  .use(isPublished())
  .use(collections({
    posts: {
      pattern: 'posts/*.*',
      sortBy: 'date',
      reverse: true
    }
  }))
  .use(markdown())
  .use(permalinks({
    pattern: ':collection/:title'
  }))
  .use(archive())
  .use(feed({ collection: 'posts' }))
  .use(render('ejs'))
  .use(layouts('ejs'))
  .destination('./build')
  .build(function(err) {
    if (err) { throw err; }

    if (process.argv[2] == 'release') {
      if (process.argv.length < 4) {
        console.error('Please specify a release message used as git commit message');
        process.exit(2);
      }

      if (exec('git status --porcelain').output != '') {
        console.error('Git working directory not clean. Please commit and build again!');
        process.exit(2);
      }

      exec('git checkout gh-pages');
      cp('-rf', 'build/*', '.');

      exec(`git commit -a -m ${process.argv[3]}`);
      exec(`git push`);
    }
  });

function isPublished(){
  return function(files, metalsmith, done){
    Object.keys(files).forEach(function(file){
      var data = files[file];
      if (data.published === false) delete files[file];
    });

    done();
  };
}

function fixCategories(){
  return function(files, metalsmith, done){
    Object.keys(files).forEach(function(file){
      var data = files[file];

      if (data.categories === null || data.categories === undefined) {
        data.categories = [];
      } else if (typeof data.categories == 'string') {
        data.categories = data.categories.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
    });

    done();
  };
}

function fixDates() {
  return function(files, metalsmith, done) {
    Object.keys(files).forEach(function(file) {
      var data = files[file];

      if (!data.date) {
        console.log('File', file, 'has no published date set!');
      }

      data.date = moment(data.date).toDate();
    });

    done();
  }
}