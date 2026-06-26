(function () {
  'use strict';
  var host = location.hostname;
  var path = location.pathname;
  var href;
  if (host === 'level1.andraewilliams.com') {
    href = location.origin + '/';
  } else if (path === '/level-1' || path.indexOf('/level-1/') === 0) {
    href = location.origin + '/level-1/';
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
