function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderPublicRegistryHtml(data: {
  event: {
    id: string;
    title: string | null;
    type: string;
    eventDate: Date | string;
    startTime?: string | null;
    endTime?: string | null;
    location: string;
    customer: { id: string; name: string };
  };
  stats: {
    totalItems: number;
    claimedItems: number;
    availableItems: number;
    groupFundsCount: number;
    totalTargetAmount: number;
    totalCollectedAmount: number;
    percentageFunded: number;
    contributionsCount: number;
  };
  items: Array<{
    id: string;
    title: string;
    description: string | null;
    category: string;
    imageUrl: string | null;
    externalUrl: string | null;
    targetAmount: number | null;
    collectedAmount: number;
    isGroupGift: boolean;
    priority: string;
    status: string;
    claimedBy: string | null;
  }>;
  contributions: Array<{
    id: string;
    contributorName: string;
    amount: number;
    message: string | null;
    isAnonymous: boolean;
    createdAt: Date | string;
  }>;
}): string {
  const event = data.event;
  const stats = data.stats;
  const items = data.items;
  const contributions = data.contributions;

  const eventTitle = escapeHtml(event.title || `${event.type} Celebration`);
  const hostName = escapeHtml(event.customer.name || "Celebration Host");
  const eventLocation = escapeHtml(event.location);
  const formattedDate = new Date(event.eventDate).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = event.startTime ? ` at ${escapeHtml(event.startTime)}` : "";

  const itemsJson = JSON.stringify(
    items.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      category: i.category,
      targetAmount: i.targetAmount,
      collectedAmount: i.collectedAmount,
      isGroupGift: i.isGroupGift,
      priority: i.priority,
      status: i.status,
      claimedBy: i.claimedBy,
      externalUrl: i.externalUrl,
    }))
  ).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>${eventTitle} · Gift Circle & Registry</title>

  <!-- Open Graph / WhatsApp Preview Meta -->
  <meta property="og:title" content="${eventTitle} · Gift Registry">
  <meta property="og:description" content="View the celebration wishlist, promise a gift, or send warm cash blessings for ${hostName}'s celebration on ${formattedDate}.">
  <meta property="og:type" content="website">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,500&display=swap" rel="stylesheet">

  <style>
    :root {
      --bg: #F7F7F5;
      --card-bg: #FFFFFF;
      --border: #E8E6E1;
      --dark: #18181B;
      --gold: #D4AF37;
      --gold-dark: #9A6A14;
      --accent: #4F46E5;
      --accent-soft: #EEF2FF;
      --success: #10B981;
      --text: #1C1C1E;
      --text-muted: #71717A;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding-bottom: 80px;
      -webkit-font-smoothing: antialiased;
    }

    /* Container */
    .container {
      max-width: 760px;
      margin: 0 auto;
      padding: 16px;
    }

    /* Header Festive Hero */
    .hero {
      background: linear-gradient(145deg, #1C1C1E 0%, #0F0F12 100%);
      border-radius: 28px;
      padding: 32px 24px 28px;
      color: #FFFFFF;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.12);
      margin-bottom: 20px;
    }
    .hero-glow {
      position: absolute;
      width: 220px;
      height: 220px;
      border-radius: 50%;
      background: rgba(79, 70, 229, 0.28);
      filter: blur(50px);
      top: -80px;
      right: -60px;
      pointer-events: none;
    }
    .hero-glow-gold {
      position: absolute;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: rgba(212, 175, 55, 0.18);
      filter: blur(45px);
      bottom: -60px;
      left: -40px;
      pointer-events: none;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.18);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #FCD34D;
      margin-bottom: 14px;
    }
    .hero h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 28px;
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 8px;
      letter-spacing: -0.2px;
    }
    .hero-sub {
      color: #A1A1AA;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .hero-sub strong { color: #FFFFFF; }

    /* Event Meta Pills */
    .event-meta {
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 18px;
      padding: 14px 16px;
      font-size: 13px;
    }
    .meta-row {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #E4E4E7;
    }
    .meta-icon {
      width: 26px;
      height: 26px;
      border-radius: 8px;
      background: rgba(212, 175, 55, 0.18);
      color: #FCD34D;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      flex-shrink: 0;
    }
    .meta-row a {
      color: #93C5FD;
      text-decoration: none;
      font-weight: 500;
      margin-left: auto;
      font-size: 12px;
    }

    /* Progress card inside hero */
    .hero-progress {
      margin-top: 20px;
      padding-top: 18px;
      border-top: 1px solid rgba(255,255,255,0.12);
    }
    .progress-numbers {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 8px;
    }
    .raised-amount {
      font-size: 26px;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.5px;
    }
    .goal-amount {
      font-size: 13px;
      color: #A1A1AA;
    }
    .bar-bg {
      width: 100%;
      height: 9px;
      background: rgba(255,255,255,0.15);
      border-radius: 999px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #4F46E5, #818CF8);
      border-radius: 999px;
      transition: width 0.6s ease;
    }
    .stats-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid rgba(255,255,255,0.1);
      text-align: center;
    }
    .stat-val { font-size: 16px; font-weight: 700; color: #FFFFFF; }
    .stat-label { font-size: 11px; color: #A1A1AA; text-transform: uppercase; font-weight: 600; margin-top: 2px; }

    /* Action bar */
    .hero-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 13px 20px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      border: none;
      transition: transform 0.1s, opacity 0.2s;
      text-decoration: none;
    }
    .btn:active { transform: scale(0.98); }
    .btn-primary {
      background: #4F46E5;
      color: #FFFFFF;
      flex: 1;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
    }
    .btn-gold {
      background: #D4AF37;
      color: #000000;
      font-weight: 800;
    }
    .btn-secondary {
      background: rgba(255,255,255,0.12);
      color: #FFFFFF;
      border: 1px solid rgba(255,255,255,0.18);
    }

    /* Category Filter Tabs */
    .tabs-wrap {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 6px;
      margin-bottom: 20px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .tabs-wrap::-webkit-scrollbar { display: none; }
    .tab {
      background: var(--card-bg);
      border: 1px solid var(--border);
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      color: #4B5563;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab.active {
      background: #18181B;
      border-color: #18181B;
      color: #FFFFFF;
    }

    /* Items Section */
    .section-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--text);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .items-grid {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .gift-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .gift-card:hover {
      box-shadow: 0 6px 16px rgba(0,0,0,0.06);
    }
    .card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .pill {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .pill-priority { background: #FEF3C7; color: #92400E; }
    .pill-group { background: #E0E7FF; color: #3730A3; }
    .pill-claimed { background: #DCFCE7; color: #166534; font-weight: 800; }

    .item-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
    }
    .item-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.45;
      margin-bottom: 14px;
    }

    .item-funding {
      background: #FAFAFA;
      border: 1px solid #EFEFEF;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 14px;
    }
    .funding-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .funding-bar {
      height: 6px;
      background: #E5E7EB;
      border-radius: 999px;
      overflow: hidden;
    }
    .funding-fill {
      height: 100%;
      background: #10B981;
      border-radius: 999px;
    }

    .card-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .card-btn {
      flex: 1;
      padding: 11px 16px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      text-align: center;
    }
    .card-btn-claim {
      background: #18181B;
      color: #FFFFFF;
    }
    .card-btn-contribute {
      background: #4F46E5;
      color: #FFFFFF;
    }
    .card-btn-claimed {
      background: #E4E4E7;
      color: #71717A;
      cursor: not-allowed;
    }
    .store-link {
      color: #4F46E5;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      padding: 8px 12px;
      border: 1px solid #E0E7FF;
      border-radius: 10px;
    }

    /* Blessings / Contributions Feed */
    .blessings-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 20px;
      margin-top: 24px;
    }
    .blessing-item {
      padding: 14px 0;
      border-bottom: 1px solid #F1F1EF;
    }
    .blessing-item:last-child { border-bottom: none; padding-bottom: 0; }
    .blessing-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }
    .blessing-name { font-weight: 700; font-size: 14px; color: var(--text); }
    .blessing-amount { font-weight: 800; font-size: 13px; color: #059669; }
    .blessing-msg { font-size: 13px; color: #52525B; font-style: italic; }

    /* Modals */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
      z-index: 1000;
    }
    .modal-overlay.open { display: flex; }
    .modal-box {
      background: #FFFFFF;
      width: 100%;
      max-width: 440px;
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      animation: popIn 0.2s ease-out;
      position: relative;
    }
    @keyframes popIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-close {
      position: absolute;
      top: 18px;
      right: 18px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #F4F4F5;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: #71717A;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-title { font-size: 20px; font-weight: 800; color: #18181B; margin-bottom: 6px; }
    .modal-sub { font-size: 13px; color: #71717A; margin-bottom: 18px; }

    /* Form elements */
    .form-group { margin-bottom: 14px; }
    .form-label { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #52525B; margin-bottom: 6px; }
    .form-input {
      width: 100%;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid #D4D4D8;
      font-size: 14px;
      font-family: inherit;
      outline: none;
    }
    .form-input:focus { border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15); }
    .amount-chips {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 10px;
    }
    .chip {
      background: #F4F4F5;
      border: 1px solid #E4E4E7;
      padding: 8px 4px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      cursor: pointer;
    }
    .chip.selected {
      background: #18181B;
      color: #FFFFFF;
      border-color: #18181B;
    }

    /* Confetti Canvas */
    #confetti-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 2000;
    }

    /* Footer Branding */
    .footer-brand {
      text-align: center;
      margin-top: 36px;
      color: #A1A1AA;
      font-size: 12px;
    }
    .footer-brand strong { color: #18181B; }
  </style>
</head>
<body>
  <canvas id="confetti-canvas"></canvas>

  <div class="container">
    <!-- Festive Hero Header -->
    <div class="hero">
      <div class="hero-glow"></div>
      <div class="hero-glow-gold"></div>

      <div class="badge">✨ Celebration Registry ✨</div>
      <h1>${eventTitle}</h1>
      <p class="hero-sub">Organized with love by <strong>${hostName}</strong></p>

      <!-- Event Details -->
      <div class="event-meta">
        <div class="meta-row">
          <div class="meta-icon">📅</div>
          <div>${formattedDate}${timeStr}</div>
        </div>
        <div class="meta-row">
          <div class="meta-icon">📍</div>
          <div style="flex:1;">${eventLocation}</div>
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}" target="_blank" rel="noopener">Map ↗</a>
        </div>
      </div>

      <!-- Raised progress / target counter -->
      <div class="hero-progress">
        <div class="progress-numbers">
          <div>
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#A1A1AA; letter-spacing:0.5px;">Total Blessings & Funds</div>
            <div class="raised-amount" id="total-raised-display">₹${stats.totalCollectedAmount.toLocaleString("en-IN")}</div>
          </div>
          ${
            stats.totalTargetAmount > 0
              ? `<div class="goal-amount">Goal: ₹${stats.totalTargetAmount.toLocaleString("en-IN")}</div>`
              : ""
          }
        </div>
        ${
          stats.totalTargetAmount > 0
            ? `<div class="bar-bg">
                <div class="bar-fill" id="progress-bar-fill" style="width: ${Math.min(
                  100,
                  stats.percentageFunded
                )}%;"></div>
              </div>`
            : ""
        }

        <div class="stats-row">
          <div>
            <div class="stat-val" id="stat-items">${stats.totalItems}</div>
            <div class="stat-label">Wishlist</div>
          </div>
          <div>
            <div class="stat-val" id="stat-claimed" style="color:#34D399;">${stats.claimedItems}</div>
            <div class="stat-label">Claimed</div>
          </div>
          <div>
            <div class="stat-val" id="stat-blessings" style="color:#FCD34D;">${stats.contributionsCount}</div>
            <div class="stat-label">Blessings</div>
          </div>
        </div>
      </div>

      <!-- Primary Action Buttons -->
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="openContributeModal(null)">
          <span>💝</span> Chip In / Cash Blessing
        </button>
      </div>
    </div>

    <!-- Category Tabs -->
    <div class="tabs-wrap">
      <button class="tab active" onclick="filterCategory('ALL', this)">All (${items.length})</button>
      <button class="tab" onclick="filterCategory('CASH_FUND', this)">Cash Funds</button>
      <button class="tab" onclick="filterCategory('HOME', this)">Home & Decor</button>
      <button class="tab" onclick="filterCategory('GADGETS', this)">Tech & Gadgets</button>
      <button class="tab" onclick="filterCategory('EXPERIENCE', this)">Experiences</button>
      <button class="tab" onclick="filterCategory('GENERAL', this)">Wishlist</button>
    </div>

    <!-- Registry Items List -->
    <div class="section-title">
      <span>Wishlist Items (<span id="items-count">${items.length}</span>)</span>
    </div>

    <div class="items-grid" id="items-container">
      ${
        items.length === 0
          ? `<div style="text-align:center; padding:40px 20px; background:#fff; border-radius:20px; border:1px solid var(--border); color:#71717A;">
              The host hasn't added items yet, but you can still send warm cash blessings above! 🎁
            </div>`
          : items
              .map((item) => {
                const isClaimed = item.status === "CLAIMED" || item.status === "COMPLETED";
                const isGroup = item.isGroupGift || item.category === "CASH_FUND";
                const priorityLabel =
                  item.priority === "HIGH" ? "Most Wanted" : item.priority === "MEDIUM" ? "Recommended" : "Nice to have";

                return `
        <div class="gift-card" data-category="${escapeHtml(item.category)}" data-id="${item.id}" id="card-${item.id}">
          <div class="card-top">
            <div class="card-tags">
              <span class="pill pill-priority">${priorityLabel}</span>
              ${isGroup ? `<span class="pill pill-group">Group Fund</span>` : ""}
              ${
                isClaimed
                  ? `<span class="pill pill-claimed">✓ Promised ${item.claimedBy ? "by " + escapeHtml(item.claimedBy) : ""}</span>`
                  : ""
              }
            </div>
            ${
              item.targetAmount
                ? `<div style="font-weight:800; font-size:16px; color:var(--text);">₹${item.targetAmount.toLocaleString("en-IN")}</div>`
                : ""
            }
          </div>

          <div class="item-title">${escapeHtml(item.title)}</div>
          ${item.description ? `<div class="item-desc">${escapeHtml(item.description)}</div>` : ""}

          ${
            isGroup && item.targetAmount
              ? `
            <div class="item-funding">
              <div class="funding-row">
                <span style="color:#059669;">₹${item.collectedAmount.toLocaleString("en-IN")} raised</span>
                <span style="color:#71717A;">Target: ₹${item.targetAmount.toLocaleString("en-IN")}</span>
              </div>
              <div class="funding-bar">
                <div class="funding-fill" style="width:${Math.min(100, Math.round((item.collectedAmount / item.targetAmount) * 100))}%;"></div>
              </div>
            </div>`
              : ""
          }

          <div class="card-actions">
            ${
              isClaimed
                ? `<button class="card-btn card-btn-claimed" disabled>Already Promised</button>`
                : isGroup
                ? `<button class="card-btn card-btn-contribute" onclick="openContributeModal('${item.id}', '${escapeHtml(item.title)}')">Chip In</button>`
                : `<button class="card-btn card-btn-claim" onclick="openClaimModal('${item.id}', '${escapeHtml(item.title)}')">Promise this Gift</button>`
            }
            ${
              item.externalUrl
                ? `<a href="${escapeHtml(item.externalUrl)}" target="_blank" rel="noopener" class="store-link">Store ↗</a>`
                : ""
            }
          </div>
        </div>`;
              })
              .join("")
      }
    </div>

    <!-- Blessings Feed -->
    ${
      contributions.length > 0
        ? `
      <div class="blessings-card">
        <h3 style="font-size:16px; font-weight:800; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <span>💌</span> Well-Wishes & Blessings (${contributions.length})
        </h3>
        <div>
          ${contributions
            .slice(0, 15)
            .map(
              (c) => `
            <div class="blessing-item">
              <div class="blessing-header">
                <span class="blessing-name">${escapeHtml(c.contributorName)}</span>
                <span class="blessing-amount">₹${c.amount.toLocaleString("en-IN")}</span>
              </div>
              ${c.message ? `<div class="blessing-msg">"${escapeHtml(c.message)}"</div>` : ""}
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `
        : ""
    }

    <!-- Footer -->
    <div class="footer-brand">
      Powered by <strong>CelebrateHub</strong> · Modern Celebrations
    </div>
  </div>

  <!-- Claim Modal -->
  <div class="modal-overlay" id="claim-modal">
    <div class="modal-box">
      <button class="modal-close" onclick="closeModals()">✕</button>
      <div class="modal-title">Promise this Gift</div>
      <div class="modal-sub" id="claim-item-name">You are promising to bring or ship this gift.</div>

      <form id="claim-form" onsubmit="submitClaim(event)">
        <input type="hidden" id="claim-item-id">
        <div class="form-group">
          <label class="form-label">Your Full Name *</label>
          <input type="text" id="claimant-name" class="form-input" placeholder="e.g. Ananya Patel" required>
        </div>

        <button type="submit" class="btn btn-primary" id="claim-submit-btn" style="width:100%; margin-top:8px;">
          Confirm Gift Promise
        </button>
      </form>
    </div>
  </div>

  <!-- Contribute / Cash Blessing Modal -->
  <div class="modal-overlay" id="contribute-modal">
    <div class="modal-box">
      <button class="modal-close" onclick="closeModals()">✕</button>
      <div class="modal-title">Send Cash Blessing</div>
      <div class="modal-sub" id="contribute-target-name">Send your heartfelt congratulations & cash gift.</div>

      <form id="contribute-form" onsubmit="submitContribution(event)">
        <input type="hidden" id="contribute-gift-id">

        <div class="form-group">
          <label class="form-label">Select Amount (₹)</label>
          <div class="amount-chips">
            <div class="chip" onclick="selectChip(500, this)">₹500</div>
            <div class="chip selected" onclick="selectChip(1000, this)">₹1,000</div>
            <div class="chip" onclick="selectChip(2500, this)">₹2,500</div>
            <div class="chip" onclick="selectChip(5000, this)">₹5,000</div>
          </div>
          <input type="number" id="contrib-amount" class="form-input" value="1000" min="10" placeholder="Custom Amount" required>
        </div>

        <div class="form-group">
          <label class="form-label">Your Name *</label>
          <input type="text" id="contrib-name" class="form-input" placeholder="e.g. Ramesh & Sunita" required>
        </div>

        <div class="form-group">
          <label class="form-label">Personal Blessing / Note</label>
          <textarea id="contrib-message" class="form-input" style="height:68px; resize:none;" placeholder="Wishing you endless joy and happiness!"></textarea>
        </div>

        <div class="form-group" style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="contrib-anon" style="width:16px; height:16px;">
          <label for="contrib-anon" style="font-size:13px; color:#52525B;">Keep my name anonymous to other guests</label>
        </div>

        <button type="submit" class="btn btn-primary" id="contrib-submit-btn" style="width:100%; margin-top:8px;">
          Send Blessing
        </button>
      </form>
    </div>
  </div>

  <script>
    var eventId = "${event.id}";
    var items = ${itemsJson};

    function filterCategory(cat, btn) {
      document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
      btn.classList.add('active');

      var cards = document.querySelectorAll('.gift-card');
      var visible = 0;
      cards.forEach(function(card) {
        var cardCat = card.getAttribute('data-category');
        if (cat === 'ALL' || cardCat === cat) {
          card.style.display = 'block';
          visible++;
        } else {
          card.style.display = 'none';
        }
      });
      document.getElementById('items-count').innerText = visible;
    }

    function openClaimModal(itemId, title) {
      document.getElementById('claim-item-id').value = itemId;
      document.getElementById('claim-item-name').innerText = 'You are promising: "' + title + '"';
      document.getElementById('claim-modal').classList.add('open');
      document.getElementById('claimant-name').focus();
    }

    function openContributeModal(itemId, title) {
      document.getElementById('contribute-gift-id').value = itemId || '';
      document.getElementById('contribute-target-name').innerText = title
        ? 'Contributing towards "' + title + '"'
        : 'Blessing for ${hostName}\\'s celebration';
      document.getElementById('contribute-modal').classList.add('open');
      document.getElementById('contrib-name').focus();
    }

    function closeModals() {
      document.querySelectorAll('.modal-overlay').forEach(function(m) { m.classList.remove('open'); });
    }

    function selectChip(val, el) {
      document.querySelectorAll('.chip').forEach(function(c) { c.classList.remove('selected'); });
      el.classList.add('selected');
      document.getElementById('contrib-amount').value = val;
    }

    // Submit Claim
    async function submitClaim(e) {
      e.preventDefault();
      var itemId = document.getElementById('claim-item-id').value;
      var name = document.getElementById('claimant-name').value.trim();
      var btn = document.getElementById('claim-submit-btn');

      if (!name) return;
      btn.innerText = 'Saving...';
      btn.disabled = true;

      try {
        var res = await fetch('/api/gifts/items/' + itemId + '/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claimedBy: name })
        });
        var json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Could not claim gift');

        closeModals();
        fireConfetti();

        // Update card in UI
        var card = document.getElementById('card-' + itemId);
        if (card) {
          var tags = card.querySelector('.card-tags');
          var pill = document.createElement('span');
          pill.className = 'pill pill-claimed';
          pill.innerText = '✓ Promised by ' + name;
          tags.appendChild(pill);

          var actions = card.querySelector('.card-actions');
          actions.innerHTML = '<button class="card-btn card-btn-claimed" disabled>Already Promised</button>';
        }

        // Increment stats
        var claimedEl = document.getElementById('stat-claimed');
        if (claimedEl) claimedEl.innerText = parseInt(claimedEl.innerText || '0', 10) + 1;

        alert('🎉 Thank you, ' + name + '! Your gift promise has been recorded and the host has been notified.');
      } catch (err) {
        alert(err.message || 'Could not claim gift');
      } finally {
        btn.innerText = 'Confirm Gift Promise';
        btn.disabled = false;
      }
    }

    // Submit Contribution
    async function submitContribution(e) {
      e.preventDefault();
      var giftItemId = document.getElementById('contribute-gift-id').value;
      var amount = parseInt(document.getElementById('contrib-amount').value, 10);
      var name = document.getElementById('contrib-name').value.trim();
      var message = document.getElementById('contrib-message').value.trim();
      var isAnonymous = document.getElementById('contrib-anon').checked;
      var btn = document.getElementById('contrib-submit-btn');

      if (!name || isNaN(amount) || amount <= 0) return;
      btn.innerText = 'Contributing...';
      btn.disabled = true;

      try {
        var payload = {
          contributorName: name,
          amount: amount,
          message: message || undefined,
          isAnonymous: isAnonymous,
          giftItemId: giftItemId || undefined
        };

        var res = await fetch('/api/gifts/event/' + eventId + '/contribute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Could not record blessing');

        closeModals();
        fireConfetti();

        // Update total raised in UI
        var totalEl = document.getElementById('total-raised-display');
        if (totalEl) {
          var current = parseInt(totalEl.innerText.replace(/[^0-9]/g, '') || '0', 10);
          totalEl.innerText = '₹' + (current + amount).toLocaleString('en-IN');
        }

        var blessingsEl = document.getElementById('stat-blessings');
        if (blessingsEl) blessingsEl.innerText = parseInt(blessingsEl.innerText || '0', 10) + 1;

        alert('✨ Heartfelt thanks, ' + (isAnonymous ? 'Well-wisher' : name) + '! Your blessing of ₹' + amount.toLocaleString('en-IN') + ' has been sent to ' + '${hostName}' + '!');
      } catch (err) {
        alert(err.message || 'Could not send blessing');
      } finally {
        btn.innerText = 'Send Blessing';
        btn.disabled = false;
      }
    }

    // Simple Celebration Confetti
    function fireConfetti() {
      var canvas = document.getElementById('confetti-canvas');
      var ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      var pieces = [];
      var colors = ['#4F46E5', '#D4AF37', '#10B981', '#EC4899', '#F59E0B', '#3B82F6'];

      for (var i = 0; i < 90; i++) {
        pieces.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.4,
          r: Math.random() * 6 + 4,
          d: Math.random() * 90,
          color: colors[Math.floor(Math.random() * colors.length)],
          tilt: Math.floor(Math.random() * 10) - 10,
          tiltAngleIncremental: Math.random() * 0.07 + 0.05,
          tiltAngle: 0
        });
      }

      var animationFrame;
      var startTime = Date.now();

      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(function(p) {
          p.tiltAngle += p.tiltAngleIncremental;
          p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
          p.x += Math.sin(p.d);
          p.tilt = Math.sin(p.tiltAngle) * 15;

          ctx.beginPath();
          ctx.lineWidth = p.r;
          ctx.strokeStyle = p.color;
          ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
          ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
          ctx.stroke();
        });

        if (Date.now() - startTime < 3500) {
          animationFrame = requestAnimationFrame(draw);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          cancelAnimationFrame(animationFrame);
        }
      }
      draw();
    }
  </script>
</body>
</html>`;
}
