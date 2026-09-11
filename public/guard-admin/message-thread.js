// Preserve media elements when receipts or neighboring messages change. Moving
// an existing audio element through replaceChildren can interrupt its playback.
export function createMessageThread(container) {
  const rows = new Map();
  function dispose(row) { row.node.querySelectorAll('audio').forEach(audio => audio.pause()); row.dispose?.(); row.node.remove(); }
  function clear() { for (const row of rows.values()) dispose(row); rows.clear(); container.replaceChildren(); }
  function update(messages, { fingerprint, create, refresh }) {
    const keep = new Set(messages.map(message => message.id));
    for (const [id, row] of rows) if (!keep.has(id)) { dispose(row); rows.delete(id); }
    let previous = null;
    for (const message of messages) {
      const key = fingerprint(message); let row = rows.get(message.id);
      if (row && row.key !== key) { dispose(row); rows.delete(message.id); row = null; }
      if (!row) { row = { ...create(message), key }; rows.set(message.id, row); }
      refresh(row.node, message);
      const expected = previous ? previous.nextSibling : container.firstChild;
      if (row.node !== expected) container.insertBefore(row.node, expected);
      previous = row.node;
    }
  }
  return { update, clear, pause: () => container.querySelectorAll('audio').forEach(audio => audio.pause()) };
}
