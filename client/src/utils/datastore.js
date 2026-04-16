// Lightweight client-side datastore using localStorage
// Stores: users, userMeta (votes/points), receipts, activity log, wallets, contribution timer

const KEYS = {
  users: 'ds_users', // Map: { [email]: { email, name, role, createdAt } }
  meta: 'ds_user_meta', // Map: { [email]: { votesAllowed, votesUsed, points } }
  receipts: 'ds_receipts', // Array of receipts
  activity: 'ds_activity', // Array of activities
  wallets: 'ds_wallets', // Array of wallets { id,name,symbol,address,network,qrCode,isActive,rate,createdAt }
  contributionTimer: 'ds_contribution_timer', // { name, description, startTime, endTime }
  contributionRounds: 'ds_contribution_rounds', // Array of rounds
  votes: 'ds_votes', // Array of votes { id,title,description,options[],status,startTime,endTime,pointsReward,maxVotesPerUser,createdAt }
  joinApplications: 'ds_join_apps', // Array of join applications { firstName, lastName, email, details, time }
  joinWizard: 'ds_join_wizard'
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  // Broadcast update so dashboards/components can auto-refresh
  try {
    window.dispatchEvent(new Event('datastore:update'));
  } catch (_) {}
}

// Users
export function getUsersMap() {
  return read(KEYS.users, {});
}

export function setUsersMap(map) {
  write(KEYS.users, map);
}

export function getUsersList() {
  const map = getUsersMap();
  return Object.values(map);
}

export function addOrUpdateUser(user) {
  const map = getUsersMap();
  map[user.email] = {
    email: user.email,
    name: user.name || user.email.split('@')[0],
    role: user.role || 'user',
    createdAt: user.createdAt || Date.now(),
  };
  setUsersMap(map);
}

export function getUserByEmail(email) {
  const map = getUsersMap();
  return map[email] || null;
}

// Meta (votes/points)
export function getUserMeta(email) {
  const meta = read(KEYS.meta, {});
  return meta[email] || { votesAllowed: 1, votesUsed: 0, points: 0 };
}

export function setUserMeta(email, updates) {
  const meta = read(KEYS.meta, {});
  const current = meta[email] || { votesAllowed: 1, votesUsed: 0, points: 0 };
  meta[email] = { ...current, ...updates };
  write(KEYS.meta, meta);
}

export function updateVotingRights(email, votesAllowed) {
  setUserMeta(email, { votesAllowed: Number(votesAllowed) || 0 });
  logActivity(`${email} voting rights updated to ${votesAllowed}`, 'voting_rights_updated', email);
}

export function castVote(email) {
  const current = getUserMeta(email);
  const remaining = (current.votesAllowed || 0) - (current.votesUsed || 0);
  if (remaining <= 0) {
    return { ok: false, remaining: 0 };
  }
  setUserMeta(email, { votesUsed: (current.votesUsed || 0) + 1 });
  logActivity(`Vote cast by ${email}`, 'vote_cast', email);
  return { ok: true, remaining: remaining - 1 };
}

export function addPoints(email, points, category) {
  const current = getUserMeta(email);
  const amount = Number(points) || 0;
  const updates = { points: (current.points || 0) + amount };
  if (category === 'voting') {
    updates.pointsVoting = (current.pointsVoting || 0) + amount;
  } else if (category === 'contribution') {
    updates.pointsContribution = (current.pointsContribution || 0) + amount;
  } else if (category === 'referral') {
    updates.pointsReferral = (current.pointsReferral || 0) + amount;
  }
  setUserMeta(email, updates);
  logActivity(`${amount} points awarded to ${email}${category ? ` via ${category}` : ''}`, 'points_awarded', email);
}

export function getAllPoints() {
  const meta = read(KEYS.meta, {});
  return Object.entries(meta).map(([email, m]) => ({ email, points: m.points || 0 }));
}

// Receipts
export function getReceipts() {
  return read(KEYS.receipts, []);
}

