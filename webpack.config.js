const path = require('path');

const nodeConfig = {
  entry: './src/index.js',
  target: 'node',
  output: {
    filename: 'bundle.node.js',
    libraryTarget: 'commonjs',
    path: path.resolve(__dirname, 'dist')
  }
};

const webConfig = {
  entry: './src/index.js',
  target: 'web',
  node: {
    fs: 'empty',
    'child_process': 'empty'
  },
  output: {
    filename: 'bundle.web.js',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist')
  }
};

module.exports = [ nodeConfig, webConfig ];