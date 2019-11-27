# Migrations

![](https://github.com/firstclasspostcodes/migrations/workflows/Publish%20Package/badge.svg)

Run and manage migrations using the RDS HTTP Data API. Migrations are executed only once and sequential order.

This small library provides a CLI that can be configured using a configuration file, environment variables or command line flags.

## Installation

The CLI can be installed globally, using:

```
npm i -g @firstclasspostcodes/migrations
```

or can be executed using `npx`:

```
npx @firstclasspostcodes/migrations
```

## Usage

Create a folder named `migrations/` in your working directory.

You'll need to name your migrations in the following format: `YYYYMMDD-name-of-migration.sql`.

The CLI accepts configuration using a `.migrationrc` file with the following keys:

```json
{
  "database": "name_of_your_database",
  "resource": "arn-of-your-aws-rds-resource",
  "secret": "arn-of-your-aws-secrets-manager-secret",
  "migrations": {
    "dir": "migrations/"
  }
}
```

You can also use the following environment variables:

| Name | Alternative |
|---|---|
| `DB_NAME` | `DATABASE_NAME` |
| `DB_RESOURCE_ARN` | `DATABASE_RESOURCE_ARN` |
| `DB_SECRET_ARN` | `DATABASE_SECRET_ARN` |

If you provide any command-line flags, all of the aforementioned configuration values are overridden:

| Flag | Shorthand |
|---|---|
| `---database` | `-d`, `-D` |
| `---resource` | `-r`, `-R` |
| `---secret` | `-s`, `-S` |
| `---migrations-dir` | `-m`, `-M` |