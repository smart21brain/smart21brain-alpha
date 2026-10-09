// Smart21Brain — minimal router for the Worker.
// Supports static segments and :param segments, e.g. '/api/games/:id'.

export class Router {
  constructor() {
    this.routes = []; // { method, pattern: RegExp, keys: string[], handler }
  }

  add(method, path, handler) {
    const keys = [];
    const pattern = new RegExp(
      '^' +
        path
          .split('/')
          .map((seg) => {
            if (seg.startsWith(':')) {
              keys.push(seg.slice(1));
              return '([^/]+)';
            }
            return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          })
          .join('/') +
        '$'
    );
    this.routes.push({ method, pattern, keys, handler });
    return this;
  }

  get(path, handler) { return this.add('GET', path, handler); }
  post(path, handler) { return this.add('POST', path, handler); }
  put(path, handler) { return this.add('PUT', path, handler); }
  delete(path, handler) { return this.add('DELETE', path, handler); }

  // Returns a Response, or null if no route matched (caller should fall
  // through to static asset serving / 404).
  async handle(request, env, ctx) {
    const url = new URL(request.url);
    for (const route of this.routes) {
      if (route.method !== request.method) continue;
      const match = route.pattern.exec(url.pathname);
      if (!match) continue;
      const params = {};
      route.keys.forEach((key, i) => { params[key] = decodeURIComponent(match[i + 1]); });
      return route.handler({ request, env, ctx, params, url });
    }
    return null;
  }
}
