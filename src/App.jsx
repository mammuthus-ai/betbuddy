import { useState, useEffect, useRef } from "react";

const MOCK_USERS = [
  { id: "u1", name: "You", avatar: "😎", wins: 12, losses: 5, streak: 3, wallet: 250.00 },
  { id: "u2", name: "Jake", avatar: "🏌️", wins: 9, losses: 8, streak: 0, wallet: 180.00 },
  { id: "u3", name: "Sarah", avatar: "🔥", wins: 15, losses: 3, streak: 7, wallet: 420.00 },
  { id: "u4", name: "Mike", avatar: "💪", wins: 6, losses: 10, streak: 0, wallet: 95.00 },
  { id: "u5", name: "Emma", avatar: "🎯", wins: 11, losses: 4, streak: 2, wallet: 310.00 },
  { id: "u6", name: "Chris", avatar: "🏀", wins: 8, losses: 7, streak: 1, wallet: 155.00 },
];

const PLATFORM_FEE = 0.01;

const BADGES = {
  closer: { icon: "🏆", name: "The Closer", desc: "Won 5+ bets in clutch moments" },
  bigmouth: { icon: "📣", name: "Big Mouth", desc: "Created 20+ bets" },
  underdog: { icon: "🐕", name: "Underdog", desc: "Won 3+ bets as underdog" },
  streak: { icon: "🔥", name: "On Fire", desc: "Won 5+ bets in a row" },
  social: { icon: "🤝", name: "Social Butterfly", desc: "Joined 10+ group bets" },
  referee: { icon: "⚖️", name: "Fair Judge", desc: "Refereed 5+ bets" },
};

const BET_CATEGORIES = [
  { id: "golf", icon: "⛳", label: "Golf", color: "#2d6a4f" },
  { id: "fitness", icon: "💪", label: "Fitness", color: "#e07a5f" },
  { id: "food", icon: "🍔", label: "Food & Drink", color: "#f2cc8f" },
  { id: "games", icon: "🎮", label: "Games", color: "#6c63ff" },
  { id: "promises", icon: "🤞", label: "Promises", color: "#ef476f" },
  { id: "other", icon: "🎲", label: "Other", color: "#118ab2" },
];

const INITIAL_BETS = [
  {
    id: "b1", title: "Jake breaks 90 this Saturday", category: "golf",
    creator: "u1", opponent: "u2", referee: "u3",
    stakes: "$50 per person", stakeType: "money", wagerAmount: 50,
    status: "active", deadline: "2026-03-22T14:00:00",
    sides: { for: ["u1", "u5"], against: ["u2", "u4"] },
    escrow: {
      totalPool: 200, platformFee: 2.00, netPayout: 198.00,
      deposits: { u1: 50, u5: 50, u2: 50, u4: 50 },
      fundedAt: "2026-03-18T11:00:00", status: "funded",
    },
    comments: [
      { user: "u1", text: "No chance Jake breaks 90 with that slice 😂", time: "2h ago" },
      { user: "u2", text: "Watch me. I've been at the range all week", time: "1h ago" },
      { user: "u3", text: "I'll believe it when I see the scorecard 📸", time: "30m ago" },
    ],
    isGroup: true, createdAt: "2026-03-18T10:00:00",
  },
  {
    id: "b2", title: "Sarah runs a sub-25 min 5K", category: "fitness",
    creator: "u3", opponent: "u1", referee: "u6",
    stakes: "$20 each", stakeType: "money", wagerAmount: 20,
    status: "active", deadline: "2026-03-25T08:00:00",
    sides: { for: ["u3", "u6"], against: ["u1"] },
    escrow: {
      totalPool: 60, platformFee: 0.60, netPayout: 59.40,
      deposits: { u3: 20, u6: 20, u1: 20 },
      fundedAt: "2026-03-17T16:00:00", status: "funded",
    },
    comments: [
      { user: "u3", text: "Easy money 💰", time: "5h ago" },
      { user: "u1", text: "Your last time was 26:30... just saying", time: "4h ago" },
    ],
    isGroup: false, createdAt: "2026-03-17T15:00:00",
  },
  {
    id: "b3", title: "Mike finishes Elden Ring DLC this week", category: "games",
    creator: "u4", opponent: "u6", referee: "u5",
    stakes: "$25 per person", stakeType: "money", wagerAmount: 25,
    status: "awaiting_funds", deadline: "2026-03-24T23:59:00",
    sides: { for: ["u4"], against: ["u6", "u1", "u5"] },
    escrow: {
      totalPool: 0, platformFee: 0, netPayout: 0,
      deposits: { u4: 25, u6: 25 },
      fundedAt: null, status: "partial",
    },
    comments: [
      { user: "u6", text: "Bro you've been stuck on the same boss for 3 days 💀", time: "3h ago" },
      { user: "u4", text: "Tonight's the night. I can feel it.", time: "1h ago" },
    ],
    isGroup: true, createdAt: "2026-03-19T09:00:00",
  },
  {
    id: "b4", title: "Emma cooks a full Thanksgiving dinner solo", category: "food",
    creator: "u5", opponent: "u1", referee: "u3",
    stakes: "$30 each", stakeType: "money", wagerAmount: 30,
    status: "settled", winner: "for", deadline: "2026-03-15T18:00:00",
    sides: { for: ["u5"], against: ["u1", "u2"] },
    escrow: {
      totalPool: 90, platformFee: 0.90, netPayout: 89.10,
      deposits: { u5: 30, u1: 30, u2: 30 },
      fundedAt: "2026-03-10T13:00:00", status: "settled",
      settledAt: "2026-03-15T19:00:00", winnerPayout: 89.10,
      payoutTo: ["u5"], perWinner: 89.10,
    },
    comments: [
      { user: "u5", text: "Turkey was PERFECT. Photo proof incoming 🍗", time: "5d ago" },
      { user: "u1", text: "...respect. That gravy was insane.", time: "5d ago" },
    ],
    isGroup: true, createdAt: "2026-03-10T12:00:00",
  },
  {
    id: "b5", title: "Chris does 100 pushups without stopping", category: "fitness",
    creator: "u6", opponent: "u4", referee: "u2",
    stakes: "$15 each", stakeType: "money", wagerAmount: 15,
    status: "disputed", deadline: "2026-03-20T12:00:00",
    sides: { for: ["u6"], against: ["u4", "u2"] },
    escrow: {
      totalPool: 45, platformFee: 0.45, netPayout: 44.55,
      deposits: { u6: 15, u4: 15, u2: 15 },
      fundedAt: "2026-03-19T09:00:00", status: "held",
    },
    comments: [
      { user: "u6", text: "Done! Video proof right here 💪", time: "6h ago" },
      { user: "u4", text: "Bro those last 10 were NOT full pushups", time: "5h ago" },
      { user: "u2", text: "As referee... I need to review the tape 🧐", time: "2h ago" },
    ],
    isGroup: true, createdAt: "2026-03-19T08:00:00",
  },
];

