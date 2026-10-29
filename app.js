/* Browser-only controls. Works without a build step or external services. */
(() => {
  'use strict';
  const english = document.documentElement.lang === 'en';
  const tr = (en, zh) => english ? en : zh;
  const video = document.getElementById('butterfly-video');
  const play = document.getElementById('play-toggle');
  const status = document.getElementById('player-status');
  const rate = document.getElementById('playback-rate');
  const chapterButtons = [...document.querySelectorAll('[data-time]')];
  const orderButtons = [...document.querySelectorAll('[data-order]')];
  const setStatus = text => { status.textContent = text; status.classList.remove('error'); };
  let order = '1';
  let generation = 0;
  let pending = null;
  let seekLabel = null;
  const selectedButton = () => orderButtons.find(button => button.dataset.order === order);
  const currentSourceMatches = () => video.currentSrc === new URL(selectedButton().dataset.video, location.href).href;
  const showError = text => { status.textContent = text; status.classList.add('error'); };
  const startPlaying = async () => {
    const token = generation;
    try { await video.play(); }
    catch (error) {
      if (token === generation && error.name !== 'AbortError') showError(tr('Playback is unavailable. Please use the MP4 download link below.', '暂时无法播放，请使用下方 MP4 下载链接。'));
    }
  };
  const applyNavigation = () => {
    if (!pending || video.readyState < 1 || !currentSourceMatches()) return;
    const action = pending;
    pending = null;
    video.playbackRate = Number(rate.value);
    // MATLAB's last frame is presented exactly at duration; seeking just
    // before it would display the preceding flux (68/69 instead of 69/70).
    const target = Math.min(action.time, Math.max(0, video.duration));
    seekLabel = { generation, text: action.label };
    video.currentTime = target;
    setStatus(action.label + (action.resume ? tr('. Resuming playback.', '，继续播放。') : tr('. Press play to continue.', '。点击播放可继续观看。')));
    if (action.resume) startPlaying();
  };
  const changeOrder = (nextOrder, explicitTime = null, label = null) => {
    const button = orderButtons.find(item => item.dataset.order === String(nextOrder));
    if (!button) return;
    const oldOffset = Number(selectedButton().dataset.timeOffset || 0);
    const newOffset = Number(button.dataset.timeOffset || 0);
    const time = explicitTime ?? Math.max(0, (pending?.time ?? video.currentTime) - oldOffset + newOffset);
    const resume = explicitTime === null && (pending?.resume ?? !video.paused);
    if (order === String(nextOrder) && explicitTime === null) return;
    const changed = order !== String(nextOrder);
    order = String(nextOrder);
    generation += 1;
    video.pause();
    seekLabel = null;
    pending = { time: Number.isFinite(time) ? time : 0, resume,
      label: label || tr(`Switched to |m| = ${order}, keeping the current flux`, `已切换至 |m| = ${order}，保留当前磁通位置`) };
    orderButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.getElementById('order-description').textContent = tr(`Showing m = −${order} and +${order}`, `展示 m = −${order} 与 +${order}`);
    document.getElementById('download-order').textContent = ` (|m| = ${order})`;
    document.querySelectorAll('.current-video-download').forEach(link => { link.href = button.dataset.video; });
    const keyframes = document.getElementById('keyframe-download');
    if (keyframes) { keyframes.hidden = !button.dataset.keyframes; if (button.dataset.keyframes) keyframes.href = button.dataset.keyframes; }
    const format = document.getElementById('video-format-value');
    if (format) format.textContent = button.dataset.format;
    chapterButtons.forEach(chapter => { if (chapter.dataset.baseTime) { const base = Number(chapter.dataset.baseTime); chapter.dataset.time = String(base + (base === 0.15 ? 0 : newOffset)); } });
    document.getElementById('half-flux-state').textContent = order === '2' ? tr('No internal gap', '无内部隙') : order === '3' ? tr('Lower-order folding', '低阶折叠') : tr('Closed gap', '闭隙');
    if (changed) {
      video.poster = button.dataset.poster;
      video.src = button.dataset.video;
      setStatus(tr(`Loading |m| = ${order}, keeping the current flux…`, `正在载入 |m| = ${order}，将保留当前磁通位置…`));
      video.load();
    } else applyNavigation();
  };
  const seekTo = (seconds, label) => {
    video.pause();
    pending = { time: seconds, resume: false, label: tr(`Positioned at ${label}`, `已定位到${label}`) };
    chapterButtons.forEach(button => button.classList.toggle('active', Number(button.dataset.time) === seconds));
    setStatus(tr(`Seeking to ${label}…`, `正在定位到${label}…`));
    applyNavigation();
  };
  orderButtons.forEach(button => button.addEventListener('click', () => changeOrder(button.dataset.order)));
  video.addEventListener('loadedmetadata', applyNavigation);
  video.addEventListener('seeked', () => {
    if (seekLabel?.generation === generation && video.paused) {
      setStatus(seekLabel.text + tr('. Press play to continue.', '。点击播放可继续观看。'));
      seekLabel = null;
    }
  });
  play.addEventListener('click', () => {
    if (!video.paused) { video.pause(); if (pending) pending.resume = false; return; }
    if (pending) pending.resume = true;
    startPlaying();
  });
  video.addEventListener('play', () => {
    play.textContent = tr('Pause animation', '暂停演示');
    setStatus(tr(`Playing the |m| = ${order} flux scan. Switch orders or jump to a key flux.`, `正在播放 |m| = ${order} 的磁通扫描。可切换阶数或跳转关键磁通。`));
  });
  video.addEventListener('pause', () => { play.textContent = tr('Resume playback', '继续播放'); });
  video.addEventListener('ended', () => { play.textContent = tr('Replay', '重新播放'); setStatus(tr('The animation has ended. Start again from any key flux.', '演示已结束，可从任意关键磁通重新观看。')); });
  video.addEventListener('error', () => showError(tr('The video could not be loaded. Try switching orders again or download the current MP4.', '视频未能载入，可重试切换阶数，或使用当前 MP4 下载链接。')));
  rate.addEventListener('change', () => { video.playbackRate = Number(rate.value); });
  chapterButtons.forEach(button => button.addEventListener('click', () => seekTo(Number(button.dataset.time), button.dataset.label)));
  document.querySelectorAll('[data-seek]').forEach(link => link.addEventListener('click', () => {
    changeOrder(link.dataset.seekOrder || order, Number(link.dataset.seek), tr('Positioned at |m| = 1, α = 1/2: central gap closure', '已定位到 |m| = 1，α = 1/2 中央闭隙'));
  }));

  // Two static language pages remain usable without JavaScript. With JS,
  // carry the same order, flux position and speed across the navigation.
  // Resume is explicit after changing language, avoiding autoplay restrictions.
  document.querySelectorAll('[data-language]').forEach(link => link.addEventListener('click', event => {
    if (link.getAttribute('aria-current') === 'page') { event.preventDefault(); return; }
    const url = new URL(link.getAttribute('href'), location.href);
    url.searchParams.set('order', order);
    url.searchParams.set('time', String(pending?.time ?? video.currentTime));
    url.searchParams.set('rate', rate.value);
    url.hash = location.hash;
    link.href = url.href;
  }));
  const navigation = new URLSearchParams(location.search);
  if (navigation.has('time') || navigation.has('order')) {
    const nextOrder = ['1', '2', '3'].includes(navigation.get('order')) ? navigation.get('order') : '1';
    const seconds = Number(navigation.get('time'));
    const nextRate = navigation.get('rate');
    if (['0.5', '1', '1.5', '2'].includes(nextRate)) rate.value = nextRate;
    changeOrder(nextOrder, Number.isFinite(seconds) ? Math.max(0, seconds) : 0,
      tr('Language changed; the flux position is preserved', '已切换语言，保留当前磁通位置'));
  }

  const root = document.documentElement;
  const settings = { font: ['small', 'standard', 'large'], width: ['standard', 'wide'], theme: ['light', 'dark', 'system'] };
  const preferences = { font: 'standard', width: 'standard', theme: 'light' };
  try { const saved = JSON.parse(localStorage.getItem('butterflyWikiAppearance') || '{}'); for (const key of Object.keys(settings)) if (settings[key].includes(saved[key])) preferences[key] = saved[key]; } catch { /* File-mode storage may be unavailable. */ }
  const applyPreferences = () => {
    for (const key of Object.keys(settings)) {
      root.dataset[key] = preferences[key];
      document.querySelectorAll(`input[name="${key}"]`).forEach(input => { input.checked = input.value === preferences[key]; });
    }
  };
  applyPreferences();
  document.querySelectorAll('.appearance input').forEach(input => input.addEventListener('change', () => {
    if (!input.checked) return;
    preferences[input.name] = input.value;
    applyPreferences();
    try { localStorage.setItem('butterflyWikiAppearance', JSON.stringify(preferences)); } catch { /* Page remains usable without storage. */ }
  }));
  const toc = document.getElementById('toc');
  const appearance = document.getElementById('appearance');
  const backdrop = document.getElementById('page-backdrop');
  const closePanels = () => {
    toc.classList.remove('open'); appearance.classList.remove('open'); backdrop.hidden = true;
    document.getElementById('toc-toggle').setAttribute('aria-expanded', 'false');
    document.getElementById('appearance-toggle').setAttribute('aria-expanded', 'false');
  };
  for (const [id, panel] of [['toc-toggle', toc], ['appearance-toggle', appearance]]) {
    document.getElementById(id).addEventListener('click', () => {
      const opened = panel.classList.contains('open'); closePanels();
      if (!opened) { panel.classList.add('open'); backdrop.hidden = false; document.getElementById(id).setAttribute('aria-expanded', 'true'); }
    });
  }
  backdrop.addEventListener('click', closePanels);
  toc.querySelectorAll('a').forEach(link => link.addEventListener('click', closePanels));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closePanels(); document.getElementById('search-results').hidden = true; } });

  const results = document.getElementById('search-results');
  document.getElementById('search-form').addEventListener('submit', event => {
    event.preventDefault(); results.replaceChildren();
    const query = document.getElementById('site-search').value.trim().toLocaleLowerCase();
    if (!query) { results.hidden = true; return; }
    const matches = [...document.querySelectorAll('[data-search]')].filter(section => `${section.dataset.search} ${section.querySelector('h2').textContent}`.toLocaleLowerCase().includes(query));
    results.hidden = false;
    if (!matches.length) { results.textContent = tr('No matching section. Try: video, model, IEB or gaps.', '没有找到相关章节。可尝试：视频、物理量、IEB、能隙。'); return; }
    for (const section of matches) {
      const link = document.createElement('a'); link.href = `#${section.id}`; link.textContent = section.querySelector('h2').textContent;
      link.addEventListener('click', () => { results.hidden = true; section.querySelector('h2').focus({ preventScroll: true }); }); results.append(link);
    }
  });
  document.getElementById('site-search').addEventListener('input', event => { if (!event.target.value) results.hidden = true; });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        toc.querySelectorAll('a').forEach(link => { if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
      }
    }, { rootMargin: '-5% 0px -70% 0px', threshold: 0 });
    document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
  }
})();
