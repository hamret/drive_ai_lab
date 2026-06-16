export function bindControls(handlers) {
  // Run buttons
  document.getElementById('btnStart').addEventListener('click', handlers.onStart);
  document.getElementById('btnPause').addEventListener('click', handlers.onPause);
  document.getElementById('btnReset').addEventListener('click', handlers.onReset);

  // Speed slider
  const speedSlider = document.getElementById('speedSlider');
  const speedVal = document.getElementById('speedVal');
  speedSlider.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    speedVal.textContent = v;
    handlers.onSpeed(v);
  });

  // Mode segmented control
  const segBtns = document.querySelectorAll('.seg-btn');
  segBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      segBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      document.body.classList.toggle('mode-sim', mode === 'sim');
      handlers.onMode(mode);
    });
  });

  // Tile palette
  const tileBtns = document.querySelectorAll('.tile-btn');
  tileBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tileBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      handlers.onTile(parseInt(btn.dataset.tile, 10));
    });
  });

  // Map operations
  document.getElementById('btnClear').addEventListener('click', handlers.onClear);
  document.getElementById('btnSave').addEventListener('click', handlers.onSave);
  document.getElementById('btnLoad').addEventListener('click', handlers.onLoad);

  // Samples
  document.querySelectorAll('[data-sample]').forEach(btn => {
    btn.addEventListener('click', () => handlers.onSample(btn.dataset.sample));
  });
}