const Avatar = ({ user, size = 36 }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    background: "linear-gradient(135deg, #1a1a2e, #16213e)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.5, border: "2px solid rgba(255,255,255,0.1)", flexShrink: 0,
  }}>{user.avatar}</div>
);

const Badge = ({ badge }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px",
    borderRadius: 20, background: "rgba(255,255,255,0.06)", fontSize: 12,
    border: "1px solid rgba(255,255,255,0.08)",
  }}>
    <span>{badge.icon}</span>
    <span style={{ color: "#ccc" }}>{badge.name}</span>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    active: { bg: "#2d6a4f22", color: "#52b788", label: "Active" },
    settled: { bg: "#6c63ff22", color: "#a5a0ff", label: "Settled" },
    disputed: { bg: "#ef476f22", color: "#ef476f", label: "Disputed" },
    pending: { bg: "#f2cc8f22", color: "#f2cc8f", label: "Pending" },
    awaiting_funds: { bg: "#f2cc8f22", color: "#f2cc8f", label: "Awaiting Funds" },
  };
  const s = styles[status] || styles.active;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, letterSpacing: 0.5, textTransform: "uppercase",
    }}>{s.label}</span>
  );
};

const EscrowBadge = ({ escrowStatus }) => {
  const styles = {
    funded: { bg: "#52b78822", color: "#52b788", icon: "🔒", label: "Escrow Funded" },
    partial: { bg: "#f2cc8f22", color: "#f2cc8f", icon: "⏳", label: "Partially Funded" },
    held: { bg: "#ef476f22", color: "#ef476f", icon: "⚠️", label: "Escrow Held" },
    settled: { bg: "#6c63ff22", color: "#a5a0ff", icon: "✅", label: "Paid Out" },
    none: { bg: "rgba(255,255,255,0.04)", color: "#666", icon: "💭", label: "No Escrow" },
  };
  const s = styles[escrowStatus] || styles.none;
  return (
    <span style={{
      padding: "3px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
      background: s.bg, color: s.color, display: "inline-flex", alignItems: "center", gap: 3,
    }}>{s.icon} {s.label}</span>
  );
};

const TimeLeft = ({ deadline }) => {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end - now;
  if (diff < 0) return <span style={{ color: "#ef476f", fontSize: 12 }}>Expired</span>;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return <span style={{ color: "#f2cc8f", fontSize: 12 }}>⏰ {days}d {hours % 24}h left</span>;
  return <span style={{ color: "#ef476f", fontSize: 12 }}>⏰ {hours}h left</span>;
};

const formatMoney = (n) => `$${Number(n).toFixed(2)}`;

