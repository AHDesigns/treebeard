const {
  ErrCircularDependency,
  ErrNoStart,
  ErrInvalidJobObject,
} = require('./errors');
const schedule = require('./index');

describe('schedule', () => {
  let jobs;
  let result; // eslint-disable-line no-unused-vars
  let error;
  const watcher = jest.fn();

  beforeEach(() => {
    return new Promise((resolve, reject) => {
      schedule(jobs)
        .then((res) => {
          result = res; // eslint-disable-line no-unused-vars
          resolve();
        })
        .catch((err) => {
          error = err;
          if (
            ![ErrCircularDependency, ErrNoStart, ErrInvalidJobObject].some(
              (errorInstance) => err instanceof errorInstance,
            )
          ) {
            reject(err);
          } else {
            resolve();
          }
        });
    });
  });

  afterEach(() => {
    watcher.mockClear();
  });

  describe('when schedule argument is invalid structure of', () => {
    [
      ['null', null],
      ['undefined', undefined],
      ['string', 'string'],
      ['number', 3],
      ['boolean', true],
      ['array', [{ a: watcher }]],
    ].forEach(([struct, jobObject]) => {
      describe(struct, () => {
        beforeAll(() => {
          jobs = jobObject;
        });

        it('errors to tell user they done messed up', () => {
          expect(error).toBeInstanceOf(ErrInvalidJobObject);
        });
      });
    });
  });

  describe('when given a list of tasks with no immidiately runnable task', () => {
    beforeAll(() => {
      jobs = {
        a: { after: ['c'], job: watcher },
        b: { after: ['a'], job: watcher },
        c: { after: ['b'], job: watcher },
      };
    });

    it('throws a wobbly', () => {
      expect(error).toBeInstanceOf(ErrNoStart);
    });
  });

  describe('when given a circular schedule', () => {
    beforeAll(() => {
      jobs = {
        x: watcher,
        a: { after: ['c'], job: watcher },
        b: { after: ['a'], job: watcher },
        c: { after: ['b'], job: watcher },
      };
    });

    it('throws a wobbly', () => {
      expect(error).toBeInstanceOf(ErrCircularDependency);
    });
  });

  describe('when a jobObject only contains a job key ', () => {
    beforeAll(() => {
      jobs = {
        a: watcher,
        x: { job: watcher },
      };
    });

    it('errors to tell user they done messed up', () => {
      expect(error).toBeInstanceOf(ErrInvalidJobObject);
    });
  });

  describe('when a jobObject is invalid structure of', () => {
    [
      ['string', { x: watcher, key: 'string' }],
      ['number', { x: watcher, key: 4 }],
      ['boolean', { x: watcher, key: true }],
      ['new Set()', { x: watcher, key: new Set() }],
      ['new Map()', { x: watcher, key: new Map() }],
      ['array', { x: watcher, key: [] }],
    ].forEach(([struct, jobObject]) => {
      describe(struct, () => {
        beforeAll(() => {
          jobs = jobObject;
        });

        it('errors to tell user they done messed up', () => {
          expect(error).toBeInstanceOf(ErrInvalidJobObject);
        });
      });
    });
  });

  describe('when given a simple queue', () => {
    beforeAll(() => {
      jobs = {
        a: {
          after: ['b'],
          job: watcher,
        },
        b: (key) => {
          watcher(key);
        },
      };
    });

    it('runs job a after job b', () => {
      expect(watcher).nthCalledWith(1, 'b');
      expect(watcher).nthCalledWith(2, 'a');
    });
  });

  describe('when given a complex queue', () => {
    beforeAll(() => {
      jobs = {
        a: watcher,
        b: {
          after: ['a'],
          job: watcher,
        },
        c: watcher,
        d: {
          after: ['a', 'c'],
          job: watcher,
        },
        e: {
          after: ['a', 'c'],
          job: watcher,
        },
        f: {
          after: ['a', 'b'],
          job: watcher,
        },
      };
    });

    it('runs jobs in order', () => {
      expect(watcher).nthCalledWith(1, 'a');
      expect(watcher).nthCalledWith(2, 'c');
      expect(watcher).nthCalledWith(3, 'b');
      expect(watcher).nthCalledWith(4, 'd');
      expect(watcher).nthCalledWith(5, 'e');
      expect(watcher).nthCalledWith(6, 'f');
    });
  });
});
