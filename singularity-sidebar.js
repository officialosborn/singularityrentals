/**
 * SINGULARITY RENTALS — Shared Sidebar Builder
 * Call: buildSharedSidebar(profile, activePage)
 */
function buildSharedSidebar(profile, activePage) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const fn = profile.full_name || 'User';
  const initials = fn.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const isLandlord = profile.role === 'landlord';
  const avatarHTML = profile.profile_photo
    ? `<img src="${profile.profile_photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
    : initials;
  const avatarBg = isLandlord
    ? 'linear-gradient(135deg,#f59e0b,#ef4444)'
    : 'linear-gradient(135deg,#7c3aed,#9333ea)';

  const landlordNav = [
    { sec: 'Manage' },
    { icon: '🏠', label: 'My Listings',     url: 'singularity-rentals.html',     key: 'listings' },
    { icon: '📋', label: 'Rental Requests', url: 'singularity-requests.html',    key: 'requests' },
    { icon: '🗺',  label: 'Map View',        url: 'singularity-map.html',         key: 'map' },
    { icon: '💳', label: 'Payments',        url: 'singularity-payment.html',     key: 'payments' },
    { icon: '🔧', label: 'Maintenance',     url: 'singularity-maintenance.html', key: 'maintenance' },
    { icon: '⭐', label: 'Ratings',         url: 'singularity-ratings.html',     key: 'ratings' },
    { sec: 'Reports' },
    { icon: '🧾', label: 'Receipts',        url: 'singularity-receipt.html',     key: 'receipts' },
    { icon: '📊', label: 'Analytics',       url: 'singularity-analytics.html',   key: 'analytics' },
    { sec: 'Account' },
    { icon: '🔐', label: 'Verification',    url: 'singularity-verify.html',      key: 'verify',
      badge: profile.is_verified ? 'verified' : 'unverified',
      badgeText: profile.is_verified ? '✓' : '!' },
    { icon: '🔔', label: 'Notifications',   url: 'singularity-notifications.html', key: 'notifications', bell: true },
  ];

  const tenantNav = [
    { sec: 'My Home' },
    { icon: '🏠', label: 'Dashboard',       url: 'singularity-dashboard.html',   key: 'dashboard' },
    { icon: '🔍', label: 'Browse',          url: 'singularity-tenant.html',      key: 'browse' },
    { icon: '🗺',  label: 'Map View',        url: 'singularity-map.html',         key: 'map' },
    { sec: 'My Rental' },
    { icon: '💳', label: 'Pay Rent',        url: 'singularity-payment.html',     key: 'pay' },
    { icon: '🧾', label: 'Receipts',        url: 'singularity-receipt.html',     key: 'receipts' },
    { icon: '🔧', label: 'Maintenance',     url: 'singularity-maintenance.html', key: 'maintenance' },
    { sec: 'Account' },
    { icon: '🔐', label: 'Verification',    url: 'singularity-verify.html',      key: 'verify',
      badge: profile.is_verified ? 'verified' : 'unverified',
      badgeText: profile.is_verified ? '✓' : '!' },
    { icon: '🔔', label: 'Notifications',   url: 'singularity-notifications.html', key: 'notifications', bell: true },
  ];

  const nav = isLandlord ? landlordNav : tenantNav;
  let navHTML = '';
  nav.forEach(item => {
    if (item.sec) { navHTML += `<div class="sb-sec">${item.sec}</div>`; return; }
    const isActive = item.key === activePage;
    navHTML += `
      <div class="sb-link${isActive ? ' active' : ''}" onclick="location.href='${item.url}'">
        <span class="sb-link-icon">${item.icon}</span>
        <span>${item.label}</span>
        ${item.bell ? `<span class="notif-badge" id="notif-badge" style="display:none">0</span>` : ''}
        ${item.badge && !item.bell ? `<span class="sb-badge ${item.badge}">${item.badgeText}</span>` : ''}
      </div>`;
  });

  sidebar.innerHTML = `
    <div class="sb-brand" onclick="location.href='${isLandlord ? 'singularity-rentals.html' : 'singularity-dashboard.html'}'">
      <div class="sb-logo">Singularity</div>
      <div class="sb-sub">Rentals</div>
    </div>
    <div class="sb-user">
      <div class="sb-avatar" id="sb-avatar" style="background:${avatarBg}">${avatarHTML}</div>
      <div class="sb-user-info">
        <div class="sb-uname" id="sb-uname">${fn}</div>
        <div class="sb-urole" id="sb-urole">${isLandlord ? 'Landlord' : 'Tenant'}</div>
      </div>
    </div>
    <nav class="sb-nav">${navHTML}</nav>
    <div class="sb-logout" onclick="doLogout()"><span>🚪</span><span>Log Out</span></div>`;

  const toggle = document.createElement('div');
  toggle.className = 'sb-toggle'; toggle.id = 'sb-toggle'; toggle.title = 'Toggle sidebar';
  const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  toggle.textContent = isCollapsed ? '›' : '‹';
  if (isCollapsed) sidebar.classList.add('collapsed');
  toggle.onclick = () => {
    const c = sidebar.classList.toggle('collapsed');
    toggle.textContent = c ? '›' : '‹';
    localStorage.setItem('sidebar-collapsed', c);
  };
  sidebar.appendChild(toggle);
}
