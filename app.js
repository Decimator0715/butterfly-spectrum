/* Browser-only controls. Works without a build step or external services. */
(() => {
  'use strict';
  const video = document.getElementById('butterfly-video');
  const play = document.getElementById('play-toggle');
  const status = document.getElementById('player-status');
  const chapterButtons = [...document.querySelectorAll('[data-time]')];
  const setStatus = text => { status.textContent = text; status.classList.remove('error'); };
  let pendingSeek = null;
  let pendingLabel = null;
  video.addEventListener('seeked', () => {
    if (pendingLabel) { setStatus(`已定位到${pendingLabel}。点击播放可继续观看。`); pendingLabel = null; }
  });
  const seekTo = (seconds, label) => {
    video.pause();
    const seek = () => {
      const target = Math.min(seconds, Math.max(0, video.duration - 0.1));
      pendingLabel = label;
      const unchanged = Math.abs(video.currentTime - target) < 0.0001;
      setStatus(unchanged ? `已定位到${label}。点击播放可继续观看。` : `正在定位到${label}…`);
      video.currentTime = target;
      chapterButtons.forEach(button => button.classList.toggle('active', Number(button.dataset.time) === seconds));
    };
    if (video.readyState >= 1) seek();
    else { pendingSeek = seek; video.load(); }
  };
  play.addEventListener('click', async () => {
    if (!video.paused) { video.pause(); return; }
    try { await video.play(); }
    catch { status.textContent = '暂时无法播放，请使用下方 MP4 下载链接。'; status.classList.add('error'); }
  });
  video.addEventListener('play', () => { play.textContent = '暂停演示'; setStatus('正在播放磁通扫描。可使用控制条或关键磁通跳转。'); });
  video.addEventListener('pause', () => { play.textContent = '继续播放'; });
  video.addEventListener('ended', () => { play.textContent = '重新播放'; setStatus('演示已结束，可从任意关键磁通重新观看。'); });
  video.addEventListener('loadedmetadata', () => {
    if (pendingSeek) { const action = pendingSeek; pendingSeek = null; action(); }
  });
  video.addEventListener('error', () => { status.textContent = '视频未能载入，请确认 assets 文件夹与网页一起保存，或下载 MP4 播放。'; status.classList.add('error'); });
  document.getElementById('playback-rate').addEventListener('change', event => { video.playbackRate = Number(event.target.value); });
  chapterButtons.forEach(button => button.addEventListener('click', () => seekTo(Number(button.dataset.time), button.dataset.label)));
  document.querySelectorAll('[data-seek]').forEach(link => link.addEventListener('click', () => seekTo(Number(link.dataset.seek), '中央闭隙：α = 1/2')));

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
    if (!matches.length) { results.textContent = '没有找到相关章节。可尝试：视频、物理量、IEB、能隙。'; return; }
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
