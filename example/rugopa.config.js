export default {
  sourceDir: './src',
  assets: ['./assets/style.css', './assets/main.js', './images'],
  statics: ['./favicon.ico'],
  templates: ['./parts/header.ejs', './parts/footer.ejs', 'about.html'],
  routes: [
    {
      method: 'get',
      path: '/',
      view: 'index.ejs',
    },
  ],
};
