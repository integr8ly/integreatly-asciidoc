#!/usr/bin/env node

const program = require('commander');
const { readFile } = require('fs');
const { check } = require('../dist/bundle.node');

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

function wrapWithContext(context) {
  return function (raw) {
    const success = check(raw, context);
    if (!success) {
      process.exit(1);
    }
  }
}

function main () {
  program
    .version(getVersion())
    .option('-f --file <file>', 'Input file')
    .option('-W --warnings <level>', 'Treat warnings as errors when set to `error`')
    .parse(process.argv);

  if (program.file) {
    readFromFile(program.file).then(wrapWithContext(program)).catch(console.error);
  } else {
    readFromStream(process.stdin).then(wrapWithContext(program)).catch(console.error);
  }
}

main();