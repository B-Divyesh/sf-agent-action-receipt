const themeButton = document.querySelector('.theme');

if (themeButton) {
  themeButton.addEventListener('click', () => {
    const dark = document.body.dataset.theme !== 'dark';
    document.body.dataset.theme = dark ? 'dark' : 'auto';
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.setAttribute('aria-label', dark ? 'Use system theme' : 'Use dark theme');
  });
}

const copyButton = document.querySelector('.copy');
if (copyButton) {
  copyButton.addEventListener('click', async () => {
    const value = copyButton.dataset.copy;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        copied = true;
      } else {
        const fallback = document.createElement('textarea');
        fallback.value = value;
        fallback.setAttribute('readonly', '');
        fallback.style.cssText = 'position:fixed;opacity:0';
        document.body.append(fallback);
        fallback.select();
        copied = document.execCommand('copy');
        fallback.remove();
      }
    } catch {
      copied = false;
    }
    copyButton.textContent = copied ? 'Copied' : 'Copy unavailable';
    window.setTimeout(() => { copyButton.textContent = 'Copy install command'; }, 1200);
  });
}

const form = document.querySelector('#action-form');
if (form) {
  const list = document.querySelector('#receipts');
  const verification = document.querySelector('#verification');
  const status = document.querySelector('#form-status');
  const offlineNote = document.querySelector('#offline-note');
  const resetButton = document.querySelector('#reset-demo');
  const submitButton = form.querySelector('button[type="submit"]');
  const connectionStatus = document.querySelector('#connection-status');
  const seed = [
    { sequence:41, tool:'billing.refund', state:'prepared', authority:'8f2a…d91c', hash:'1bb82607a7149d3d50d55e9649b6e5c85cfa78dc99a07b83ec3a123a34d6a042', previous:'6d0f79a4508d48a1d6fe429635fbcd82aa1a5d8310ced1f68a31bb51fc5d982a' },
    { sequence:42, tool:'billing.refund', state:'succeeded', result:'a10e…77b1', hash:'f8cd843d365b5825967a868ecb5b3102ba34c62db10be81ee5d2c59f167811e9', previous:'1bb82607a7149d3d50d55e9649b6e5c85cfa78dc99a07b83ec3a123a34d6a042' }
  ];
  let chain = [];
  let unresolved = null;

  const digest = async (text) => {
    const bytes = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, '0')).join('');
  };

  const addDetail = (listElement, name, value) => {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = name;
    description.textContent = value;
    row.append(term, description);
    listElement.append(row);
  };

  const receiptCard = (receipt) => {
    const card = document.createElement('article');
    card.className = 'receipt';
    const top = document.createElement('div');
    top.className = 'receipt-top';
    const label = document.createElement('span');
    label.className = `tag ${receipt.state === 'succeeded' ? 'good' : receipt.state === 'prepared' ? '' : 'bad'}`;
    label.textContent = receipt.state === 'prepared' ? 'PREPARED' : receipt.state === 'succeeded' ? '✓ SUCCEEDED' : receipt.state === 'outbox' ? '⚠ OUTBOX' : '× FAILED';
    const tool = document.createElement('strong');
    tool.textContent = receipt.tool;
    top.append(label, tool);
    const details = document.createElement('dl');
    addDetail(details, 'Sequence', String(receipt.sequence));
    addDetail(details, receipt.result ? 'Result' : 'Authority', receipt.result || receipt.authority || 'hashed');
    const hash = document.createElement('p');
    hash.className = 'hash';
    hash.textContent = `previous ${receipt.previous ? receipt.previous.slice(0, 12) : 'chain origin'} → receipt ${receipt.hash.slice(0, 12)}`;
    card.append(top, details, hash);
    return card;
  };

  const chainIsLinked = () => chain.every((receipt, index) => index === 0 || receipt.previous === chain[index - 1].hash);

  const render = () => {
    const visible = unresolved ? [...chain.slice(-3), unresolved] : chain.slice(-4);
    list.replaceChildren(...visible.map(receiptCard));
    const linked = chainIsLinked() && (!unresolved || unresolved.previous === chain.at(-1)?.hash);
    verification.className = unresolved ? 'verification outbox' : 'verification';
    verification.textContent = unresolved
      ? 'Explicit unresolved outbox item: the tool ran, but the final receipt was not stored.'
      : linked
        ? `Chain verified in this browser: ${chain.length} linked sample records.`
        : 'The sample chain is not linked. Reset the demo to recover.';
    offlineNote.hidden = !unresolved;
    submitButton.disabled = Boolean(unresolved);
  };

  const reset = () => {
    chain = seed.map((receipt) => ({ ...receipt }));
    unresolved = null;
    form.reset();
    status.textContent = 'Sample restored. No data was saved.';
    render();
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const tool = String(data.get('tool')).trim();
    const authority = String(data.get('authority')).trim();
    const outcome = String(data.get('result'));
    status.textContent = 'Hashing the action and creating the prepared record.';
    const previous = chain.at(-1)?.hash || null;
    const authorityHash = await digest(authority);
    const prepared = {
      sequence:(chain.at(-1)?.sequence || 0) + 1,
      tool,
      state:'prepared',
      authority:authorityHash.slice(0, 4) + '…' + authorityHash.slice(-4),
      previous,
      hash:await digest(`prepared|${tool}|${authority}|${previous}`)
    };
    chain.push(prepared);
    const finalState = outcome === 'outbox' ? 'outbox' : outcome;
    const final = {
      sequence:prepared.sequence + 1,
      tool,
      state:finalState,
      result:outcome === 'failed' ? 'error hash' : 'result hash',
      previous:prepared.hash,
      hash:await digest(`${finalState}|${tool}|${authority}|${prepared.hash}`)
    };
    if (outcome === 'outbox') {
      unresolved = final;
      status.textContent = 'The action is explicit in the unresolved outbox. Reset before creating another action.';
    } else {
      chain.push(final);
      status.textContent = outcome === 'failed' ? 'Failure receipt created and linked.' : 'Success receipt created and linked.';
    }
    render();
  });

  resetButton.addEventListener('click', reset);
  reset();

  const showConnection = () => {
    connectionStatus.textContent = navigator.onLine ? '' : 'Offline. The cached sample remains available.';
  };
  window.addEventListener('online', showConnection);
  window.addEventListener('offline', showConnection);
  showConnection();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
