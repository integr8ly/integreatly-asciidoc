const { readdir, statSync } = require('fs');
const { extname, resolve, join } = require('path');
const { EventEmitter } = require('events');

/**
 * Recursive directory traversal. This class is implemented as an EventEmitter
 * that will emit `file` events for every adoc file it encounters in a nested
 * directory structure.
 */
class AdocCollector extends EventEmitter {
  constructor(entry) {
    super();
    this.entry = entry;
  }

  run() {
    readdir(this.entry, (err, files) => {
      files.forEach((file) => {
        file = resolve(this.entry, file);
        let stat = statSync(file);

        if (stat.isDirectory()) {
          // Subdir
          let rec = new AdocCollector(file);
          rec.on('adoc', (file) => this.emit('adoc', file));
          rec.on('json', (file) => this.emit('json', file));
          rec.run();
        } else if (stat.isFile() && extname(file) === '.adoc') {
          // Asciidoc
          this.emit('adoc', file);
        } else if (stat.isFile() && extname(file) === '.json') {
          // JSON
          this.emit('json', file);
        }
      });
    });
  }
}

/**
 * Verifies the walkthrough directory structure. Every walkthrough is expected to
 * have it's own subdirectory and every subdirectory needs to have two files:
 * 1) walkthrough.json
 * 2) walkthrough.adoc
 *
 * @param dir The directory where the walkthroughs are located
 * @returns {Promise<any>}
 */
function verifyDirectoryStructure(dir) {
  console.log(`checking ${dir}`);

  function verifyWalkthrough(subdir) {
    console.log(`checking ${subdir}`);

    return new Promise((resolve, reject) => {
      readdir(subdir, (err, files) => {
        if (err) {
          return reject(err);
        }

        if (files.indexOf('walkthrough.adoc') < 0) {
         return reject(new Error(`ERROR walkthrough.adoc missing in ${subdir}`));
        }

        if (files.indexOf('walkthrough.json') < 0) {
          return reject(new Error(`ERROR walkthrough.json missing in ${subdir}`));
        }

        return resolve();
      })
    });
  }

  const stat = statSync(dir);
  if (!stat.isDirectory()) {
    console.error(`ERROR ${dir} is not a directory`);
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    readdir(dir, (err, files) => {
      if (err) {
        return reject(err);
      }

      const mapped = files.map(file => verifyWalkthrough(join(dir, file)));
      Promise.all(mapped).then(() => resolve(dir)).catch(reject);
    });
  });
}

module.exports = {
  AdocCollector, verifyDirectoryStructure
};