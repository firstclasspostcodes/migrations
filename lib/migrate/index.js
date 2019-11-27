const AWS = require('aws-sdk');
const Listr = require('listr');

const {
  getMigrations, localMigrations, executeMigration, filterMigrations,
} = require('./migrations');

const { AWS_REGION } = process.env;

module.exports = async (config) => {
  const {
    database, resource: resourceArn, secret: secretArn,
  } = config;

  const client = new AWS.RDSDataService({
    region: AWS_REGION,
    params: { secretArn, resourceArn, database },
  });

  const local = localMigrations(config);
  const committed = await getMigrations(client);
  const migrations = filterMigrations(local, committed);

  console.log(JSON.stringify(migrations, null, '  '));

  return new Listr(migrations.map((migration) => ({
    title: migration.filename,
    task: () => executeMigration(migration),
  })));
};
