const minimist = require('minimist');
const rc = require('rc');
const Dot = require('dot-object');

const options = require('./options');
const migrate = require('./migrate');

exports.run = () => migrate(
  rc('migration', new Dot('-').object(minimist(process.argv.slice(2), options))),
).catch(console.error);
