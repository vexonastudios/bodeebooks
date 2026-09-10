// Static placeholders only: no family data or extra requests during startup.
export const dashboardLoading = `<section id="cloud-dashboard-loading" class="cloud-dashboard-loading" aria-label="Loading child computers">
  <div class="cloud-dashboard-loading-heading" role="status">
    <img src="/guard-icons/bodeeguard-parent-192.png" width="64" height="64" alt="">
    <h1>Checking child computers…</h1>
    <p>Getting your family dashboard ready.</p>
  </div>
  <div class="cloud-dashboard-skeletons" aria-hidden="true">
    ${Array.from({ length: 3 }, () => `<div class="cloud-dashboard-skeleton-card">
      <div class="cloud-dashboard-skeleton-identity"><span class="cloud-skeleton cloud-skeleton-avatar"></span><div><span class="cloud-skeleton cloud-skeleton-name"></span><span class="cloud-skeleton cloud-skeleton-detail"></span></div></div>
      <div class="cloud-dashboard-skeleton-stats"><span class="cloud-skeleton"></span><span class="cloud-skeleton"></span></div>
      <div class="cloud-dashboard-skeleton-activity"><span class="cloud-skeleton"></span><span class="cloud-skeleton"></span><span class="cloud-skeleton"></span></div>
      <span class="cloud-skeleton cloud-skeleton-action"></span><span class="cloud-skeleton cloud-skeleton-action"></span>
    </div>`).join('')}
  </div>
</section>`;
