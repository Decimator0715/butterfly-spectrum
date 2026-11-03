/* Original PNG viewer. No spectral calculations or interpolation in the browser. */
(() => {
  'use strict';
  const en = document.documentElement.lang === 'en';
  const tr = (a, b) => en ? a : b;
  const data = JSON.parse(document.getElementById('keyframe-data').textContent);
  const flux = document.getElementById('image-flux');
  const order = document.getElementById('image-order');
  const cards = [...document.querySelectorAll('[data-image-order]')];
  const modes = [...document.querySelectorAll('[data-image-mode]')];
  const note = document.getElementById('comparison-note');
  let mode = 'single';
  const states = {
    open: tr('Both target gaps open', '两个目标能隙开放'),
    closed: tr('Central gap closed', '中央能隙闭合'),
    folded: tr('Folds to lower order', '折叠为低阶标签'),
    absent: tr('No internal target gap', '无内部目标能隙')
  };
  function render() {
    modes.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.imageMode === mode)));
    document.getElementById('image-order-label').hidden = mode === 'compare';
    document.getElementById('linked-entry').hidden = mode !== 'compare';
    const descriptions = [];
    cards.forEach(card => {
      const m = card.dataset.imageOrder;
      const item = data[`${m}:${flux.value}`];
      const visible = mode === 'compare' || order.value === m;
      card.hidden = !visible;
      const caption = `|m| = ${m}, α = ${flux.value}; ${states[item.state]}`;
      card.querySelector('.keyframe-status').textContent = states[item.state];
      card.querySelector('.keyframe-flux').textContent = `α = ${flux.value}`;
      const image = card.querySelector('img');
      image.alt = caption;
      const open = card.querySelector('.image-open');
      open.href = item.src; open.setAttribute('aria-label', tr('Enlarge: ', '放大：') + caption);
      if (visible && image.getAttribute('src') !== item.preview) {
        image.style.visibility = 'hidden';open.dataset.loading = 'true';
        open.dataset.loadingText = tr('Loading preview…', '正在载入预览…');
        image.src = item.preview;
        if (image.complete && image.naturalWidth) {image.style.visibility = '';open.dataset.loading = 'false';}
      }
      card.querySelector('.single-image-download').href = item.src;
      if (visible) descriptions.push(`|m| = ${m}: ${states[item.state]}`);
    });
    note.textContent = `α = ${flux.value} · ` + descriptions.join(' · ');
    if (mode === 'compare' && cards.some(c => data[`${c.dataset.imageOrder}:${flux.value}`].state === 'folded')) {
      note.textContent += tr('. A folded label is not an independent higher-order gap; lower-order gaps may remain.', '。折叠标签不作为独立高阶能隙，低阶能隙仍可存在。');
    }
  }
  modes.forEach(b => b.addEventListener('click', () => { mode = b.dataset.imageMode; render(); }));
  flux.addEventListener('change', render); order.addEventListener('change', render);
  document.querySelectorAll('[data-open-compare]').forEach(a => a.addEventListener('click', () => { mode = 'compare'; render(); }));
  const params = new URLSearchParams(location.search);
  cards.forEach(card => {
    const img = card.querySelector('img'), link = card.querySelector('.image-open');
    img.addEventListener('load', () => {img.style.visibility = '';link.dataset.loading = 'false';});
    img.addEventListener('error', () => {link.dataset.loading = 'true';link.dataset.loadingText = tr('Image unavailable — click to retry or download.', '图像未载入，可点击重试或下载。');});
  });
  if ([...flux.options].some(o => o.value === params.get('figureFlux'))) flux.value = params.get('figureFlux');
  if (['1','2','3'].includes(params.get('figureOrder'))) order.value = params.get('figureOrder');
  if (params.get('figureView') === 'compare') mode = 'compare';
  render();
  document.querySelectorAll('[data-language]').forEach(a => a.addEventListener('click', () => {
    const url = new URL(a.href, location.href);
    url.searchParams.set('figureFlux', flux.value);url.searchParams.set('figureOrder', order.value);url.searchParams.set('figureView', mode);
    a.href = url.href;
  }));

  const dialog = document.getElementById('image-dialog');
  const viewport = document.getElementById('image-viewport');
  const image = document.getElementById('zoom-image');
  const message = document.getElementById('zoom-status');
  let scale = 1, fitScale = 1, trigger = null, drag = null;
  let token = 0;
  function resize(next, reset = false) {
    const old = scale;
    scale = Math.max(fitScale, Math.min(2, next));
    image.style.width = `${3600 * scale}px`;
    document.getElementById('zoom-value').textContent = `${Math.round(scale * 100)}%`;
    document.getElementById('zoom-out').disabled = scale <= fitScale + .0001;
    document.getElementById('zoom-in').disabled = scale >= 2;
    if (reset) { viewport.scrollLeft = 0; viewport.scrollTop = 0; }
    else { viewport.scrollLeft = (viewport.scrollLeft + viewport.clientWidth / 2) * scale / old - viewport.clientWidth / 2;
      viewport.scrollTop = (viewport.scrollTop + viewport.clientHeight / 2) * scale / old - viewport.clientHeight / 2; }
  }
  function fit() {
    fitScale = Math.min(viewport.clientWidth / 3600, viewport.clientHeight / 1800, 1);
    resize(fitScale, true);
  }
  async function enlarge(m, button) {
    if (mode === 'compare') { openLinked(button); return; }
    const item = data[`${m}:${flux.value}`];
    trigger = button; const current = ++token;
    const title = `|m| = ${m} · α = ${flux.value} · 3600 × 1800`;
    document.getElementById('image-dialog-title').textContent = title;
    document.getElementById('zoom-download').href = item.src;
    image.alt = title + ' · ' + states[item.state];
    message.textContent = tr('Loading original PNG…', '正在载入原始 PNG…');
    image.hidden = true; image.src = item.src;
    dialog.showModal(); document.body.classList.add('image-modal-open');
    fit();
    try {
      await image.decode();
      if (token !== current || !dialog.open) return;
      image.hidden = false; fit();
      message.textContent = states[item.state];
    } catch {
      if (token === current) message.textContent = tr('The image could not load. Close and retry, or use the original PNG link.', '图像未能载入，可关闭后重试，或使用原始 PNG 链接。');
    }
  }
  cards.forEach(card => {
    card.querySelector('.image-open').addEventListener('click', event => { event.preventDefault(); enlarge(card.dataset.imageOrder, event.currentTarget); });
    card.querySelector('.enlarge-image').addEventListener('click', event => enlarge(card.dataset.imageOrder, event.currentTarget));
  });
  document.getElementById('zoom-in').addEventListener('click', () => resize(scale * 1.5));
  document.getElementById('zoom-out').addEventListener('click', () => resize(scale / 1.5));
  document.getElementById('zoom-fit').addEventListener('click', fit);
  document.getElementById('zoom-native').addEventListener('click', () => resize(1));
  document.getElementById('image-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { token += 1; document.body.classList.remove('image-modal-open'); trigger?.focus({preventScroll:true}); });
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = {x:event.clientX, y:event.clientY, left:viewport.scrollLeft, top:viewport.scrollTop};
    viewport.setPointerCapture(event.pointerId); viewport.classList.add('dragging'); event.preventDefault();
  });
  viewport.addEventListener('pointermove', event => {
    if (drag) { viewport.scrollLeft = drag.left + drag.x - event.clientX; viewport.scrollTop = drag.top + drag.y - event.clientY; }
  });
  const stopDrag = () => { drag = null; viewport.classList.remove('dragging'); };
  viewport.addEventListener('pointerup', stopDrag); viewport.addEventListener('pointercancel', stopDrag);
  window.addEventListener('resize', () => { if (dialog.open) fit(); });

  // All original exports share a 3600 × 1800 canvas. Use one pixel scale
  // and equal-size viewports; sync scroll offsets, never resample spectral data.
  const linked = document.getElementById('linked-dialog');
  const panes = [...linked.querySelectorAll('.linked-pane')];
  const views = panes.map(p => p.querySelector('.linked-viewport'));
  let linkedScale = 1, linkedFit = 1, linkedTrigger = null, linkedToken = 0;
  let linkedDrag = null, scrollFrame = 0, scrollSource = null;
  const expectedScroll = new WeakMap();
  function cancelScroll() {
    cancelAnimationFrame(scrollFrame); scrollFrame = 0; scrollSource = null;
  }
  function alignViews(left, top) {
    // Identical viewport dimensions and scroll extents keep all image positions equal.
    views.forEach(v => {
      v.scrollLeft = left; v.scrollTop = top;
      expectedScroll.set(v, {x:v.scrollLeft,y:v.scrollTop});
    });
  }
  function linkedResize(next, reset = false) {
    cancelScroll();
    const v = views[0], old = linkedScale;
    const x = 3600 * old <= v.clientWidth ? 1800 : (v.scrollLeft + v.clientWidth / 2) / old;
    const y = 1800 * old <= v.clientHeight ? 900 : (v.scrollTop + v.clientHeight / 2) / old;
    linkedScale = Math.max(linkedFit, Math.min(2, next));
    panes.forEach(p => {
      const canvas = p.querySelector('.linked-canvas');
      canvas.style.width = `${3600 * linkedScale}px`;
      canvas.style.height = `${1800 * linkedScale}px`;
    });
    document.getElementById('linked-value').textContent = `${Math.round(linkedScale * 100)}%`;
    document.getElementById('linked-out').disabled = linkedScale <= linkedFit + .0001;
    document.getElementById('linked-in').disabled = linkedScale >= 2;
    alignViews(reset ? 0 : x * linkedScale - v.clientWidth / 2,
      reset ? 0 : y * linkedScale - v.clientHeight / 2);
  }
  function fitLinked() {
    linkedFit = Math.min(...views.map(v => Math.min(v.clientWidth / 3600, v.clientHeight / 1800)), 1);
    linkedResize(linkedFit, true);
  }
  function openLinked(button) {
    linkedTrigger = button;
    const current = ++linkedToken;
    document.getElementById('linked-title').textContent = tr('Linked zoom', '三阶联动放大') + ` · α = ${flux.value}`;
    panes.forEach(p => {
      const m = p.dataset.linkedOrder, item = data[`${m}:${flux.value}`];
      const img = p.querySelector('img'), status = p.querySelector('.linked-load');
      p.querySelector('.linked-state').textContent = states[item.state];
      p.querySelector('.linked-download').href = item.src;
      img.style.visibility = 'hidden';
      img.alt = `|m| = ${m} · α = ${flux.value} · ${states[item.state]}`;
      status.textContent = tr('Loading original PNG…', '正在载入原始 PNG…');
      img.src = item.src;
      img.decode().then(() => {
        if (current !== linkedToken || !linked.open) return;
        img.style.visibility = '';
        status.textContent = '';
      }).catch(() => {
        if (current === linkedToken && linked.open) status.textContent = tr('Could not load. Close and retry, or open Original PNG.', '载入失败，可关闭后重试，或打开原始 PNG。');
      });
    });
    linked.showModal(); document.body.classList.add('image-modal-open'); fitLinked();
  }
  document.getElementById('linked-enlarge').addEventListener('click', event => openLinked(event.currentTarget));
  document.getElementById('linked-in').addEventListener('click', () => linkedResize(linkedScale * 1.5));
  document.getElementById('linked-out').addEventListener('click', () => linkedResize(linkedScale / 1.5));
  document.getElementById('linked-fit').addEventListener('click', fitLinked);
  document.getElementById('linked-native').addEventListener('click', () => linkedResize(1));
  document.getElementById('linked-close').addEventListener('click', () => linked.close());
  linked.addEventListener('close', () => {
    linkedToken += 1; linkedDrag = null; cancelScroll();
    views.forEach(v => v.classList.remove('dragging'));
    document.body.classList.remove('image-modal-open'); linkedTrigger?.focus({preventScroll:true});
  });
  views.forEach(v => {
    v.addEventListener('scroll', () => {
      // Ignore scroll events queued by our own updates; an older event from
      // another pane must not undo the user's newest scroll gesture.
      const expected = expectedScroll.get(v);
      if (expected && Math.abs(v.scrollLeft-expected.x)<1 && Math.abs(v.scrollTop-expected.y)<1) return;
      if (!linked.open || views.every(other => Math.abs(other.scrollLeft-v.scrollLeft) < 1 && Math.abs(other.scrollTop-v.scrollTop) < 1)) return;
      scrollSource = v;
      if (!scrollFrame) scrollFrame = requestAnimationFrame(() => {
        const source = scrollSource; cancelScroll();
        if (source && linked.open) alignViews(source.scrollLeft, source.scrollTop);
      });
    });
    v.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      cancelScroll();
      linkedDrag = {view:v,x:event.clientX,y:event.clientY,left:v.scrollLeft,top:v.scrollTop};
      v.setPointerCapture(event.pointerId); v.classList.add('dragging'); v.focus({preventScroll:true}); event.preventDefault();
    });
    v.addEventListener('pointermove', event => {
      if (linkedDrag?.view !== v) return;
      alignViews(linkedDrag.left+linkedDrag.x-event.clientX, linkedDrag.top+linkedDrag.y-event.clientY);
    });
    const stop = () => { linkedDrag = null; v.classList.remove('dragging'); };
    v.addEventListener('pointerup', stop); v.addEventListener('pointercancel', stop);
  });
  window.addEventListener('resize', () => { if (linked.open) fitLinked(); });
  // Version links and search results reveal collapsed material before scrolling.
  function reveal(hash) {
    if (hash !== '#provenance') return;
    const details = document.querySelector('#provenance details');if (details) details.open = true;
  }
  document.addEventListener('click', event => { const a = event.target.closest('a[href]');if (a) reveal(new URL(a.href,location.href).hash); });
  reveal(location.hash);
})();
