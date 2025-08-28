// BreadCache
/**
 * BreadCache — store and retrieve objects by ID, with merge-on-update.
 * - Deep-merges plain objects when updating an existing entry.
 * - Arrays are REPLACED by default; set arrays: "concat" | "unique" to change.
 * - IDs are explicit (first arg), not inferred from the object.
 */
class ObjectCache {
  /**
   * @param {Object} [opts]
   * @param {"replace"|"concat"|"unique"} [opts.arrays="replace"] - array merge strategy
   * @param {boolean} [opts.clone=true] - clone values on set/get to avoid external mutation
   */
  constructor(opts = {}) {
    const { arrays = "replace", clone = true } = opts;
    this._map = new Map();
    this._arrayStrategy = arrays;
    this._clone = clone;
  }

  /** Get a value by ID. */
  get(id) {
    const v = this._map.get(id);
    return this._clone ? ObjectCache._clone(v) : v;
  }

  /** Check if an ID exists. */
  has(id) { return this._map.has(id); }

  /** Set/overwrite an ID with an object. */
  set(id, obj) {
    if (!ObjectCache._isObjectLike(obj)) {
      throw new TypeError("BreadCache.set expects a plain object value");
    }
    this._map.set(id, this._clone ? ObjectCache._clone(obj) : obj);
    return this;
  }

  /**
   * Update by ID: if it exists, deep-merge; otherwise create it.
   * @param {string|number} id
   * @param {Object} patch - partial object to merge
   */
  update(id, patch) {
    if (!ObjectCache._isObjectLike(patch)) {
      throw new TypeError("BreadCache.update expects a plain object patch");
    }
    const existing = this._map.get(id);
    if (!existing) {
      // create new
      this._map.set(id, this._clone ? ObjectCache._clone(patch) : { ...patch });
      return this.get(id);
    }
    const merged = ObjectCache._merge(existing, patch, this._arrayStrategy);
    this._map.set(id, merged);
    return this._clone ? ObjectCache._clone(merged) : merged;
  }

  /** Delete by ID. */
  delete(id) { return this._map.delete(id); }

  /** Remove everything. */
  clear() { this._map.clear(); }

  /** Size of the cache. */
  size() { return this._map.size; }

  /** Get all entries as [id, value] tuples. */
  entries() {
    return Array.from(this._map.entries())
      .map(([k, v]) => [k, this._clone ? ObjectCache._clone(v) : v]);
  }

  /** Get all values. */
  values() {
    return Array.from(this._map.values())
      .map(v => (this._clone ? ObjectCache._clone(v) : v));
  }

  // --- internals ---

  static _isObjectLike(v) {
    return v && Object.prototype.toString.call(v) === "[object Object]";
  }

  static _clone(v) {
    // cheap deep clone for JSON-safe objects
    return v == null ? v : JSON.parse(JSON.stringify(v));
  }

  static _merge(target, patch, arrayStrategy = "replace") {
    // Mutates target in-place, returns target
    if (target === patch) return target;

    for (const key of Object.keys(patch)) {
      const a = target[key];
      const b = patch[key];

      if (ObjectCache._isObjectLike(a) && ObjectCache._isObjectLike(b)) {
        ObjectCache._merge(a, b, arrayStrategy);
      } else if (Array.isArray(a) && Array.isArray(b)) {
        if (arrayStrategy === "concat") {
          target[key] = a.concat(b);
        } else if (arrayStrategy === "unique") {
          const set = new Set([...a, ...b]);
          target[key] = Array.from(set);
        } else {
          // "replace"
          target[key] = JSON.parse(JSON.stringify(b));
        }
      } else if (b !== undefined) {
        // primitives, nulls, arrays replacing non-arrays, etc.
        target[key] = ObjectCache._isObjectLike(b) || Array.isArray(b)
          ? JSON.parse(JSON.stringify(b))
          : b;
      }
      // if b is undefined, skip (no-op)
    }
    return target;
  }
  /** Make BreadCache iterable */
  [Symbol.iterator]() {
    return this.entries()[Symbol.iterator]();
  }
  keys() {
    return Array.from(this._map.keys());
  }

}

const message_cache = new ObjectCache({ arrays: "replace" });
const user_cache = new ObjectCache({ arrays: "replace" });
const guild_cache = new ObjectCache({ arrays: "replace" });
const private_channels = new ObjectCache({ arrays: "replace" }); // these are DMs
const relationships = new ObjectCache({ arrays: "replace" }); // these are friends, blocked, etc.
const presences = new ObjectCache({ arrays: "replace" }); // userId -> presence { status, activities, client_status }
let user_settings = null;
let user = null;

