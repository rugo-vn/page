export const name = 'db';

export const actions = {
  async find({}) {
    return {
      data: this.db,
      meta: {
        total: this.db.length * 3,
        limit: this.db.length,
        skip: 0,
        page: 1,
        npage: 3,
      },
    };
  },

  async get({}) {
    return this.db[0] || null;
  },
};

export const started = function () {
  this.db = this.settings.mocks?.db || [];
};
