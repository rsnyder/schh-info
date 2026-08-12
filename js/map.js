/* Interactive community map for schh.info/map (map/index.html).
 *
 * Ported from SCHH-Commons' assets/js/gmap.js (schh-commons.github.io)
 * as a single layered page: every amenity category is a toggleable set
 * of markers over the SCHH boundary polygon, with the GeoJSON served
 * same-origin from /geojson/.
 *
 * Browser Maps keys are public by design — this one must be restricted
 * to https://schh.info/* (HTTP referrer) and to the Maps JavaScript API
 * in the Google Cloud console.
 */

const MAPS_API_KEY = "AIzaSyDBejEEEQsERva2YklfOU4iWjgRBVdsOc8";  // referrer-restricted browser key
const MAP_ID = "DEMO_MAP_ID";       // replace with a real Map ID to customize styling
const CENTER = { lat: 32.304481, lng: -80.9572716 };
/* Data layers come straight from the guide repo's reference/ dir,
 * served by the droplet with CORS for this origin (see
 * docs/community_map.md there) — edits to the canonical GeoJSON are
 * live here within the endpoint's five-minute cache, no copies. */
const AMENITIES_URL = "https://chat.schh.info/geojson/Amenity_Locations.geojson";
const BOUNDARY_URL = "https://chat.schh.info/geojson/Sun_City,_Hilton_Head.geojson";

/* The GeoJSON's marker-symbol values are Font Awesome icon names (the old
 * site loaded FA); this app is dependency-free, so map them to glyphs. */
const SYMBOL_GLYPHS = {
  "briefcase": "\u{1F4BC}", "building": "\u{1F3E2}", "circle-dot": "\u{1F3AF}",
  "road": "\u{1F309}", "computer": "\u{1F4BB}", "palette": "\u{1F3A8}",
  "utensils": "\u{1F374}", "dog": "\u{1F415}", "leaf": "\u{1F343}",
  "road-barrier": "\u{1F6A7}", "flag": "⛳", "water": "\u{1F4A7}",
  "table-tennis-paddle-ball": "\u{1F3D3}", "person-swimming": "\u{1F3CA}",
  "baseball-bat-ball": "⚾", "caravan": "\u{1F690}",
  "masks-theater": "\u{1F3AD}", "person-hiking": "\u{1F97E}",
  "baseball-ball": "\u{1F94E}", "volleyball-ball": "\u{1F3D0}",
  "hammer": "\u{1F528}",
};
const CATEGORY_GLYPHS = { "Tennis": "\u{1F3BE}" };  // shares FA symbol with Pickleball

const state = {
  map: null,
  categories: new Map(),   // name -> {color, glyph, markers: [], on: bool}
  expanded: null,          // currently expanded marker content element
  boundary: null,          // google.maps.Data layer
  watchId: null,           // geolocation watch while "my location" is on
  userMarker: null,        // blue-dot AdvancedMarkerElement
  userCircle: null,        // accuracy circle around the dot
};

function notice(html) {
  const el = document.getElementById("notice");
  el.innerHTML = html;
  el.classList.toggle("hidden", !html);
}

function glyphFor(props) {
  return CATEGORY_GLYPHS[props.category] || SYMBOL_GLYPHS[props["marker-symbol"]] || "\u{1F4CD}";
}

async function fetchGeoJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

/* --- markers ------------------------------------------------------- */

function collapseExpanded() {
  if (state.expanded) {
    state.expanded.classList.remove("expanded");
    state.expanded = null;
  }
}

function buildPin(props, color) {
  const pin = document.createElement("div");
  pin.className = "pin";
  pin.style.setProperty("--accent", color || "#c62828");
  const links = [];
  if (props.address) {
    const q = encodeURIComponent(`${props.name}, ${props.address}`);
    links.push(`<a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">${props.address}</a>`);
  }
  if (props.phone) {
    links.push(`<a href="tel:${props.phone.replace(/[^+\d]/g, "")}">${props.phone}</a>`);
  }
  pin.innerHTML = `
    <span class="glyph" aria-hidden="true">${glyphFor(props)}</span>
    <div class="details">
      <div class="title">${props.name}</div>
      <div class="category">${props.category}</div>
      ${props.description ? `<div class="description">${props.description}</div>` : ""}
      ${links.map((l) => `<div class="link">${l}</div>`).join("")}
    </div>`;
  return pin;
}

