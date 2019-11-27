const AWS = require('aws-sdk');
const Listr = require('listr');

const {
  getMigrations, insertMigrations, localMigrations, executeMigration, filterMigrations,
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

  const tasks = [
    {
      title: 'Read local migrations',
      task: async (ctx) => {
        const local = localMigrations(config);
        Object.assign(ctx, { local });
        return `${local.length} migrations`;
      },
    },
    {
      title: 'Fetch committed migrations',
      task: async (ctx) => {
        const committed = await getMigrations(client);
        Object.assign(ctx, { committed });
        return `${committed.length} committed migrations`;
      },
    },
    {
      title: 'Find new migrations',
      task: async (ctx) => {
        const { local, committed } = ctx;
        const migrations = filterMigrations(local, committed);
        Object.assign(ctx, { migrations });
        return `${migrations.length} new migrations`;
      },
    },
    {
      title: 'Execute new migrations',
      skip: ({ migrations }) => migrations.length === 0,
      task: ({ migrations }) => new Listr(migrations.map((migration) => ({
        title: migration.filename,
        task: () => executeMigration(client, migration),
      }))),
    },
    {
      title: 'Save committed migrations',
      skip: ({ migrations }) => migrations.length === 0,
      task: ({ migrations }) => insertMigrations(client, migrations),
    },
  ];

  return new Listr(tasks).run();
};
