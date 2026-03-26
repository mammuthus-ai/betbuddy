import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useSocket } from "./useSocket";
import {
  fetchBets, fetchBet, createBet, joinSide, depositToEscrow, settleBet,
  addComment, reactToComment, uploadProof, fetchLeaderboard, fetchFriends, fetchUsers,
  sendFriendRequest, acceptFriendRequest, removeFriend, getMyQR, scanQR,
  getCoinStatus, claimDailyBonus, claimWeeklyBonus, getReferralCode, applyReferralCode, getCoinHistory,
  getShopItems, createCheckout, verifyPurchase, purchaseItem, setCustomName, setCustomUsername, setCustomAvatar,
  setPhoneNumber, matchContacts,
} from "./api";

const PLATFORM_FEE = 0;

const BADGES = {
  closer: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffd166" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, name: "The Closer", desc: "Won 5+ games" },
  bigmouth: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef476f" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>, name: "Big Mouth", desc: "Created 20+ games" },
  underdog: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52b788" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>, name: "Underdog", desc: "Won 3+ games as underdog" },
  streak: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef476f" stroke="none"><path d="M12 23c-4.97 0-9-3.13-9-7.5 0-3.17 2.36-5.33 4-6.5-.23 1.5.5 3 1.5 3.5C9 10 10 7.5 12 4c1.33 2.67 2.5 4.5 3.5 6.5.56 1.12.56 2.5 0 3.5 1.5-.5 2.5-2 2.5-3.5 1.5 1.33 3 3.67 3 6 0 4.37-4.03 6.5-9 6.5z"/></svg>, name: "On Fire", desc: "Won 5+ games in a row" },
  social: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, name: "Social Butterfly", desc: "Joined 10+ group games" },
  referee: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f2cc8f" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>, name: "Fair Judge", desc: "Refereed 5+ games" },
  undefeated: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, name: "Undefeated", desc: "Won 10 games without a loss" },
  trailblazer: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff9f1c" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, name: "Trailblazer", desc: "Created the very first game" },
  speed_demon: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00b4d8" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, name: "Speed Demon", desc: "Settled a game within 1 hour" },
  phoenix: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="#ff6b6b" stroke="none"><path d="M12 2c-1 4-4 6-4 10a4 4 0 008 0c0-4-3-6-4-10z"/><path d="M10 22c0-2 1-3 2-4 1 1 2 2 2 4" fill="#ffd166"/></svg>, name: "Phoenix", desc: "Won after losing 3 in a row" },
  coin_sharer: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52b788" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>, name: "Coin Sharer", desc: "Referred 5 friends" },
  jack_of_all: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e59cff" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>, name: "Jack of All Trades", desc: "Games in every category" },
  whale: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#118ab2" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>, name: "Whale", desc: "Wagered 500+ coins in one game" },
  day_streak: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52b788" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, name: "Day Streak", desc: "Logged in 30 days in a row" },
  fan_favorite: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef476f" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>, name: "Fan Favorite", desc: "10+ comments on a single game" },
  certified_ref: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffd166" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, name: "Certified Ref", desc: "Refereed 20+ games, no disputes" },
  all_in: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef476f" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>, name: "All In", desc: "Wagered entire coin balance" },
  shutterbug: { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a5a0ff" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>, name: "Shutterbug", desc: "Uploaded proof for 10+ games" },
};

const BadgeUnlockAnimation = ({ badge, onDone }) => {
  const [phase, setPhase] = useState("enter"); // enter, show, exit
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 100);
    const t2 = setTimeout(() => setPhase("exit"), 3500);
    const t3 = setTimeout(onDone, 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);
  const b = BADGES[badge];
  if (!b) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: phase === "enter" ? "rgba(0,0,0,0)" : phase === "show" ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0)",
      transition: "background 0.5s ease", pointerEvents: "none",
    }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        transform: phase === "show" ? "scale(1)" : phase === "enter" ? "scale(0.3)" : "scale(1.5)",
        opacity: phase === "show" ? 1 : 0,
        transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
        <div style={{
          width: 100, height: 100, borderRadius: "50%",
          background: "linear-gradient(135deg, #6c63ff, #ef476f, #ffd166)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 60px rgba(108,99,255,0.5), 0 0 120px rgba(239,71,111,0.3)",
          animation: "badgePulse 1.5s ease-in-out infinite",
        }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#12121a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ transform: "scale(3)" }}>{b.icon}</span>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#ffd166", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Badge Unlocked!</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>{b.name}</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{b.desc}</div>
        </div>
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            position: "absolute", width: 6, height: 6, borderRadius: "50%",
            background: ["#6c63ff", "#ef476f", "#ffd166", "#52b788"][i % 4],
            top: "50%", left: "50%",
            transform: `rotate(${i * 30}deg) translateY(-${80 + Math.random() * 40}px)`,
            opacity: phase === "show" ? 1 : 0,
            transition: `all 0.8s ease ${i * 0.05}s`,
          }} />
        ))}
      </div>
    </div>
  );
};

const BET_CATEGORIES = [
  { id: "golf", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="18" r="3"/><path d="M12 2v13"/><path d="M12 2l6 4-6 4"/></svg>, label: "Golf", color: "#2d6a4f", examples: ["I'll break 90 this Saturday", "Jake can't hit a fairway at Pebble Beach", "I'll beat you in 18 holes this weekend", "Longest drive on hole 7 wins"] },
  { id: "fitness", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.5 6.5l11 11M20 4l-1.5 1.5M15 9l-2-2M11 13l-2-2M4 20l1.5-1.5"/><path d="M18.5 2.5a2.121 2.121 0 013 3"/><path d="M2.5 18.5a2.121 2.121 0 013 3"/></svg>, label: "Fitness", color: "#e07a5f", examples: ["I'll run a sub-25 min 5K by Friday", "Sarah can't bench 200 lbs", "10K steps every day this week", "I'll do 100 pushups in under 5 minutes"] },
  { id: "food", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>, label: "Food & Drink", color: "#f2cc8f", examples: ["I can eat 50 wings in 30 minutes", "Mike won't last a week without coffee", "I'll cook a better steak than you", "No fast food for 2 weeks straight"] },
  { id: "games", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="16" cy="12" r="1"/></svg>, label: "Games", color: "#6c63ff", examples: ["I'll beat you in FIFA best of 3", "First to finish Elden Ring wins", "I'll get a higher score in bowling", "1v1 me in Warzone, loser pays up"] },
  { id: "promises", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>, label: "Promises", color: "#ef476f", examples: ["You won't wake up before 7am for a month", "I'll read 2 books this month", "No social media for a week", "I'll finally clean out the garage by Sunday"] },
  { id: "other", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>, label: "Other", color: "#118ab2", examples: ["It'll rain tomorrow", "The movie will be rated over 80% on RT", "Our team wins the championship", "I'll get the job offer by next week"] },
];

const COIN = "\u{1FA99}"; // 🪙
const formatCoins = (n) => `${Math.round(Number(n) || 0)}`;
const CoinIcon = ({ size = 14 }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: size, height: size, borderRadius: "50%",
    background: "linear-gradient(145deg, #FFD700, #DAA520)",
    color: "#6b4c00", fontSize: size * 0.55, fontWeight: 900,
    lineHeight: 1, boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.3)",
    flexShrink: 0, verticalAlign: "middle", letterSpacing: 0,
  }}>C</span>
);

const Avatar = ({ user, size = 36 }) => {
  const display = user?.custom_avatar || user?.avatar;
  const isUrl = display && (display.startsWith("http://") || display.startsWith("https://"));
  return (
    <div style={{
      width: size, height: size, borderRadius: size > 30 ? 16 : "50%",
      background: "linear-gradient(135deg, #1a1a2e, #16213e)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.5, border: "3px solid rgba(255,255,255,0.12)", flexShrink: 0,
      overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    }}>
      {isUrl ? <img src={display} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (display || "?")}
    </div>
  );
};

const Badge = ({ badge }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px",
    borderRadius: 20, background: "rgba(255,255,255,0.06)", fontSize: 12, fontWeight: 700,
    border: "2px solid rgba(255,255,255,0.1)", boxShadow: "0 2px 0 rgba(0,0,0,0.2)",
  }}>
    <span>{badge.icon}</span>
    <span style={{ color: "#ddd" }}>{badge.name}</span>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    active: { bg: "#2d6a4f22", color: "#52b788", label: "Active" },
    settled: { bg: "#6c63ff22", color: "#a5a0ff", label: "Settled" },
    disputed: { bg: "#ef476f22", color: "#ef476f", label: "Disputed" },
    pending: { bg: "#f2cc8f22", color: "#f2cc8f", label: "Pending" },
    awaiting_funds: { bg: "#f2cc8f22", color: "#f2cc8f", label: "Awaiting Funds" },
    funded: { bg: "#52b78822", color: "#52b788", label: "All In" },
    partial: { bg: "#f2cc8f22", color: "#f2cc8f", label: "Waiting on Players" },
    held: { bg: "#ef476f22", color: "#ef476f", label: "Under Review" },
    none: { bg: "rgba(255,255,255,0.04)", color: "#666", label: "No Stakes" },
    cancelled: { bg: "#ef476f22", color: "#ef476f", label: "Cancelled" },
    refunded: { bg: "#f2cc8f22", color: "#f2cc8f", label: "Refunded" },
  };
  const s = styles[status] || styles.active;
  return (
    <span style={{
      padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 800,
      background: s.bg, color: s.color, letterSpacing: 1, textTransform: "uppercase",
      border: `2px solid ${s.color}33`,
    }}>{s.label}</span>
  );
};

const TimeLeft = ({ deadline }) => {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end - now;
  if (diff < 0) return <span style={{ color: "#ef476f", fontSize: 12 }}>Expired</span>;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return <span style={{ color: "#f2cc8f", fontSize: 12 }}>{<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display:"inline",verticalAlign:"middle"}}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3L2 6M22 6l-3-3"/></svg>} {days}d {hours % 24}h left</span>;
  return <span style={{ color: "#ef476f", fontSize: 12 }}>{<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display:"inline",verticalAlign:"middle"}}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3L2 6M22 6l-3-3"/></svg>} {hours}h left</span>;
};

/* ==================== LOGIN PAGE ==================== */

