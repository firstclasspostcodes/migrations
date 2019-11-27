const { readFileSync } = require('fs');

const read = (path) => readFileSync(path, 'utf8');

exports.createMigration = read(`${__dirname}/create-migration.sql`);

exports.createMigrationsTable = read(`${__dirname}/create-migrations-table.sql`);

exports.getMigrations = read(`${__dirname}/get-migrations.sql`);
