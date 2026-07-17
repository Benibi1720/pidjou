// Service worker minimal pour Pidjou : rend l'app installable et met en cache
// la coquille de l'appli pour un chargement plus rapide (le jeu en lui-même
// a besoin du réseau pour Firebase, donc pas de vrai mode hors-ligne jouable).
var CACHE_NAME = "pidjou-shell-v2";
var SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return Promise.all(SHELL_FILES.map(function(url){
        return cache.add(url).catch(function(){ /* ignore missing files (e.g. different filename) */ });
      }));
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(event){
  var req = event.request;
  // Never cache Firebase calls (rooms/players/invites must always be live).
  if (req.url.indexOf("firebasedatabase.app") !== -1) return;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then(function(cached){
      var networkFetch = fetch(req).then(function(res){
        if (res && res.ok){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || networkFetch;
    })
  );
});
