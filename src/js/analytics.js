// Vercel Web Analytics — loads on production/preview hosts only.
const host = location.hostname;
if (host.endsWith('andraewilliams.com') || host.endsWith('.vercel.app')) {
  window.va =
    window.va ||
    function va() {
      (window.vaq = window.vaq || []).push(arguments);
    };
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);
}
