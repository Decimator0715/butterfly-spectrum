/* Copy a snapshot of independent video and figure controls. No external sharing. */
(() => {
  'use strict';
  const en = document.documentElement.lang === 'en';
  const tr = (a,b) => en ? a : b;
  document.querySelectorAll('[data-share-view]').forEach(button => {
    button.addEventListener('click', async () => {
      const group=button.closest('.view-share'),status=group.querySelector('.share-status');
      const input=group.querySelector('.share-url');
      // Start clean: exclude unrelated query parameters or old navigation state.
      const url=new URL(location.pathname,location.origin);
      document.dispatchEvent(new CustomEvent('butterfly:share-state',{detail:{url}}));
      url.searchParams.set('figureFlux',document.getElementById('image-flux').value);
      url.searchParams.set('figureOrder',document.getElementById('image-order').value);
      url.searchParams.set('figureView',document.querySelector('[data-image-mode][aria-pressed="true"]').dataset.imageMode);
      url.hash=button.dataset.shareView;
      input.value=url.href;group.querySelector('.share-result').hidden=false;
      group.querySelector('.share-note').textContent=url.searchParams.get('source')==='bilibili'
        ? tr('Includes both video and figure selections. Bilibili playback position is not included; it opens from the beginning.','包含视频与图片的选择状态。B站播放器内部进度不包含在链接中，打开后从头播放。')
        : tr('Includes video order, source, position and speed, plus the independent figure flux, order and view. Playback starts paused.','包含视频阶数、源、位置和倍速，以及独立的图片磁通、阶数与模式。打开后暂停，点击播放继续。');
      button.disabled=true;status.textContent=tr('Copying…','正在复制…');
      try {
        if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(url.href);
        status.textContent=tr('Link copied.','链接已复制。');
      } catch {
        status.textContent=tr('Select and copy the link below.','请选中并复制下方链接。');
        input.focus();input.select();
      } finally {button.disabled=false;}
    });
  });
})();
