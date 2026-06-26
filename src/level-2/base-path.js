(function () {
  'use strict';
  var host = location.hostname;
  var path = location.pathname;
  var href;
  if (host === 'level2.andraewilliams.com') href = location.origin + '/';
  else if (path === '/level-2' || path.indexOf('/level-2/') === 0) href = location.origin + '/level-2/';
  else if (location.protocol === 'file:') href = location.href.replace(/[^/]+$/, '');
  else href = location.origin + path.replace(/[^/]*$/, '');
  var base = document.createElement('base');
  base.href = href;
  document.head.appendChild(base);
})();
