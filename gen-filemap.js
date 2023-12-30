// doesn't run on web, only for generating javascript mapping file.
const fs = require('fs');

const inputPath = 'inputs';
const files = Object.fromEntries(fs.readdirSync(inputPath).map(f => [f.split('.').at(0), inputPath + '/' + f]));
fs.writeFileSync('./filemap.js', `window.FILE_MAP = ${JSON.stringify(files)}`, 'utf-8');