export default function BetBuddy() {
  const [tab, setTab] = useState("feed");
  const [bets, setBets] = useState(INITIAL_BETS);
  const [users, setUsers] = useState(MOCK_USERS);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBet, setSelectedBet] = useState(null);
  const [showWallet, setShowWallet] = useState(false);
  const [platformRevenue, setPlatformRevenue] = useState(3.95);
  const [toast, setToast] = useState(null);

  const currentUser = users[0];

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const addBet = (bet) => {
    const deposits = {};
    deposits[bet.creator] = bet.wagerAmount;
    const newBet = {
      ...bet, id: `b${Date.now()}`, createdAt: new Date().toISOString(),
      comments: [], sides: { for: [bet.creator], against: [bet.opponent] },
      escrow: { totalPool: bet.wagerAmount, platformFee: 0, netPayout: 0, deposits, fundedAt: null, status: "partial" },
    };
    setUsers(prev => prev.map(u => u.id === bet.creator ? { ...u, wallet: u.wallet - bet.wagerAmount } : u));
    setBets(prev => [newBet, ...prev]);
    setShowCreate(false);
    showToast(`Bet created! ${formatMoney(bet.wagerAmount)} sent to escrow 🔒`);
  };

  const depositToEscrow = (betId) => {
    setBets(prev => prev.map(b => {
      if (b.id !== betId) return b;
      const escrow = { ...b.escrow, deposits: { ...b.escrow.deposits } };
      if (escrow.deposits["u1"]) return b;
      escrow.deposits["u1"] = b.wagerAmount;
      const totalDeposited = Object.values(escrow.deposits).reduce((s, v) => s + v, 0);
      const allParticipants = [...new Set([...b.sides.for, ...b.sides.against])];
      const allFunded = allParticipants.every(uid => escrow.deposits[uid]);
      if (allFunded) {
        escrow.totalPool = totalDeposited;
        escrow.platformFee = +(totalDeposited * PLATFORM_FEE).toFixed(2);
        escrow.netPayout = +(totalDeposited - escrow.platformFee).toFixed(2);
        escrow.fundedAt = new Date().toISOString();
        escrow.status = "funded";
      } else {
        escrow.totalPool = totalDeposited;
        escrow.status = "partial";
      }
      return { ...b, escrow, status: allFunded ? "active" : "awaiting_funds" };
    }));
    const bet = bets.find(b => b.id === betId);
    if (bet) {
      setUsers(prev => prev.map(u => u.id === "u1" ? { ...u, wallet: u.wallet - bet.wagerAmount } : u));
      showToast(`${formatMoney(bet.wagerAmount)} deposited to escrow 🔒`);
    }
  };

  const settleBet = (betId, winningSide) => {
    setBets(prev => prev.map(b => {
      if (b.id !== betId) return b;
      const escrow = { ...b.escrow };
      const winners = b.sides[winningSide];
      const perWinner = +(escrow.netPayout / winners.length).toFixed(2);
      escrow.status = "settled";
      escrow.settledAt = new Date().toISOString();
      escrow.winnerPayout = escrow.netPayout;
      escrow.payoutTo = winners;
      escrow.perWinner = perWinner;
      setUsers(prev => prev.map(u => winners.includes(u.id) ? { ...u, wallet: u.wallet + perWinner } : u));
      setPlatformRevenue(prev => +(prev + escrow.platformFee).toFixed(2));
      return { ...b, status: "settled", winner: winningSide, escrow };
    }));
    showToast("Bet settled! Funds distributed (1% fee applied) 💰");
  };

  const addComment = (betId, text) => {
    setBets(prev => prev.map(b =>
      b.id === betId ? { ...b, comments: [...b.comments, { user: "u1", text, time: "Just now" }] } : b
    ));
  };

  const joinSide = (betId, side) => {
    setBets(prev => prev.map(b => {
      if (b.id !== betId) return b;
      const otherSide = side === "for" ? "against" : "for";
      return {
        ...b,
        sides: {
          [side]: b.sides[side].includes("u1") ? b.sides[side] : [...b.sides[side], "u1"],
          [otherSide]: b.sides[otherSide].filter(id => id !== "u1"),
        }
      };
    }));
  };

  useEffect(() => {
    if (selectedBet) {
      const updated = bets.find(b => b.id === selectedBet.id);
      if (updated) setSelectedBet(updated);
    }
  }, [bets]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif", color: "#fff" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 8px rgba(82,183,136,0.3); } 50% { box-shadow: 0 0 20px rgba(82,183,136,0.6); } }
        input, textarea, select { font-family: inherit; }
      `}</style>

      {toast && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid rgba(108,99,255,0.3)",
          padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 500,
          zIndex: 500, animation: "slideUp 0.3s ease", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>{toast}</div>
      )}

      <header style={{
        padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(180deg, rgba(108,99,255,0.08) 0%, transparent 100%)",
        position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            fontSize: 28, lineHeight: 1,
            background: "linear-gradient(135deg, #6c63ff, #ef476f)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            fontFamily: "'Space Mono', monospace", fontWeight: 700,
          }}>BB</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>BetBuddy</div>
            <div style={{ fontSize: 10, color: "#666", letterSpacing: 1, textTransform: "uppercase" }}>Put your money where your mouth is</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setShowWallet(!showWallet)} style={{
            padding: "6px 12px", borderRadius: 20,
            background: "linear-gradient(135deg, #52b78822, #2d6a4f22)",
            border: "1px solid rgba(82,183,136,0.2)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5, color: "#52b788",
          }}>💳 {formatMoney(currentUser.wallet)}</button>
          <div style={{
            padding: "6px 12px", borderRadius: 20,
            background: "linear-gradient(135deg, #6c63ff22, #ef476f22)",
            fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
          }}>
            <span>🔥</span><span style={{ color: "#ef476f" }}>{currentUser.streak}</span>
          </div>
          <Avatar user={currentUser} size={32} />
        </div>
      </header>

      {showWallet && (
        <div style={{
          position: "sticky", top: 65, zIndex: 99,
          background: "linear-gradient(135deg, #12121a, #0e0e18)",
          borderBottom: "1px solid rgba(82,183,136,0.15)",
          padding: "16px 20px", animation: "slideUp 0.2s ease",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>💳 Your Wallet</h3>
            <button onClick={() => setShowWallet(false)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>
          <div style={{
            padding: "16px", borderRadius: 12,
            background: "linear-gradient(135deg, rgba(82,183,136,0.08), rgba(45,106,79,0.08))",
            border: "1px solid rgba(82,183,136,0.15)", marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Available Balance</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#52b788", fontFamily: "'Space Mono', monospace" }}>{formatMoney(currentUser.wallet)}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { val: formatMoney(bets.filter(b => b.escrow?.deposits?.u1 && b.status !== "settled").reduce((s, b) => s + (b.escrow.deposits.u1 || 0), 0)), label: "In Escrow", color: "#f2cc8f" },
              { val: bets.filter(b => b.escrow?.deposits?.u1 && b.status !== "settled").length, label: "Active Bets", color: "#6c63ff" },
              { val: formatMoney(bets.filter(b => b.escrow?.payoutTo?.includes("u1")).reduce((s, b) => s + (b.escrow.perWinner || 0), 0)), label: "Total Won", color: "#52b788" },
            ].map((item, i) => (
              <div key={i} style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.val}</div>
                <div style={{ fontSize: 10, color: "#888" }}>{item.label}</div>
              </div>
            ))}
          </div>
          <button onClick={() => showToast("Add funds via Settings → Payment Methods")} style={{
            width: "100%", marginTop: 12, padding: "10px", borderRadius: 10,
            background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)",
            color: "#52b788", cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}>+ Add Funds</button>
        </div>
      )}

      <nav style={{
        display: "flex", padding: "0 12px", gap: 4,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.3)", position: "sticky", top: 65, zIndex: 98,
      }}>
        {[
          { id: "feed", icon: "📡", label: "Feed" },
          { id: "mybets", icon: "🎯", label: "My Bets" },
          { id: "leaderboard", icon: "🏆", label: "Board" },
          { id: "profile", icon: "👤", label: "Profile" },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelectedBet(null); }} style={{
            flex: 1, padding: "12px 8px", background: "none", border: "none",
            color: tab === t.id ? "#6c63ff" : "#666", cursor: "pointer",
            borderBottom: tab === t.id ? "2px solid #6c63ff" : "2px solid transparent",
            fontSize: 12, fontWeight: tab === t.id ? 600 : 400,
            transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "12px 12px 100px" }}>
        {selectedBet ? (
          <BetDetail bet={selectedBet} users={users} onBack={() => setSelectedBet(null)}
            onComment={addComment} onJoin={joinSide} onDeposit={depositToEscrow} onSettle={settleBet} />
        ) : tab === "feed" ? (
          <FeedView bets={bets} users={users} onSelect={setSelectedBet} onJoin={joinSide} />
        ) : tab === "mybets" ? (
          <MyBetsView bets={bets} users={users} onSelect={setSelectedBet} currentUser={currentUser} />
        ) : tab === "leaderboard" ? (
          <LeaderboardView users={users} />
        ) : (
          <ProfileView user={currentUser} bets={bets} />
        )}
      </main>

      {!selectedBet && (
        <button onClick={() => setShowCreate(true)} style={{
          position: "fixed", bottom: 24, right: 24, width: 56, height: 56,
          borderRadius: "50%", border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #6c63ff, #ef476f)",
          color: "#fff", fontSize: 28, fontWeight: 300,
          boxShadow: "0 4px 24px rgba(108,99,255,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.2s", zIndex: 200,
        }}
        onMouseEnter={e => e.target.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.target.style.transform = "scale(1)"}
        >+</button>
      )}

      {showCreate && <CreateBetModal onClose={() => setShowCreate(false)} onCreate={addBet} users={users} currentUser={currentUser} />}
    </div>
  );
}

function FeedView({ bets, users, onSelect, onJoin }) {
  const activeBets = bets.filter(b => b.status !== "settled");
  return (
    <div>
      <div style={{ padding: "12px 4px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Live Bets</h2>
        <span style={{ fontSize: 12, color: "#666" }}>{activeBets.length} active</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {bets.map((bet, i) => (
          <BetCard key={bet.id} bet={bet} users={users} onClick={() => onSelect(bet)} onJoin={onJoin} delay={i * 80} />
        ))}
      </div>
    </div>
  );
}

function BetCard({ bet, users, onClick, onJoin, delay = 0 }) {
  const getUser = id => users.find(u => u.id === id) || users[0];
  const creator = getUser(bet.creator);
  const cat = BET_CATEGORIES.find(c => c.id === bet.category) || BET_CATEGORIES[5];
  const totalFor = bet.sides.for.length;
  const totalAgainst = bet.sides.against.length;
  const total = totalFor + totalAgainst || 1;

  return (
    <div onClick={onClick} style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
      borderRadius: 16, padding: 16, cursor: "pointer",
      border: "1px solid rgba(255,255,255,0.06)",
      transition: "all 0.25s", animation: `slideUp 0.4s ease ${delay}ms both`,
      position: "relative", overflow: "hidden",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(108,99,255,0.3)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: cat.color }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar user={creator} size={28} />
          <span style={{ fontSize: 12, color: "#888" }}>{creator.name}</span>
          <span style={{ fontSize: 14 }}>{cat.icon}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <StatusBadge status={bet.status} />
          {bet.escrow && <EscrowBadge escrowStatus={bet.escrow.status} />}
        </div>
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, lineHeight: 1.3, paddingRight: 8 }}>{bet.title}</h3>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
        padding: "6px 10px", borderRadius: 8, background: "rgba(0,0,0,0.3)", fontSize: 12,
      }}>
        <span>💰</span><span style={{ color: "#ccc" }}>{bet.stakes}</span>
        <span style={{ marginLeft: "auto" }}><TimeLeft deadline={bet.deadline} /></span>
      </div>

      {bet.escrow && (
        <div style={{
          padding: "6px 10px", borderRadius: 8, marginBottom: 10,
          background: bet.escrow.status === "funded" ? "rgba(82,183,136,0.06)" : "rgba(242,204,143,0.06)",
          border: `1px solid ${bet.escrow.status === "funded" ? "rgba(82,183,136,0.12)" : "rgba(242,204,143,0.12)"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11,
        }}>
          <span style={{ color: "#888" }}>🔒 Escrow</span>
          <span style={{ fontWeight: 700, color: bet.escrow.status === "funded" || bet.escrow.status === "held" || bet.escrow.status === "settled" ? "#52b788" : "#f2cc8f" }}>
            {bet.escrow.status === "funded" || bet.escrow.status === "held" || bet.escrow.status === "settled"
              ? formatMoney(bet.escrow.totalPool)
              : `${Object.keys(bet.escrow.deposits).length}/${[...bet.sides.for, ...bet.sides.against].length} funded`
            }
          </span>
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
          <span>👍 {totalFor} for</span><span>👎 {totalAgainst} against</span>
        </div>
        <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
          <div style={{ width: `${(totalFor / total) * 100}%`, background: "#52b788", transition: "width 0.3s" }} />
          <div style={{ width: `${(totalAgainst / total) * 100}%`, background: "#ef476f", transition: "width 0.3s" }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {[...bet.sides.for, ...bet.sides.against].slice(0, 4).map((uid, i) => (
            <div key={uid} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 4 - i }}><Avatar user={getUser(uid)} size={22} /></div>
          ))}
          {bet.isGroup && <span style={{ fontSize: 11, color: "#666", marginLeft: 6 }}>Group</span>}
        </div>
        <div style={{ fontSize: 12, color: "#666" }}>💬 {bet.comments.length}</div>
      </div>
    </div>
  );
}