BreadAPI.gateway.on_message((data) => {
  if (data.t === "READY") { 
    console.log("[BreadCache] Ready Event Received, caching initial data");
    for (const guild of data.d.guilds) {
      guild_cache.update(guild.id, guild);
    }
    console.log("[BreadCache] Guilds Cached!");
    for (const channel of data.d.private_channels) {
      private_channels.update(channel.id, channel);
    }
    console.log("[BreadCache] Private Channels Cached!");
    for (const relation of data.d.relationships) {
      relationships.update(relation.id, relation);
    }
    console.log("[BreadCache] Relationships Cached!");
    
    BreadCache.user = data.d.user;
    console.log("[BreadCache] User Cached!");

    BreadCache.user_settings = data.d.user_settings;
    console.log("[BreadCache] User Settings Cached!", user_settings);

    BreadCache.markReady();
  }
  // Presence updates from gateway
  if (data.t === "PRESENCE_UPDATE") {
    try {
      const p = data.d || {};
      const uid = String(p.user?.id || p.user_id || p.id || "");
      if (uid) {
        // Cache minimal user fields if provided
        if (p.user) {
          const { id, username, global_name, avatar, avatar_decoration_data } = p.user;
          if (id) user_cache.update(id, { id, username, global_name, avatar, avatar_decoration_data });
        }
        // Normalize presence payload
        const presence = {
          user_id: uid,
          status: p.status || p.client_status?.desktop || p.client_status?.web || p.client_status?.mobile || "offline",
          activities: Array.isArray(p.activities) ? p.activities : [],
          client_status: p.client_status || {},
          guild_id: p.guild_id || null,
        };
        presences.update(uid, presence);
        BreadCache.emitPresence(uid, presence);
      }
    } catch (err) {
      console.error("[BreadCache] PRESENCE_UPDATE error", err);
    }
  }
  // Relationship add/remove/update can include presence-like info for the target user
  if (data.t === "RELATIONSHIP_ADD" || data.t === "RELATIONSHIP_UPDATE") {
    try {
      const rel = data.d || {};
      const uid = String(rel.id || rel.user?.id || "");
      if (rel.user) {
        const { id, username, global_name, avatar, avatar_decoration_data } = rel.user;
        if (id) user_cache.update(id, { id, username, global_name, avatar, avatar_decoration_data });
      }
      if (uid && rel.presence) {
        const p = rel.presence;
        const presence = {
          user_id: uid,
          status: p.status || "offline",
          activities: Array.isArray(p.activities) ? p.activities : [],
          client_status: p.client_status || {},
          guild_id: null,
        };
        presences.update(uid, presence);
        BreadCache.emitPresence(uid, presence);
      }
      if (uid && typeof rel.type === 'number') {
        relationships.update(uid, rel);
      }
    } catch (err) {
      console.error("[BreadCache] RELATIONSHIP_* ingest error", err);
    }
  }
  // Some gateways may send initial GUILD_CREATE with presences
  if (data.t === "GUILD_CREATE") {
    try {
      const g = data.d || {};
      if (g.id) guild_cache.update(g.id, g);
      if (Array.isArray(g.presences)) {
        for (const p of g.presences) {
          const uid = String(p.user?.id || p.user_id || p.id || "");
          if (!uid) continue;
          const presence = {
            user_id: uid,
            status: p.status || p.client_status?.desktop || p.client_status?.web || p.client_status?.mobile || "offline",
            activities: Array.isArray(p.activities) ? p.activities : [],
            client_status: p.client_status || {},
            guild_id: g.id,
          };
          presences.update(uid, presence);
          BreadCache.emitPresence(uid, presence);
        }
      }
    } catch (err) {
      console.error("[BreadCache] GUILD_CREATE presence ingest error", err);
    }
  }
});

class BreadCache {

  static #ready = false;
  static #readyCallbacks = [];
  static #presenceListeners = new Set();

  static on_ready(fn) {
    if (this.#ready) {
      // already ready → fire immediately
      fn();
    } else {
      // queue until ready
      this.#readyCallbacks.push(fn);
    }
  }

  static markReady() {
    this.#ready = true;
    for (const fn of this.#readyCallbacks) {
      try { fn(); } catch (e) { console.error(e); }
    }
    this.#readyCallbacks = [];
  }

  static emitPresence(userId, presence) {
    for (const fn of Array.from(this.#presenceListeners)) {
      try { fn(userId, presence); } catch (e) { console.error(e); }
    }
  }

  static getMessage(id) { return message_cache.get(id); }
  static getUser(id) { return user_cache.get(id); }
  static getGuild(id) { return guild_cache.get(id); }
  static getPrivateChannel(id) { return private_channels.get(id); }
  static getRelationship(id) { return relationships.get(id); }
  static getCurrentUser() { return user; }
  static getPresence(id) { return presences.get(id); }

  static cacheMessage(msg) {
    if (!msg || !msg.id) return;
    message_cache.update(msg.id, msg);
  }

  static cacheUser(u) {
    if (!u || !u.id) return;
    user_cache.update(u.id, u);
  }

  static cacheGuild(g) {
    if (!g || !g.id) return;
    guild_cache.update(g.id, g);
  }

  static cachePrivateChannel(c) {
    if (!c || !c.id) return;
    private_channels.update(c.id, c);
  }

  static cacheRelationship(r) {
    if (!r || !r.id) return;
    relationships.update(r.id, r);
  }
  static cachePresence(p) {
    if (!p) return;
    const uid = String(p.user_id || p.user?.id || p.id || "");
    if (!uid) return;
    presences.update(uid, p);
    BreadCache.emitPresence(uid, p);
  }

  static get guilds() {
    return guild_cache.values();
  }

  // Convenience getters for consumers (Friends/DM pages)
  static getRelationships() {
    return relationships.values();
  }
  static getPrivateChannels() {
    return private_channels.values();
  }

  /** Subscribe to presence changes. Returns unsubscribe. */
  static onPresenceUpdate(fn) {
    if (typeof fn !== "function") return () => {};
    this.#presenceListeners.add(fn);
    return () => this.#presenceListeners.delete(fn);
  }
}
window.BreadCache = BreadCache;