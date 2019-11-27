module.exports = {
  alias: {
    database: ['d', 'D'],
    resource: ['r', 'R'],
    secret: ['s', 'S'],
    'migrations-dir': ['m', 'M'],
  },
  default: {
    'migrations-dir': 'migrations/',
    database: process.env.DB_NAME || process.env.DATABASE_NAME,
    resource: process.env.DB_RESOURCE_ARN || process.env.DATABASE_RESOURCE_ARN,
    secret: process.env.DB_SECRET_ARN || process.env.DATABASE_SECRET_ARN,
  },
};
