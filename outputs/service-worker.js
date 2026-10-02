const CACHE_NAME = "ngc-super-app-vmur19zpz";
const BADGE_DB_NAME = "ngc-super-app-state";
const BADGE_STORE_NAME = "keyval";
const APP_SHELL = [
  "./",
  "./index.html",
  "./ngc_super_app.html",
  "./manifest.webmanifest",
  "./campaign-config.json",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./ngc-liquid-background-v2.jpg",
  "./ngc-logo.png",
  "./icon-calculator.svg",
  "./icon-commission.svg",
  "./icon-prs-tax.svg",
  "./icon-quick-link.svg",
  "./icon-campaign.svg",
  "./icon-home.svg",
  "./icon-bell.svg",
  "./icon-volume.svg",
  "./icon-settings.svg",
  "./icon-presentation.svg",
  "./icon-contact.svg",
  "./icon-phone.svg",
  "./icon-mail.svg",
  "./icon-share.svg",
  "./icon-edit.svg",
  "./icon-add-contact.svg",
  "./icon-info.svg",
  "./icon-fund.svg",
  "./icon-calendar.svg",
  "./icon-calendar-plus.svg",
  "./icon-star.svg",
  "./icon-sparkles.svg",
  "./icon-chevron-right.svg",
  "./icon-external-link.svg",
  "./icon-search.svg",
  "./icon-refresh.svg",
  "./icon-close.svg",
  "./icon-back.svg",
  "./icon-check.svg",
  "./icon-speed.svg",
  "./icon-shield.svg",
  "./icon-inbox-ready.svg",
  "./icon-archive.svg",
  "./icon-read.svg",
  "./icon-chevron-down.svg",
  "./icon-alert.svg"
];

function openBadgeDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BADGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(BADGE_STORE_NAME)) {
        request.result.createObjectStore(BADGE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readBadgeState(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(BADGE_STORE_NAME, "readonly").objectStore(BADGE_STORE_NAME).get("badge");
    request.onsuccess = () => resolve(request.result || { count:0, seen:[] });
    request.onerror = () => reject(request.error);
  });
}

function writeBadgeState(db, state) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BADGE_STORE_NAME, "readwrite");
    transaction.objectStore(BADGE_STORE_NAME).put(state, "badge");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function applySystemBadge(count) {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  try {
    if (safeCount > 0 && "setAppBadge" in self.navigator) await self.navigator.setAppBadge(safeCount);
    if (safeCount === 0 && "clearAppBadge" in self.navigator) await self.navigator.clearAppBadge();
  } catch {}
  return safeCount;
}

async function setStoredBadgeCount(count) {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  try {
    const db = await openBadgeDatabase();
    const state = await readBadgeState(db);
    await writeBadgeState(db, { count:safeCount, seen:Array.isArray(state.seen) ? state.seen.slice(-100) : [] });
    db.close();
  } catch {}
  return applySystemBadge(safeCount);
}

async function updateBackgroundBadge(tag, suppliedCount) {
  let count = Number.isFinite(suppliedCount) ? Math.max(0, Math.floor(suppliedCount)) : 1;
  try {
    const db = await openBadgeDatabase();
    const state = await readBadgeState(db);
    const seen = Array.isArray(state.seen) ? state.seen : [];
    const storedCount = Math.max(0, Math.floor(Number(state.count) || 0));
    if (!tag || !seen.includes(tag)) {
      count = Number.isFinite(suppliedCount) ? count : storedCount + 1;
      if (tag) seen.push(tag);
      await writeBadgeState(db, { count, seen:seen.slice(-100) });
    } else {
      count = Number.isFinite(suppliedCount) ? count : storedCount;
    }
    db.close();
  } catch {}
  return applySystemBadge(count);
}

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "ngc-skip-waiting") {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (event.data?.type === "ngc-set-badge") event.waitUntil(setStoredBadgeCount(event.data.count));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("/campaign-config.json") || url.pathname.endsWith("/push-admin.html") || url.pathname.endsWith("/admin.html")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }))
  );
});

self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch { payload = { body: event.data ? event.data.text() : "" }; }
  const proposed = payload.notification || {};
  const title = proposed.title || payload.title || "NGC Super App";
  const options = {
    body: proposed.body || payload.body || "You have a new update.",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: proposed.tag || payload.tag || "ngc-update",
    renotify: true,
    data: { url: proposed.navigate || payload.url || "./index.html" }
  };
  const suppliedBadge = Number(payload.app_badge ?? proposed.app_badge ?? payload.badge);
  const badgePromise = payload.badge_enabled === false ? Promise.resolve() : updateBackgroundBadge(options.tag, suppliedBadge);
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    badgePromise,
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
      windows.forEach(client => client.postMessage({ type: "ngc-update" }));
    })
  ]));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./index.html", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow ? clients.openWindow(target) : undefined;
    })
  );
});
