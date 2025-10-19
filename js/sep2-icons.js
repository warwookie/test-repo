(function () {
  if (window.__sep2Bound) return;
  window.__sep2Bound = true;

  function getSel() {
    return document.querySelector('.block.sel') || window.selected || null;
  }

  function ensureIconsHost(block) {
    if (!block) return null;
    let icons = block.querySelector('.iconsHost');
    if (!icons) {
      icons = document.createElement('span');
      icons.className = 'iconsHost';
      const inner = block.querySelector('.innerHost') || block;
      inner.appendChild(icons);
    }
    return icons;
  }

  function rebuildIcons(block, count) {
    const host = ensureIconsHost(block);
    host.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const icon = document.createElement('span');
      icon.className = 'iconToken';
      host.appendChild(icon);
    }
  }

  let targetInput = null;
  document.querySelectorAll('input').forEach((inp) => {
    if (inp.previousElementSibling?.textContent?.match(/Icon Count/i)) targetInput = inp;
  });

  if (!targetInput) {
    console.warn('[SEP-2] No Icon Count input found');
    return;
  }

  targetInput.addEventListener('input', () => {
    const block = getSel();
    if (!block) return;
    const n = Math.max(0, parseInt(targetInput.value) || 0);
    rebuildIcons(block, n);
  });

  targetInput.addEventListener('change', () => {
    const block = getSel();
    if (!block) return;
    const n = Math.max(0, parseInt(targetInput.value) || 0);
    rebuildIcons(block, n);
    if (window.snapshot) window.snapshot();
  });

  console.log('[SEP-2] Text + Icons unified successfully');
})();
