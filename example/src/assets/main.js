window.addEventListener('DOMContentLoaded', () => {
  const about =
    'Hello, this is Rugopa (@rugo-vn/page) which is using for render view in Rugo Platform.';

  const aboutContent = document.getElementById('about');

  if (aboutContent) {
    aboutContent.innerHTML = about;
  }
});
