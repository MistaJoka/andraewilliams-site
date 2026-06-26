(function () {
  'use strict';
  var host = location.hostname;
  var path = location.pathname;
  var href;
  if (host === 'level4.andraewilliams.com') href = location.origin + '/';
  else if (path === '/level-4' || path.indexOf('/level-4/') === 0) href = location.origin + '/level-4/';
  else if (location.protocol === 'file:') href = location.href.replace(/[^/]+$/, '');
  else href = location.origin + path.replace(/[^/]*$/, '');
  var base = document.createElement('base');
  base.href = href;
  document.head.appendChild(base);
})();
