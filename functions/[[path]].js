import app from "../worker.js";

export async function onRequest(context) {
  const env = new Proxy(context.env, {
    get(target, property, receiver) {
      if (property === "ASSETS") {
        return { fetch: () => context.next() };
      }
      return Reflect.get(target, property, receiver);
    },
  });

  return app.fetch(context.request, env);
}