export function addReceipt({ userEmail, amount, currency, url, notes }) {
  const receipts = getReceipts();
  const receipt = {
    id: `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userEmail,
    amount: Number(amount) || 0,
    currency: currency || 'USD',
    url: url || '',
    notes: notes || '',
    verified: false,
    status: 'pending',
    time: Date.now(),
  };
  receipts.unshift(receipt);
  write(KEYS.receipts, receipts);
  logActivity(`Contribution receipt uploaded`, 'contribution_uploaded', userEmail);
  return receipt;
}

export function updateReceipt(id, updates) {
  const receipts = getReceipts();
  const idx = receipts.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  receipts[idx] = { ...receipts[idx], ...updates };
  write(KEYS.receipts, receipts);
  if (updates.verified) {
    const email = receipts[idx].userEmail;
    const timer = read(KEYS.contributionTimer, null);
    const active = timer && timer.endTime && Date.now() < timer.endTime;
    if (active) {
      addPoints(email, receipts[idx].amount || 0, 'contribution');
    }
    logActivity(`Receipt verified (+${receipts[idx].amount || 0})`, 'receipt_verified', email);
  }
  return receipts[idx];
}

// Activity
export function getActivityLog() {
  const log = read(KEYS.activity, []);
  return log.sort((a, b) => b.time - a.time);
}

export function logActivity(message, type, userEmail) {
  const log = read(KEYS.activity, []);
  log.unshift({ id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, message, type, userEmail, time: Date.now() });
  write(KEYS.activity, log);
}

export function clearActivityLog() {
  write(KEYS.activity, []);
}

export function clearAllDatastore() {
  write(KEYS.users, {});
  write(KEYS.meta, {});
  write(KEYS.receipts, []);
  write(KEYS.activity, []);
  write(KEYS.wallets, []);
  write(KEYS.contributionTimer, null);
  write(KEYS.contributionRounds, []);
  write(KEYS.votes, []);
  write(KEYS.joinApplications, []);
  write(KEYS.joinWizard, {});
  try {
    localStorage.removeItem('placeholderUsers');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  } catch (_) {}
}

// Join Applications
export function getJoinApplications() {
  const apps = read(KEYS.joinApplications, []);
  return apps.sort((a, b) => (b.time || 0) - (a.time || 0));
}

export function addJoinApplication(app) {
  const apps = getJoinApplications();
  const normalizedEmail = String(app.email || '').toLowerCase();
  const normalizedFirst = String(app.firstName || '').trim();
  const normalizedLast = String(app.lastName || '').trim();
  const idx = apps.findIndex((a) => String(a.email || '').toLowerCase() === normalizedEmail);
  const item = {
    firstName: normalizedFirst,
    lastName: normalizedLast,
    email: normalizedEmail,
    details: app.details || app || {},
    referralCode: app.referralCode || null,
    time: Date.now(),
    status: 'pending',
  };
  if (idx >= 0) {
    apps[idx] = { ...apps[idx], ...item };
  } else {
    apps.unshift(item);
  }
  write(KEYS.joinApplications, apps);
  logActivity(`Join application submitted: ${normalizedEmail}`, 'join_application_submitted', normalizedEmail);
  return item;
}

export function updateJoinApplicationStatus(email, status) {
  const apps = getJoinApplications();
  const idx = apps.findIndex((a) => String(a.email || '').toLowerCase() === String(email || '').toLowerCase());
  if (idx === -1) return null;

  apps[idx].status = status;
  write(KEYS.joinApplications, apps);
  logActivity(`Application for ${email} status updated to ${status}`, `join_application_${status}`);
  return apps[idx];
}

export function hasJoinApplication({ firstName, lastName, email }) {
  const apps = getJoinApplications();
  const normalizedEmail = String(email || '').toLowerCase();
  const normalizedFirst = String(firstName || '').trim();
  const normalizedLast = String(lastName || '').trim();
  return apps.some(
    (a) => String(a.email || '').toLowerCase() === normalizedEmail &&
           String(a.firstName || '').trim() === normalizedFirst &&
           String(a.lastName || '').trim() === normalizedLast
  );
}

export function findJoinApplicationByEmail(email) {
  const apps = getJoinApplications();
  const normalizedEmail = String(email || '').toLowerCase();
  return apps.find((a) => String(a.email || '').toLowerCase() === normalizedEmail) || null;
}

export function getJoinWizard() {
  return read(KEYS.joinWizard, {});
}

export function setJoinWizard(updates) {
  const current = read(KEYS.joinWizard, {});
  const merged = { ...current, ...updates };
  write(KEYS.joinWizard, merged);
  return merged;
}

export function clearJoinWizard() {
  write(KEYS.joinWizard, {});
}

// Dashboard stats
export function getDashboardStats() {
  const users = getUsersList();
  const receipts = getReceipts();
  const votes = getVotes();
  const totalPoints = getAllPoints().reduce((sum, p) => sum + (p.points || 0), 0);
  const pendingContributions = receipts.filter((r) => !r.verified).length;
  const activeVotes = votes.filter((v) => v.status === 'active').length;
  const totalVotesSubmitted = votes.reduce((sum, v) => sum + (v.totalVotes || 0), 0);
  return {
    totalUsers: users.length,
    activeVotes,
    totalPoints,
    totalVotesSubmitted,
    pendingContributions,
  };
}

// Wallets
export function getWallets() {
  return read(KEYS.wallets, []);
}

export function setWallets(list) {
  write(KEYS.wallets, list);
}

export function addWallet(wallet) {
  const list = getWallets();
  const item = {
    id: wallet.id || Date.now(),
    name: wallet.name || '',
    symbol: (wallet.symbol || '').toUpperCase(),
    address: wallet.address || '',
    network: wallet.network || '',
    qrCode: wallet.qrCode || '',
    isActive: wallet.isActive !== undefined ? !!wallet.isActive : true,
    rate: wallet.rate !== undefined ? Number(wallet.rate) : null,
    createdAt: wallet.createdAt || new Date().toISOString(),
    totalReceived: wallet.totalReceived || 0,
    transactionCount: wallet.transactionCount || 0,
  };
  list.push(item);
  setWallets(list);
  logActivity(`Wallet added: ${item.symbol}`, 'wallet_added');
  return item;
}

export function updateWallet(id, updates) {
  const list = getWallets();
  const idx = list.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  setWallets(list);
  logActivity(`Wallet updated: ${list[idx].symbol}`, 'wallet_updated');
  return list[idx];
}

export function deleteWallet(id) {
  const list = getWallets();
  const item = list.find((w) => w.id === id);
  const filtered = list.filter((w) => w.id !== id);
  setWallets(filtered);
  logActivity(`Wallet removed: ${item?.symbol || id}`, 'wallet_removed');
}

export function getActiveWallets() {
  return getWallets().filter((w) => w.isActive);
}

// Contribution Timer
export function getContributionTimer() {
  const t = read(KEYS.contributionTimer, null);
  if (!t) return null;
  return t;
}

export function setContributionTimer({ name, description, startTime, endTime }) {
  const payload = {
    name: name || 'Contribution Window',
    description: description || '',
    startTime: startTime || Date.now(),
    endTime,
  };
  write(KEYS.contributionTimer, payload);
  logActivity(`Contribution timer set: ${payload.name}`, 'contribution_timer_set');
  return payload;
}

export function clearContributionTimer() {
  write(KEYS.contributionTimer, null);
  logActivity(`Contribution timer cleared`, 'contribution_timer_cleared');
}

// Contribution Rounds (supports pause/resume/stop/delete)
export function getContributionRounds() {
  return read(KEYS.contributionRounds, []);
}

export function setContributionRounds(list) {
  write(KEYS.contributionRounds, list);
}

export function addContributionRound({ name, description, durationMs }) {
  const rounds = getContributionRounds();
  const now = Date.now();
  const round = {
    id: `round_${now}_${Math.random().toString(36).slice(2, 6)}`,
    name: name || 'Contribution Round',
    description: description || '',
    startTime: now,
    endTime: now + (Number(durationMs) || 0),
    status: 'running', // running | paused | stopped
    pausedAt: null,
    remainingMs: Number(durationMs) || 0,
    createdAt: now,
    updatedAt: now,
  };
  rounds.unshift(round);
  setContributionRounds(rounds);
  // Keep legacy single-timer in sync for user countdowns
  write(KEYS.contributionTimer, { name: round.name, description: round.description, startTime: round.startTime, endTime: round.endTime });
  logActivity(`Contribution round started: ${round.name}`, 'contribution_round_started');
  return round;
}

export function pauseContributionRound(id) {
  const rounds = getContributionRounds();
  const idx = rounds.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const now = Date.now();
  const r = rounds[idx];
  if (r.status !== 'running') return r;
  const remainingMs = Math.max(0, (r.endTime || now) - now);
  const updated = { ...r, status: 'paused', pausedAt: now, remainingMs, updatedAt: now };
  rounds[idx] = updated;
  setContributionRounds(rounds);
  // Legacy timer: reflect paused (clear timer)
  write(KEYS.contributionTimer, { ...read(KEYS.contributionTimer, null), endTime: null });
  logActivity(`Contribution round paused: ${r.name}`, 'contribution_round_paused');
  return updated;
}

export function resumeContributionRound(id) {
  const rounds = getContributionRounds();
  const idx = rounds.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const now = Date.now();
  const r = rounds[idx];
  if (r.status !== 'paused') return r;
  const endTime = now + (Number(r.remainingMs) || 0);
  const updated = { ...r, status: 'running', pausedAt: null, startTime: now, endTime, updatedAt: now };
  rounds[idx] = updated;
  setContributionRounds(rounds);
  // Legacy timer: reflect resumed
  write(KEYS.contributionTimer, { name: updated.name, description: updated.description, startTime: updated.startTime, endTime: updated.endTime });
  logActivity(`Contribution round resumed: ${r.name}`, 'contribution_round_resumed');
  return updated;
}

export function stopContributionRound(id) {
  const rounds = getContributionRounds();
  const idx = rounds.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const now = Date.now();
  const r = rounds[idx];
  const updated = { ...r, status: 'stopped', updatedAt: now };
  rounds[idx] = updated;
  setContributionRounds(rounds);
  // Legacy timer: clear
  write(KEYS.contributionTimer, null);
  logActivity(`Contribution round stopped: ${r.name}`, 'contribution_round_stopped');
  return updated;
}

export function deleteContributionRound(id) {
  const rounds = getContributionRounds();
  const removed = rounds.find((r) => r.id === id);
  const filtered = rounds.filter((r) => r.id !== id);
  setContributionRounds(filtered);
  // If deleting the currently running one, clear legacy timer
  if (removed?.status === 'running') {
    write(KEYS.contributionTimer, null);
  }
  logActivity(`Contribution round deleted: ${removed?.name || id}`, 'contribution_round_deleted');
}

export function updateContributionRound(id, updates) {
  const rounds = getContributionRounds();
  const idx = rounds.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const now = Date.now();
  const r = rounds[idx];
  let next = { ...r };
  if (updates.name !== undefined) next.name = String(updates.name || '').trim();
  if (updates.description !== undefined) next.description = String(updates.description || '');
  if (updates.durationHours !== undefined) {
    const hours = Number(updates.durationHours);
    const ms = Math.max(0, hours) * 60 * 60 * 1000;
    if (next.status === 'running') {
      next.startTime = now;
      next.endTime = now + ms;
      next.remainingMs = ms;
    } else if (next.status === 'paused') {
      next.remainingMs = ms;
    }
  }
  next.updatedAt = now;
  rounds[idx] = next;
  setContributionRounds(rounds);
  if (next.status === 'running') {
    write(KEYS.contributionTimer, { name: next.name, description: next.description, startTime: next.startTime, endTime: next.endTime });
  }
  logActivity(`Contribution round updated: ${next.name}`, 'contribution_round_updated');
  return next;
}

// Voting datastore
export function getVotes() {
  return read(KEYS.votes, []);
}

export function setVotes(list) {
  write(KEYS.votes, list);
}

export function addVote({ title, description, options, pointsReward, maxVotesPerUser, durationHours }) {
  const list = getVotes();
  const now = Date.now();
  const id = Date.now();
  const opts = (options || []).map((text, idx) => ({ id: idx + 1, text: String(text).trim(), votes: 0 }));
  const durationMs = (Number(durationHours) || 0) * 60 * 60 * 1000;
  const vote = {
    id,
    title: title || 'Vote',
    description: description || '',
    options: opts,
    status: 'active',
    startTime: new Date(now).toISOString(),
    endTime: durationMs ? new Date(now + durationMs).toISOString() : null,
    totalVotes: 0,
    pointsReward: Number(pointsReward) || 0,
    maxVotesPerUser: Number(maxVotesPerUser) || 1,
    createdAt: new Date(now).toISOString().split('T')[0],
    submissions: {}, // { [email]: count }
  };
  const updatedList = [vote, ...list];
  setVotes(updatedList);
  logActivity(`Vote created: ${vote.title}`, 'vote_created');
  return vote;
}

export function updateVote(id, updates) {
  const list = getVotes();
  const idx = list.findIndex((v) => v.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...updates };
  setVotes(list);
  logActivity(`Vote updated: ${list[idx].title}`, 'vote_updated');
  return list[idx];
}

export function deleteVote(id) {
  const list = getVotes();
  const removed = list.find((v) => v.id === id);
  const filtered = list.filter((v) => v.id !== id);
  setVotes(filtered);
  logActivity(`Vote deleted: ${removed?.title || id}`, 'vote_deleted');
}

export function getActiveVote() {
  const list = getVotes();
  // Auto-complete any expired active vote
  const now = Date.now();
  let changed = false;
  const updated = list.map((v) => {
    if (v.status === 'active' && v.endTime) {
      const end = new Date(v.endTime).getTime();
      if (end <= now) {
        changed = true;
        return { ...v, status: 'completed' };
      }
    }
    return v;
  });
  if (changed) setVotes(updated);
  return updated.find((v) => v.status === 'active') || null;
}

// Return all active votes, auto-completing expired ones
export function getActiveVotes() {
  const list = getVotes();
  const now = Date.now();
  let changed = false;
  const updated = list.map((v) => {
    if (v.status === 'active' && v.endTime) {
      const end = new Date(v.endTime).getTime();
      if (end <= now) {
        changed = true;
        return { ...v, status: 'completed' };
      }
    }
    return v;
  });
  if (changed) setVotes(updated);
  return updated.filter((v) => v.status === 'active');
}

export function startVote(id, durationHours) {
  const list = getVotes();
  const now = Date.now();
  const durationMs = (Number(durationHours) || 0) * 60 * 60 * 1000;
  const updated = list.map((v) => (v.id === id
    ? { ...v, status: 'active', startTime: new Date(now).toISOString(), endTime: durationMs ? new Date(now + durationMs).toISOString() : null }
    : v));
  setVotes(updated);
  const current = updated.find((v) => v.id === id);
  logActivity(`Vote started: ${current?.title || id}`, 'vote_started');
  return current || null;
}

export function pauseVote(id) {
  const list = getVotes();
  const idx = list.findIndex((v) => v.id === id);
  if (idx === -1) return null;
  const v = list[idx];
  list[idx] = { ...v, status: 'paused' };
  setVotes(list);
  logActivity(`Vote paused: ${v.title}`, 'vote_paused');
  return list[idx];
}

export function resumeVote(id, durationHours) {
  const list = getVotes();
  const idx = list.findIndex((v) => v.id === id);
  if (idx === -1) return null;
  const now = Date.now();
  const durationMs = (Number(durationHours) || 0) * 60 * 60 * 1000;
  // Resume: set active and new end time from now + duration
  list[idx] = { ...list[idx], status: 'active', startTime: new Date(now).toISOString(), endTime: durationMs ? new Date(now + durationMs).toISOString() : null };
  setVotes(list);
  logActivity(`Vote resumed: ${list[idx].title}`, 'vote_resumed');
  return list[idx];
}

export function completeVote(id) {
  const list = getVotes();
  const idx = list.findIndex((v) => v.id === id);
  if (idx === -1) return null;
  const v = list[idx];
  list[idx] = { ...v, status: 'completed' };
  setVotes(list);
  logActivity(`Vote completed: ${v.title}`, 'vote_completed');
  return list[idx];
}

// Submit a user's vote selection to the active vote
export function submitVoteOption({ voteId, userEmail, optionId }) {
  const list = getVotes();
  const idx = list.findIndex((v) => v.id === voteId);
  if (idx === -1) return { ok: false, error: 'Vote not found' };
  const vote = list[idx];
  if (vote.status !== 'active') return { ok: false, error: 'Vote is not active' };
  if (vote.endTime) {
    const end = new Date(vote.endTime).getTime();
    if (Date.now() >= end) {
      // Auto-complete and reject further submissions
      list[idx] = { ...vote, status: 'completed' };
      setVotes(list);
      return { ok: false, error: 'Vote has ended' };
    }
  }
  const optionIdx = vote.options.findIndex((o) => o.id === optionId);
  if (optionIdx === -1) return { ok: false, error: 'Option not found' };
  const submissions = vote.submissions || {};
  const usedByUser = submissions[userEmail] || 0;
  if (usedByUser >= (vote.maxVotesPerUser || 1)) {
    return { ok: false, error: 'Max votes reached for this vote' };
  }
  const updatedOption = { ...vote.options[optionIdx], votes: (vote.options[optionIdx].votes || 0) + 1 };
  const updatedVote = {
    ...vote,
    options: [
      ...vote.options.slice(0, optionIdx),
      updatedOption,
      ...vote.options.slice(optionIdx + 1),
    ],
    totalVotes: (vote.totalVotes || 0) + 1,
    submissions: { ...submissions, [userEmail]: usedByUser + 1 },
  };
  list[idx] = updatedVote;
  setVotes(list);
  logActivity(`User ${userEmail} voted on "${vote.title}"`, 'vote_option_selected', userEmail);
  return { ok: true, vote: updatedVote };
}
