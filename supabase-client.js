// ═══════════════════════════════════════════════════
// SINGULARITY RENTALS — Supabase Client
// Include this script on every page:
// <script src="supabase-client.js"></script>
// ═══════════════════════════════════════════════════

const SUPABASE_URL = 'https://vkmsoseapbofplpegnku.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbXNvc2VhcGJvZnBscGVnbmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTg4MDAsImV4cCI6MjA5MjA5NDgwMH0.Mv-FmpWAgTgGkCaaZiDfiweoz-PsLfo89saza653B4I';

// Load Supabase from CDN
const _supabaseScript = document.createElement('script');
_supabaseScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
_supabaseScript.onload = () => {
  window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  // Fire event so pages know Supabase is ready
  window.dispatchEvent(new Event('supabase-ready'));
};
document.head.appendChild(_supabaseScript);

// ── AUTH HELPERS ────────────────────────────────────

// Get current logged-in user (returns null if not logged in)
async function getCurrentUser() {
  const { data: { user } } = await window.sb.auth.getUser();
  return user;
}

// Get current user's profile (role, name, phone)
async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await window.sb.from('profiles').select('*').eq('id', user.id).single();
  return data;
}

// Sign up a new user
async function signUp(email, password, fullName, phone, role) {
  const { data, error } = await window.sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone, role }
    }
  });
  if (error) throw error;
  return data;
}

// Log in existing user
async function logIn(email, password) {
  const { data, error } = await window.sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Log out
async function logOut() {
  await window.sb.auth.signOut();
  window.location.href = 'index.html';
}

// Check if user is logged in — redirect to index if not
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

// Check role — redirect if wrong role
async function requireRole(expectedRole) {
  const profile = await getCurrentProfile();
  if (!profile) { window.location.href = 'index.html'; return null; }
  if (profile.role !== expectedRole) {
    window.location.href = profile.role === 'landlord'
      ? 'singularity-rentals.html'
      : 'singularity-tenant.html';
    return null;
  }
  return profile;
}

// ── LISTINGS HELPERS ────────────────────────────────

async function getListings(filters = {}) {
  let query = window.sb.from('listings').select(`
    *,
    profiles:landlord_id ( full_name, phone )
  `).order('created_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.neighbourhood) query = query.eq('neighbourhood', filters.neighbourhood);
  if (filters.maxPrice) query = query.lte('price', filters.maxPrice);
  if (filters.landlordId) query = query.eq('landlord_id', filters.landlordId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function createListing(listing) {
  const user = await getCurrentUser();
  const { data, error } = await window.sb.from('listings').insert({
    ...listing,
    landlord_id: user.id
  }).select().single();
  if (error) throw error;
  return data;
}

async function updateListing(id, updates) {
  const { data, error } = await window.sb.from('listings')
    .update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteListing(id) {
  const { error } = await window.sb.from('listings').delete().eq('id', id);
  if (error) throw error;
}

// ── PAYMENTS HELPERS ────────────────────────────────

async function createPayment(payment) {
  const { data, error } = await window.sb.from('payments').insert(payment).select().single();
  if (error) throw error;
  return data;
}

async function getPayments(userId, role = 'tenant') {
  const col = role === 'tenant' ? 'tenant_id' : 'landlord_id';
  const { data, error } = await window.sb.from('payments')
    .select(`*, listings(title, address), profiles:tenant_id(full_name)`)
    .eq(col, userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── MAINTENANCE HELPERS ─────────────────────────────

async function getMaintenanceRequests(userId, role = 'tenant') {
  const col = role === 'tenant' ? 'tenant_id' : 'landlord_id';
  const { data, error } = await window.sb.from('maintenance_requests')
    .select(`*, listings(title, address), profiles:tenant_id(full_name)`)
    .eq(col, userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function createMaintenanceRequest(req) {
  const { data, error } = await window.sb.from('maintenance_requests')
    .insert(req).select().single();
  if (error) throw error;
  return data;
}

async function updateMaintenanceStatus(id, status) {
  const { data, error } = await window.sb.from('maintenance_requests')
    .update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function addMaintenanceComment(requestId, content, authorRole) {
  const user = await getCurrentUser();
  const { data, error } = await window.sb.from('maintenance_comments').insert({
    request_id: requestId,
    author_id: user.id,
    author_role: authorRole,
    content
  }).select().single();
  if (error) throw error;
  return data;
}

// ── RATINGS HELPERS ─────────────────────────────────

async function getRatings(landlordId) {
  const { data, error } = await window.sb.from('ratings')
    .select(`*, profiles:tenant_id(full_name, phone)`)
    .eq('landlord_id', landlordId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function createRating(rating) {
  const user = await getCurrentUser();
  const { data, error } = await window.sb.from('ratings')
    .insert({ ...rating, landlord_id: user.id })
    .select().single();
  if (error) throw error;
  return data;
}

// ── RENTAL REQUESTS ─────────────────────────────────

async function createRentalRequest(req) {
  const user = await getCurrentUser();
  const { data, error } = await window.sb.from('rental_requests')
    .insert({ ...req, tenant_id: user.id })
    .select().single();
  if (error) throw error;
  return data;
}

async function getRentalRequests(userId, role = 'tenant') {
  const col = role === 'tenant' ? 'tenant_id' : 'landlord_id';
  const { data, error } = await window.sb.from('rental_requests')
    .select(`*, listings(*), profiles:tenant_id(full_name, phone)`)
    .eq(col, userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── UI HELPERS ──────────────────────────────────────

function showError(msg) {
  let toast = document.getElementById('sb-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sb-toast';
    toast.style.cssText = `
      position:fixed;bottom:28px;right:28px;z-index:9999;
      padding:13px 20px;border-radius:12px;
      background:#fff;border:1px solid #dc2626;color:#dc2626;
      font-family:'DM Mono',monospace;font-size:12px;
      box-shadow:0 8px 24px rgba(0,0,0,0.1);
      display:flex;align-items:center;gap:8px;
      transform:translateY(80px);opacity:0;transition:all 0.3s;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = '⚠ ' + msg;
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.transform = 'translateY(80px)';
    toast.style.opacity = '0';
  }, 4000);
}

function showSuccess(msg) {
  let toast = document.getElementById('sb-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sb-toast';
    toast.style.cssText = `
      position:fixed;bottom:28px;right:28px;z-index:9999;
      padding:13px 20px;border-radius:12px;
      background:#fff;border:1px solid #059669;color:#059669;
      font-family:'DM Mono',monospace;font-size:12px;
      box-shadow:0 8px 24px rgba(0,0,0,0.1);
      display:flex;align-items:center;gap:8px;
      transform:translateY(80px);opacity:0;transition:all 0.3s;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = '✓ ' + msg;
  toast.style.borderColor = '#059669';
  toast.style.color = '#059669';
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.transform = 'translateY(80px)';
    toast.style.opacity = '0';
  }, 3000);
}

// Loading spinner helper
function setLoading(btn, loading, originalText) {
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? '⏳ Please wait…' : originalText;
}
