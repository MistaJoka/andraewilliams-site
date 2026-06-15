/**
 * Sets <base href> so relative links work on:
 * - level0.andraewilliams.com (subdomain root)
 * - www.andraewilliams.com/level-0/ (nested path)
 * - localhost or file:// when developing locally
 *
 * Must load synchronously in <head> before stylesheets.
 */
(function () {
  'use strict';

  var host = location.hostname;
  var path = location.pathname;
  var href;

  if (host === 'level0.andraewilliams.com') {
    href = location.origin + '/';
  } else if (path === '/level-0' || path.indexOf('/level-0/') === 0) {
    href = location.origin + '/level-0/';
  } else if (location.protocol === 'file:') {
    href = location.href.replace(/[^/]+$/, '');
  } else {
    href = location.origin + path.replace(/[^/]*$/, '');
  }

  var base = document.createElement('base');
  base.id = 'site-base';
  base.href = href;
  document.head.appendChild(base);
})();
