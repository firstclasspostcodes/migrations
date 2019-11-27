const glob = require('glob');
const path = require('path');

const { createMigration, createMigrationsTable, getMigrations } = require('./sql');
const { fileChecksum, fileTimestamp, mapColumns } = require('./utils');

const sortMigrations = ({ timestamp: a }, { timestamp: b }) => a - b;

exports.insertMigrations = async (dataApiClient, migrations = [], params = {}) => {
  if (migrations.length === 0) {
    return true;
  }

  const parameterSets = migrations.map(({ filename, hash }) => (
    Object.entries({ filename, hash }).map(([name, stringValue]) => ({
      name,
      value: {
        stringValue,
      },
    }))
  ));

  return dataApiClient.batchExecuteStatement({
    ...params,
    sql: createMigration,
    parameterSets,
  }).promise();
};

exports.getMigrations = async (dataApiClient, params = {}) => {
  await dataApiClient.executeStatement({
    sql: createMigrationsTable,
    ...params,
  }).promise();

  const data = await dataApiClient.executeStatement({
    includeResultMetadata: true,
    sql: getMigrations,
    ...params,
  }).promise();

  const mapped = mapColumns(data);

  return mapped;
};

exports.filterMigrations = (localMigrations, committedMigrations) => (
  localMigrations.filter((migration) => {
    const { timestamp, filename } = migration;

    const match = committedMigrations.find((other) => other.filename === filename);

    if (match) {
      if (match.hash !== migration.hash) {
        throw new Error(`"${filename}" (${migration.hash}) hash does not match ${match.hash}`);
      }
      return false;
    }

    const created = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

    const { length: after } = committedMigrations.filter((committed) => (
      new Date(committed.timestamp) > created
    ));

    if (after > 0) {
      throw new Error(`Migration "${filename}" is before a committed timestamp.`);
    }

    return true;
  })
);

exports.localMigrations = ({ migrations: { dir } }) => {
  const directoryPath = path.resolve(process.cwd(), dir);
  const files = glob.sync(`${directoryPath}/*.sql`);
  const migrations = files.map((file) => ({
    filepath: file,
    filename: path.parse(file).base,
    timestamp: fileTimestamp(file),
    hash: fileChecksum(file),
  }));
  const sorted = migrations.sort(sortMigrations);
  return sorted;
};
