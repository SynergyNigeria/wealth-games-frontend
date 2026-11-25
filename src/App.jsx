import { useEffect, useState } from "react";
import {
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  CircleX,
  Clock3,
  Eye,
  EyeOff,
  Gift,
  LogOut,
  PartyPopper,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";

const API_ROOT = `${(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "")}/api`;
const TOKEN_KEY = "mr-wealth-giveaway-token";
const DISMISSED_RESULTS_KEY = "mr-wealth-giveaway-dismissed-results";
const DISMISSED_BET_RESULTS_KEY = "mr-wealth-giveaway-dismissed-bet-results";

function getDismissedResultIds() {
  const stored = localStorage.getItem(DISMISSED_RESULTS_KEY);
  if (!stored) return [];

  try {
    const resultIds = JSON.parse(stored);
    return Array.isArray(resultIds)
      ? resultIds.filter((id) => Number.isInteger(id))
      : [];
  } catch {
    return [];
  }
}

function getDismissedBetResultIds(accountPhone) {
  if (!accountPhone) return [];
  const stored = localStorage.getItem(
    `${DISMISSED_BET_RESULTS_KEY}:${accountPhone}`,
  );
  if (!stored) return [];

  try {
    const resultIds = JSON.parse(stored);
    return Array.isArray(resultIds)
      ? resultIds.filter((id) => Number.isInteger(id))
      : [];
  } catch {
    return [];
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function getApiErrorMessage(data, statusCode) {
  if (data && typeof data === "object") {
    const messages = Object.values(data)
      .flat(Infinity)
      .filter((value) => typeof value === "string");
    if (messages.length) return messages[0];
  }

  if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
    return "The server is temporarily unavailable. Please try again shortly.";
  }
  return `The server returned an unexpected response (${statusCode}). Please try again.`;
}

async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Token ${token}`);

  let response;
  try {
    response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
  } catch {
    throw new Error("Can’t reach the server. Please check that the giveaway server is running and try again.");
  }

  let data = null;
  if (response.status !== 204) {
    const body = await response.text();
    if (body.trim()) {
      try {
        data = JSON.parse(body);
      } catch {
        if (response.ok) {
          throw new Error("The server returned an unreadable response. Please try again.");
        }
      }
    }
  }

  if (!response.ok) {
    const error = new Error(getApiErrorMessage(data, response.status));
    error.status = response.status;
    throw error;
  }

  if (response.status !== 204 && data === null) {
    throw new Error("The server returned an empty response. Please try again.");
  }

  return data;
}

function AuthDialog({ mode, onClose, onModeChange, onSuccess, submitting, error }) {
  const isRegister = mode === "register";
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await onSuccess({
      phone: formData.get("phone"),
      password: formData.get("password"),
    });
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="auth-heading"
        aria-modal="true"
        className="auth-dialog"
        role="dialog"
      >
        <button aria-label="Close dialog" className="icon-button dialog-close" onClick={onClose} type="button">
          <X size={20} />
        </button>
        <span className="eyebrow">{isRegister ? "JOIN THE COMMUNITY" : "WELCOME BACK"}</span>
        <h2 id="auth-heading">{isRegister ? "Create your account" : "Log in"}</h2>
        <p className="auth-intro">
          {isRegister
            ? "Sign up with your phone number to take part."
            : "Enter your phone number and password to continue."}
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Phone number
            <input
              autoComplete="tel"
              autoFocus
              name="phone"
              placeholder="e.g. 08012345678"
              required
              type="tel"
            />
          </label>
          <label>
            Password
            <span className="password-input-wrap">
              <input
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={8}
                name="password"
                placeholder="At least 8 characters"
                required
                type={showPassword ? "text" : "password"}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="password-visibility"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" disabled={submitting} type="submit">
            {submitting ? "Please wait..." : isRegister ? "Create account" : "Log in"}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "New here?"}{" "}
          <button onClick={() => onModeChange(isRegister ? "login" : "register")} type="button">
            {isRegister ? "Log in" : "Create an account"}
          </button>
        </p>
      </section>
    </div>
  );
}

function GiveawayCountdown({ drawDate, isClosed }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (isClosed || !drawDate) return undefined;
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, [drawDate, isClosed]);

  if (isClosed) {
    return <p className="countdown-finished">The draw is complete</p>;
  }

  if (!drawDate) {
    return <p className="countdown-finished">Draw date to be announced</p>;
  }

  const remainingSeconds = Math.max(
    0,
    Math.floor((new Date(drawDate).getTime() - now) / 1000),
  );
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const parts = [hours, minutes, seconds].map((value) => String(value).padStart(2, "0"));

  return (
    <div
      aria-label={`Draw in ${hours} hours, ${minutes} minutes, ${seconds} seconds`}
      className="countdown"
      role="timer"
    >
      {parts.map((part, index) => (
        <span className="countdown-part" key={index}>
          <strong>{part}</strong>
          <span>{["HOURS", "MINUTES", "SECONDS"][index]}</span>
        </span>
      ))}
    </div>
  );
}

function GiveawayCard({ giveaway, joining, onParticipate, user }) {
  const isClosed = giveaway.status === "closed";
  const joined = giveaway.has_joined;

  return (
    <article className="giveaway-card">
      <div className="card-topline">
        <span className={`giveaway-status ${isClosed ? "closed-status" : ""}`}>
          {isClosed ? "Closed" : "Active"}
        </span>
        <Gift aria-hidden="true" className="card-gift" size={23} />
      </div>
      <h2 className="giveaway-name">{giveaway.name}</h2>
      {giveaway.description && <p className="giveaway-description">{giveaway.description}</p>}

      <div className="prize-panel">
        <span className="detail-label">GIVEAWAY AMOUNT</span>
        <strong className="prize-amount">
          {new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0,
          }).format(Number(giveaway.amount))}
        </strong>
      </div>

      <div className="giveaway-details">
        <div className="detail-item">
          <span className="detail-icon"><Sparkles size={17} /></span>
          <span><span className="detail-label">WINNERS</span><strong>{giveaway.number_of_winners}</strong></span>
        </div>
      </div>

      <div className="draw-countdown">
        <span className="detail-label"><Clock3 size={14} /> DRAW IN</span>
        <GiveawayCountdown drawDate={giveaway.draw_date} isClosed={isClosed} />
      </div>

      <button
        className={`button participate-button ${isClosed || joined ? "button-success" : "button-primary"}`}
        disabled={isClosed || joined || joining}
        onClick={onParticipate}
        type="button"
      >
        {isClosed ? "This giveaway is closed" : joined ? <><Check size={18} /> You’re participating</> : joining ? "Joining..." : user ? "Participate" : "Create account & participate"}
        {!isClosed && !joined && !joining && <ArrowRight size={18} />}
      </button>
      <p className="no-payment-note">
        {isClosed ? "The winners have been selected." : "Watch for the draw results."}
      </p>
    </article>
  );
}

function BetCard({
  bet,
  joining,
  onParticipate,
  user,
}) {
  const [selectedOptionId, setSelectedOptionId] = useState(
    bet.selected_option_id ?? "",
  );
  const hasEntry = bet.selected_option_id !== null;
  const isOpen = bet.status === "open";
  const isSettled = bet.status === "settled";
  const entryResult = isSettled && hasEntry
    ? bet.is_winner ? "won" : "lost"
    : null;

  useEffect(() => {
    setSelectedOptionId(bet.selected_option_id ?? "");
  }, [bet.id, bet.selected_option_id]);

  return (
    <article className="giveaway-card bet-card">
      <div className="card-topline">
        <span className={`giveaway-status ${isOpen ? "" : "closed-status"}`}>
          {isOpen ? "Open" : isSettled ? "Settled" : "Entries closed"}
        </span>
        <div className="bet-card-status">
          {entryResult && (
            <span className={`bet-outcome bet-outcome-${entryResult}`}>
              {entryResult === "won"
                ? <CheckCircle2 aria-hidden="true" size={17} />
                : <CircleX aria-hidden="true" size={17} />}
              {entryResult === "won" ? "Won" : "Lost"}
            </span>
          )}
          <span className="bet-prize-pool">{formatCurrency(bet.prize_pool)} pool</span>
        </div>
      </div>
      <h2 className="giveaway-name">{bet.question}</h2>
      <div className="bet-details">
        <span>{bet.entries_count} {bet.entries_count === 1 ? "entry" : "entries"}</span>
        {isSettled && <span>{bet.winner_count} {bet.winner_count === 1 ? "winner" : "winners"}</span>}
      </div>

      <fieldset className="bet-options" disabled={!isOpen || hasEntry}>
        <legend>{hasEntry ? "Your selection" : "Choose a range"}</legend>
        {bet.options.map((option) => (
          <label className="bet-option" key={option.id}>
            <input
              checked={Number(selectedOptionId) === option.id}
              name={`bet-${bet.id}`}
              onChange={() => setSelectedOptionId(option.id)}
              type="radio"
              value={option.id}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      {hasEntry && (
        <p className="bet-entry-note">
          You selected <strong>{bet.selected_option_label}</strong>. Your entry is final.
        </p>
      )}
      {!isOpen && (
        <div className="bet-result">
          {isSettled ? (
            <>
              <span>Correct range</span>
              <strong>{bet.correct_option_label}</strong>
              {bet.is_winner && (
                <p>Your prize share: <strong>{formatCurrency(bet.my_payout)}</strong></p>
              )}
            </>
          ) : (
            <span>Waiting for the admin to enter the final answer.</span>
          )}
        </div>
      )}
      {isOpen && !hasEntry && (
        <button
          className="button button-primary participate-button"
          disabled={selectedOptionId === "" || joining}
          onClick={() => onParticipate(bet.id, Number(selectedOptionId))}
          type="button"
        >
          {joining ? "Submitting..." : user ? "Confirm selection" : "Sign in to enter"}
          {!joining && <ArrowRight size={18} />}
        </button>
      )}
    </article>
  );
}

function BetWinnerReveal({ bet, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <section
      aria-labelledby="bet-reveal-heading"
      aria-modal="true"
      className="giveaway-reveal winner-reveal"
      role="dialog"
    >
      <div aria-hidden="true" className="reveal-confetti">
        {Array.from({ length: 22 }, (_, index) => (
          <span key={index} style={{ "--confetti-index": index }} />
        ))}
      </div>
      <button
        aria-label="Close bet winner announcement"
        className="icon-button reveal-close"
        onClick={onClose}
        type="button"
      >
        <X size={22} />
      </button>
      <div className="reveal-content">
        <span className="reveal-icon reveal-icon-winner"><PartyPopper size={34} /></span>
        <p className="reveal-eyebrow">BET RESULT CONFIRMED</p>
        <h2 id="bet-reveal-heading">You got it<br />right!</h2>
        <p className="bet-reveal-question">{bet.question}</p>
        <p className="reveal-prize">{formatCurrency(bet.my_payout)}</p>
        <p className="winner-message">
          Your share of the {formatCurrency(bet.prize_pool)} prize pool
        </p>
      </div>
    </section>
  );
}

function GiveawayReveal({ giveaway, onClose }) {
  const isWinner = giveaway.is_winner;
  const amount = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(giveaway.amount));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <section
      aria-labelledby="reveal-heading"
      aria-modal="true"
      className={`giveaway-reveal ${isWinner ? "winner-reveal" : ""}`}
      role="dialog"
    >
      <div aria-hidden="true" className="reveal-confetti">
        {Array.from({ length: 22 }, (_, index) => (
          <span key={index} style={{ "--confetti-index": index }} />
        ))}
      </div>
      <button
        aria-label="Close winner announcement"
        className="icon-button reveal-close"
        onClick={onClose}
        type="button"
      >
        <X size={22} />
      </button>

      <div className="reveal-content">
        <span className={`reveal-icon ${isWinner ? "reveal-icon-winner" : ""}`}>
          {isWinner ? <PartyPopper size={34} /> : <Trophy size={34} />}
        </span>
        <p className="reveal-eyebrow">
          {isWinner ? "CONGRATULATIONS" : "THE DRAW IS COMPLETE"}
        </p>
        <h2 id="reveal-heading">
          {isWinner ? <>You’re a<br />winner!</> : <>And the<br />winners are...</>}
        </h2>
        <p className="reveal-prize">{amount}</p>
        {giveaway.winners.length > 0 ? (
          <div className="reveal-winners">
            {giveaway.winners.map((winner, index) => (
              <div className="reveal-winner" key={`${winner.display_name}-${index}`}>
                <span className="winner-number">{String(index + 1).padStart(2, "0")}</span>
                <span>{winner.is_current_user ? "You" : winner.display_name}</span>
                {winner.is_current_user && <Trophy aria-label="You won" size={17} />}
              </div>
            ))}
          </div>
        ) : (
          <p className="reveal-no-winners">There were no participants in this giveaway.</p>
        )}
        {isWinner && <p className="winner-message">You’ve won in MR Wealth’s Giveaway!</p>}
      </div>
    </section>
  );
}

function BetsPage({
  openBets,
  closedBets,
  joiningBetId,
  onParticipate,
  user,
  pageError,
}) {
  const [activeSection, setActiveSection] = useState("open");
  const bets = activeSection === "open" ? openBets : closedBets;

  return (
    <section aria-label="Football bets" className="content-section bets-section">
      {pageError && <p className="page-error" role="alert">{pageError}</p>}
      <div className="bets-heading">
        <span className="eyebrow">MATCH PREDICTIONS</span>
        <h1>Football bets</h1>
        <p>Choose the range you think the final result will fall into.</p>
      </div>
      <div aria-label="Bet status" className="bet-tabs" role="group">
        <button
          aria-pressed={activeSection === "open"}
          className={activeSection === "open" ? "active-bet-tab" : ""}
          onClick={() => setActiveSection("open")}
          type="button"
        >
          Open ({openBets.length})
        </button>
        <button
          aria-pressed={activeSection === "closed"}
          className={activeSection === "closed" ? "active-bet-tab" : ""}
          onClick={() => setActiveSection("closed")}
          type="button"
        >
          Closed ({closedBets.length})
        </button>
      </div>
      {bets.length > 0 ? (
        <div className="giveaway-list">
          {bets.map((bet) => (
            <BetCard
              bet={bet}
              joining={joiningBetId === bet.id}
              key={bet.id}
              onParticipate={onParticipate}
              user={user}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon"><Trophy size={24} /></span>
          <h3>{activeSection === "open" ? "No open bets right now" : "No closed bets yet"}</h3>
          <p>
            {activeSection === "open"
              ? "Check back when the next prediction is available."
              : "Completed and entry-closed bets will appear here."}
          </p>
        </div>
      )}
    </section>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [dismissedBetResults, setDismissedBetResults] = useState({
    account: null,
    ids: [],
  });
  const [giveaway, setGiveaway] = useState(null);
  const [giveaways, setGiveaways] = useState([]);
  const [closedGiveaways, setClosedGiveaways] = useState([]);
  const [openBets, setOpenBets] = useState([]);
  const [closedBets, setClosedBets] = useState([]);
  const [authMode, setAuthMode] = useState(null);
  const [authError, setAuthError] = useState("");
  const [pageError, setPageError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [joiningGiveawayId, setJoiningGiveawayId] = useState(null);
  const [joiningBetId, setJoiningBetId] = useState(null);
  const [joinAfterAuth, setJoinAfterAuth] = useState(null);
  const [dismissedResultIds, setDismissedResultIds] = useState(getDismissedResultIds);
  const isBetsPage = window.location.pathname === "/bets";

  function updateGiveaways(data) {
    setGiveaway(data.giveaway);
    setGiveaways(data.giveaways ?? (data.giveaway ? [data.giveaway] : []));
    if (data.closed_giveaways?.length) {
      setClosedGiveaways((current) => {
        const knownIds = new Set(current.map((item) => item.id));
        return [
          ...current,
          ...data.closed_giveaways.filter((item) => !knownIds.has(item.id)),
        ];
      });
    }
  }

  async function refreshGiveaways(activeToken = token) {
    const data = await apiRequest("/giveaway/", { token: activeToken });
    updateGiveaways(data);
  }

  function updateBets(data) {
    setOpenBets(data.open_bets);
    setClosedBets(data.closed_bets);
  }

  async function refreshBets(activeToken = token) {
    const data = await apiRequest("/bets/", { token: activeToken });
    updateBets(data);
  }

  useEffect(() => {
    setDismissedBetResults({
      account: user?.phone ?? null,
      ids: getDismissedBetResultIds(user?.phone),
    });
  }, [user?.phone]);

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        if (token) {
          try {
            const profile = await apiRequest("/auth/me/", { token });
            if (active) setUser(profile);
          } catch (error) {
            if (error.status === 401) {
              localStorage.removeItem(TOKEN_KEY);
              if (active) {
                setToken(null);
                setUser(null);
              }
            } else {
              throw error;
            }
          }
        }

        const data = await apiRequest("/giveaway/", { token });
        const betData = await apiRequest("/bets/", { token });
        if (active) {
          updateGiveaways(data);
          updateBets(betData);
        }
      } catch {
        if (active) setPageError("We couldn’t connect right now. Please refresh the page and try again.");
      }
    }

    loadPage();
    const pollId = window.setInterval(async () => {
      try {
        const data = await apiRequest("/giveaway/", { token });
        const betData = await apiRequest("/bets/", { token });
        if (active) {
          updateGiveaways(data);
          updateBets(betData);
          setPageError("");
        }
      } catch {
        if (active) setPageError("Live updates are temporarily unavailable. Reconnecting...");
      }
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(pollId);
    };
  }, [token]);

  async function handleAuth({ phone, password }) {
    setAuthSubmitting(true);
    setAuthError("");

    try {
      const endpoint = authMode === "register" ? "/auth/register/" : "/auth/login/";
      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({ phone, password }),
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser({ phone: data.phone });
      setAuthMode(null);

      if (joinAfterAuth !== null) {
        const pendingAction = joinAfterAuth;
        setJoinAfterAuth(null);
        if (pendingAction.type === "bet") {
          await participateInBet(
            pendingAction.betId,
            pendingAction.optionId,
            data.token,
          );
        } else {
          await participate(pendingAction.giveawayId, data.token);
        }
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function participate(giveawayId, activeToken = token) {
    setJoiningGiveawayId(giveawayId);
    setPageError("");
    try {
      await apiRequest("/giveaway/participate/", {
        method: "POST",
        token: activeToken,
        body: JSON.stringify({ giveaway_id: giveawayId }),
      });
      await refreshGiveaways(activeToken);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setJoiningGiveawayId(null);
    }
  }

  function handleParticipate(giveawayId) {
    if (!user) {
      setJoinAfterAuth({ type: "giveaway", giveawayId });
      setAuthError("");
      setAuthMode("register");
      return;
    }
    participate(giveawayId);
  }

  async function participateInBet(betId, optionId, activeToken = token) {
    setJoiningBetId(betId);
    setPageError("");
    try {
      await apiRequest("/bets/participate/", {
        method: "POST",
        token: activeToken,
        body: JSON.stringify({ bet_id: betId, option_id: optionId }),
      });
      await refreshBets(activeToken);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setJoiningBetId(null);
    }
  }

  function handleBetParticipate(betId, optionId) {
    if (!user) {
      setJoinAfterAuth({ type: "bet", betId, optionId });
      setAuthError("");
      setAuthMode("register");
      return;
    }
    participateInBet(betId, optionId);
  }

  function dismissResult(giveawayId) {
    const updated = dismissedResultIds.includes(giveawayId)
      ? dismissedResultIds
      : [...dismissedResultIds, giveawayId];
    localStorage.setItem(DISMISSED_RESULTS_KEY, JSON.stringify(updated));
    setDismissedResultIds(updated);
  }

  function dismissBetResult(betId) {
    if (!user?.phone) return;
    const updated = dismissedBetIds.includes(betId)
      ? dismissedBetIds
      : [...dismissedBetIds, betId];
    localStorage.setItem(
      `${DISMISSED_BET_RESULTS_KEY}:${user.phone}`,
      JSON.stringify(updated),
    );
    setDismissedBetResults({ account: user.phone, ids: updated });
  }

  async function handleLogout() {
    try {
      await apiRequest("/auth/logout/", { method: "POST", token });
    } catch {
      setPageError("Could not sign out. Please try again.");
      return;
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  const queuedResult = closedGiveaways.find(
    (item) => !dismissedResultIds.includes(item.id),
  );
  const resultToReveal = queuedResult ?? (
    giveaways.length === 0
      && giveaway?.status === "closed"
      && !dismissedResultIds.includes(giveaway.id)
      ? giveaway
      : null
  );
  const dismissedBetIds = dismissedBetResults.account === user?.phone
    ? dismissedBetResults.ids
    : [];
  const betResultToReveal = user && !resultToReveal
    ? closedBets.find(
      (bet) => bet.status === "settled"
        && bet.is_winner
        && !dismissedBetIds.includes(bet.id),
    )
    : null;

  return (
    <div className="app-shell">
      <header className="site-header">
        <a aria-label="MR Wealth’s Giveaway home" className="brand" href="/">
          <img alt="MR Wealth’s Giveaway" className="brand-logo" src="/images/mr-wealth-logo.png" />
        </a>
        {user ? (
          <div className="header-account">
            <span className="account-phone">{user.phone}</span>
            <button className="header-action" onClick={handleLogout} type="button">
              <LogOut size={16} /><span>Log out</span>
            </button>
          </div>
        ) : (
          <div className="header-account">
            <button className="header-login" onClick={() => { setJoinAfterAuth(null); setAuthError(""); setAuthMode("login"); }} type="button">
              Log in
            </button>
            <button className="button button-small button-primary" onClick={() => { setJoinAfterAuth(null); setAuthError(""); setAuthMode("register"); }} type="button">
              Sign up <ArrowRight size={15} />
            </button>
          </div>
        )}
      </header>

      <main>
        {isBetsPage ? (
          <BetsPage
            closedBets={closedBets}
            joiningBetId={joiningBetId}
            onParticipate={handleBetParticipate}
            openBets={openBets}
            pageError={pageError}
            user={user}
          />
        ) : (
          <section aria-label="Open giveaway" className="content-section">
            {pageError && <p className="page-error" role="alert">{pageError}</p>}
            {giveaways.length > 0 ? (
              <div className="giveaway-list">
                {giveaways.map((item) => (
                  <GiveawayCard
                    giveaway={item}
                    joining={joiningGiveawayId === item.id}
                    key={item.id}
                    onParticipate={() => handleParticipate(item.id)}
                    user={user}
                  />
                ))}
              </div>
            ) : pageError ? null : (
              <div className="empty-state">
                <span className="empty-icon"><Gift size={24} /></span>
                <h3>The next giveaway is getting ready</h3>
                <p>The open giveaway will appear here.</p>
              </div>
            )}
          </section>
        )}

        <p className="footer-note">Made for the community</p>
      </main>

      <nav aria-label="Main navigation" className="bottom-navigation">
        <a aria-current={!isBetsPage ? "page" : undefined} href="/">
          <Gift aria-hidden="true" size={21} />
          <span>Giveaway</span>
        </a>
        <a aria-current={isBetsPage ? "page" : undefined} href="/bets">
          <Banknote aria-hidden="true" size={21} />
          <span>My Bet</span>
        </a>
      </nav>

      {authMode && (
        <AuthDialog
          error={authError}
          mode={authMode}
          onClose={() => { setAuthMode(null); setJoinAfterAuth(null); }}
          onModeChange={(mode) => { setAuthMode(mode); setAuthError(""); }}
          onSuccess={handleAuth}
          submitting={authSubmitting}
        />
      )}
      {resultToReveal && (
        <GiveawayReveal
          giveaway={resultToReveal}
          onClose={() => dismissResult(resultToReveal.id)}
        />
      )}
      {betResultToReveal && (
        <BetWinnerReveal
          bet={betResultToReveal}
          onClose={() => dismissBetResult(betResultToReveal.id)}
        />
      )}
    </div>
  );
}

export default App;
