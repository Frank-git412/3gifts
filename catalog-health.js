(function () {
  const BLOCKING_STATUSES = [
    "NON DISPONIBILE",
    "LINK ROTTO",
    "LINK NON VALIDO",
    "LINK MANCANTE",
    "ESAURITO", "ESAURITA", "OUT OF STOCK", "OUTOFSTOCK",
    "UNAVAILABLE", "NOT AVAILABLE", "SOLD OUT", "SOLDOUT",
    "DISCONTINUED", "INACTIVE", "INATTIVO", "BROKEN LINK", "INVALID LINK", "MISSING LINK",
  ];

  function text(value) {
    return value === null || value === undefined ? "" : String(value).trim();
  }

  function upper(value) {
    return text(value).toLocaleUpperCase("it-IT");
  }

  function finitePrice(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
  }

  function itemKey(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return "";
    if (text(item.id)) return `id:${text(item.id)}`;
    if (text(item.asin)) return `asin:${upper(item.asin)}`;
    if (text(item.directUrl || item.url)) return `url:${text(item.directUrl || item.url)}`;
    const name = upper(item.name || item.title);
    return name ? `name:${name}` : "";
  }

  function itemKeys(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const keys = [];
    if (text(item.id)) keys.push(`id:${text(item.id)}`);
    if (/^[A-Z0-9]{10}$/.test(upper(item.asin))) keys.push(`asin:${upper(item.asin)}`);
    const value = text(item.directUrl || item.url);
    if (value) {
      keys.push(`url:${value}`);
      try {
        const url = new URL(value);
        const asin = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([a-z0-9]{10})(?:\/|$)/i)?.[1];
        if (/^(?:www\.)?amazon\.it$/.test(url.hostname) && url.protocol === "https:" && asin) keys.push(`asin:${upper(asin)}`);
      } catch {}
    }
    if (!keys.length && itemKey(item)) keys.push(itemKey(item));
    return [...new Set(keys)];
  }

  function isBlocking(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return true;
    if (item.available === false || item.availability === false || item.availabilityStatus === false) return true;
    const statuses = [item.monitorStatus, item.status, item.catalogStatus, item.linkStatus, item.availabilityStatus, item.availability].map(value => upper(value).replace(/[_-]+/g, " ").replace(/\s+/g, " "));
    return statuses.some(status => BLOCKING_STATUSES.some(entry => status === entry || status.startsWith(entry + " ") || status.startsWith(entry + ":")));
  }

  function isFresh(item, maxAgeHours, now) {
    const checkedAt = Date.parse(item.checkedAt || item.lastChecked || "");
    if (!Number.isFinite(checkedAt)) return false;
    return checkedAt <= now && now - checkedAt <= maxAgeHours * 60 * 60 * 1000;
  }

  function checkedTime(item, now) {
    const value = Date.parse(item && (item.checkedAt || item.lastChecked) || "");
    return Number.isFinite(value) && value <= now ? value : null;
  }

  function latestByKey(items, now) {
    const grouped = new Map();
    for (const item of items) {
      const keys = itemKeys(item);
      if (!keys.length) continue;
      const time = checkedTime(item, now);
      // A future timestamp is never allowed to override a real observation.
      if (time === null && Date.parse(item.checkedAt || item.lastChecked || "") > now) continue;
      for (const key of keys) {
        const current = grouped.get(key);
        if (!current || (time !== null && (current.time === null || time > current.time))
          || (time === current.time && isBlocking(item) && !isBlocking(current.item))) {
          grouped.set(key, { item, time });
        }
      }
    }
    return new Map([...grouped].map(([key, value]) => [key, value.item]));
  }

  function merge(products, snapshot, options) {
    const maxAgeHours = Number(options && options.maxAgeHours) || 192;
    const now = Number(options && options.now) || Date.now();
    const monitored = (Array.isArray(snapshot && snapshot.products) ? snapshot.products : []).filter(item => itemKey(item));
    const byKey = latestByKey(monitored, now);
    let matched = 0;
    let excluded = 0;
    let pricesUpdated = 0;

    const merged = products.map((product) => {
      const matches = itemKeys(product).map(key => byKey.get(key)).filter(Boolean);
      const health = matches.sort((a, b) => (checkedTime(b, now) ?? -Infinity) - (checkedTime(a, now) ?? -Infinity)
        || Number(isBlocking(b)) - Number(isBlocking(a)))[0];
      if (!health) return product;
      if (!isFresh(health, maxAgeHours, now)) {
        // Old negative checks remain a reason to stop, not permission to sell.
        if (isBlocking(health)) { excluded += 1; return { ...product, monitorEligible: false }; }
        return product;
      }
      matched += 1;
      const livePrice = finitePrice(health.price);
      const blocked = isBlocking(health);
      if (blocked) excluded += 1;
      if (livePrice !== null && livePrice !== finitePrice(product.price)) pricesUpdated += 1;
      return {
        ...product,
        price: livePrice !== null ? livePrice : product.price,
        priceStatus: livePrice !== null ? "monitored" : product.priceStatus,
        availabilityStatus: text(health.availabilityStatus ?? health.availability ?? product.availabilityStatus),
        monitorStatus: text(health.status || health.monitorStatus || product.monitorStatus),
        checkedAt: text(health.checkedAt || health.lastChecked),
        monitorEligible: product.monitorEligible !== false && !blocked,
        // A price check alone does not certify shipping, variant or delivery.
        offer: livePrice !== null && livePrice !== finitePrice(product.price) ? null : product.offer,
      };
    });

    return {
      products: merged,
      meta: {
        active: true,
        generatedAt: text(snapshot && snapshot.generatedAt),
        matched,
        excluded,
        pricesUpdated,
        staleOrMissing: Math.max(0, products.length - matched),
      },
    };
  }

  function isEligible(product) {
    return product.monitorEligible !== false && !isBlocking(product);
  }

  window.TRE_REGALI_HEALTH = { merge, isEligible, isBlocking, itemKey, latestByKey };
})();
