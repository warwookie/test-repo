// Simple JSON renderer for handheld-layout.json
(async function () {
  const root = document.getElementById('root');
  if (!root) return;

  // Load layout JSON
  const res = await fetch('../projects/handheld-layout.json', { cache: 'no-store' });
  const layout = await res.json();

  // Helpers
  const s = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 4;
  const tile = layout.grid?.tileSize ?? 8;
  const unit = tile * s;  // px per tile at current scale

  // Create one box per block
  const blocks = layout.blocks || {};
  for (const [id, b] of Object.entries(blocks)) {
    const el = document.createElement('div');
    el.className = 'tilebox';
    el.dataset.id = id;

    // Absolute position in tiles → px
    el.style.left   = (b.x * unit) + 'px';
    el.style.top    = (b.y * unit) + 'px';
    el.style.width  = (b.w * unit) + 'px';
    el.style.height = (b.h * unit) + 'px';

    // Label text: show id or a friendly name
    el.textContent = id;

    // Optional finer font size for narrow boxes so labels fit
    if (b.h <= 2 && (id.length > 8 || id.toLowerCase().includes('fires'))) {
      el.classList.add('smallText'); // helps labels like "FIRES" fit their 2-tile box
    }

    root.appendChild(el);
  }
})();
