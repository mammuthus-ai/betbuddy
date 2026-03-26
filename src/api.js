const isCapacitor = window.Capacitor !== undefined;
const PROD_API = import.meta.env.VITE_API_URL || '';
const BASE = isCapacitor ? (PROD_API || 'https://putuporshutup-production.up.railway.app') : PROD_API;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export const fetchMe = () => request('/auth/me');
export const devLogin = (username) => request('/auth/dev-login', { method: 'POST', body: JSON.stringify({ username }) });
export const logout = () => request('/auth/logout', { method: 'POST' });

// Bets
export const fetchBets = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/bets${qs ? '?' + qs : ''}`);
};
export const fetchBet = (id) => request(`/api/bets/${id}`);
export const createBet = (data) => request('/api/bets', { method: 'POST', body: JSON.stringify(data) });
export const joinSide = (betId, side) => request(`/api/bets/${betId}/join`, { method: 'POST', body: JSON.stringify({ side }) });
export const depositToEscrow = (betId) => request(`/api/bets/${betId}/deposit`, { method: 'POST' });
export const settleBet = (betId, winningSide) => request(`/api/bets/${betId}/settle`, { method: 'POST', body: JSON.stringify({ winningSide }) });

// Comments
export const fetchComments = (betId) => request(`/api/bets/${betId}/comments`);
export const addComment = (betId, text, commentType = 'text', extraData = null) =>
  request(`/api/bets/${betId}/comments`, { method: 'POST', body: JSON.stringify({ text, commentType, extraData }) });
export const reactToComment = (betId, commentId, emoji) =>
  request(`/api/bets/${betId}/comments/${commentId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) });

// Proof
export const fetchProofs = (betId) => request(`/api/bets/${betId}/proof`);
export async function uploadProof(betId, file, caption = '') {
  const formData = new FormData();
  formData.append('file', file);
  if (caption) formData.append('caption', caption);
  const res = await fetch(`/api/bets/${betId}/proof`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Users
export const fetchUsers = (q = '') => request(`/api/users${q ? '?q=' + encodeURIComponent(q) : ''}`);
export const fetchUser = (id) => request(`/api/users/${id}`);
export const fetchLeaderboard = () => request('/api/users/leaderboard');

// Friends
export const fetchFriends = () => request('/api/friends');
export const sendFriendRequest = (userId) => request('/api/friends/request', { method: 'POST', body: JSON.stringify({ userId }) });
export const acceptFriendRequest = (userId) => request('/api/friends/accept', { method: 'POST', body: JSON.stringify({ userId }) });
export const removeFriend = (userId) => request('/api/friends/remove', { method: 'POST', body: JSON.stringify({ userId }) });
export const getMyQR = () => request('/api/friends/qr');
export const scanQR = (qrData) => request('/api/friends/qr-scan', { method: 'POST', body: JSON.stringify({ qrData }) });
export const setPhoneNumber = (phone) => request('/api/friends/set-phone', { method: 'POST', body: JSON.stringify({ phone }) });
export const matchContacts = (phones) => request('/api/friends/match-contacts', { method: 'POST', body: JSON.stringify({ phones }) });

// Coins
export const getCoinStatus = () => request('/api/coins/status');
export const claimDailyBonus = () => request('/api/coins/daily', { method: 'POST' });
export const claimWeeklyBonus = () => request('/api/coins/weekly', { method: 'POST' });
export const getReferralCode = () => request('/api/coins/referral');
export const applyReferralCode = (code) => request('/api/coins/referral/apply', { method: 'POST', body: JSON.stringify({ code }) });
export const getCoinHistory = () => request('/api/coins/history');

// Shop
export const getShopItems = () => request('/api/shop');
export const getStripeKey = () => request('/api/shop/stripe-key');
export const createCheckout = (itemId) => request('/api/shop/create-checkout', { method: 'POST', body: JSON.stringify({ itemId }) });
export const verifyPurchase = (itemId) => request('/api/shop/verify-purchase', { method: 'POST', body: JSON.stringify({ itemId }) });
export const purchaseItem = (itemId) => request('/api/shop/purchase', { method: 'POST', body: JSON.stringify({ itemId }) });
export const setCustomName = (name) => request('/api/shop/set-name', { method: 'POST', body: JSON.stringify({ name }) });
export const setCustomUsername = (username) => request('/api/shop/set-username', { method: 'POST', body: JSON.stringify({ username }) });
export const setCustomAvatar = (avatar) => request('/api/shop/set-avatar', { method: 'POST', body: JSON.stringify({ avatar }) });