function LoginPage() {
  const { devLogin } = useAuth();
  const [username, setUsername] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState(null);

  const handleDevLogin = async () => {
    if (!username.trim()) return;
    setLoggingIn(true);
    setError(null);
    try {
      await devLogin(username.trim());
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoggingIn(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "16px 18px", borderRadius: 20,
    border: "3px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.5)",
    color: "#fff", fontSize: 16, outline: "none", fontFamily: "inherit", fontWeight: 500,
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f",
      fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { transform: scale(1.05); } 70% { transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        input { font-family: inherit; }
        input:focus { border-color: #6c63ff !important; }
        .chunky-btn { transition: all 0.15s ease !important; }
        .chunky-btn:active { transform: translateY(3px) !important; box-shadow: 0 1px 4px rgba(0,0,0,0.3) !important; }
      `}</style>

      <div style={{
        width: "100%", maxWidth: 400, padding: 32, animation: "slideUp 0.5s ease",
      }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            fontSize: 36, fontWeight: 900, letterSpacing: -1,
            background: "linear-gradient(135deg, #6c63ff, #ef476f, #ffd166)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "bounceIn 0.6s ease, float 3s ease-in-out infinite 0.6s",
            filter: "drop-shadow(0 4px 20px rgba(108,99,255,0.4))",
          }}>PutUpOrShutUp</div>
          <div style={{
            fontSize: 13, color: "#888", letterSpacing: 2, textTransform: "uppercase", marginTop: 8,
            fontWeight: 600, animation: "fadeIn 0.8s ease 0.5s both",
          }}>
            Put your money where your mouth is
          </div>
        </div>

        <div style={{
          padding: 28, borderRadius: 24,
          background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
          border: "3px solid rgba(255,255,255,0.08)", marginBottom: 20,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          animation: "slideUp 0.5s ease 0.6s both",
        }}>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 14, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>
            Dev Login
          </div>
          <input
            value={username} onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleDevLogin()}
            placeholder="Enter username..."
            style={{ ...inputStyle, marginBottom: 14 }}
          />
          <button className="chunky-btn" onClick={handleDevLogin} disabled={loggingIn || !username.trim()} style={{
            width: "100%", padding: 16, borderRadius: 20, border: "none",
            background: username.trim() ? "linear-gradient(135deg, #6c63ff, #ef476f)" : "rgba(255,255,255,0.05)",
            color: username.trim() ? "#fff" : "#666", fontSize: 17, fontWeight: 800,
            cursor: username.trim() ? "pointer" : "not-allowed", fontFamily: "inherit",
            boxShadow: username.trim() ? "0 6px 0 #4a3fd4, 0 8px 24px rgba(108,99,255,0.3)" : "none",
            transform: "translateY(0)",
          }}>
            {loggingIn ? "Logging in..." : "Let's Go!"}
          </button>
          {error && <div style={{ color: "#ef476f", fontSize: 14, marginTop: 10, textAlign: "center", fontWeight: 600 }}>{error}</div>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1 }} />
          <span style={{ fontSize: 13, color: "#666", fontWeight: 700 }}>OR</span>
          <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 1 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <a className="chunky-btn" href={`${window.Capacitor ? 'http://localhost:3001' : ''}/auth/google`} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            padding: 16, borderRadius: 20, border: "3px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 16, fontWeight: 700,
            textDecoration: "none", cursor: "pointer",
            boxShadow: "0 4px 0 rgba(255,255,255,0.05), 0 6px 20px rgba(0,0,0,0.2)",
            transform: "translateY(0)",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Sign in with Google
          </a>
        </div>
      </div>
    </div>
  );
}

/* ==================== MAIN APP ==================== */

export default function PutUpOrShutUp() {
  const { user, loading, logout, refreshUser, isAuthenticated } = useAuth();
  const socket = useSocket();

  const [tab, setTab] = useState("feed");
  const [bets, setBets] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [badgeQueue, setBadgeQueue] = useState([]);
  // Dev helper — remove before production
  useEffect(() => { window.__triggerBadge = (badge) => setBadgeQueue(prev => [...prev, badge]); }, []);
  const [selectedBet, setSelectedBet] = useState(null);
  const [showWallet, setShowWallet] = useState(false);
  const [toast, setToast] = useState(null);
  const [loadingBets, setLoadingBets] = useState(true);
  const [coinStatus, setCoinStatus] = useState(null);
  const [referralInfo, setReferralInfo] = useState(null);
  const [referralInput, setReferralInput] = useState("");
  const [coinCenterLoading, setCoinCenterLoading] = useState(false);
  const [dailyChecked, setDailyChecked] = useState(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load bets
  const loadBets = useCallback(async () => {
    try {
      setLoadingBets(true);
      const data = await fetchBets();
      setBets(data);
    } catch (err) {
      showToast("Failed to load bets: " + (err.message || "Unknown error"));
    } finally {
      setLoadingBets(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isAuthenticated) loadBets();
  }, [isAuthenticated, loadBets]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const offBetUpdated = socket.on("bet:updated", (updatedBet) => {
      setBets(prev => prev.map(b => b.id === updatedBet.id ? updatedBet : b));
      if (selectedBet && selectedBet.id === updatedBet.id) {
        setSelectedBet(updatedBet);
      }
    });

    const offBetCreated = socket.on("bet:created", (newBet) => {
      setBets(prev => [newBet, ...prev]);
    });

    const offComment = socket.on("bet:comment", ({ betId, comment }) => {
      setBets(prev => prev.map(b =>
        b.id === betId ? { ...b, comments: [...(b.comments || []), comment] } : b
      ));
    });

    const offBadge = socket.on("badge:earned", ({ userId: badgeUserId, badges }) => {
      if (badgeUserId === user?.id && badges.length > 0) {
        setBadgeQueue(prev => [...prev, ...badges]);
        refreshUser();
      }
    });

    return () => {
      if (offBetUpdated) offBetUpdated();
      if (offBetCreated) offBetCreated();
      if (offComment) offComment();
      if (offBadge) offBadge();
    };
  }, [socket, isAuthenticated, selectedBet]);

  // Join/leave socket rooms for selected bet
  useEffect(() => {
    if (!socket || !selectedBet) return;
    socket.joinBet(selectedBet.id);
    return () => socket.leaveBet(selectedBet.id);
  }, [socket, selectedBet]);

  // Load coin status when wallet tab is active
  useEffect(() => {
    if (tab === "wallet" && isAuthenticated) {
      setCoinCenterLoading(true);
      Promise.all([getCoinStatus(), getReferralCode()])
        .then(([status, refInfo]) => {
          setCoinStatus(status);
          setReferralInfo(refInfo);
        })
        .catch(() => showToast("Failed to load coin status"))
        .finally(() => setCoinCenterLoading(false));
    }
  }, [tab, isAuthenticated, showToast]);

  // Auto-check daily bonus on login
  useEffect(() => {
    if (isAuthenticated && !dailyChecked) {
      setDailyChecked(true);
      getCoinStatus().then((status) => {
        if (status.canClaimDaily) {
          showToast("Daily bonus available! Open your coins to claim 5 free coins");
        }
      }).catch(() => {});
    }
  }, [isAuthenticated, dailyChecked, showToast]);

  const handleClaimDaily = async () => {
    try {
      await claimDailyBonus();
      await refreshUser();
      const status = await getCoinStatus();
      setCoinStatus(status);
      showToast("Daily bonus claimed! +5 coins");
    } catch (err) {
      showToast("Failed to claim daily bonus: " + (err.message || "Unknown error"));
    }
  };

  const handleClaimWeekly = async () => {
    try {
      await claimWeeklyBonus();
      await refreshUser();
      const status = await getCoinStatus();
      setCoinStatus(status);
      showToast("Weekly allowance claimed! +20 coins");
    } catch (err) {
      showToast("Failed to claim weekly bonus: " + (err.message || "Unknown error"));
    }
  };

  const handleApplyReferral = async () => {
    if (!referralInput.trim()) return;
    try {
      await applyReferralCode(referralInput.trim());
      await refreshUser();
      const status = await getCoinStatus();
      setCoinStatus(status);
      setReferralInput("");
      showToast("Referral code applied! +25 coins");
    } catch (err) {
      showToast("Failed to apply referral: " + (err.message || "Unknown error"));
    }
  };

  const handleCreateBet = async (betData) => {
    try {
      const newBet = await createBet(betData);
      setBets(prev => [newBet, ...prev]);
      setShowCreate(false);
      showToast(`Game created! ${formatCoins(betData.wagerAmount)} locked in`);
      await refreshUser();
    } catch (err) {
      showToast("Failed to create game: " + (err.message || "Unknown error"));
    }
  };

  const handleDeposit = async (betId) => {
    try {
      const updated = await depositToEscrow(betId);
      setBets(prev => prev.map(b => b.id === betId ? updated : b));
      if (selectedBet && selectedBet.id === betId) setSelectedBet(updated);
      showToast("Coins locked in! 🔒");
      await refreshUser();
    } catch (err) {
      showToast("Deposit failed: " + (err.message || "Unknown error"));
    }
  };

  const handleSettle = async (betId, winningSide) => {
    try {
      const updated = await settleBet(betId, winningSide);
      setBets(prev => prev.map(b => b.id === betId ? updated : b));
      if (selectedBet && selectedBet.id === betId) setSelectedBet(updated);
      showToast("Game settled! Coins distributed to winners!");
      await refreshUser();
    } catch (err) {
      showToast("Settlement failed: " + (err.message || "Unknown error"));
    }
  };

  const handleComment = async (betId, text, commentType = 'text', extraData = null) => {
    try {
      const comment = await addComment(betId, text, commentType, extraData);
      setBets(prev => prev.map(b =>
        b.id === betId ? { ...b, comments: [...(b.comments || []), comment] } : b
      ));
      if (selectedBet && selectedBet.id === betId) {
        setSelectedBet(prev => ({ ...prev, comments: [...(prev.comments || []), comment] }));
      }
    } catch (err) {
      showToast("Failed to send comment: " + (err.message || "Unknown error"));
    }
  };

  const handleReaction = async (betId, commentId, emoji) => {
    try {
      const { reactions } = await reactToComment(betId, commentId, emoji);
      const updateComments = (comments) =>
        (comments || []).map(c => c.id === commentId ? { ...c, reactions } : c);
      setBets(prev => prev.map(b =>
        b.id === betId ? { ...b, comments: updateComments(b.comments) } : b
      ));
      if (selectedBet && selectedBet.id === betId) {
        setSelectedBet(prev => ({ ...prev, comments: updateComments(prev.comments) }));
      }
    } catch (err) {
      showToast(err.message || "Failed to react");
    }
  };

  const handleJoinSide = async (betId, side) => {
    try {
      const updated = await joinSide(betId, side);
      setBets(prev => prev.map(b => b.id === betId ? updated : b));
      if (selectedBet && selectedBet.id === betId) setSelectedBet(updated);
    } catch (err) {
      showToast("Failed to join side: " + (err.message || "Unknown error"));
    }
  };

  const handleUploadProof = async (betId, file, caption) => {
    try {
      const updated = await uploadProof(betId, file, caption);
      setBets(prev => prev.map(b => b.id === betId ? updated : b));
      if (selectedBet && selectedBet.id === betId) setSelectedBet(updated);
      showToast("Proof uploaded!");
    } catch (err) {
      showToast("Upload failed: " + (err.message || "Unknown error"));
    }
  };

  const handleSelectBet = async (bet) => {
    try {
      const full = await fetchBet(bet.id);
      setSelectedBet(full);
    } catch {
      setSelectedBet(bet);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0a0a0f", display: "flex",
        alignItems: "center", justifyContent: "center", color: "#fff",
        fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 32, fontWeight: 900, letterSpacing: -1,
            background: "linear-gradient(135deg, #6c63ff, #ef476f, #ffd166)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>PutUpOrShutUp</div>
          <div style={{ color: "#888", fontSize: 14, marginTop: 12 }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", color: "#fff" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

        /* ---- Entrance Animations ---- */
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideLeft { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideRight { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { transform: scale(1.08); } 70% { transform: scale(0.96); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.5) rotate(-5deg); } 60% { transform: scale(1.1) rotate(2deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
        @keyframes dropIn { 0% { opacity: 0; transform: translateY(-60px) scale(0.9); } 60% { transform: translateY(8px) scale(1.02); } 100% { opacity: 1; transform: translateY(0) scale(1); } }

        /* ---- Looping Animations ---- */
        @keyframes glow { 0%, 100% { box-shadow: 0 0 8px rgba(82,183,136,0.3); } 50% { box-shadow: 0 0 20px rgba(82,183,136,0.6); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 15% { transform: translateX(-4px) rotate(-1deg); } 30% { transform: translateX(4px) rotate(1deg); } 45% { transform: translateX(-3px); } 60% { transform: translateX(3px); } 75% { transform: translateX(-2px); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes wiggle { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
        @keyframes recording-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }

        /* ---- Coin Counter Animation ---- */
        @keyframes coinPop { 0% { transform: scale(1); } 30% { transform: scale(1.3); } 60% { transform: scale(0.9); } 100% { transform: scale(1); } }
        @keyframes coinFlip { 0% { transform: rotateY(0); } 50% { transform: rotateY(180deg); } 100% { transform: rotateY(360deg); } }
        @keyframes streakFire { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.5); } }

        /* ---- Overlay / Modal ---- */
        @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalBounceUp { 0% { opacity: 0; transform: translateY(100%); } 60% { transform: translateY(-8px); } 100% { opacity: 1; transform: translateY(0); } }

        /* ---- Tab Page Transitions ---- */
        .page-enter { animation: scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

        input, textarea, select { font-family: inherit; }
        input:focus, textarea:focus { border-color: rgba(108,99,255,0.5) !important; box-shadow: 0 0 0 3px rgba(108,99,255,0.15) !important; transition: all 0.2s ease !important; }
        .chunky-btn { transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) !important; }
        .chunky-btn:active { transform: translateY(3px) scale(0.97) !important; box-shadow: 0 1px 4px rgba(0,0,0,0.3) !important; }
        .chunky-btn:hover { transform: translateY(-1px) !important; filter: brightness(1.1) !important; }
      `}</style>

      {toast && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "3px solid rgba(108,99,255,0.3)",
          padding: "12px 24px", borderRadius: 20, fontSize: 14, fontWeight: 700,
          zIndex: 500, animation: "bounceIn 0.4s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>{toast}</div>
      )}

      <header style={{
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "3px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(180deg, rgba(108,99,255,0.1) 0%, transparent 100%)",
        position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{
            fontSize: 20, fontWeight: 900, letterSpacing: -0.5,
            background: "linear-gradient(135deg, #6c63ff, #ef476f, #ffd166)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>PutUpOrShutUp</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="chunky-btn" onClick={() => { setTab("wallet"); setSelectedBet(null); }} style={{
            padding: "8px 14px", borderRadius: 20,
            background: "linear-gradient(135deg, #52b78833, #2d6a4f33)",
            border: "2px solid rgba(82,183,136,0.3)",
            fontSize: 14, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5, color: "#52b788",
            boxShadow: "0 3px 0 rgba(82,183,136,0.15)",
          }}><span style={{ display: "inline-flex", animation: "float 3s ease-in-out infinite" }}><CoinIcon size={14} /></span> {formatCoins(user.coins || 0)}</button>
          <div style={{
            padding: "8px 12px", borderRadius: 20,
            background: "linear-gradient(135deg, #6c63ff22, #ef476f22)",
            border: "2px solid rgba(239,71,111,0.2)",
            fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", gap: 6,
            animation: (user.streak || 0) >= 3 ? "streakFire 1.5s ease-in-out infinite" : "none",
          }}>
            <span style={{ color: "#ef476f", animation: (user.streak || 0) >= 3 ? "wiggle 0.5s ease-in-out infinite" : "none", display: "inline-flex" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="#ef476f" stroke="none"><path d="M12 23c-4.97 0-9-3.13-9-7.5 0-3.17 2.36-5.33 4-6.5-.23 1.5.5 3 1.5 3.5C9 10 10 7.5 12 4c1.33 2.67 2.5 4.5 3.5 6.5.56 1.12.56 2.5 0 3.5 1.5-.5 2.5-2 2.5-3.5 1.5 1.33 3 3.67 3 6 0 4.37-4.03 6.5-9 6.5z"/></svg></span><span style={{ color: "#ef476f" }}>{user.streak || 0}</span>
          </div>
          <button onClick={() => { setTab("profile"); setSelectedBet(null); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <Avatar user={user} size={36} />
          </button>
        </div>
      </header>


      <nav style={{
        display: "flex", padding: "8px 10px", gap: 4,
        borderTop: "3px solid rgba(255,255,255,0.06)",
        background: "rgba(10,10,15,0.97)", position: "fixed", bottom: 0, left: 0, right: 0,
        zIndex: 98, backdropFilter: "blur(20px)",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
      }}>
        {[
          { id: "feed", color: "#6c63ff", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"/></svg>, label: "Feed" },
          { id: "mybets", color: "#ef476f", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>, label: "My Games" },
          { id: "leaderboard", color: "#ffd166", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, label: "Board" },
          { id: "friends", color: "#52b788", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, label: "Friends" },
          { id: "wallet", color: "#52b788", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><circle cx="18" cy="15" r="1"/></svg>, label: "Wallet" },
          { id: "shop", color: "#e59cff", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>, label: "Shop" },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelectedBet(null); }} style={{
            flex: 1, padding: "10px 4px 12px", border: "none", cursor: "pointer",
            background: "none", borderRadius: 0,
            color: tab === t.id ? "#fff" : "#555",
            fontSize: 11, fontWeight: tab === t.id ? 700 : 500,
            transition: "all 0.25s ease", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            position: "relative",
          }}>
            <span style={{ fontSize: 16, color: tab === t.id ? t.color : "#555", transition: "all 0.25s", filter: tab === t.id ? `drop-shadow(0 0 6px ${t.color}88)` : "none" }}>{t.icon}</span>{t.label}
            {tab === t.id && <span style={{ position: "absolute", bottom: 2, left: "20%", right: "20%", height: 3, borderRadius: 2, background: t.color, boxShadow: `0 0 12px ${t.color}88, 0 0 24px ${t.color}44` }} />}
          </button>
        ))}
      </nav>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "12px 12px 140px" }}>
        {loadingBets && bets.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading games...</div>
        ) : selectedBet ? (
          <div style={{ animation: "slideLeft 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}>
          <BetDetail
            bet={selectedBet} user={user}
            onBack={() => setSelectedBet(null)}
            onComment={handleComment} onReaction={handleReaction}
            onJoin={handleJoinSide}
            onDeposit={handleDeposit} onSettle={handleSettle}
            onUploadProof={handleUploadProof}
          />
          </div>
        ) : (
          <div key={tab} className="page-enter">
            {tab === "feed" ? (
              <FeedView bets={bets} user={user} onSelect={handleSelectBet} onJoin={handleJoinSide} />
            ) : tab === "mybets" ? (
              <MyBetsView bets={bets} user={user} onSelect={handleSelectBet} />
            ) : tab === "leaderboard" ? (
              <LeaderboardView showToast={showToast} />
            ) : tab === "friends" ? (
              <FriendsView user={user} showToast={showToast} />
            ) : tab === "wallet" ? (
              <WalletView user={user} bets={bets} showToast={showToast} coinStatus={coinStatus} coinCenterLoading={coinCenterLoading} referralInfo={referralInfo} referralInput={referralInput} setReferralInput={setReferralInput} handleClaimDaily={handleClaimDaily} handleClaimWeekly={handleClaimWeekly} handleApplyReferral={handleApplyReferral} onLogout={logout} />
            ) : tab === "shop" ? (
              <ShopView user={user} showToast={showToast} refreshUser={refreshUser} />
            ) : (
              <ProfileView user={user} bets={bets} onLogout={logout} />
            )}
          </div>
        )}
      </main>

      {!selectedBet && (
        <button className="chunky-btn" onClick={() => setShowCreate(true)} style={{
          position: "fixed", bottom: 85, right: 20, width: 60, height: 60,
          borderRadius: 22, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #6c63ff, #ef476f)",
          color: "#fff", fontSize: 30, fontWeight: 700,
          boxShadow: "0 6px 0 #4a3fd4, 0 8px 28px rgba(108,99,255,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s", zIndex: 200,
          animation: "float 4s ease-in-out infinite, popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
        onMouseEnter={e => e.target.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.target.style.transform = "scale(1)"}
        >+</button>
      )}

      {showCreate && (
        <CreateBetModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateBet}
          user={user}
          showToast={showToast}
        />
      )}

      {badgeQueue.length > 0 && (
        <BadgeUnlockAnimation
          badge={badgeQueue[0]}
          onDone={() => setBadgeQueue(prev => prev.slice(1))}
        />
      )}
    </div>
  );
}

/* ==================== FEED VIEW ==================== */

function FeedView({ bets, user, onSelect, onJoin }) {
  const activeBets = bets.filter(b => b.status !== "settled");
  return (
    <div>
      <div style={{ padding: "12px 4px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>Live Games</h2>
        <span style={{ fontSize: 12, color: "#666" }}>{activeBets.length} active</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {bets.map((bet, i) => (
          <BetCard key={bet.id} bet={bet} user={user} onClick={() => onSelect(bet)} onJoin={onJoin} delay={i * 80} />
        ))}
      </div>
      {bets.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#555", animation: "fadeIn 0.5s ease both" }}>
          <div style={{ fontSize: 48, marginBottom: 12, animation: "float 3s ease-in-out infinite" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>No games yet</div>
          <div style={{ fontSize: 13, color: "#444" }}>Tap the + button to create one!</div>
        </div>
      )}
    </div>
  );
}

/* ==================== BET CARD ==================== */

function BetCard({ bet, user, onClick, onJoin, delay = 0 }) {
  const creator = bet.creator || { name: "Unknown", avatar: "?" };
  const cat = BET_CATEGORIES.find(c => c.id === bet.category) || BET_CATEGORIES[5];
  const forSide = bet.sides?.for || [];
  const againstSide = bet.sides?.against || [];
  const totalFor = forSide.length;
  const totalAgainst = againstSide.length;
  const total = totalFor + totalAgainst || 1;

  const allParticipants = [...forSide, ...againstSide];

  return (
    <div onClick={onClick} style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
      borderRadius: 24, padding: 18, cursor: "pointer",
      border: "3px solid rgba(255,255,255,0.08)",
      transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)", animation: `slideUp 0.4s ease ${delay}ms both`,
      position: "relative", overflow: "hidden",
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = `${cat.color}55`; e.currentTarget.style.transform = "translateY(-4px) scale(1.01)"; e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${cat.color}33`; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)"; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 6, height: "100%", background: cat.color, borderRadius: "0 4px 4px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar user={creator} size={32} />
          <span style={{ fontSize: 13, color: "#999", fontWeight: 600 }}>{creator.name}</span>
          <span style={{ fontSize: 14 }}>{cat.icon}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <StatusBadge status={bet.status} />
          {bet.escrow && <StatusBadge status={bet.escrow.status} />}
        </div>
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 10, lineHeight: 1.3, paddingRight: 8 }}>{bet.title}</h3>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
        padding: "6px 10px", borderRadius: 8, background: "rgba(0,0,0,0.3)", fontSize: 12,
      }}>
        <CoinIcon size={14} /><span style={{ color: "#ccc" }}>{bet.stakes || `${bet.wager_amount || 0} coins per person`}</span>
        <span style={{ marginLeft: "auto" }}><TimeLeft deadline={bet.deadline} /></span>
      </div>

      {bet.escrow && (
        <div style={{
          padding: "6px 10px", borderRadius: 8, marginBottom: 10,
          background: bet.escrow.status === "funded" ? "rgba(82,183,136,0.06)" : "rgba(242,204,143,0.06)",
          border: `1px solid ${bet.escrow.status === "funded" ? "rgba(82,183,136,0.12)" : "rgba(242,204,143,0.12)"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11,
        }}>
          <span style={{ color: "#888", display: "inline-flex", alignItems: "center", gap: 4 }}><CoinIcon size={12} /> Pot</span>
          <span style={{ fontWeight: 700, color: bet.escrow.status === "funded" || bet.escrow.status === "held" || bet.escrow.status === "settled" ? "#52b788" : "#f2cc8f" }}>
            {bet.escrow.status === "funded" || bet.escrow.status === "held" || bet.escrow.status === "settled"
              ? formatCoins(bet.escrow.totalPool)
              : `${Object.keys(bet.escrow.deposits || {}).length}/${allParticipants.length} funded`
            }
          </span>
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
          <span>{"+"} {totalFor} for</span><span>{"-"} {totalAgainst} against</span>
        </div>
        <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
          <div style={{ width: `${(totalFor / total) * 100}%`, background: "#52b788", transition: "width 0.3s" }} />
          <div style={{ width: `${(totalAgainst / total) * 100}%`, background: "#ef476f", transition: "width 0.3s" }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {allParticipants.slice(0, 4).map((p, i) => (
            <div key={p.id || i} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 4 - i }}>
              <Avatar user={p} size={22} />
            </div>
          ))}
          {bet.isGroup && <span style={{ fontSize: 11, color: "#666", marginLeft: 6 }}>Group</span>}
        </div>
        <div style={{ fontSize: 12, color: "#666", display: "flex", alignItems: "center", gap: 4 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> {(bet.comments || []).length}</div>
      </div>
    </div>
  );
}

/* ==================== BET DETAIL ==================== */

function BetDetail({ bet, user, onBack, onComment, onReaction, onJoin, onDeposit, onSettle, onUploadProof }) {
  const [comment, setComment] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofCaption, setProofCaption] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifResults, setGifResults] = useState([]);
  const [searchingGifs, setSearchingGifs] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [hasTrashTalk, setHasTrashTalk] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    fetch('/api/shop/check/extended_trash_talk', { credentials: 'include' })
      .then(r => r.json()).then(d => setHasTrashTalk(d.purchased)).catch(() => {});
  }, []);
  const fileInputRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result;
          onComment(bet.id, "Voice note", "voice", { audioData: base64, duration: recordingTime });
          setRecordingTime(0);
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  };
  const cat = BET_CATEGORIES.find(c => c.id === bet.category) || BET_CATEGORIES[5];

  const forSide = bet.sides?.for || [];
  const againstSide = bet.sides?.against || [];
  const allParticipants = [...forSide, ...againstSide];
  const wagerAmount = bet.wager_amount || bet.wagerAmount || 0;

  const myId = user.id;
  const isParticipant = allParticipants.some(p => p.id === myId);
  const needsMyDeposit = bet.escrow && !bet.escrow.deposits?.[myId] && isParticipant;
  const canAfford = (user.coins || 0) >= wagerAmount;

  const imOnFor = forSide.some(p => p.id === myId);
  const imOnAgainst = againstSide.some(p => p.id === myId);

  const handleComment = () => {
    if (!comment.trim()) return;
    onComment(bet.id, comment);
    setComment("");
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProof(true);
    await onUploadProof(bet.id, file, proofCaption);
    setProofCaption("");
    setUploadingProof(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const escrowPool = bet.escrow?.totalPool || Object.values(bet.escrow?.deposits || {}).reduce((s, v) => s + v, 0);

  return (
    <div style={{ animation: "slideUp 0.3s ease" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#6c63ff", cursor: "pointer", fontSize: 14, marginBottom: 12, padding: 0 }}>{"\u2190"} Back</button>
      <div style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", borderRadius: 24, padding: 20, border: "3px solid rgba(255,255,255,0.08)", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 24 }}>{cat.icon}</span>
          <StatusBadge status={bet.status} />
          {bet.escrow && <StatusBadge status={bet.escrow.status} />}
          <TimeLeft deadline={bet.deadline} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 12, lineHeight: 1.3 }}>{bet.title}</h2>
        <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 16, background: "rgba(0,0,0,0.3)", border: "3px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Stakes</div>
          <div style={{ fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><CoinIcon size={18} /> {bet.stakes || `${wagerAmount} coins per person`}</div>
        </div>

        {/* ESCROW SECTION */}
        {bet.escrow && (
          <div style={{ padding: 14, borderRadius: 12, marginBottom: 16, background: "linear-gradient(135deg, rgba(82,183,136,0.04), rgba(45,106,79,0.04))", border: "1px solid rgba(82,183,136,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>{"*"}</span>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "#52b788" }}>Game Pot</h4>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[
                { val: formatCoins(escrowPool), label: "Pool", color: "#52b788" },
                { val: formatCoins(bet.escrow.netPayout || escrowPool), label: "Payout", color: "#a5a0ff" },
              ].map((item, i) => (
                <div key={i} style={{ flex: 1, padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.2)", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.color, fontFamily: "'Space Mono', monospace" }}>{item.val}</div>
                  <div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Deposits</div>
            {allParticipants.map((p) => {
              const deposited = bet.escrow.deposits?.[p.id];
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                  <Avatar user={p} size={20} />
                  <span style={{ fontSize: 12, flex: 1 }}>{p.name}</span>
                  {deposited
                    ? <span style={{ fontSize: 11, color: "#52b788", fontWeight: 600 }}>{"\u2705"} {formatCoins(deposited)}</span>
                    : <span style={{ fontSize: 11, color: "#f2cc8f", fontWeight: 600 }}>{"\u23F3"} Pending</span>
                  }
                </div>
              );
            })}
            {needsMyDeposit && (
              <button onClick={() => canAfford && onDeposit(bet.id)} style={{
                width: "100%", marginTop: 12, padding: 12, borderRadius: 10, border: "none",
                background: canAfford ? "linear-gradient(135deg, #52b788, #2d6a4f)" : "rgba(255,255,255,0.05)",
                color: canAfford ? "#fff" : "#666", cursor: canAfford ? "pointer" : "not-allowed",
                fontSize: 14, fontWeight: 700, animation: canAfford ? "glow 2s ease-in-out infinite" : "none",
              }}>
                {canAfford ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CoinIcon size={16} /> Put In {formatCoins(wagerAmount)}</span> : "Not enough coins"}
              </button>
            )}
            {bet.escrow.status === "settled" && (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "rgba(108,99,255,0.08)" }}>
                <div style={{ color: "#a5a0ff", fontWeight: 600, marginBottom: 4 }}>{"\u2705"} Settlement Complete</div>
                <div style={{ color: "#888" }}>
                  Winners ({(bet.escrow.payoutTo || []).map(id => {
                    const p = allParticipants.find(pp => pp.id === id);
                    return p ? p.name : id;
                  }).join(", ")}) each received {formatCoins(bet.escrow.perWinner || 0)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sides */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, padding: 12, borderRadius: 10, background: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.12)" }}>
            <div style={{ fontSize: 11, color: "#52b788", marginBottom: 8, fontWeight: 600 }}>{"+"} FOR</div>
            {forSide.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Avatar user={p} size={20} /><span style={{ fontSize: 13 }}>{p.name}</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, padding: 12, borderRadius: 10, background: "rgba(239,71,111,0.06)", border: "1px solid rgba(239,71,111,0.12)" }}>
            <div style={{ fontSize: 11, color: "#ef476f", marginBottom: 8, fontWeight: 600 }}>{"-"} AGAINST</div>
            {againstSide.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Avatar user={p} size={20} /><span style={{ fontSize: 13 }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {(bet.status === "active" || bet.status === "awaiting_funds") && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onJoin(bet.id, "for")} style={{
              flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(82,183,136,0.3)",
              background: imOnFor ? "rgba(82,183,136,0.2)" : "transparent",
              color: "#52b788", cursor: "pointer", fontWeight: 600, fontSize: 13,
            }}>I'm For This {"\u2705"}</button>
            <button onClick={() => onJoin(bet.id, "against")} style={{
              flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(239,71,111,0.3)",
              background: imOnAgainst ? "rgba(239,71,111,0.2)" : "transparent",
              color: "#ef476f", cursor: "pointer", fontWeight: 600, fontSize: 13,
            }}>Against {"x"}</button>
          </div>
        )}

        {bet.status === "active" && bet.escrow?.status === "funded" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Settle this game</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onSettle(bet.id, "for")} style={{
                flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(82,183,136,0.3)",
                background: "rgba(82,183,136,0.1)", color: "#52b788", cursor: "pointer", fontWeight: 600, fontSize: 13,
              }}>{"\u2705"} "For" Wins</button>
              <button onClick={() => onSettle(bet.id, "against")} style={{
                flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(239,71,111,0.3)",
                background: "rgba(239,71,111,0.1)", color: "#ef476f", cursor: "pointer", fontWeight: 600, fontSize: 13,
              }}>{"\u2705"} "Against" Wins</button>
            </div>
          </div>
        )}

        {bet.referee && (
          <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            {"\u2696\uFE0F"} Referee: <Avatar user={bet.referee} size={18} /> <span style={{ color: "#ccc" }}>{bet.referee.name}</span>
          </div>
        )}
      </div>

      {/* Proof Upload & Gallery */}
      <div style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", borderRadius: 24, padding: 20, border: "3px solid rgba(255,255,255,0.08)", marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Proof</h3>

        {(bet.status === "active" || bet.status === "disputed") && (
          <div style={{ marginBottom: 16 }}>
            <input
              type="text" value={proofCaption} onChange={e => setProofCaption(e.target.value)}
              placeholder="Add a caption (optional)..."
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 8, marginBottom: 8,
                border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)",
                color: "#fff", fontSize: 13, outline: "none",
              }}
            />
            <input
              ref={fileInputRef} type="file" accept="image/*,video/*"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingProof}
              style={{
                width: "100%", padding: 10, borderRadius: 10,
                border: "1px dashed rgba(108,99,255,0.4)", background: "rgba(108,99,255,0.06)",
                color: "#a5a0ff", cursor: uploadingProof ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 600,
              }}
            >
              {uploadingProof ? "Uploading..." : "Upload Proof (Photo / Video)"}
            </button>
          </div>
        )}

        {(bet.proofs && bet.proofs.length > 0) ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bet.proofs.map((proof, i) => (
              <div key={i} style={{ padding: 12, borderRadius: 10, background: "rgba(0,0,0,0.2)", border: "3px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Avatar user={{ avatar: proof.user_avatar, name: proof.user_name }} size={22} />
                  <span style={{ fontSize: 12, color: "#ccc" }}>{proof.user_name}</span>
                  <span style={{ fontSize: 11, color: "#666", marginLeft: "auto" }}>
                    {proof.created_at ? new Date(proof.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
                {proof.caption && <div style={{ fontSize: 13, color: "#ccc", marginBottom: 8 }}>{proof.caption}</div>}
                {proof.file_type?.startsWith("video") ? (
                  <video
                    src={proof.file_path} controls
                    style={{ width: "100%", borderRadius: 8, maxHeight: 300 }}
                  />
                ) : (
                  <img
                    src={proof.file_path} alt="Proof"
                    style={{ width: "100%", borderRadius: 8, maxHeight: 300, objectFit: "cover" }}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "#666", fontSize: 13, textAlign: "center", padding: 12 }}>
            No proof uploaded yet
          </div>
        )}
      </div>

      {/* Trash Talk */}
      <div style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))", borderRadius: 24, padding: 20, border: "3px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12 }}># Trash Talk</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12, maxHeight: 300, overflowY: "auto" }}>
          {(bet.comments || []).map((c, i) => {
            const commentUser = { id: c.user_id, name: c.user_name, avatar: c.user_avatar };
            const isMe = c.user_id === user.id;
            const timeStr = c.created_at ? new Date(c.created_at).toLocaleString() : (c.time || "");
            const reactions = c.reactions || [];
            const reactionGroups = {};
            reactions.forEach(r => {
              if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = [];
              reactionGroups[r.emoji].push(r);
            });
            return (
              <div key={c.id || i} style={{ display: "flex", gap: 8, alignItems: "flex-start", flexDirection: isMe ? "row-reverse" : "row" }}>
                <Avatar user={commentUser} size={24} />
                <div style={{ maxWidth: "75%" }}>
                  <div style={{
                    padding: "8px 12px", borderRadius: 12,
                    background: isMe ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.06)",
                    borderTopLeftRadius: isMe ? 12 : 4, borderTopRightRadius: isMe ? 4 : 12,
                  }}>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{commentUser.name} {"\u00B7"} {timeStr}</div>
                    {c.comment_type === 'gif' && c.extra_data?.gifUrl ? (
                      <img src={c.extra_data.gifUrl} alt="GIF" style={{ maxWidth: "100%", borderRadius: 8, marginTop: 4 }} />
                    ) : c.comment_type === 'voice' && c.extra_data?.audioData ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <button onClick={(e) => { e.stopPropagation(); const audio = new Audio(c.extra_data.audioData); audio.play(); }} style={{
                          width: 32, height: 32, borderRadius: "50%", border: "none",
                          background: "linear-gradient(135deg, #6c63ff, #ef476f)", color: "#fff",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        }}><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
                        <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                          <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #6c63ff, #ef476f)", borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#888" }}>{c.extra_data.duration || 0}s</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, lineHeight: 1.4 }}>{c.text}</div>
                    )}
                  </div>
                  {/* Reactions display */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                    {Object.entries(reactionGroups).map(([emoji, users]) => (
                      <button key={emoji} onClick={() => hasTrashTalk && onReaction(bet.id, c.id, emoji)} style={{
                        padding: "2px 6px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
                        background: users.some(u => u.user_id === user.id) ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.04)",
                        color: "#fff", cursor: hasTrashTalk ? "pointer" : "default", fontSize: 12,
                      }}>{emoji} {users.length}</button>
                    ))}
                    {hasTrashTalk && (
                      <div style={{ position: "relative" }}>
                        <button onClick={() => setShowReactionPicker(showReactionPicker === (c.id || i) ? null : (c.id || i))} style={{
                          padding: "2px 6px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.03)", color: "#888", cursor: "pointer", fontSize: 12,
                        }}>+</button>
                        {showReactionPicker === (c.id || i) && (
                          <div style={{
                            position: "absolute", bottom: "100%", left: 0, background: "#1a1a2e",
                            borderRadius: 10, padding: 6, display: "flex", gap: 4, zIndex: 10,
                            border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                          }}>
                            {["W", "L", "!!!", "+1", "nah", "wow", "cap", "lol"].map(em => (
                              <button key={em} onClick={() => { onReaction(bet.id, c.id, em); setShowReactionPicker(null); }} style={{
                                padding: 4, border: "none", background: "none", cursor: "pointer", fontSize: 18,
                              }}>{em}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* GIF Picker */}
        {showGifPicker && (
          <div style={{
            background: "#1a1a2e", borderRadius: 12, padding: 12, marginBottom: 10,
            border: "1px solid rgba(255,255,255,0.1)", maxHeight: 250, overflowY: "auto",
          }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input value={gifSearch} onChange={e => setGifSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && gifSearch.trim()) {
                    setSearchingGifs(true);
                    fetch(`https://api.giphy.com/v1/gifs/search?api_key=GlVGYHkr3WSBnllca54iNt0yFbjz7L65&q=${encodeURIComponent(gifSearch)}&limit=12&rating=pg-13`)
                      .then(r => r.json()).then(d => setGifResults(d.data || [])).catch(() => {})
                      .finally(() => setSearchingGifs(false));
                  }
                }}
                placeholder="Search GIFs..." style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 13, outline: "none",
                }}
              />
              <button onClick={() => { setShowGifPicker(false); setGifResults([]); setGifSearch(""); }} style={{
                padding: "8px 12px", borderRadius: 8, border: "none",
                background: "rgba(255,255,255,0.08)", color: "#aaa", cursor: "pointer", fontSize: 12,
              }}>Close</button>
            </div>
            {searchingGifs && <div style={{ textAlign: "center", color: "#888", padding: 10 }}>Searching...</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {gifResults.map(gif => (
                <img key={gif.id} src={gif.images.fixed_height_small.url} alt={gif.title}
                  onClick={() => {
                    onComment(bet.id, "", "gif", { gifUrl: gif.images.fixed_height.url, gifTitle: gif.title });
                    setShowGifPicker(false); setGifResults([]); setGifSearch("");
                  }}
                  style={{ width: "100%", borderRadius: 6, cursor: "pointer", objectFit: "cover", height: 80 }}
                />
              ))}
            </div>
            {!searchingGifs && gifResults.length === 0 && gifSearch && (
              <div style={{ textAlign: "center", color: "#666", fontSize: 12, padding: 10 }}>Press Enter to search</div>
            )}
          </div>
        )}

        {isRecording ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 16,
            background: "rgba(239,71,111,0.1)", border: "2px solid rgba(239,71,111,0.3)",
            animation: "glow 1.5s ease infinite",
          }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef476f", animation: "recording-pulse 1s ease infinite" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#ef476f" }}>Recording... {recordingTime}s</span>
            <div style={{ flex: 1 }} />
            <button onClick={stopRecording} style={{
              padding: "8px 20px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #ef476f, #6c63ff)", color: "#fff",
              cursor: "pointer", fontWeight: 800, fontSize: 13,
              boxShadow: "0 4px 0 #c0392b",
            }} className="chunky-btn">Send</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            {hasTrashTalk && (
              <>
                <button onClick={() => setShowGifPicker(!showGifPicker)} style={{
                  padding: "10px 12px", borderRadius: 14, border: "2px solid rgba(255,255,255,0.08)",
                  background: showGifPicker ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.03)",
                  color: showGifPicker ? "#a5a0ff" : "#888", cursor: "pointer", fontSize: 14, fontWeight: 800,
                }} title="Send GIF">GIF</button>
                <button onClick={startRecording} style={{
                  padding: "10px 12px", borderRadius: 14, border: "2px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)", color: "#888", cursor: "pointer",
                }} title="Voice Note"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></button>
              </>
            )}
            <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && handleComment()}
              placeholder="Talk your trash..." style={{
                flex: 1, padding: "10px 14px", borderRadius: 14, border: "2px solid rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 13, fontWeight: 600, outline: "none",
              }}
            />
            <button className="chunky-btn" onClick={handleComment} style={{
              padding: "10px 16px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg, #6c63ff, #ef476f)",
              color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 13,
              boxShadow: "0 4px 0 #4a3fd4",
            }}>Send</button>
          </div>
        )}
        {!hasTrashTalk && (
          <div style={{ fontSize: 11, color: "#666", marginTop: 6, textAlign: "center" }}>
            Buy "Extended Trash Talk" in the Shop to send GIFs & reactions
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== MY BETS VIEW ==================== */

function MyBetsView({ bets, user, onSelect }) {
  const myId = user.id;
  const myBets = bets.filter(b => {
    if (b.creator_id === myId || b.creator?.id === myId) return true;
    const allP = [...(b.sides?.for || []), ...(b.sides?.against || [])];
    return allP.some(p => p.id === myId);
  });
  const active = myBets.filter(b => b.status === "active");
  const awaiting = myBets.filter(b => b.status === "awaiting_funds");
  const disputed = myBets.filter(b => b.status === "disputed");
  const totalInEscrow = myBets.filter(b => b.escrow?.deposits?.[myId] && b.status !== "settled")
    .reduce((s, b) => s + (b.escrow.deposits[myId] || 0), 0);

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 900, padding: "12px 4px 8px" }}>My Games</h2>
      <div style={{
        padding: "12px 14px", borderRadius: 12, marginBottom: 12,
        background: "linear-gradient(135deg, rgba(82,183,136,0.06), rgba(45,106,79,0.04))",
        border: "1px solid rgba(82,183,136,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{"*"}</span>
          <div>
            <div style={{ fontSize: 11, color: "#888" }}>Coins Staked</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#52b788", fontFamily: "'Space Mono', monospace" }}>{formatCoins(totalInEscrow)}</div>
          </div>
        </div>
        {awaiting.length > 0 && (
          <div style={{ padding: "4px 10px", borderRadius: 10, background: "#f2cc8f22", fontSize: 11, color: "#f2cc8f", fontWeight: 600 }}>
            {awaiting.length} need funding
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: "0 4px" }}>
        {[
          { label: "Active", value: active.length, color: "#52b788" },
          { label: "Won", value: user.wins || 0, color: "#6c63ff" },
          { label: "Lost", value: user.losses || 0, color: "#ef476f" },
          { label: "Disputed", value: disputed.length, color: "#f2cc8f" },
        ].map(p => (
          <div key={p.label} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "center", background: "rgba(255,255,255,0.03)" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: p.color }}>{p.value}</div>
            <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{p.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {myBets.map((bet, i) => (
          <BetCard key={bet.id} bet={bet} user={user} onClick={() => onSelect(bet)} onJoin={() => {}} delay={i * 80} />
        ))}
      </div>
      {myBets.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
          You haven't joined any bets yet.
        </div>
      )}
    </div>
  );
}

/* ==================== LEADERBOARD VIEW ==================== */

function LeaderboardView({ showToast }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLB, setLoadingLB] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLeaderboard();
        setLeaderboard(data);
      } catch (err) {
        showToast("Failed to load leaderboard: " + (err.message || "Unknown error"));
      } finally {
        setLoadingLB(false);
      }
    })();
  }, [showToast]);

  if (loadingLB) return <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading leaderboard...</div>;

  const sorted = [...leaderboard].sort((a, b) => (b.wins || 0) - (a.wins || 0));
  const top3Raw = sorted.slice(0, 3);
  const top3 = top3Raw.length >= 3
    ? [{ ...top3Raw[1], place: "2nd" }, { ...top3Raw[0], place: "1st" }, { ...top3Raw[2], place: "3rd" }]
    : top3Raw.map((u, i) => ({ ...u, place: ["1st", "2nd", "3rd"][i] }));

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 900, padding: "12px 4px 8px" }}>Leaderboard</h2>
      {top3.length >= 3 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 12, marginBottom: 24, paddingTop: 20 }}>
          {top3.map((u, i) => {
            const heights = [100, 130, 80];
            const isFirst = i === 1;
            return (
              <div key={u.id || i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, animation: `dropIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${isFirst ? 0 : (i === 0 ? 150 : 300)}ms both` }}>
                <div style={{ fontSize: isFirst ? 28 : 20, animation: isFirst ? "wiggle 2s ease-in-out infinite" : "none" }}>{u.place}</div>
                <Avatar user={u} size={isFirst ? 52 : 40} />
                <div style={{ fontSize: isFirst ? 14 : 12, fontWeight: 600 }}>{u.name}</div>
                <div style={{
                  width: 80, height: heights[i], borderRadius: "10px 10px 0 0",
                  background: isFirst ? "linear-gradient(180deg, #6c63ff, #6c63ff44)" : "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))",
                  display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
                  border: isFirst ? "1px solid rgba(108,99,255,0.3)" : "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{u.wins || 0}</div>
                  <div style={{ fontSize: 10, color: "#888" }}>wins</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ borderRadius: 24, overflow: "hidden", border: "3px solid rgba(255,255,255,0.08)" }}>
        {sorted.map((u, i) => (
          <div key={u.id || i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
            background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
            borderBottom: "1px solid rgba(255,255,255,0.04)", animation: `slideUp 0.4s ease ${i * 80}ms both`,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#666", width: 24, textAlign: "center" }}>#{i + 1}</span>
            <Avatar user={u} size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
              <div style={{ fontSize: 11, color: "#888" }}>
                {u.wins || 0}W - {u.losses || 0}L {"\u00B7"} {(u.wins || 0) + (u.losses || 0) > 0 ? Math.round(((u.wins || 0) / ((u.wins || 0) + (u.losses || 0))) * 100) : 0}%
              </div>
            </div>
            {(u.streak || 0) > 0 && <div style={{ fontSize: 12, color: "#ef476f", fontWeight: 600 }}>{"~"}{u.streak}</div>}
          </div>
        ))}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, padding: "20px 4px 10px" }}>Badges</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {Object.values(BADGES).map(b => <Badge key={b.name} badge={b} />)}
      </div>
    </div>
  );
}

/* ==================== FRIENDS VIEW ==================== */

function FriendsView({ user, showToast }) {
  const [friends, setFriends] = useState([]);
  const [pendingReceived, setPendingReceived] = useState([]);
  const [pendingSent, setPendingSent] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [contactMatches, setContactMatches] = useState([]);
  const [contactInvites, setContactInvites] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  const loadFriends = useCallback(async () => {
    try {
      setLoadingFriends(true);
      const data = await fetchFriends();
      setFriends(data.friends || []);
      setPendingReceived(data.pendingReceived || []);
      setPendingSent(data.pendingSent || []);
    } catch (err) {
      showToast("Failed to load friends: " + (err.message || "Unknown error"));
    } finally {
      setLoadingFriends(false);
    }
  }, [showToast]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  const handleImportContacts = async () => {
    setLoadingContacts(true);
    setShowContacts(true);
    try {
      // Check if running in Capacitor (native)
      if (window.Capacitor) {
        const { Contacts } = await import('@capgo/capacitor-contacts');
        const permission = await Contacts.requestPermissions();
        if (permission.contacts !== 'granted') {
          showToast("Contacts permission denied");
          setLoadingContacts(false);
          return;
        }
        const result = await Contacts.getContacts({ projection: { phones: true, name: true } });
        const phones = [];
        const phoneToName = {};
        (result.contacts || []).forEach(c => {
          (c.phones || []).forEach(p => {
            const num = p.number?.replace(/\D/g, '').slice(-10);
            if (num && num.length >= 7) {
              phones.push(num);
              phoneToName[num] = c.name?.display || c.name?.given || "Unknown";
            }
          });
        });
        if (phones.length === 0) {
          showToast("No phone numbers found in contacts");
          setLoadingContacts(false);
          return;
        }
        const data = await matchContacts(phones);
        setContactMatches(data.matches || []);
        setContactInvites((data.notOnApp || []).slice(0, 20).map(p => ({ phone: p, name: phoneToName[p] || p })));
      } else {
        // Web fallback — show a message
        showToast("Contacts import is available on the mobile app only");
      }
    } catch (err) {
      showToast("Failed to import contacts: " + (err.message || "Unknown error"));
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleInviteSMS = (phone) => {
    const message = encodeURIComponent("Join me on PutUpOrShutUp! Put your money where your mouth is. Download here: https://putuporshutup.app");
    if (window.Capacitor) {
      window.open(`sms:${phone}&body=${message}`);
    } else {
      window.open(`sms:${phone}?body=${message}`);
    }
    showToast("Opening SMS...");
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyQR();
        setQrData(data);
      } catch (err) {
        // QR not critical
      }
    })();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await fetchUsers(searchQuery.trim());
      setSearchResults(results.filter(u => u.id !== user.id));
    } catch (err) {
      showToast("Search failed: " + (err.message || "Unknown error"));
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (toUserId) => {
    try {
      await sendFriendRequest(toUserId);
      showToast("Friend request sent!");
      await loadFriends();
    } catch (err) {
      showToast("Failed to send request: " + (err.message || "Unknown error"));
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await acceptFriendRequest(requestId);
      showToast("Friend request accepted!");
      await loadFriends();
    } catch (err) {
      showToast("Failed to accept: " + (err.message || "Unknown error"));
    }
  };

  const handleRemove = async (friendId) => {
    try {
      await removeFriend(friendId);
      showToast("Friend removed");
      await loadFriends();
    } catch (err) {
      showToast("Failed to remove: " + (err.message || "Unknown error"));
    }
  };

  const startScanner = () => {
    setShowScanner(true);
    setTimeout(() => {
      if (!scannerRef.current) return;
      import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
        const scanner = new Html5QrcodeScanner("qr-reader", {
          fps: 10, qrbox: { width: 250, height: 250 },
        }, false);
        scannerInstanceRef.current = scanner;
        scanner.render(
          async (decodedText) => {
            scanner.clear();
            setShowScanner(false);
            try {
              await scanQR(decodedText);
              showToast("Friend added via QR!");
              await loadFriends();
            } catch (err) {
              showToast("QR scan failed: " + (err.message || "Unknown error"));
            }
          },
          () => {} // error callback (ignore scan misses)
        );
      }).catch(() => {
        showToast("Failed to load QR scanner library");
        setShowScanner(false);
      });
    }, 100);
  };

  const stopScanner = () => {
    if (scannerInstanceRef.current) {
      try { scannerInstanceRef.current.clear(); } catch {}
      scannerInstanceRef.current = null;
    }
    setShowScanner(false);
  };

  const isFriend = (uid) => friends.some(f => f.id === uid);
  const hasPendingTo = (uid) => pendingSent.some(f => f.id === uid);

  return (
    <div style={{ animation: "slideUp 0.3s ease" }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, padding: "12px 4px 8px" }}>Friends</h2>

      {/* QR Code Section */}
      <div style={{
        padding: 16, borderRadius: 24, marginBottom: 16,
        background: "linear-gradient(135deg, rgba(108,99,255,0.06), rgba(239,71,111,0.04))",
        border: "3px solid rgba(108,99,255,0.15)", textAlign: "center",
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>My QR Code</h3>
        {qrData?.qrCode ? (
          <img src={qrData.qrCode} alt="My QR Code" style={{ width: 180, height: 180, borderRadius: 12, background: "#fff", padding: 8 }} />
        ) : qrData?.qrData ? (
          <div style={{ padding: 16, borderRadius: 12, background: "rgba(0,0,0,0.3)", fontSize: 13, color: "#888", wordBreak: "break-all" }}>
            {qrData.qrData}
          </div>
        ) : (
          <div style={{ color: "#888", fontSize: 13 }}>Loading QR code...</div>
        )}
        <div style={{ marginTop: 12 }}>
          {!showScanner ? (
            <button onClick={startScanner} style={{
              padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(108,99,255,0.3)",
              background: "rgba(108,99,255,0.1)", color: "#a5a0ff", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
            }}>Scan Friend's QR</button>
          ) : (
            <div>
              <div id="qr-reader" ref={scannerRef} style={{ width: "100%", maxWidth: 300, margin: "0 auto", borderRadius: 12, overflow: "hidden" }} />
              <button onClick={stopScanner} style={{
                marginTop: 8, padding: "8px 16px", borderRadius: 10,
                border: "1px solid rgba(239,71,111,0.3)", background: "rgba(239,71,111,0.1)",
                color: "#ef476f", cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}>Cancel Scan</button>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{
        padding: 16, borderRadius: 24, marginBottom: 16,
        background: "rgba(255,255,255,0.03)", border: "3px solid rgba(255,255,255,0.08)",
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Find Friends</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search by username..."
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)",
              color: "#fff", fontSize: 13, outline: "none",
            }}
          />
          <button onClick={handleSearch} disabled={searching} style={{
            padding: "10px 16px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #6c63ff, #ef476f)",
            color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13,
          }}>{searching ? "..." : "Search"}</button>
        </div>
        {searchResults.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {searchResults.map(u => (
              <div key={u.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <Avatar user={u} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                </div>
                {isFriend(u.id) ? (
                  <span style={{ fontSize: 11, color: "#52b788", fontWeight: 600 }}>Friends</span>
                ) : hasPendingTo(u.id) ? (
                  <span style={{ fontSize: 11, color: "#f2cc8f", fontWeight: 600 }}>Pending</span>
                ) : (
                  <button onClick={() => handleSendRequest(u.id)} style={{
                    padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(108,99,255,0.3)",
                    background: "rgba(108,99,255,0.1)", color: "#a5a0ff",
                    cursor: "pointer", fontSize: 12, fontWeight: 600,
                  }}>Add</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Find from Contacts */}
      <div style={{
        padding: 16, borderRadius: 24, marginBottom: 16,
        background: "rgba(108,99,255,0.04)", border: "3px solid rgba(108,99,255,0.15)",
      }}>
        <button onClick={handleImportContacts} disabled={loadingContacts} style={{
          width: "100%", padding: "12px 16px", borderRadius: 10, border: "none",
          background: "linear-gradient(135deg, #6c63ff, #52b788)",
          color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          {loadingContacts ? "Searching contacts..." : "Find Friends from Contacts"}
        </button>

        {showContacts && !loadingContacts && (
          <div style={{ marginTop: 12 }}>
            {contactMatches.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#52b788", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>On PutUpOrShutUp</div>
                {contactMatches.map(m => (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <Avatar user={m} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>@{m.username}</div>
                    </div>
                    {m.friendStatus === "accepted" ? (
                      <span style={{ fontSize: 11, color: "#52b788", fontWeight: 600 }}>Friends</span>
                    ) : m.friendStatus === "pending" ? (
                      <span style={{ fontSize: 11, color: "#f2cc8f", fontWeight: 600 }}>Pending</span>
                    ) : (
                      <button onClick={() => { handleSendRequest(m.id); setContactMatches(prev => prev.map(c => c.id === m.id ? {...c, friendStatus: "pending"} : c)); }} style={{
                        padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(108,99,255,0.3)",
                        background: "rgba(108,99,255,0.1)", color: "#a5a0ff",
                        cursor: "pointer", fontSize: 12, fontWeight: 600,
                      }}>Add</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {contactInvites.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: "#f2cc8f", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Invite to PutUpOrShutUp</div>
                {contactInvites.map((inv, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, color: "#888",
                    }}>{inv.name?.[0] || "?"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{inv.name}</div>
                    </div>
                    <button onClick={() => handleInviteSMS(inv.phone)} style={{
                      padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(82,183,136,0.3)",
                      background: "rgba(82,183,136,0.1)", color: "#52b788",
                      cursor: "pointer", fontSize: 12, fontWeight: 600,
                    }}>Invite</button>
                  </div>
                ))}
              </div>
            )}

            {contactMatches.length === 0 && contactInvites.length === 0 && (
              <div style={{ color: "#888", fontSize: 13, textAlign: "center", padding: 12 }}>No contacts found</div>
            )}
          </div>
        )}
      </div>

      {/* Pending Requests */}
      {pendingReceived.length > 0 && (
        <div style={{
          padding: 16, borderRadius: 24, marginBottom: 16,
          background: "rgba(242,204,143,0.04)", border: "3px solid rgba(242,204,143,0.15)",
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: "#f2cc8f" }}>
            Pending Requests ({pendingReceived.length})
          </h3>
          {pendingReceived.map(req => (
            <div key={req.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              <Avatar user={req} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{req.name}</div>
              </div>
              <button onClick={() => handleAccept(req.requestId || req.id)} style={{
                padding: "6px 12px", borderRadius: 8, border: "none",
                background: "rgba(82,183,136,0.15)", color: "#52b788",
                cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}>Accept</button>
              <button onClick={() => handleRemove(req.requestId || req.id)} style={{
                padding: "6px 12px", borderRadius: 8, border: "none",
                background: "rgba(239,71,111,0.1)", color: "#ef476f",
                cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}>Decline</button>
            </div>
          ))}
        </div>
      )}

      {/* Friends List */}
      <div style={{
        padding: 16, borderRadius: 24,
        background: "rgba(255,255,255,0.03)", border: "3px solid rgba(255,255,255,0.08)",
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
          Friends ({friends.length})
        </h3>
        {loadingFriends ? (
          <div style={{ color: "#888", fontSize: 13, textAlign: "center", padding: 12 }}>Loading...</div>
        ) : friends.length === 0 ? (
          <div style={{ color: "#888", fontSize: 13, textAlign: "center", padding: 12 }}>No friends yet. Add some!</div>
        ) : (
          friends.map(f => (
            <div key={f.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              animation: "fadeIn 0.3s ease",
            }}>
              <Avatar user={f} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
                <div style={{ fontSize: 11, color: "#888" }}>
                  {f.wins || 0}W - {f.losses || 0}L
                  {(f.streak || 0) > 0 && <span style={{ color: "#ef476f", marginLeft: 6 }}>{"~"}{f.streak}</span>}
                </div>
              </div>
              <button onClick={() => handleRemove(f.id)} style={{
                padding: "6px 12px", borderRadius: 8,
                border: "1px solid rgba(239,71,111,0.2)", background: "rgba(239,71,111,0.06)",
                color: "#ef476f", cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}>Remove</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ==================== SHOP VIEW ==================== */

function ShopView({ user, showToast, refreshUser }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [customNameInput, setCustomNameInput] = useState(user.custom_name || "");
  const [savingName, setSavingName] = useState(false);
  const [customUsernameInput, setCustomUsernameInput] = useState(user.username || "");
  const [savingUsername, setSavingUsername] = useState(false);

  const PREMIUM_AVATARS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  const SHOP_ICONS = {
    custom_avatar: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>,
    custom_name: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffd166" strokeWidth="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    extended_trash_talk: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef476f" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M8 10h8M8 14h4"/></svg>,
    unlimited_group: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#52b788" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  };

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getShopItems();
      setItems(data.items || []);
    } catch (err) {
      showToast("Failed to load shop: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Check for Stripe redirect success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const successItem = params.get('shop_success');
    if (successItem) {
      // Verify the purchase with the backend
      verifyPurchase(successItem).then(result => {
        if (result.ok) {
          showToast("Purchase successful! Enjoy your upgrade.");
          loadItems();
          refreshUser();
        }
      }).catch(err => {
        showToast("Verifying purchase... " + (err.message || ""));
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    const cancelled = params.get('shop_cancel');
    if (cancelled) {
      showToast("Purchase cancelled.");
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleBuy = async (itemId) => {
    try {
      setBuying(itemId);
      // Try Stripe checkout first
      const result = await createCheckout(itemId);
      if (result.url) {
        window.location.href = result.url;
        return;
      }
    } catch (err) {
      // If Stripe not available, fall back to simulated purchase
      try {
        const result = await purchaseItem(itemId);
        showToast(result.message || "Purchase successful!");
        await loadItems();
        await refreshUser();
      } catch (err2) {
        showToast("Purchase failed: " + (err2.message || "Unknown error"));
      }
    } finally {
      setBuying(null);
    }
  };

  const handleSaveName = async () => {
    if (!customNameInput.trim()) return;
    try {
      setSavingName(true);
      await setCustomName(customNameInput.trim());
      showToast("Custom name saved!");
      await refreshUser();
    } catch (err) {
      showToast("Failed to save name: " + (err.message || "Unknown error"));
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!customUsernameInput.trim()) return;
    try {
      setSavingUsername(true);
      await setCustomUsername(customUsernameInput.trim());
      showToast("Username updated!");
      await refreshUser();
    } catch (err) {
      showToast(err.message || "Failed to save username");
    } finally {
      setSavingUsername(false);
    }
  };

  const handlePickAvatar = async (emoji) => {
    try {
      await setCustomAvatar(emoji);
      showToast("Avatar updated to " + emoji);
      await refreshUser();
    } catch (err) {
      showToast("Failed to set avatar: " + (err.message || "Unknown error"));
    }
  };

  const purchased = items.filter(i => i.purchased);
  const isPurchased = (id) => items.find(i => i.id === id)?.purchased;

  const cardStyle = {
    padding: 20, borderRadius: 24,
    background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
    border: "3px solid rgba(255,255,255,0.08)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
  };

  return (
    <div style={{ animation: "slideUp 0.3s ease" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e59cff" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> Shop</h2>
        <div style={{ fontSize: 13, color: "#888" }}>Upgrade your PutUpOrShutUp experience</div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading shop...</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {items.map(item => (
              <div key={item.id} style={{
                ...cardStyle,
                textAlign: "center",
                background: item.purchased
                  ? "linear-gradient(135deg, rgba(82,183,136,0.08), rgba(45,106,79,0.06))"
                  : cardStyle.background,
                border: item.purchased
                  ? "1px solid rgba(82,183,136,0.15)"
                  : cardStyle.border,
              }}>
                <div style={{ fontSize: 36, marginBottom: 8, display: "flex", justifyContent: "center" }}>{SHOP_ICONS[item.id] || item.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 10, lineHeight: 1.4 }}>{item.description}</div>
                {item.purchased ? (
                  <div style={{
                    padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: "rgba(82,183,136,0.15)", color: "#52b788", display: "inline-block",
                  }}>Owned {"\u2713"}</div>
                ) : (
                  <>
                    <div style={{
                      display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 12,
                      fontWeight: 700, background: "rgba(255,215,0,0.15)", color: "#FFD700",
                      marginBottom: 8, fontFamily: "'Space Mono', monospace",
                    }}>${item.price.toFixed(2)}</div>
                    <button
                      onClick={() => handleBuy(item.id)}
                      disabled={buying === item.id}
                      style={{
                        display: "block", width: "100%", padding: "8px 12px", borderRadius: 10,
                        border: "none", background: "linear-gradient(135deg, #6c63ff, #ef476f)",
                        color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                        opacity: buying === item.id ? 0.6 : 1,
                        boxShadow: "0 4px 16px rgba(108,99,255,0.3)",
                      }}
                    >{buying === item.id ? "Buying..." : "Buy"}</button>
                  </>
                )}
              </div>
            ))}
          </div>

          {isPurchased("custom_name") && (
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffd166" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Custom Display Name</div>
              {user.custom_name && (
                <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Current: <span style={{ color: "#a5a0ff" }}>{user.custom_name}</span></div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={customNameInput}
                  onChange={e => setCustomNameInput(e.target.value)}
                  placeholder="Enter custom name..."
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.4)",
                    color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName || !customNameInput.trim()}
                  style={{
                    padding: "10px 18px", borderRadius: 10, border: "none",
                    background: customNameInput.trim() ? "linear-gradient(135deg, #6c63ff, #ef476f)" : "rgba(255,255,255,0.05)",
                    color: customNameInput.trim() ? "#fff" : "#666",
                    fontSize: 13, fontWeight: 700, cursor: customNameInput.trim() ? "pointer" : "not-allowed",
                  }}
                >{savingName ? "..." : "Save"}</button>
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 16, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Custom Username
              </div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Current: <span style={{ color: "#a5a0ff" }}>@{user.username}</span></div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={customUsernameInput}
                  onChange={e => setCustomUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="Enter new username..."
                  maxLength={20}
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.4)",
                    color: "#fff", fontSize: 16, outline: "none", fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={handleSaveUsername}
                  disabled={savingUsername || !customUsernameInput.trim() || customUsernameInput.trim() === user.username}
                  style={{
                    padding: "10px 18px", borderRadius: 10, border: "none",
                    background: customUsernameInput.trim() && customUsernameInput.trim() !== user.username ? "linear-gradient(135deg, #6c63ff, #ef476f)" : "rgba(255,255,255,0.05)",
                    color: customUsernameInput.trim() && customUsernameInput.trim() !== user.username ? "#fff" : "#666",
                    fontSize: 13, fontWeight: 700, cursor: customUsernameInput.trim() && customUsernameInput.trim() !== user.username ? "pointer" : "not-allowed",
                  }}
                >{savingUsername ? "..." : "Save"}</button>
              </div>
            </div>
          )}

          {isPurchased("custom_avatar") && (
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Premium Avatars</div>
              {user.custom_avatar && (
                <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>Current: <span style={{ fontSize: 20 }}>{user.custom_avatar}</span></div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                {PREMIUM_AVATARS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handlePickAvatar(emoji)}
                    style={{
                      padding: 10, borderRadius: 12, border: user.custom_avatar === emoji
                        ? "2px solid #6c63ff" : "1px solid rgba(255,255,255,0.08)",
                      background: user.custom_avatar === emoji
                        ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.03)",
                      cursor: "pointer", fontSize: 24, textAlign: "center",
                    }}
                  >{emoji}</button>
                ))}
              </div>
            </div>
          )}

          {purchased.length > 0 && (
            <div style={{ ...cardStyle }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{"\u2728"} My Upgrades</div>
              {purchased.map(item => (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                    {item.purchased_at && (
                      <div style={{ fontSize: 11, color: "#666" }}>Purchased {new Date(item.purchased_at).toLocaleDateString()}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "#52b788", fontWeight: 600 }}>Owned</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ==================== PROFILE VIEW ==================== */

function WalletView({ user, bets, showToast, coinStatus, coinCenterLoading, referralInfo, referralInput, setReferralInput, handleClaimDaily, handleClaimWeekly, handleApplyReferral, onLogout }) {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 900, padding: "12px 4px 8px" }}><CoinIcon size={20} /> Your Coins</h2>
      <div style={{
        padding: "20px", borderRadius: 12,
        background: "linear-gradient(135deg, rgba(82,183,136,0.08), rgba(45,106,79,0.08))",
        border: "1px solid rgba(82,183,136,0.15)", marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Available Balance</div>
        <div style={{
          fontSize: 36, fontWeight: 900, fontFamily: "'Space Mono', monospace",
          background: "linear-gradient(90deg, #52b788, #6c63ff, #52b788)",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          animation: "shimmer 3s linear infinite",
        }}>{formatCoins(user.coins || 0)}</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { val: formatCoins(bets.filter(b => b.escrow?.deposits?.[user.id] && b.status !== "settled").reduce((s, b) => s + (b.escrow.deposits[user.id] || 0), 0)), label: "Staked", color: "#f2cc8f" },
          { val: bets.filter(b => b.escrow?.deposits?.[user.id] && b.status !== "settled").length, label: "Active Bets", color: "#6c63ff" },
          { val: formatCoins(bets.filter(b => b.escrow?.payoutTo?.includes(user.id)).reduce((s, b) => s + (b.escrow.perWinner || 0), 0)), label: "Total Won", color: "#52b788" },
        ].map((item, i) => (
          <div key={i} style={{ flex: 1, padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.val}</div>
            <div style={{ fontSize: 10, color: "#888" }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Coin Center</div>
      {coinCenterLoading ? (
        <div style={{ textAlign: "center", padding: 16, color: "#666", fontSize: 13 }}>Loading...</div>
      ) : coinStatus ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {coinStatus.canClaimDaily ? (
              <button className="chunky-btn" onClick={handleClaimDaily} style={{
                flex: 1, padding: "12px", borderRadius: 16,
                background: "linear-gradient(135deg, rgba(82,183,136,0.2), rgba(82,183,136,0.1))", border: "2px solid rgba(82,183,136,0.3)",
                color: "#52b788", cursor: "pointer", fontSize: 13, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                boxShadow: "0 3px 0 rgba(82,183,136,0.15)", animation: "pulse 2s ease-in-out infinite",
              }}><CoinIcon size={13} /> Claim 5 coins</button>
            ) : (
              <div style={{
                flex: 1, padding: "12px", borderRadius: 10,
                background: "rgba(255,255,255,0.03)", border: "3px solid rgba(255,255,255,0.08)",
                color: "#555", fontSize: 13, fontWeight: 600, textAlign: "center",
              }}>Claimed today {"\u2713"}</div>
            )}
            {coinStatus.canClaimWeekly ? (
              <button className="chunky-btn" onClick={handleClaimWeekly} style={{
                flex: 1, padding: "12px", borderRadius: 16,
                background: "linear-gradient(135deg, rgba(82,183,136,0.2), rgba(82,183,136,0.1))", border: "2px solid rgba(82,183,136,0.3)",
                color: "#52b788", cursor: "pointer", fontSize: 13, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                boxShadow: "0 3px 0 rgba(82,183,136,0.15)", animation: "pulse 2s ease-in-out infinite 0.5s",
              }}><CoinIcon size={13} /> Claim 20 coins</button>
            ) : (
              <div style={{
                flex: 1, padding: "12px", borderRadius: 10,
                background: "rgba(255,255,255,0.03)", border: "3px solid rgba(255,255,255,0.08)",
                color: "#555", fontSize: 13, fontWeight: 600, textAlign: "center",
              }}>Claimed this week {"\u2713"}</div>
            )}
          </div>

          {referralInfo && (
            <div style={{
              padding: "12px", borderRadius: 10,
              background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.15)",
            }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>Your Referral Code ({referralInfo.referralCount} referrals, {referralInfo.totalEarned} earned)</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <div style={{
                  flex: 1, padding: "8px 10px", borderRadius: 8,
                  background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#a5a0ff", fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace",
                  letterSpacing: 1,
                }}>{referralInfo.code}</div>
                <button onClick={() => { navigator.clipboard.writeText(referralInfo.code); showToast("Referral code copied!"); }} style={{
                  padding: "8px 14px", borderRadius: 8,
                  background: "rgba(108,99,255,0.15)", border: "1px solid rgba(108,99,255,0.3)",
                  color: "#a5a0ff", cursor: "pointer", fontSize: 13, fontWeight: 600,
                }}>Copy</button>
              </div>
              {!coinStatus.hasUsedReferral && (
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={referralInput}
                    onChange={e => setReferralInput(e.target.value)}
                    placeholder="Enter a referral code..."
                    style={{
                      flex: 1, padding: "8px 10px", borderRadius: 8,
                      background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit",
                    }}
                  />
                  <button onClick={handleApplyReferral} style={{
                    padding: "8px 14px", borderRadius: 8,
                    background: "rgba(82,183,136,0.15)", border: "1px solid rgba(82,183,136,0.3)",
                    color: "#52b788", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  }}>Apply</button>
                </div>
              )}
            </div>
          )}

          {coinStatus.recentTransactions && coinStatus.recentTransactions.length > 0 && (
            <div style={{
              padding: "12px", borderRadius: 10,
              background: "rgba(255,255,255,0.02)", border: "3px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>Recent Activity</div>
              {coinStatus.recentTransactions.slice(0, 10).map((tx, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 0", borderBottom: i < Math.min(coinStatus.recentTransactions.length, 10) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.description}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>{new Date(tx.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace",
                    color: tx.amount > 0 ? "#52b788" : "#ef476f", marginLeft: 8, flexShrink: 0,
                    display: "flex", alignItems: "center", gap: 3,
                  }}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount} <CoinIcon size={12} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <button onClick={onLogout} style={{
          width: "100%", padding: "12px 16px", borderRadius: 10,
          background: "rgba(239,71,111,0.1)", border: "1px solid rgba(239,71,111,0.2)",
          color: "#ef476f", cursor: "pointer", fontSize: 14, fontWeight: 600,
        }}>Logout</button>
      </div>
    </div>
  );
}

function ProfileView({ user, bets, onLogout }) {
  const winRate = (user.wins || 0) + (user.losses || 0) > 0
    ? Math.round(((user.wins || 0) / ((user.wins || 0) + (user.losses || 0))) * 100) : 0;
  const myId = user.id;
  const myBets = bets.filter(b => {
    if (b.creator_id === myId || b.creator?.id === myId) return true;
    const allP = [...(b.sides?.for || []), ...(b.sides?.against || [])];
    return allP.some(p => p.id === myId);
  });
  const catCounts = {};
  myBets.forEach(b => { catCounts[b.category] = (catCounts[b.category] || 0) + 1; });
  const totalEscrowed = myBets.filter(b => b.escrow?.deposits?.[myId] && b.status !== "settled")
    .reduce((s, b) => s + (b.escrow.deposits[myId] || 0), 0);

  return (
    <div style={{ animation: "slideUp 0.3s ease" }}>
      <div style={{
        textAlign: "center", padding: "24px 16px",
        background: "linear-gradient(135deg, rgba(108,99,255,0.1), rgba(239,71,111,0.05))",
        borderRadius: 24, marginBottom: 16, border: "1px solid rgba(108,99,255,0.1)",
      }}>
        <Avatar user={user} size={64} />
        <h2 style={{ fontSize: 24, fontWeight: 900, marginTop: 10 }}>{user.custom_name || user.name}</h2>
        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>@{user.username || user.name}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16 }}>
          {[
            { val: user.wins || 0, label: "Wins", color: "#6c63ff" },
            { val: user.losses || 0, label: "Losses", color: "#ef476f" },
            { val: `${winRate}%`, label: "Win Rate", color: "#52b788" },
            { val: user.streak || 0, label: "Streak", color: "#f2cc8f" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 16, borderRadius: 24, marginBottom: 16, background: "linear-gradient(135deg, rgba(82,183,136,0.04), rgba(45,106,79,0.04))", border: "1px solid rgba(82,183,136,0.1)" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}><CoinIcon size={16} /> Coins Summary</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { val: formatCoins(user.coins || 0), label: "Coins", color: "#52b788" },
            { val: formatCoins(totalEscrowed), label: "Staked", color: "#f2cc8f" },
            { val: formatCoins((user.coins || 0) + totalEscrowed), label: "Net Worth", color: "#a5a0ff" },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.2)", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: "'Space Mono', monospace" }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "#888" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 16, borderRadius: 24, marginBottom: 16, background: "rgba(255,255,255,0.03)", border: "3px solid rgba(255,255,255,0.08)" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffd166" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/></svg> Earned Badges</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(user.badges || ["closer", "streak", "social"]).map(b => {
            const badge = BADGES[b];
            return badge ? <Badge key={b} badge={badge} /> : null;
          })}
        </div>
      </div>

      <div style={{ padding: 16, borderRadius: 24, marginBottom: 16, background: "rgba(255,255,255,0.03)", border: "3px solid rgba(255,255,255,0.08)" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> Game Style</h3>
        {Object.entries(catCounts).map(([catId, count]) => {
          const cat = BET_CATEGORIES.find(c => c.id === catId);
          if (!cat) return null;
          return (
            <div key={catId} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{cat.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>{cat.label}</div>
                <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{ width: `${(count / myBets.length) * 100}%`, height: "100%", background: cat.color, borderRadius: 2 }} />
                </div>
              </div>
              <span style={{ fontSize: 12, color: "#888" }}>{count}</span>
            </div>
          );
        })}
        {Object.keys(catCounts).length === 0 && (
          <div style={{ color: "#888", fontSize: 13, textAlign: "center", padding: 12 }}>No games yet</div>
        )}
      </div>

      <button onClick={onLogout} style={{
        width: "100%", padding: 14, borderRadius: 12,
        border: "1px solid rgba(239,71,111,0.3)", background: "rgba(239,71,111,0.08)",
        color: "#ef476f", fontSize: 15, fontWeight: 700, cursor: "pointer",
      }}>Logout</button>
    </div>
  );
}

/* ==================== CREATE BET MODAL ==================== */

function CreateBetModal({ onClose, onCreate, user, showToast }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("golf");
  const [wagerAmount, setWagerAmount] = useState("");
  const [opponentSearch, setOpponentSearch] = useState("");
  const [opponentResults, setOpponentResults] = useState([]);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [refereeSearch, setRefereeSearch] = useState("");
  const [refereeResults, setRefereeResults] = useState([]);
  const [selectedReferee, setSelectedReferee] = useState(null);
  const [deadline, setDeadline] = useState("2026-03-25T23:59");
  const [isGroup, setIsGroup] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  const amount = parseFloat(wagerAmount) || 0;
  const canAfford = (user.coins || 0) >= amount;
  const fee = +(amount * 2 * PLATFORM_FEE).toFixed(2);
  const valid = title.trim() && amount > 0 && canAfford && selectedOpponent;

  const searchUsers = async (query, setter) => {
    if (!query.trim()) { setter([]); return; }
    try {
      const results = await fetchUsers(query.trim());
      setter(results.filter(u => u.id !== user.id));
    } catch {
      setter([]);
    }
  };

  const handleCreate = async () => {
    if (!valid || creating) return;
    setCreating(true);
    try {
      await onCreate({
        title, category, stakes: `${amount} coins per person`, stakeType: "coins", wagerAmount: amount,
        opponentId: selectedOpponent.id, refereeId: selectedReferee?.id || null,
        deadline: deadline.includes("T") ? `${deadline}:00` : `${deadline}T23:59:00`, isGroup, isPrivate,
      });
    } catch {
      // error handled in parent
    } finally {
      setCreating(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.3)", color: "#fff", outline: "none",
  };
  const labelStyle = { fontSize: 12, color: "#888", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "overlayFadeIn 0.25s ease both", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto",
        background: "#12121a", borderRadius: "28px 28px 0 0", padding: 28,
        animation: "modalBounceUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900 }}>New Game</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: 4 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        <label style={labelStyle}>Category</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {BET_CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)} style={{
              padding: "8px 14px", borderRadius: 10, border: "1px solid",
              borderColor: category === c.id ? c.color : "rgba(255,255,255,0.08)",
              background: category === c.id ? `${c.color}22` : "transparent",
              color: category === c.id ? c.color : "#888", cursor: "pointer", fontSize: 13,
              display: "flex", alignItems: "center", gap: 6,
            }}>{c.icon} {c.label}</button>
          ))}
        </div>

        <label style={labelStyle}>What's the game?</label>
        {(() => { const cat = BET_CATEGORIES.find(c => c.id === category); return cat?.examples ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {cat.examples.slice(0, 3).map((ex, i) => (
              <button key={i} onClick={() => setTitle(ex)} style={{
                padding: "6px 10px", borderRadius: 8, fontSize: 11,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#999", cursor: "pointer", textAlign: "left",
              }}>{ex}</button>
            ))}
          </div>
        ) : null; })()}
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder={(() => { const cat = BET_CATEGORIES.find(c => c.id === category); return cat?.examples?.[0] ? `e.g., "${cat.examples[0]}"` : 'e.g., "Jake can\'t break 90"'; })()}
          style={{ ...inputStyle, fontSize: 16, marginBottom: 16 }} />

        <label style={labelStyle}>Wager (coins per person)</label>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}><CoinIcon size={18} /></span>
          <input value={wagerAmount} onChange={e => setWagerAmount(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="0" style={{ ...inputStyle, paddingLeft: 38, fontSize: 18, fontWeight: 700 }} />
        </div>

        {amount > 0 && (
          <div style={{
            padding: "10px 12px", borderRadius: 10, marginBottom: 16,
            background: canAfford ? "rgba(82,183,136,0.06)" : "rgba(239,71,111,0.06)",
            border: `1px solid ${canAfford ? "rgba(82,183,136,0.12)" : "rgba(239,71,111,0.15)"}`,
          }}>
            {canAfford ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {[
                  { label: "Your stake", val: formatCoins(amount), color: "#52b788" },
                  { label: "Est. total pool (2 players)", val: formatCoins(amount * 2), color: "#ccc" },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#888" }}>{r.label}</span>
                    <span style={{ color: r.color, fontFamily: "'Space Mono', monospace" }}>{r.val}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 4, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#888" }}>Winner receives</span>
                  <span style={{ color: "#52b788", fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{formatCoins(amount * 2)}</span>
                </div>
                <div style={{ color: "#666", marginTop: 2, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><CoinIcon size={11} /> Coins after stake: {formatCoins((user.coins || 0) - amount)}</div>
              </div>
            ) : (
              <div style={{ color: "#ef476f", fontWeight: 600 }}>{"\u26A0\uFE0F"} Not enough coins. You have {formatCoins(user.coins || 0)}</div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Opponent</label>
            <input
              value={selectedOpponent ? selectedOpponent.name : opponentSearch}
              onChange={e => {
                setOpponentSearch(e.target.value);
                setSelectedOpponent(null);
                searchUsers(e.target.value, setOpponentResults);
              }}
              placeholder="Search user..."
              style={inputStyle}
            />
            {opponentResults.length > 0 && !selectedOpponent && (
              <div style={{ maxHeight: 120, overflowY: "auto", marginTop: 4, borderRadius: 8, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {opponentResults.map(u => (
                  <div key={u.id} onClick={() => { setSelectedOpponent(u); setOpponentResults([]); setOpponentSearch(u.name); }}
                    style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <Avatar user={u} size={20} /> {u.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Referee (optional)</label>
            <input
              value={selectedReferee ? selectedReferee.name : refereeSearch}
              onChange={e => {
                setRefereeSearch(e.target.value);
                setSelectedReferee(null);
                searchUsers(e.target.value, setRefereeResults);
              }}
              placeholder="Search user..."
              style={inputStyle}
            />
            {refereeResults.length > 0 && !selectedReferee && (
              <div style={{ maxHeight: 120, overflowY: "auto", marginTop: 4, borderRadius: 8, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {refereeResults.map(u => (
                  <div key={u.id} onClick={() => { setSelectedReferee(u); setRefereeResults([]); setRefereeSearch(u.name); }}
                    style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <Avatar user={u} size={20} /> {u.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <label style={labelStyle}>Deadline</label>
        <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ ...inputStyle, marginBottom: 16, colorScheme: "dark", fontSize: 16 }} />

        <div onClick={() => setIsGroup(!isGroup)} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
          borderRadius: 10, background: "rgba(255,255,255,0.03)", cursor: "pointer",
          border: "3px solid rgba(255,255,255,0.08)", marginBottom: 20,
        }}>
          <div style={{ width: 36, height: 20, borderRadius: 10, padding: 2, background: isGroup ? "#6c63ff" : "rgba(255,255,255,0.1)", transition: "background 0.2s" }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", transform: isGroup ? "translateX(16px)" : "translateX(0)", transition: "transform 0.2s" }} />
          </div>
          <span style={{ fontSize: 13 }}>Allow others to join sides (Group Game)</span>
        </div>

        <div onClick={() => setIsPrivate(!isPrivate)} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
          borderRadius: 10, background: "rgba(255,255,255,0.03)", cursor: "pointer",
          border: "3px solid rgba(255,255,255,0.08)", marginBottom: 20,
        }}>
          <div style={{ width: 36, height: 20, borderRadius: 10, padding: 2, background: isPrivate ? "#ef476f" : "rgba(255,255,255,0.1)", transition: "background 0.2s" }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", transform: isPrivate ? "translateX(16px)" : "translateX(0)", transition: "transform 0.2s" }} />
          </div>
          <span style={{ fontSize: 13 }}>Private game (hidden from friends' feeds)</span>
        </div>

        <button onClick={handleCreate} disabled={creating} style={{
          width: "100%", padding: 14, borderRadius: 12, border: "none",
          background: valid ? "linear-gradient(135deg, #6c63ff, #ef476f)" : "rgba(255,255,255,0.05)",
          color: valid ? "#fff" : "#666", fontSize: 16, fontWeight: 700,
          cursor: valid ? "pointer" : "not-allowed",
          boxShadow: valid ? "0 4px 20px rgba(108,99,255,0.3)" : "none",
        }}>
          {creating ? "Creating..." : valid ? `Create Game & Deposit ${formatCoins(amount)}` : "Create Game"}
        </button>
        {valid && (
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#888" }}>
            Your {formatCoins(amount)} will be locked in until the game is settled
          </div>
        )}
      </div>
    </div>
  );
}
