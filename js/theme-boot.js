(function() {
  try {
    var k = 'SQ_THEME_V1';
    var saved = localStorage.getItem(k);
    // Fallback to a stable default used by the project; do NOT randomize.
    var theme = saved || 'Midnight Synth';
    // Normalize class name if project uses class tokens (e.g., 'midnight', 'cream')
    // Allow both raw theme string and pre-tokenized value.
    var token = (theme || '').toString().trim();
    // Common normalizations (idempotent; adjust only if classes exist)
    if (token.toLowerCase() === 'midnight synth') token = 'midnight';
    if (token.toLowerCase() === 'cream synth') token = 'cream';
    // Apply immediately to avoid flash of default theme. Use the same prefix the runtime uses.
    if (token) {
      document.documentElement.classList.add('theme-' + token);
      if (document.body) document.body.classList.add('theme-' + token);
    }
  } catch (e) { /* fail safe, no console noise before paint */ }
})();
