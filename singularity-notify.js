/**
 * SINGULARITY RENTALS — Notification Helper
 * Include on pages that trigger notifications.
 * Requires Supabase client (sb) to be available.
 * 
 * Usage: await notify(userId, title, message, type, link)
 */

/**
 * Create a notification for a user
 */
async function notify(userId, title, message, type = 'info', link = null) {
  if (!window.sb || !userId) return;
  try {
    await window.sb.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      link,
      is_read: false,
    });
  } catch (e) {
    console.warn('Could not create notification:', e);
  }
}

/**
 * Notify landlord when tenant submits a room request
 */
async function notifyRentalRequest(landlordId, tenantName, listingTitle) {
  await notify(
    landlordId,
    '📋 New Rental Request',
    `${tenantName} has submitted a request to rent "${listingTitle}". Review and approve or reject it.`,
    'request',
    'singularity-requests.html'
  );
}

/**
 * Notify tenant when landlord approves their request
 */
async function notifyRequestApproved(tenantId, listingTitle, landlordName) {
  await notify(
    tenantId,
    '✅ Rental Request Approved!',
    `${landlordName} has approved your request for "${listingTitle}". You can now proceed to make your first payment.`,
    'success',
    'singularity-payment.html'
  );
}

/**
 * Notify tenant when landlord rejects their request
 */
async function notifyRequestRejected(tenantId, listingTitle) {
  await notify(
    tenantId,
    '❌ Rental Request Not Approved',
    `Your request for "${listingTitle}" was not approved this time. Browse other available listings.`,
    'warning',
    'singularity-tenant.html'
  );
}

/**
 * Notify landlord when tenant makes a payment
 */
async function notifyPaymentReceived(landlordId, tenantName, amount, period) {
  await notify(
    landlordId,
    `💳 Payment Received — GHS ${Number(amount).toLocaleString()}`,
    `${tenantName} has paid GHS ${Number(amount).toLocaleString()} for ${period}. Check your receipts for details.`,
    'payment',
    'singularity-receipt.html'
  );
}

/**
 * Notify tenant when payment is confirmed
 */
async function notifyPaymentConfirmed(tenantId, amount, period, reference) {
  await notify(
    tenantId,
    `✅ Payment Confirmed — GHS ${Number(amount).toLocaleString()}`,
    `Your ${period} rent payment of GHS ${Number(amount).toLocaleString()} was confirmed. Ref: ${reference}`,
    'payment',
    'singularity-receipt.html'
  );
}

/**
 * Notify landlord when tenant submits a maintenance request
 */
async function notifyMaintenanceSubmitted(landlordId, tenantName, issueTitle, priority) {
  await notify(
    landlordId,
    `🔧 New Maintenance Request — ${priority.toUpperCase()} Priority`,
    `${tenantName} reported: "${issueTitle}". Please review and schedule a repair.`,
    'maintenance',
    'singularity-maintenance.html'
  );
}

/**
 * Notify tenant when maintenance status changes
 */
async function notifyMaintenanceUpdate(tenantId, issueTitle, newStatus) {
  const statusMessages = {
    progress: 'Your landlord has started working on it.',
    resolved: 'The issue has been resolved.',
    closed: 'The request has been closed.',
  };
  await notify(
    tenantId,
    `🔧 Maintenance Update: "${issueTitle}"`,
    statusMessages[newStatus] || `Status updated to: ${newStatus}`,
    'maintenance',
    'singularity-maintenance.html'
  );
}

/**
 * Get unread notification count and update bell badge
 */
async function updateNotificationBadge(userId) {
  if (!window.sb || !userId) return;
  try {
    const { count } = await window.sb.from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    const badges = document.querySelectorAll('.notif-badge, #notif-badge');
    badges.forEach(badge => {
      if (count > 0) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    });

    // Store in localStorage for quick access
    localStorage.setItem('singularity_unread_notifs', count || 0);
    return count || 0;
  } catch (e) {
    return 0;
  }
}
