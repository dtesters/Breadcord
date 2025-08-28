// Breadcord DM sorting utility
// Stable, deterministic sort with pinned group first, then by last activity desc.

/**
 * @typedef {Object} DM
 * @property {string} id
 * @property {string} name
 * @property {boolean} pinned
 * @property {string=} lastMessageAt
 * @property {string=} lastCallAt
 * @property {string=} lastInteractionAt
 */

function ts(iso) { return iso ? new Date(iso).getTime() : 0; }
function activity(d) { return Math.max(ts(d.lastMessageAt), ts(d.lastCallAt), ts(d.lastInteractionAt)); }

/**
 * @param {DM[]} list
 * @returns {DM[]}
 */
function sortDMs(list) {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const diff = activity(b) - activity(a);
    if (diff) return diff;
    const byName = String(a.name || '').localeCompare(String(b.name || ''));
    if (byName) return byName;
    return String(a.id).localeCompare(String(b.id));
  });
}

window.BreadLib = window.BreadLib || {};
window.BreadLib.sortDMs = sortDMs;


