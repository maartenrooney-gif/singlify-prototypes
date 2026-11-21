// Detects placeholder text in content strings ("to confirm", "to map", "[...]").
const MARK = /to confirm|to be confirmed|to map/i;

/** Split a string into plain and placeholder segments. */
export function segments(text) {
  if (typeof text !== 'string' || !MARK.test(text)) return [{ t: text, ph: false }];
  const out = [];
  const push = (t, ph) => {
    if (!t) return;
    const last = out[out.length - 1];
    if (last && last.ph === ph) last.t += t; else out.push({ t, ph });
  };
  for (const s of text.match(/[^.]+\.?\s*/g) ?? [text]) {
    if (!MARK.test(s)) { push(s, false); continue; }
    if (/\[[^\]]+\]/.test(s)) {
      for (const part of s.split(/(\[[^\]]+\])/)) push(part, /^\[/.test(part));
    } else if (/\([^)]*(to confirm|to map)[^)]*\)/i.test(s)) {
      for (const part of s.split(/(\([^)]*\))/)) push(part, /^\(/.test(part) && MARK.test(part));
    } else {
      const trimmed = s.trimEnd();
      push(trimmed, true);
      push(s.slice(trimmed.length), false);
    }
  }
  return out;
}

/** Walk a data object and list every string that contains a placeholder. */
export function collect(node, path = '', found = []) {
  if (typeof node === 'string') {
    const ph = segments(node).filter((x) => x.ph).map((x) => x.t);
    if (ph.length) found.push({ path, text: node, spans: ph });
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => collect(v, `${path}[${i}]`, found));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) if (k !== '_note') collect(v, path ? `${path}.${k}` : k, found);
  }
  return found;
}
