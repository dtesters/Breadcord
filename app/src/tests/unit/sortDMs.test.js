/* Minimal test runner harness; run in renderer console or a node env with jsdom */
(function () {
  function expectEqual(a, b, msg) {
    const ok = JSON.stringify(a) === JSON.stringify(b);
    if (!ok) throw new Error('Assertion failed: ' + (msg || '') + ' -> ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b));
  }

  function dm(p) {
    return Object.assign({ id: Math.random().toString(36).slice(2), name: 'z', pinned: false }, p);
  }

  const { sortDMs } = window.BreadLib || {};
  if (!sortDMs) {
    console.warn('[test] sortDMs not loaded; include app/src/lib/sortDMs.js first');
    return;
  }

  // orders by pinned first
  (function () {
    const a = dm({ name: 'a' });
    const b = dm({ name: 'b', pinned: true });
    const res = sortDMs([a, b])[0];
    if (res !== b) throw new Error('pinned first failed');
  })();

  // orders by latest activity descending
  (function () {
    const a = dm({ name: 'a', lastMessageAt: '2023-01-01T00:00:00Z' });
    const b = dm({ name: 'b', lastInteractionAt: '2024-01-01T00:00:00Z' });
    const c = dm({ name: 'c', lastCallAt: '2022-01-01T00:00:00Z' });
    const names = sortDMs([a, b, c]).map(x => x.name);
    expectEqual(names, ['b', 'a', 'c'], 'activity order');
  })();

  // ties by name then id
  (function () {
    const a = Object.assign(dm({ name: 'alpha' }), { id: '1' });
    const b = Object.assign(dm({ name: 'alpha' }), { id: '0' });
    const ids = sortDMs([a, b]).map(x => x.id);
    expectEqual(ids, ['0', '1'], 'tie-break');
  })();

  console.log('[test] sortDMs passed');
})();