function BetDetail({ bet, users, onBack, onComment, onJoin, onDeposit, onSettle }) {
  const [comment, setComment] = useState("");
  const getUser = id => users.find(u => u.id === id) || users[0];
  const cat = BET_CATEGORIES.find(c => c.id === bet.category) || BET_CATEGORIES[5];
  const needsMyDeposit = bet.escrow && !bet.escrow.deposits["u1"] && [...bet.sides.for, ...bet.sides.against].includes("u1");
  const canAfford = users[0].wallet >= (bet.wagerAmount || 0);
  const handleComment = () => { if (!comment.trim()) return; onComment(bet.id, comment); setComment(""); };

  return (
    <div style={{ animation: "slideUp 0.3s ease" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#6c63ff", cursor: "pointer", fontSize: 14, marginBottom: 12, padding: 0 }}>← Back</button>
      <div style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", borderRadius: 16, padding: 20, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 24 }}>{cat.icon}</span>
          <StatusBadge status={bet.status} />
          {bet.escrow && <EscrowBadge escrowStatus={bet.escrow.status} />}
          <TimeLeft deadline={bet.deadline} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, lineHeight: 1.3 }}>{bet.title}</h2>
        <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 16, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Stakes</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>💰 {bet.stakes}</div>
        </div>

        {/* ESCROW SECTION */}
        {bet.escrow && (
          <div style={{ padding: 14, borderRadius: 12, marginBottom: 16, background: "linear-gradient(135deg, rgba(82,183,136,0.04), rgba(45,106,79,0.04))", border: "1px solid rgba(82,183,136,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>🔒</span>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "#52b788" }}>Escrow Account</h4>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[
                { val: formatMoney(bet.escrow.totalPool || Object.values(bet.escrow.deposits).reduce((s, v) => s + v, 0)), label: "Pool", color: "#52b788" },
                { val: formatMoney((bet.escrow.totalPool || Object.values(bet.escrow.deposits).reduce((s, v) => s + v, 0)) * PLATFORM_FEE), label: "Fee (1%)", color: "#f2cc8f" },
                { val: formatMoney(bet.escrow.netPayout || (Object.values(bet.escrow.deposits).reduce((s, v) => s + v, 0) * 0.99)), label: "Payout", color: "#a5a0ff" },
              ].map((item, i) => (
                <div key={i} style={{ flex: 1, padding: 8, borderRadius: 8, background: "rgba(0,0,0,0.2)", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.color, fontFamily: "'Space Mono', monospace" }}>{item.val}</div>
                  <div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Deposits</div>
            {[...bet.sides.for, ...bet.sides.against].map(uid => {
              const user = getUser(uid);
              const deposited = bet.escrow.deposits[uid];
              return (
                <div key={uid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                  <Avatar user={user} size={20} />
                  <span style={{ fontSize: 12, flex: 1 }}>{user.name}</span>
                  {deposited
                    ? <span style={{ fontSize: 11, color: "#52b788", fontWeight: 600 }}>✅ {formatMoney(deposited)}</span>
                    : <span style={{ fontSize: 11, color: "#f2cc8f", fontWeight: 600 }}>⏳ Pending</span>
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
                {canAfford ? `🔒 Deposit ${formatMoney(bet.wagerAmount)} to Escrow` : `Insufficient funds`}
              </button>
            )}
            {bet.escrow.status === "settled" && (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "rgba(108,99,255,0.08)" }}>
                <div style={{ color: "#a5a0ff", fontWeight: 600, marginBottom: 4 }}>✅ Settlement Complete</div>
                <div style={{ color: "#888" }}>
                  Winners ({bet.escrow.payoutTo.map(id => getUser(id).name).join(", ")}) each received {formatMoney(bet.escrow.perWinner)}
                </div>
                <div style={{ color: "#666", marginTop: 2 }}>Platform fee: {formatMoney(bet.escrow.platformFee)}</div>
              </div>
            )}
          </div>
        )}

        {/* Sides */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, padding: 12, borderRadius: 10, background: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.12)" }}>
            <div style={{ fontSize: 11, color: "#52b788", marginBottom: 8, fontWeight: 600 }}>👍 FOR</div>
            {bet.sides.for.map(uid => (
              <div key={uid} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Avatar user={getUser(uid)} size={20} /><span style={{ fontSize: 13 }}>{getUser(uid).name}</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, padding: 12, borderRadius: 10, background: "rgba(239,71,111,0.06)", border: "1px solid rgba(239,71,111,0.12)" }}>
            <div style={{ fontSize: 11, color: "#ef476f", marginBottom: 8, fontWeight: 600 }}>👎 AGAINST</div>
            {bet.sides.against.map(uid => (
              <div key={uid} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Avatar user={getUser(uid)} size={20} /><span style={{ fontSize: 13 }}>{getUser(uid).name}</span>
              </div>
            ))}
          </div>
        </div>

        {(bet.status === "active" || bet.status === "awaiting_funds") && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onJoin(bet.id, "for")} style={{
              flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(82,183,136,0.3)",
              background: bet.sides.for.includes("u1") ? "rgba(82,183,136,0.2)" : "transparent",
              color: "#52b788", cursor: "pointer", fontWeight: 600, fontSize: 13,
            }}>I'm For This ✅</button>
            <button onClick={() => onJoin(bet.id, "against")} style={{
              flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(239,71,111,0.3)",
              background: bet.sides.against.includes("u1") ? "rgba(239,71,111,0.2)" : "transparent",
              color: "#ef476f", cursor: "pointer", fontWeight: 600, fontSize: 13,
            }}>Against 🚫</button>
          </div>
        )}

        {bet.status === "active" && bet.escrow?.status === "funded" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Settle this bet</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onSettle(bet.id, "for")} style={{
                flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(82,183,136,0.3)",
                background: "rgba(82,183,136,0.1)", color: "#52b788", cursor: "pointer", fontWeight: 600, fontSize: 13,
              }}>✅ "For" Wins</button>
              <button onClick={() => onSettle(bet.id, "against")} style={{
                flex: 1, padding: 10, borderRadius: 10, border: "1px solid rgba(239,71,111,0.3)",
                background: "rgba(239,71,111,0.1)", color: "#ef476f", cursor: "pointer", fontWeight: 600, fontSize: 13,
              }}>✅ "Against" Wins</button>
            </div>
          </div>
        )}

        {bet.referee && (
          <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            ⚖️ Referee: <Avatar user={getUser(bet.referee)} size={18} /> <span style={{ color: "#ccc" }}>{getUser(bet.referee).name}</span>
          </div>
        )}
      </div>

      {/* Trash Talk */}
      <div style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", borderRadius: 16, padding: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>💬 Trash Talk</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12, maxHeight: 300, overflowY: "auto" }}>
          {bet.comments.map((c, i) => {
            const user = getUser(c.user);
            const isMe = c.user === "u1";
            return (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", flexDirection: isMe ? "row-reverse" : "row" }}>
                <Avatar user={user} size={24} />
                <div style={{
                  padding: "8px 12px", borderRadius: 12, maxWidth: "75%",
                  background: isMe ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.06)",
                  borderTopLeftRadius: isMe ? 12 : 4, borderTopRightRadius: isMe ? 4 : 12,
                }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{user.name} · {c.time}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.4 }}>{c.text}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && handleComment()}
            placeholder="Talk your trash..." style={{
              flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 13, outline: "none",
            }}
          />
          <button onClick={handleComment} style={{
            padding: "10px 16px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #6c63ff, #ef476f)",
            color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13,
          }}>Send</button>
        </div>
      </div>
    </div>
  );
}

function MyBetsView({ bets, users, onSelect, currentUser }) {
  const myBets = bets.filter(b => b.creator === currentUser.id || b.sides.for.includes(currentUser.id) || b.sides.against.includes(currentUser.id));
  const active = myBets.filter(b => b.status === "active");
  const awaiting = myBets.filter(b => b.status === "awaiting_funds");
  const disputed = myBets.filter(b => b.status === "disputed");
  const totalInEscrow = myBets.filter(b => b.escrow?.deposits?.["u1"] && b.status !== "settled").reduce((s, b) => s + (b.escrow.deposits["u1"] || 0), 0);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, padding: "12px 4px 8px" }}>My Bets</h2>
      <div style={{
        padding: "12px 14px", borderRadius: 12, marginBottom: 12,
        background: "linear-gradient(135deg, rgba(82,183,136,0.06), rgba(45,106,79,0.04))",
        border: "1px solid rgba(82,183,136,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <div>
            <div style={{ fontSize: 11, color: "#888" }}>Total in Escrow</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#52b788", fontFamily: "'Space Mono', monospace" }}>{formatMoney(totalInEscrow)}</div>
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
          { label: "Won", value: currentUser.wins, color: "#6c63ff" },
          { label: "Lost", value: currentUser.losses, color: "#ef476f" },
          { label: "Disputed", value: disputed.length, color: "#f2cc8f" },
        ].map(p => (
          <div key={p.label} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "center", background: "rgba(255,255,255,0.03)" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: p.color }}>{p.value}</div>
            <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{p.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {myBets.map((bet, i) => (
          <BetCard key={bet.id} bet={bet} users={users} onClick={() => onSelect(bet)} onJoin={() => {}} delay={i * 80} />
        ))}
      </div>
    </div>
  );
}

function LeaderboardView({ users }) {
  const sorted = [...users].sort((a, b) => b.wins - a.wins);
  const top3 = [{ ...sorted[1], place: "🥈" }, { ...sorted[0], place: "🥇" }, { ...sorted[2], place: "🥉" }];

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, padding: "12px 4px 8px" }}>Leaderboard</h2>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 12, marginBottom: 24, paddingTop: 20 }}>
        {top3.map((u, i) => {
          const heights = [100, 130, 80];
          const isFirst = i === 1;
          return (
            <div key={u.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: isFirst ? 28 : 20 }}>{u.place}</div>
              <Avatar user={u} size={isFirst ? 52 : 40} />
              <div style={{ fontSize: isFirst ? 14 : 12, fontWeight: 600 }}>{u.name}</div>
              <div style={{
                width: 80, height: heights[i], borderRadius: "10px 10px 0 0",
                background: isFirst ? "linear-gradient(180deg, #6c63ff, #6c63ff44)" : "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))",
                display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
                border: isFirst ? "1px solid rgba(108,99,255,0.3)" : "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{u.wins}</div>
                <div style={{ fontSize: 10, color: "#888" }}>wins</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
        {sorted.map((u, i) => (
          <div key={u.id} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
            background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
            borderBottom: "1px solid rgba(255,255,255,0.04)", animation: `slideUp 0.4s ease ${i * 80}ms both`,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#666", width: 24, textAlign: "center" }}>#{i + 1}</span>
            <Avatar user={u} size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{u.wins}W - {u.losses}L · {Math.round((u.wins / (u.wins + u.losses)) * 100)}%</div>
            </div>
            {u.streak > 0 && <div style={{ fontSize: 12, color: "#ef476f", fontWeight: 600 }}>🔥{u.streak}</div>}
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

function ProfileView({ user, bets }) {
  const winRate = Math.round((user.wins / (user.wins + user.losses)) * 100);
  const myBets = bets.filter(b => b.creator === user.id || b.sides.for.includes(user.id) || b.sides.against.includes(user.id));
  const catCounts = {};
  myBets.forEach(b => { catCounts[b.category] = (catCounts[b.category] || 0) + 1; });
  const totalEscrowed = myBets.filter(b => b.escrow?.deposits?.[user.id] && b.status !== "settled").reduce((s, b) => s + (b.escrow.deposits[user.id] || 0), 0);

  return (
    <div style={{ animation: "slideUp 0.3s ease" }}>
      <div style={{
        textAlign: "center", padding: "24px 16px",
        background: "linear-gradient(135deg, rgba(108,99,255,0.1), rgba(239,71,111,0.05))",
        borderRadius: 16, marginBottom: 16, border: "1px solid rgba(108,99,255,0.1)",
      }}>
        <Avatar user={user} size={64} />
        <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 10 }}>{user.name}</h2>
        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Member since March 2026</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16 }}>
          {[
            { val: user.wins, label: "Wins", color: "#6c63ff" },
            { val: user.losses, label: "Losses", color: "#ef476f" },
            { val: `${winRate}%`, label: "Win Rate", color: "#52b788" },
            { val: user.streak, label: "Streak", color: "#f2cc8f" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 16, borderRadius: 16, marginBottom: 16, background: "linear-gradient(135deg, rgba(82,183,136,0.04), rgba(45,106,79,0.04))", border: "1px solid rgba(82,183,136,0.1)" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>💰 Financial Summary</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { val: formatMoney(user.wallet), label: "Wallet", color: "#52b788" },
            { val: formatMoney(totalEscrowed), label: "In Escrow", color: "#f2cc8f" },
            { val: formatMoney(user.wallet + totalEscrowed), label: "Net Worth", color: "#a5a0ff" },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.2)", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: "'Space Mono', monospace" }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "#888" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 16, borderRadius: 16, marginBottom: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>🏅 Earned Badges</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Badge badge={BADGES.closer} /><Badge badge={BADGES.streak} /><Badge badge={BADGES.social} />
        </div>
      </div>

      <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>📊 Betting Style</h3>
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
      </div>
    </div>
  );
}

function CreateBetModal({ onClose, onCreate, users, currentUser }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("golf");
  const [wagerAmount, setWagerAmount] = useState("");
  const [opponent, setOpponent] = useState("u2");
  const [referee, setReferee] = useState("u3");
  const [deadline, setDeadline] = useState("2026-03-25");
  const [isGroup, setIsGroup] = useState(true);

  const amount = parseFloat(wagerAmount) || 0;
  const canAfford = currentUser.wallet >= amount;
  const fee = +(amount * 2 * PLATFORM_FEE).toFixed(2);
  const valid = title.trim() && amount > 0 && canAfford;

  const handleCreate = () => {
    if (!valid) return;
    onCreate({
      title, category, stakes: `$${amount} per person`, stakeType: "money", wagerAmount: amount,
      opponent, referee, deadline: `${deadline}T23:59:00`, creator: "u1", status: "awaiting_funds", isGroup,
    });
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.3)", color: "#fff", outline: "none",
  };
  const labelStyle = { fontSize: 12, color: "#888", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto",
        background: "#12121a", borderRadius: "20px 20px 0 0", padding: 24,
        animation: "slideUp 0.3s ease", border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>New Bet 🎲</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        <label style={labelStyle}>What's the bet?</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={"e.g., \"Jake can't break 90\""}
          style={{ ...inputStyle, fontSize: 15, marginBottom: 16 }} />

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

        <label style={labelStyle}>Wager Amount (per person)</label>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: 18 }}>$</span>
          <input value={wagerAmount} onChange={e => setWagerAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00" style={{ ...inputStyle, paddingLeft: 30, fontSize: 18, fontWeight: 700 }} />
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
                  { label: "🔒 Your deposit to escrow", val: formatMoney(amount), color: "#52b788" },
                  { label: "Est. total pool (2 players)", val: formatMoney(amount * 2), color: "#ccc" },
                  { label: "Platform fee (1%)", val: `-${formatMoney(fee)}`, color: "#f2cc8f" },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#888" }}>{r.label}</span>
                    <span style={{ color: r.color, fontFamily: "'Space Mono', monospace" }}>{r.val}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 4, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#888" }}>Winner receives</span>
                  <span style={{ color: "#52b788", fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{formatMoney(amount * 2 - fee)}</span>
                </div>
                <div style={{ color: "#666", marginTop: 2, fontSize: 11 }}>💳 Wallet after deposit: {formatMoney(currentUser.wallet - amount)}</div>
              </div>
            ) : (
              <div style={{ color: "#ef476f", fontWeight: 600 }}>⚠️ Insufficient funds. You have {formatMoney(currentUser.wallet)}</div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Opponent</label>
            <select value={opponent} onChange={e => setOpponent(e.target.value)} style={{ ...inputStyle }}>
              {users.filter(u => u.id !== "u1").map(u => <option key={u.id} value={u.id}>{u.avatar} {u.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Referee</label>
            <select value={referee} onChange={e => setReferee(e.target.value)} style={{ ...inputStyle }}>
              {users.filter(u => u.id !== "u1" && u.id !== opponent).map(u => <option key={u.id} value={u.id}>{u.avatar} {u.name}</option>)}
            </select>
          </div>
        </div>

        <label style={labelStyle}>Deadline</label>
        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ ...inputStyle, marginBottom: 16, colorScheme: "dark" }} />

        <div onClick={() => setIsGroup(!isGroup)} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
          borderRadius: 10, background: "rgba(255,255,255,0.03)", cursor: "pointer",
          border: "1px solid rgba(255,255,255,0.06)", marginBottom: 20,
        }}>
          <div style={{ width: 36, height: 20, borderRadius: 10, padding: 2, background: isGroup ? "#6c63ff" : "rgba(255,255,255,0.1)", transition: "background 0.2s" }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", transform: isGroup ? "translateX(16px)" : "translateX(0)", transition: "transform 0.2s" }} />
          </div>
          <span style={{ fontSize: 13 }}>Allow others to join sides (Group Bet)</span>
        </div>

        <button onClick={handleCreate} style={{
          width: "100%", padding: 14, borderRadius: 12, border: "none",
          background: valid ? "linear-gradient(135deg, #6c63ff, #ef476f)" : "rgba(255,255,255,0.05)",
          color: valid ? "#fff" : "#666", fontSize: 16, fontWeight: 700,
          cursor: valid ? "pointer" : "not-allowed",
          boxShadow: valid ? "0 4px 20px rgba(108,99,255,0.3)" : "none",
        }}>
          {valid ? `Create Bet & Deposit ${formatMoney(amount)} 🔒` : "Create Bet 🎲"}
        </button>
        {valid && (
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#888" }}>
            Your {formatMoney(amount)} will be held in escrow until the bet is settled
          </div>
        )}
      </div>
    </div>
  );
}
