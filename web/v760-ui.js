/* BizSim UI refinement. Additive-only: no simulation rules, navigation routes, or transaction endpoints are replaced. */
(() => {
  if (typeof App === 'undefined') return;
  const oldRender = App.render;
  App.render = function () {
    const result = oldRender.apply(this, arguments);
    try {
      document.title = 'BizSim v8.2.1 A — Economic Life Simulator';
      const brandVersion = document.querySelector('.sidebar .brand small');
      if (brandVersion) brandVersion.textContent = 'v8.2.1 · A';
      const footer = document.querySelector('.sidebar-footer');
      if (footer && /Build:\s*7\.3\.0/.test(footer.textContent || '')) footer.innerHTML = footer.innerHTML.replace(/Build:\s*7\.3\.0/, 'Build: 8.2.0 A');
      const root = document.querySelector('.content');
      if (root) root.setAttribute('data-bizsim-view', App.view || 'dashboard');
      document.querySelectorAll('.market-card').forEach(card => {
        if (!card.querySelector('.simulated-label')) {
          const heading = card.querySelector('.section-head');
          if (heading) {
            const label = document.createElement('span');
            label.className = 'simulated-label badge warn';
            label.textContent = 'SIMULATED';
            label.setAttribute('aria-label', 'Harga simulasi, bukan harga pasar nyata');
            heading.appendChild(label);
          }
        }
      });
    } catch (_) { /* UI enhancement must never prevent the core app from rendering. */ }
    return result;
  };
  if (App.state) App.render();
})();