async function addAmenities(geojson) {
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  for (const feature of geojson.features) {
    const props = feature.properties;
    if (!props.category || feature.geometry.type !== "Point") continue;
    let cat = state.categories.get(props.category);
    if (!cat) {
      cat = { color: props["marker-color"], glyph: glyphFor(props), markers: [], on: true };
      state.categories.set(props.category, cat);
    }
    const [lng, lat] = feature.geometry.coordinates;
    const content = buildPin(props, props["marker-color"]);
    const marker = new AdvancedMarkerElement({
      map: state.map,
      position: { lat, lng },
      content,
      title: props.name,
      gmpClickable: true,
    });
    marker.addEventListener("gmp-click", () => {
      const wasExpanded = content.classList.contains("expanded");
      collapseExpanded();
      if (!wasExpanded) {
        content.classList.add("expanded");
        state.expanded = content;
      }
    });
    cat.markers.push(marker);
  }
}

/* --- boundary ------------------------------------------------------ */

function addBoundary(geojson) {
  const layer = new google.maps.Data();
  layer.addGeoJson(geojson);
  layer.setStyle((feature) => ({
    strokeColor: feature.getProperty("strokeColor") || "#ff0000",
    strokeWeight: 2,
    strokeOpacity: 0.9,
    fillColor: feature.getProperty("fillColor") || "#ff0000",
    fillOpacity: feature.getProperty("fillOpacity") ?? 0.08,
    clickable: false,
  }));
  layer.setMap(state.map);
  state.boundary = layer;

  const bounds = new google.maps.LatLngBounds();
  layer.forEach((feature) =>
    feature.getGeometry().forEachLatLng((latLng) => bounds.extend(latLng)));
  state.map.fitBounds(bounds);
}

/* --- category filter UI -------------------------------------------- */

function applyFilter() {
  collapseExpanded();
  for (const [name, cat] of state.categories) {
    for (const marker of cat.markers) marker.map = cat.on ? state.map : null;
    document.querySelector(`.map-chip[data-category="${CSS.escape(name)}"]`)
      ?.classList.toggle("off", !cat.on);
  }
}

function fitVisibleMarkers() {
  const bounds = new google.maps.LatLngBounds();
  let any = false;
  for (const cat of state.categories.values()) {
    if (!cat.on) continue;
    for (const marker of cat.markers) { bounds.extend(marker.position); any = true; }
  }
  if (any) state.map.fitBounds(bounds, 60);
}

function buildControls() {
  const bar = document.getElementById("chips");
  const names = [...state.categories.keys()].sort((a, b) => a.localeCompare(b));
  for (const name of names) {
    const cat = state.categories.get(name);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "map-chip";
    chip.dataset.category = name;
    chip.innerHTML = `<span class="dot" style="background:${cat.color}"></span>` +
      `${cat.glyph} ${name} <span class="count">${cat.markers.length}</span>`;
    chip.addEventListener("click", () => { cat.on = !cat.on; applyFilter(); });
    bar.appendChild(chip);
  }
  document.getElementById("all-btn").addEventListener("click", () => {
    for (const cat of state.categories.values()) cat.on = true;
    applyFilter();
  });
  document.getElementById("none-btn").addEventListener("click", () => {
    for (const cat of state.categories.values()) cat.on = false;
    applyFilter();
  });
  document.getElementById("boundary-toggle").addEventListener("change", (e) => {
    state.boundary?.setMap(e.target.checked ? state.map : null);
  });
}

/* --- user location -------------------------------------------------- */

/* A "show my location" toggle in the map's corner: on → a blue dot (plus
 * accuracy circle) follows the visitor via watchPosition; off → cleared.
 * Requires the standard browser permission prompt; HTTPS-only API. */
function addLocateControl() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "locate-btn";
  btn.title = "Show my location";
  btn.setAttribute("aria-label", "Show my location");
  btn.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/>' +
    '<line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/>' +
    '<circle cx="12" cy="12" r="7"/></svg>';
  btn.addEventListener("click", () =>
    state.watchId === null ? startLocate(btn) : stopLocate(btn));
  state.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(btn);
}

