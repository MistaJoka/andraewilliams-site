import '../css/style.css';
import '../css/themes.css';
import './style.css';
import { initRouter } from './router.js';

document.documentElement.dataset.theme =
  localStorage.getItem('site-theme') || 'graphite-command-pro';

document.fonts.ready.then(() => {
  initRouter();
});
