// Generated compatibility redirects. Edit the catalogue, then rebuild.
(() => {
  const routes = {
  "hooray-penguin": "/designs/hooray-penguin/",
  "cute-puffin": "/designs/cute-puffin/",
  "hello-dog": "/designs/hello-dog/",
  "happy-shiba": "/designs/happy-shiba/",
  "cozy-monkey": "/designs/cozy-monkey/",
  "dogs-business": "/designs/dogs-business/",
  "winter-arctic-fox": "/designs/winter-arctic-fox/",
  "alpapa-alpaca": "/designs/alpapa-alpaca/",
  "summer-arctic-fox": "/designs/summer-arctic-fox/",
  "arctic-fox-duo": "/designs/arctic-fox-duo/"
};
  const lookup = slug => Object.hasOwn(routes, slug) ? routes[slug] : null;
  function redirect() {
    let target;
    if (location.pathname.endsWith('/doodle.html')) {
      const slug = new URLSearchParams(location.search).get('design');
      target = slug ? lookup(slug) || '/designs/' : "/designs/hooray-penguin/";
    } else if (location.hash.startsWith('#/')) {
      const route = location.hash.slice(1);
      if (route === '/') target = '/';
      else if (['/designs', '/about', '/shop', '/contact'].includes(route)) target = route + '/';
      else if (route.startsWith('/designs/')) target = lookup(route.slice('/designs/'.length)) || '/404.html';
      else target = '/404.html';
    }
    if (target) location.replace(target);
  }
  window.addEventListener('hashchange', redirect);
  redirect();
})();
