export default {
  sourceDir: './src',
  css: ['./assets/style.css'],
  templates: ['./parts/header.ejs', './parts/footer.ejs'],
  routes: [
    {
      method: 'get',
      path: '/',
      view: 'index.ejs',
    },
  ],
};
