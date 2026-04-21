export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

export function notFound() {
  return new Response("Not Found", { status: 404 });
}

export function methodNotAllowed() {
  return json({ ok: false, msg: "Method Not Allowed" }, 405);
}
