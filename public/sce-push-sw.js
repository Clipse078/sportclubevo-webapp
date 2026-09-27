/* SCE dedicated Web Push receiver — no offline/PWA caching. */

function parsePushPayload(event) {
  if (!event.data) {
    return { title: "SportClubEvo", body: "", data: { href: "/" } };
  }
  try {
    const raw = event.data.json();
    const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "SportClubEvo";
    const body = typeof raw.body === "string" ? raw.body : "";
    const data = raw.data && typeof raw.data === "object" ? raw.data : {};
    const href = typeof data.href === "string" ? data.href : "/";
    return { title, body, data: { ...data, href } };
  } catch {
    const text = event.data.text();
    return { title: "SportClubEvo", body: typeof text === "string" ? text : "", data: { href: "/" } };
  }
}

function canonicalSameOriginHref(href) {
  if (typeof href !== "string") return "/";
  const trimmed = href.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  if (trimmed.includes("\\") || trimmed.includes("\0")) return "/";
  return trimmed;
}

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event);
  const href = canonicalSameOriginHref(payload.data.href);
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { href },
      tag: href,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = canonicalSameOriginHref(event.notification.data?.href);
  const targetUrl = new URL(href, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client && client.url.startsWith(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
