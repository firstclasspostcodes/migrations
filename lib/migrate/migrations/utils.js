const crypto = require('crypto');
const path = require('path');
const { readFileSync } = require('fs');

// eslint-disable-next-line no-unused-vars
const mapVal = (obj, metadata) => Object.values(obj)[0];

const mapColumns = ({ columnMetadata, records = [] }) => (
  records.map((record) => (
    record.reduce((obj, val, index) => ({
      ...obj,
      [columnMetadata[index].name]: mapVal(val, columnMetadata[index]),
    }), {})
  ))
);

const readFile = (filepath) => readFileSync(filepath, 'utf8');

const fileChecksum = (filepath) => {
  const hash = crypto.createHash('sha1');
  const contents = readFile(filepath, 'utf8');
  hash.setEncoding('hex');
  hash.write(contents);
  hash.end();
  return hash.read();
};

const fileTimestamp = (filepath) => {
  const { base, name } = path.parse(filepath);
  const matches = name.match(/^([0-9]{4})([0-9]{2})([0-9]{2})-/);
  if (!matches) {
    throw new Error(`Invalid naming for migration file: "${base}"`);
  }
  const [, year, month, day] = matches;
  return new Date(`${year}-${month}-${day}`);
};

module.exports = {
  mapVal,
  mapColumns,
  fileChecksum,
  fileTimestamp,
  readFile,
};
