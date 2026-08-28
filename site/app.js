const form = document.querySelector('#action-form');
const list = document.querySelector('#receipts');
const empty = document.querySelector('#empty-state');
const verify = document.querySelector('#verification');
const status = document.querySelector('#form-status');
const offline = document.querySelector('#offline-note');
let chain = [];
document.body.dataset.theme = 'auto';

async function digest(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function receiptCard(receipt) {
  const el = document.createElement('article');
  el.className = 'receipt';
  const top = document.createElement('div'); top.className = 'receipt-top';
  const label = document.createElement('span'); label.className = `tag ${receipt.state === 'prepared' ? '' : receipt.state === 'succeeded' ? 'good' : 'bad'}`;
  label.textContent = receipt.state === 'prepared' ? 'PREPARED' : receipt.state === 'succeeded' ? '✓ SUCCEEDED' : receipt.state === 'outbox' ? '⚠ OUTBOX' : '× FAILED';
  const tool = document.createElement('strong'); tool.textContent = receipt.tool;
  top.append(label, tool);
  const hash = document.createElement('p'); hash.className = 'hash'; hash.textContent = `#${receipt.hash}  ←  ${receipt.previous ? receipt.previous.slice(0, 16) : 'chain origin'}`;
  el.append(top, hash); return el;
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form); const tool = String(data.get('tool')); const authority = String(data.get('authority')); const outcome = String(data.get('result'));
  status.textContent = 'Hashing the action and filing the prepared receipt…';
  const previous = chain.at(-1)?.hash || null;
  const prepared = { tool, state:'prepared', previous, hash: await digest(`prepared|${tool}|${authority}|${previous}`) };
  chain.push(prepared);
  const finalState = outcome === 'outbox' ? 'outbox' : outcome;
  const final = { tool, state:finalState, previous:prepared.hash, hash: await digest(`${finalState}|${tool}|${authority}|${prepared.hash}`) };
  if (outcome !== 'outbox') chain.push(final);
  empty.hidden = true; list.hidden = false; list.replaceChildren(...chain.slice(-4).map(receiptCard));
  verify.hidden = false; offline.hidden = outcome !== 'outbox';
  if (outcome === 'outbox') { verify.className = 'verification outbox'; verify.textContent = 'Explicit unresolved outbox item: the tool succeeded, but the final receipt was not persisted.'; status.textContent = 'Action recorded with an unresolved outbox item.'; }
  else { verify.className = 'verification'; verify.textContent = `Chain verified locally: ${chain.length} linked receipt${chain.length === 1 ? '' : 's'}.`; status.textContent = outcome === 'failed' ? 'Failure receipt filed.' : 'Success receipt filed and linked.'; }
});
document.querySelector('.theme').addEventListener('click', (event) => {
  const next = document.body.dataset.theme === 'dark' ? 'auto' : 'dark';
  document.body.dataset.theme = next; event.currentTarget.setAttribute('aria-pressed', String(next === 'dark'));
});
document.querySelector('.copy').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const value = button.dataset.copy;
  let copied = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      copied = true;
    } else {
      const fallback = document.createElement('textarea');
      fallback.value = value; fallback.setAttribute('readonly', '');
      fallback.style.cssText = 'position:fixed;opacity:0'; document.body.append(fallback);
      fallback.select(); copied = document.execCommand('copy'); fallback.remove();
    }
  } catch { copied = false; }
  button.textContent = copied ? 'Copied' : 'Copy unavailable';
  setTimeout(() => button.textContent = 'Copy install command', 1200);
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
