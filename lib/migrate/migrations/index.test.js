const path = require('path');
const AWSMock = require('aws-sdk-mock');
const AWS = require('aws-sdk');

const {
  insertMigrations, getMigrations, localMigrations, filterMigrations,
} = require('.');

const defaultParams = {
  secretArn: 'test',
  resourceArn: 'test',
};

describe('#insertMigrations', () => {
  let client;

  let migrations;

  const mockedBatchExecuteStatement = jest.fn();

  beforeEach(() => {
    AWSMock.mock('RDSDataService', 'batchExecuteStatement', mockedBatchExecuteStatement);
  });

  afterEach(() => {
    mockedBatchExecuteStatement.mockReset();
    AWSMock.restore('RDSDataService', 'batchExecuteStatement');
  });

  beforeEach(() => {
    client = new AWS.RDSDataService({
      region: 'eu-west-1',
    });
  });

  describe('when there are no migrations', () => {
    beforeEach(() => {
      migrations = [];
    });

    it('should do nothing', () => (
      expect(insertMigrations(client, migrations)).resolves.toBe(true)
    ));
  });

  describe('when there is 1 migration', () => {
    const migration = {
      filename: '20190101-committed-migration.sql',
      hash: 'committed',
      timestamp: new Date('2019-01-01').toISOString(),
    };

    beforeEach(() => {
      migrations = [migration];
    });

    beforeEach(() => {
      mockedBatchExecuteStatement.mockImplementation((params, cb) => {
        expect(params).toEqual(expect.objectContaining({
          parameterSets: [
            [
              {
                name: 'filename',
                value: {
                  stringValue: migration.filename,
                },
              },
              {
                name: 'hash',
                value: {
                  stringValue: migration.hash,
                },
              },
            ],
          ],
        }));
        cb(null, {});
      });
    });

    it('should be truthy', () => (
      expect(insertMigrations(client, migrations, defaultParams)).resolves.toBeTruthy()
    ));
  });
});

describe('#getMigrations', () => {
  let client;

  const columnMetadata = [
    {
      name: 'colA',
    },
    {
      name: 'colB',
    },
  ];

  const mockedExecuteStatement = jest.fn();

  beforeEach(() => {
    AWSMock.mock('RDSDataService', 'executeStatement', mockedExecuteStatement);
  });

  afterEach(() => {
    mockedExecuteStatement.mockReset();
    AWSMock.restore('RDSDataService', 'executeStatement');
  });

  beforeEach(() => {
    client = new AWS.RDSDataService({
      region: 'eu-west-1',
    });
  });

  describe('when there are no migrations', () => {
    const records = [];

    beforeEach(() => {
      mockedExecuteStatement.mockImplementation((params, cb) => {
        cb(null, { columnMetadata, records });
      });
    });

    it('should be an empty array', () => (
      expect(getMigrations(client, defaultParams)).resolves.toHaveLength(0)
    ));
  });

  describe('when there is one migration', () => {
    const records = [
      [
        { stringValue: 'a' },
        { stringValue: 'b' },
      ],
    ];

    beforeEach(() => {
      mockedExecuteStatement.mockImplementation((params, cb) => {
        cb(null, { columnMetadata, records });
      });
    });

    it('should be an empty array', () => (
      expect(getMigrations(client, defaultParams)).resolves.toEqual(
        expect.arrayContaining([{
          colA: 'a',
          colB: 'b',
        }]),
      )
    ));
  });
});

describe('#localMigrations', () => {
  // eslint-disable-next-line global-require
  const fs = require('fs');

  const dir = __dirname;

  const config = { migrations: { dir } };

  describe('when there are no SQL files', () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(dir, 'test.txt'), 'test', 'utf8');
    });

    afterEach(() => {
      fs.unlinkSync(path.join(dir, 'test.txt'));
    });

    it('should return an empty array', () => (
      expect(localMigrations(config)).toHaveLength(0)
    ));
  });

  describe('when there are 2 SQL files', () => {
    beforeEach(() => {
      fs.writeFileSync(path.join(dir, '20190101-test-a.sql'), 'test', 'utf8');
      fs.writeFileSync(path.join(dir, '20190102-test-b.sql'), 'test', 'utf8');
    });

    afterEach(() => {
      fs.unlinkSync(path.join(dir, '20190101-test-a.sql'));
      fs.unlinkSync(path.join(dir, '20190102-test-b.sql'));
    });

    it('should return an array with 2 elements', () => (
      expect(localMigrations(config)).toHaveLength(2)
    ));
  });
});

describe('#filterMigrations', () => {
  let local;

  let committed;

  describe('when a hash does not match a committed migration', () => {
    const committedMigration = {
      filename: '20190101-committed-migration.sql',
      hash: 'committed',
      timestamp: new Date('2019-01-01').toISOString(),
    };

    const corruptedMigration = {
      ...committedMigration,
      hash: 'corrupt',
    };

    beforeEach(() => {
      local = [committedMigration, corruptedMigration];

      committed = [committedMigration];
    });

    it('should throw an error', () => (
      expect(() => filterMigrations(local, committed)).toThrow(/hash does not match/)
    ));
  });

  describe('when an uncommitted migration is before a committed migration', () => {
    const committedMigration = {
      filename: '20190101-committed-migration.sql',
      hash: 'committed',
      timestamp: new Date('2019-01-01').toISOString(),
    };

    const outOfOrderMigration = {
      filename: '20180101-out-of-order-migration.sql',
      hash: 'outOfOrder',
      timestamp: new Date('2018-01-01').toISOString(),
    };

    beforeEach(() => {
      local = [outOfOrderMigration, committedMigration];

      committed = [committedMigration];
    });

    it('should throw an error', () => (
      expect(() => filterMigrations(local, committed)).toThrow(/before a committed/)
    ));
  });

  describe('when all migrations are committed', () => {
    beforeEach(() => {
      const migration = {
        filename: '20190101-test-migration.sql',
        hash: 'test',
        timestamp: new Date('2019-01-01').toISOString(),
      };

      local = [migration];

      committed = [migration];
    });

    it('should return an empty array', () => (
      expect(filterMigrations(local, committed)).toHaveLength(0)
    ));
  });

  describe('when some migrations are committed', () => {
    const uncommittedMigration = {
      filename: '20191231-uncommitted-migration.sql',
      hash: 'uncommitted',
      timestamp: new Date('2019-12-31').toISOString(),
    };

    const committedMigration = {
      filename: '20190101-committed-migration.sql',
      hash: 'committed',
      timestamp: new Date('2019-01-01').toISOString(),
    };

    beforeEach(() => {
      local = [committedMigration, uncommittedMigration];

      committed = [committedMigration];
    });

    it('should return the uncommitted migrations', () => (
      expect(filterMigrations(local, committed)).toEqual(
        expect.arrayContaining([uncommittedMigration]),
      )
    ));
  });
});
