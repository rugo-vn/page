export default {
  sourceDir: './src',
  routes: [
    {
      method: 'get',
      path: '/',
      view: 'index.ejs',
    },
  ],
  mocks: {
    db: [{ name: 'Foo', desc: 'Bar' }],
  },
  modules: {
    http: 'node_modules/axios/index.js',
  },
};