let noticeTimer = null;
function transientNotice(html) {
  notice(html);
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => notice(""), 6000);
}

async function startLocate(btn) {
  if (!("geolocation" in navigator)) {
    transientNotice("This browser doesn't support location.");
    return;
  }
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  btn.classList.add("active");
  let firstFix = true;
  state.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (!state.userMarker) {
        const dot = document.createElement("div");
        dot.className = "user-dot";
        state.userMarker = new AdvancedMarkerElement({
          map: state.map, position: p, content: dot,
          title: "Your location", zIndex: 20,
        });
        state.userCircle = new google.maps.Circle({
          map: state.map, center: p, radius: pos.coords.accuracy,
          fillColor: "#1a73e8", fillOpacity: 0.12,
          strokeColor: "#1a73e8", strokeOpacity: 0.3, strokeWeight: 1,
          clickable: false,
        });
      } else {
        state.userMarker.position = p;
        state.userCircle.setCenter(p);
        state.userCircle.setRadius(pos.coords.accuracy);
      }
      if (firstFix) {
        firstFix = false;
        state.map.panTo(p);
        if (state.map.getZoom() < 14) state.map.setZoom(15);
      }
    },
    (err) => {
      stopLocate(btn);
      transientNotice(err.code === 1
        ? "Location permission was denied. Allow location access for this " +
          "site in your browser settings to see yourself on the map."
        : "Couldn't determine your location — please try again.");
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
}

function stopLocate(btn) {
  if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
  state.watchId = null;
  if (state.userMarker) { state.userMarker.map = null; state.userMarker = null; }
  if (state.userCircle) { state.userCircle.setMap(null); state.userCircle = null; }
  btn.classList.remove("active");
}

/* ?category=Pool or ?category=pools,gates reproduces the old themed
 * pages (pools/gates/…) as links into this one. Trailing "s" tolerated. */
function applyUrlFilter() {
  const param = new URLSearchParams(location.search).get("category");
  if (!param) return;
  const wanted = param.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const matches = (name) => {
    const n = name.toLowerCase();
    return wanted.some((w) => n === w || n === w.replace(/s$/, "") || n + "s" === w);
  };
  if (![...state.categories.keys()].some(matches)) return;  // unknown value: show all
  for (const [name, cat] of state.categories) cat.on = matches(name);
  applyFilter();
  fitVisibleMarkers();
}

/* --- bootstrap ----------------------------------------------------- */

// Official Maps JS dynamic-import bootstrap (v=weekly), key appended below.
/* eslint-disable */
(g => { var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]); e.set("callback", c + ".maps." + q); a.src = `https://maps.${c}apis.com/maps/api/js?` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load.")); a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a) })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)) })({ key: MAPS_API_KEY, v: "weekly" });
/* eslint-enable */

// Called by the Maps API when the key is rejected (invalid, wrong
// referrer, API not enabled) — otherwise the map just goes silently gray.
window.gm_authFailure = () => {
  notice("The map's Google Maps API key was rejected. Check the key's " +
    "referrer/API restrictions — see <code>docs/community_map.md</code>.");
};

(async () => {
  if (!MAPS_API_KEY) {
    notice("The map isn't configured yet: a Google Maps API key needs to be " +
      "set in <code>map.js</code>. See <code>docs/community_map.md</code>.");
    return;
  }
  try {
    const [{ Map }, amenities, boundary] = await Promise.all([
      google.maps.importLibrary("maps"),
      fetchGeoJSON(AMENITIES_URL),
      fetchGeoJSON(BOUNDARY_URL),
    ]);
    state.map = new Map(document.getElementById("map"), {
      center: CENTER,
      zoom: 13,
      mapId: MAP_ID,
      mapTypeControl: true,
      mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
    });
    state.map.addListener("click", collapseExpanded);
    addBoundary(boundary);
    await addAmenities(amenities);
    buildControls();
    addLocateControl();
    applyUrlFilter();
  } catch (error) {
    console.error("Error initializing map:", error);
    notice("Sorry — the map failed to load. Please try again later.");
  }
})();
