#!/usr/bin/env node

const program = require('commander');
const { readFile } = require('fs');
const { check } = require('../dist/bundle.node');
const { AdocCollector, verifyDirectoryStructure } = require('./fileUtils');
const queue = require('async.queue');
var Ajv = require('ajv');
var ajv = new Ajv();
var validateJson = ajv.compile(require('./resources/schema'));

const BANNER = 'Integreatly Asciidoc';

function getVersion() {
  return `${BANNER} v${require('../package').version}`;
}

function readFromFile(path) {
  return new Promise((resolve, reject) => {
    readFile(path, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data.toString('utf-8'));
    });
  });
}

/**
 * Read from stdin. Allows the cli to be used with cat:
 * cat file.adoc | ./iad
 * @param stream stdin
 * @returns {Promise<any>}
 */
function readFromStream(stream) {
  return new Promise((resolve, reject) => {
    const data = [];
    stream.resume();
    stream.setEncoding('utf-8');
    stream.on('data', (chunk) => {
      data.push(chunk);
    });
    stream.on('end', () => {
      return resolve(data.join(''));
    });
    stream.on('error', reject);
  });
}

/**
 * Processes a directory and performs the following checks
 * 1) subdirs for walkthroughs present
 * 2) walkthrough.adoc present in every subdir
 * 3) walkthrough.json present in every subdir
 * 4) all adoc files valid
 * 5) all json files valid
 * @param dir The directory where
 * @param context
 */
function processDirectory(dir, context) {
  const collector = new AdocCollector(dir);

  // Process all adoc files sequentially
  const adocQueue = queue((doc, cb) => {
    readFromFile(doc).then(raw => {
      console.log(`processing ${doc}`);
      const success = check(raw, context);
      if (!success) {
        process.exit(1);
      }
      return cb();
    }).catch(handleError);
  });

  // Process all json files sequentially
  const jsonQueue = queue((doc, cb) => {
    console.log(`processing ${doc}`);
    let json;
    try {
      json = require(doc);
    } catch (_) {
      console.error(`ERROR Invalid or empty JSON file`);
      process.exit(1);
    }

    const success = validateJson(json);
    if (!success) {
      console.error('ERROR');
      console.error(validateJson.errors);
      process.exit(1);
    }
    return cb();
  });

  collector.on('adoc', file => {
    adocQueue.push(file)
  });

  collector.on('json', file => {
    jsonQueue.push(file);
  });

  // Collect all json and adoc files
  collector.run();
}

function wrapWithContext(context) {
  return function (raw) {
    const success = check(raw, context);
    if (!success) {
      process.exit(1);
    }
  }
}

function handleError(err) {
  console.error(err);
  process.exit(1);
}

function main () {
  program
    .version(getVersion())
    .option('-f --file <file>', 'Input file')
    .option('-d --directory <directory>', 'Walkthroughs path')
    .option('-W --warnings <level>', 'Treat warnings as errors when set to `error`')
    .parse(process.argv);

  if (program.directory) {
    verifyDirectoryStructure(program.directory)
      .then(dir => processDirectory(dir, program))
      .catch(handleError);
  } else if (program.file) {
    readFromFile(program.file).then(wrapWithContext(program)).catch(handleError);
  } else {
    readFromStream(process.stdin).then(wrapWithContext(program)).catch(handleError);
  }
}

main();