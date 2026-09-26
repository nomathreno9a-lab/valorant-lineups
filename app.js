// ==============================================================================
// VALORANT 定点アシスタント Webビューア メインスクリプト
// - 4大スロット（マップローディング画面WebP、エージェント大アイコン、4スキル大アイコン、フリーワード）
// - 淡いアニメーションのマップ・エージェント選択モーダル
// - VALORANTログ（ShooterGame.log）からの対戦状況自動判定
// - 1430x900px まとめ画像生成＆Web版URL同時コピー
// ==============================================================================

// VALORANT 内部コードネームと日本語名のマッピング辞書
const AGENT_CODENAME_TO_JA = {
  "AggroBot": "ゲッコー", "Astra": "アストラ", "Rift": "アストラ", "BountyHunter": "フェイド",
  "Breach": "ブリーチ", "Brimstone": "ブリムストーン", "Sarge": "ブリムストーン", "Cable": "デッドロック",
  "Chamber": "チェンバー", "Deadeye": "チェンバー", "Clay": "レイズ", "Clove": "クローヴ", "Smonk": "クローヴ",
  "Cypher": "サイファー", "Gumshoe": "サイファー", "Deadlock": "デッドロック", "Fade": "フェイド",
  "Gekko": "ゲッコー", "Grenadier": "KAY/O", "Guide": "スカイ", "Harbor": "ハーバー", "Mage": "ハーバー",
  "Hunter": "ソーヴァ", "Iso": "アイソ", "Seeker": "アイソ", "Iris": "ミクス", "Jett": "ジェット",
  "Wushu": "ジェット", "Kayo": "KAY/O", "Killjoy": "キルジョイ", "Neon": "ネオン", "Sprinter": "ネオン",
  "Nox": "ヴィトー", "Omen": "オーメン", "Wraith": "オーメン", "Phoenix": "フェニックス", "Raze": "レイズ",
  "Reyna": "レイナ", "Vampire": "レイナ", "Sage": "セージ", "Thorne": "セージ", "Skye": "スカイ",
  "Sova": "ソーヴァ", "Tejo": "テホ", "Veto": "ヴィトー", "Viper": "ヴァイパー", "Pandemic": "ヴァイパー",
  "Vyse": "ヴァイス", "Metal": "ヴァイス", "Waylay": "ウェイレイ", "Yoru": "ヨル", "Stealth": "ヨル"
};

const MAP_CODENAME_TO_JA = {
  "Ascent": "アセント", "Split": "スプリット", "Bonsai": "スプリット", "Bind": "バインド",
  "Duality": "バインド", "Haven": "ヘイヴン", "Triad": "ヘイヴン", "Icebox": "アイスボックス",
  "Port": "アイスボックス", "Breeze": "ブリーズ", "Foxtrot": "ブリーズ", "Fracture": "フラクチャー",
  "Canyon": "フラクチャー", "Pearl": "パール", "Pitt": "パール", "Lotus": "ロータス", "Jam": "ロータス",
  "Sunset": "サンセット", "Juliett": "サンセット", "Abyss": "アビス", "Infinity": "アビス",
  "Corrode": "カロード", "Rook": "カロード", "Summit": "サミット", "Plummet": "サミット"
};

// マップ日本語名から英語名（アセット名）への対応
const MAP_JA_TO_EN = {
  "アセント": "Ascent", "スプリット": "Split", "バインド": "Bind", "ヘイヴン": "Haven",
  "アイスボックス": "Icebox", "ブリーズ": "Breeze", "フラクチャー": "Fracture", "パール": "Pearl",
  "ロータス": "Lotus", "サンセット": "Sunset", "アビス": "Abyss", "カロード": "Corrode", "サミット": "Summit"
};

// マップ別デフォルト角度（アタッカー視点基準）デスクトップアプリ完全準拠
const MAP_DEFAULT_ROTATIONS = {
  "アビス": 0, "アセント": 90, "カロード": 90, "ヘイヴン": 90,
  "サミット": 0, "スプリット": 90, "アイスボックス": 270,
  "バインド": 0, "ブリーズ": 0, "フラクチャー": 0, "パール": 0,
  "ロータス": 0, "サンセット": 0,
  "Abyss": 0, "Ascent": 90, "Corrode": 90, "Haven": 90,
  "Summit": 0, "Split": 90, "Icebox": 270,
  "Bind": 0, "Breeze": 0, "Fracture": 0, "Pearl": 0,
  "Lotus": 0, "Sunset": 0
};

// アプリ全体の状態管理
const state = {
  masters: null,
  allLineups: [],
  filteredLineups: [],
  selectedLineup: null,
  filters: {
    map: "",
    agent: "",
    ability: "",
    keyword: ""
  },
  currentMobileImage: "aim",
  currentMapSide: "atk" // "atk" | "def"
};

// ==============================================================================
// 1. 初期化とデータ読み込み
// ==============================================================================
window.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await loadMastersData();
  await loadLineupsData();

  // 初期スロット表示の更新
  updateSlotsDisplay();

  // URLディープリンク（?id=<cloud_id>）のチェック
  checkUrlDeepLink();

  // ログ自動連携の復元チェック
  initAutoLogOnLoad();
});

// マスタデータ（masters.json）の読み込み
async function loadMastersData() {
  try {
    const res = await fetch("assets/masters.json");
    if (res.ok) {
      state.masters = await res.json();
      renderMapDrawerGrid();
      renderAgentDrawerGrid();
    }
  } catch (err) {
    console.error("masters.json 読み込み失敗:", err);
  }
}

// 定点データ（lineups_master.json）の読み込み
async function loadLineupsData(bypassCache = false) {
  try {
    const url = bypassCache ? `lineups_master.json?t=${Date.now()}` : "lineups_master.json";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      state.allLineups = data.lineups || [];
      state.allLineups.sort(compareLineups);
      applyFilters();
      return true;
    }
  } catch (err) {
    console.warn("lineups_master.json 読み込みエラー:", err);
    state.allLineups = [];
    applyFilters();
    return false;
  }
}

// クラウド定点キャッシュの手動更新処理
async function refreshLineupsCache() {
  const btn = document.getElementById("btn-refresh-cache");
  const icon = document.getElementById("refresh-icon");
  const text = document.getElementById("refresh-btn-text");

  if (btn) btn.disabled = true;
  if (icon) icon.classList.add("spin-icon");
  if (text) text.textContent = "更新中...";

  try {
    const ok = await loadLineupsData(true);
    if (ok) {
      // 選択中定点があれば最新データで再選択
      if (state.selectedLineup) {
        const selCid = String(state.selectedLineup.cloud_id || "").trim();
        const reFound = state.allLineups.find(l => String(l.cloud_id || "").trim() === selCid);
        if (reFound) {
          selectLineup(reFound);
        }
      }
      showToast(`データを最新に更新しました (全 ${state.allLineups.length} 件)`);
    } else {
      showToast("データの更新に失敗しました");
    }
  } catch (e) {
    console.error("refreshLineupsCache error:", e);
    showToast("データ更新中にエラーが発生しました");
  } finally {
    if (btn) btn.disabled = false;
    if (icon) icon.classList.remove("spin-icon");
    if (text) text.textContent = "データ更新";
  }
}

// URLディープリンクのチェック (cloud_id のみで一意判定)
function checkUrlDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const targetId = params.get("id");
  if (!targetId || !state.allLineups.length) return;

  const cleanTarget = targetId.replace(/^cloud_/, "").trim();
  const found = state.allLineups.find(l => {
    const cid = String(l.cloud_id || "").trim();
    return cid === cleanTarget || cid === targetId;
  });

  if (found) {
    state.filters.map = found.map || "";
    state.filters.agent = found.agent || "";
    state.filters.ability = found.ability || "";
    updateSlotsDisplay();
    applyFilters();
    selectLineup(found);

    if (window.innerWidth <= 960) {
      switchMobileTab("detail");
    }
  } else {
    showToast("指定された定点が見つかりませんでした");
  }
}

// ==============================================================================
// 2. 4大スロットの表示更新
// ==============================================================================
function updateSlotsDisplay() {
  // 1. マップスロット
  const mapBg = document.getElementById("slot-map-bg");
  const mapTitle = document.getElementById("slot-map-title");
  if (state.filters.map) {
    const enName = MAP_JA_TO_EN[state.filters.map] || state.filters.map;
    if (mapBg) mapBg.style.backgroundImage = `url('assets/maps/loading/${enName}.webp')`;
    if (mapTitle) mapTitle.textContent = state.filters.map;
  } else {
    // マップ未選択（全マップ）の場合は画像を非表示にし、ダーク背景にする
    if (mapBg) mapBg.style.backgroundImage = "none";
    if (mapTitle) mapTitle.textContent = "全マップ";
  }

  // 2. エージェントスロット
  const agentImg = document.getElementById("slot-agent-img");
  const agentPlaceholder = document.getElementById("slot-agent-placeholder");
  const agentTitle = document.getElementById("slot-agent-title");
  if (state.filters.agent && state.masters) {
    const agentObj = state.masters.agents.find(a => a.name === state.filters.agent);
    const iconDir = agentObj ? (agentObj.icon || agentObj.name) : state.filters.agent;
    if (agentImg) {
      agentImg.src = `assets/agents/${iconDir}/display_icon.png`;
      agentImg.style.display = "block";
    }
    if (agentPlaceholder) agentPlaceholder.style.display = "none";
    if (agentTitle) agentTitle.textContent = state.filters.agent;
  } else {
    if (agentImg) agentImg.style.display = "none";
    if (agentPlaceholder) agentPlaceholder.style.display = "block";
    if (agentTitle) agentTitle.textContent = "全エージェント";
  }

  // 3. スキルスロット (大きめ4アイコンのみ)
  renderAbilityIconsSlot();

  // ドロワー内の選択状態も同期更新
  highlightDrawerSelection();
}

function renderAbilityIconsSlot() {
  const container = document.getElementById("ability-icons-row");
  if (!container) return;

  if (!state.filters.agent || !state.masters) {
    container.innerHTML = `<div class="ability-placeholder-text">エージェントを選択してください</div>`;
    return;
  }

  const agentObj = state.masters.agents.find(a => a.name === state.filters.agent);
  if (!agentObj || !agentObj.abilities || !agentObj.abilities.length) {
    container.innerHTML = `<div class="ability-placeholder-text">スキル情報なし</div>`;
    return;
  }

  const iconDir = agentObj.icon || agentObj.name;
  let html = "";
  agentObj.abilities.forEach(ab => {
    const iconName = ab.icon || ab.name;
    const isSelected = (state.filters.ability === ab.name);
    const activeClass = isSelected ? "active" : "";
    html += `
      <button class="ability-icon-btn ${activeClass}" data-ability="${ab.name}" title="${ab.name}">
        <img src="assets/agents/${iconDir}/abilities/${iconName}.png" alt="${ab.name}" onerror="this.style.opacity='0.3'">
      </button>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll(".ability-icon-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetAb = btn.dataset.ability;
      if (state.filters.ability === targetAb) {
        state.filters.ability = ""; // 選択解除
      } else {
        state.filters.ability = targetAb;
      }
      renderAbilityIconsSlot();
      applyFilters();
    });
  });
}

// ==============================================================================
// 3. 下側展開ドロワー (アコーディオンアニメーション表示)
// ==============================================================================
function renderMapDrawerGrid() {
  const grid = document.getElementById("drawer-map-grid");
  if (!grid || !state.masters || !state.masters.maps) return;

  // 「全マップ (解除)」カード（未選択時は画像なしのダーク背景）
  let html = `
    <div class="map-picker-card" data-map="" style="background-color: #1a2230;">
      <span class="map-picker-title">全マップ (解除)</span>
    </div>
  `;

  state.masters.maps.forEach(m => {
    const enName = m.icon || m.name;
    const imgUrl = `assets/maps/loading/${enName}.webp`;
    html += `
      <div class="map-picker-card" data-map="${m.name}" style="background-image: url('${imgUrl}');">
        <span class="map-picker-title">${m.name}</span>
      </div>
    `;
  });

  grid.innerHTML = html;

  grid.querySelectorAll(".map-picker-card").forEach(card => {
    card.addEventListener("click", () => {
      state.filters.map = card.dataset.map;
      closeAllDrawers();
      updateSlotsDisplay();
      applyFilters();
    });
  });
}

function renderAgentDrawerGrid() {
  const grid = document.getElementById("drawer-agent-grid");
  if (!grid || !state.masters || !state.masters.agents) return;

  // 「全エージェント」カード
  let html = `
    <div class="agent-picker-card" data-agent="">
      <div style="width: 44px; height: 44px; border-radius: 6px; background-color: #1e293b; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #94a3b8;">&#x25C9;</div>
      <span class="agent-picker-name">全エージェント</span>
    </div>
  `;

  state.masters.agents.forEach(a => {
    const iconDir = a.icon || a.name;
    const imgUrl = `assets/agents/${iconDir}/display_icon.png`;
    html += `
      <div class="agent-picker-card" data-agent="${a.name}">
        <img src="${imgUrl}" alt="${a.name}" onerror="this.src=''">
        <span class="agent-picker-name">${a.name}</span>
      </div>
    `;
  });

  grid.innerHTML = html;

  grid.querySelectorAll(".agent-picker-card").forEach(card => {
    card.addEventListener("click", () => {
      const newAgent = card.dataset.agent;
      state.filters.agent = newAgent;
      state.filters.ability = ""; // キャラ変更時はスキル選択リセット
      closeAllDrawers();
      updateSlotsDisplay();
      applyFilters();
    });
  });
}

// ドロワー内の選択状態ハイライト
function highlightDrawerSelection() {
  const mapCards = document.querySelectorAll("#drawer-map-grid .map-picker-card");
  mapCards.forEach(c => {
    c.classList.toggle("selected", c.dataset.map === state.filters.map);
  });

  const agentCards = document.querySelectorAll("#drawer-agent-grid .agent-picker-card");
  agentCards.forEach(c => {
    c.classList.toggle("selected", c.dataset.agent === state.filters.agent);
  });
}

// ドロワーの開閉トグル
function toggleDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;

  const isOpen = drawer.classList.contains("open");
  closeAllDrawers();

  if (!isOpen) {
    drawer.classList.add("open");
    // スロットの矢印を回転
    if (drawerId === "drawer-map") {
      const chev = document.querySelector("#slot-map .slot-chevron");
      if (chev) chev.classList.add("open");
    } else if (drawerId === "drawer-agent") {
      const chev = document.querySelector("#slot-agent .slot-chevron");
      if (chev) chev.classList.add("open");
    }
  }
}

// 全ドロワーを閉じる
function closeAllDrawers() {
  document.querySelectorAll(".expand-drawer").forEach(d => d.classList.remove("open"));
  document.querySelectorAll(".slot-chevron").forEach(c => c.classList.remove("open"));
}

// ==============================================================================
// 4. イベントリスナー
// ==============================================================================
function setupEventListeners() {
  // スロットクリックで下側ドロワーを開閉
  const slotMap = document.getElementById("slot-map");
  if (slotMap) {
    slotMap.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDrawer("drawer-map");
    });
  }

  const slotAgent = document.getElementById("slot-agent");
  if (slotAgent) {
    slotAgent.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDrawer("drawer-agent");
    });
  }

  // ドロワー内の閉じるボタン
  const btnCloseMap = document.getElementById("btn-close-map-drawer");
  if (btnCloseMap) {
    btnCloseMap.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDrawers();
    });
  }

  const btnCloseAgent = document.getElementById("btn-close-agent-drawer");
  if (btnCloseAgent) {
    btnCloseAgent.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDrawers();
    });
  }

  // ドロワー外部クリックで閉じる
  document.addEventListener("click", (e) => {
    const isMapSlot = e.target.closest("#slot-map");
    const isAgentSlot = e.target.closest("#slot-agent");
    const isDrawer = e.target.closest(".expand-drawer");
    if (!isMapSlot && !isAgentSlot && !isDrawer) {
      closeAllDrawers();
    }
  });

  // ESCキーでドロワーを閉じる
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllDrawers();
    }
  });

  // データ更新ボタン (キャッシュバイパス取得)
  const btnRefresh = document.getElementById("btn-refresh-cache");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", refreshLineupsCache);
  }

  // フリーワード検索入力 (日本語IME変換中のちらつき防止)
  const searchInput = document.getElementById("keyword-search-input");
  const clearBtn = document.getElementById("btn-clear-search");
  let isComposing = false;
  if (searchInput) {
    searchInput.addEventListener("compositionstart", () => {
      isComposing = true;
    });
    searchInput.addEventListener("compositionend", () => {
      isComposing = false;
      state.filters.keyword = searchInput.value.trim().toLowerCase();
      if (clearBtn) clearBtn.style.display = state.filters.keyword ? "block" : "none";
      applyFilters();
    });
    searchInput.addEventListener("input", () => {
      if (isComposing) return;
      state.filters.keyword = searchInput.value.trim().toLowerCase();
      if (clearBtn) clearBtn.style.display = state.filters.keyword ? "block" : "none";
      applyFilters();
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      state.filters.keyword = "";
      clearBtn.style.display = "none";
      applyFilters();
    });
  }

  // ログ自動連携ボタン ＆ パスコピーボタン
  const btnReadLog = document.getElementById("btn-read-log");
  const btnCopyPath = document.getElementById("btn-copy-log-path");
  const logFileInput = document.getElementById("log-file-input");
  if (btnReadLog) {
    btnReadLog.addEventListener("click", handleAutoLogButtonClick);
  }
  if (btnCopyPath) {
    btnCopyPath.addEventListener("click", handleCopyLogPath);
  }
  if (logFileInput) {
    logFileInput.addEventListener("change", handleLogFileSelect);
  }

  // 共有ボタン
  const btnShare = document.getElementById("btn-share-lineup");
  if (btnShare) {
    btnShare.addEventListener("click", handleShareCurrentLineup);
  }

  // モバイル用タブ切り替え
  const tabList = document.getElementById("tab-btn-list");
  const tabDetail = document.getElementById("tab-btn-detail");
  if (tabList) tabList.addEventListener("click", () => switchMobileTab("list"));
  if (tabDetail) tabDetail.addEventListener("click", () => switchMobileTab("detail"));

  // モバイル用 画像表示切り替えタブ
  document.querySelectorAll(".m-img-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".m-img-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      state.currentMobileImage = tab.dataset.imgTarget;
      updateMobileImageVisibility();
    });
  });

  // ミニマップ アタッカー／ディフェンダー視点切り替え
  const btnSideAtk = document.getElementById("btn-side-atk");
  const btnSideDef = document.getElementById("btn-side-def");
  if (btnSideAtk) {
    btnSideAtk.addEventListener("click", () => setMapSide("atk"));
  }
  if (btnSideDef) {
    btnSideDef.addEventListener("click", () => setMapSide("def"));
  }

  // 全体ミニマップ（上半分）のズーム＆パンイベント登録
  setupOverviewMinimapEvents();

  // ウィンドウリサイズ時にピンと赤丸の位置を再計算
  window.addEventListener("resize", () => {
    if (state.selectedLineup) {
      updateMinimapPins(state.selectedLineup);
      updateZoomRing(state.selectedLineup);
    }
    updateOverviewMinimap();
    updateMobileImageVisibility();
  });
}

// スキルスロット順定義 (C -> Q -> E -> X)
const SLOT_ORDER = { 'C': 1, 'Q': 2, 'E': 3, 'X': 4 };

function getSlotRank(abilityStr) {
  if (!abilityStr) return 99;
  const s = String(abilityStr).trim();
  if (s.length >= 2 && s[1] === '-' && SLOT_ORDER[s[0].toUpperCase()]) {
    return SLOT_ORDER[s[0].toUpperCase()];
  }
  if (SLOT_ORDER[s[0].toUpperCase()]) {
    return SLOT_ORDER[s[0].toUpperCase()];
  }
  return 99;
}

// 階層ソート比較関数 (マップ名50音 ➔ エージェント名50音 ➔ スキル順 ➔ クラウドID昇順)
function compareLineups(a, b) {
  // 1. マップ名50音順
  const mapA = String(a.map || a.map_name || "");
  const mapB = String(b.map || b.map_name || "");
  const mapCmp = mapA.localeCompare(mapB, "ja");
  if (mapCmp !== 0) return mapCmp;

  // 2. エージェント名50音順
  const agentA = String(a.agent || "");
  const agentB = String(b.agent || "");
  const agentCmp = agentA.localeCompare(agentB, "ja");
  if (agentCmp !== 0) return agentCmp;

  // 3. スキル順 (C -> Q -> E -> X)
  const rankA = getSlotRank(a.ability);
  const rankB = getSlotRank(b.ability);
  if (rankA !== rankB) return rankA - rankB;

  const abA = String(a.ability || "");
  const abB = String(b.ability || "");
  const abCmp = abA.localeCompare(abB, "ja");
  if (abCmp !== 0) return abCmp;

  // 4. クラウドID順 (昇順)
  const cidA = String(a.cloud_id || "");
  const cidB = String(b.cloud_id || "");
  return cidA.localeCompare(cidB);
}

// フィルター適用
function applyFilters() {
  const { map, agent, ability, keyword } = state.filters;

  state.filteredLineups = state.allLineups.filter(item => {
    if (map && item.map !== map) return false;
    if (agent && item.agent !== agent) return false;
    if (ability && item.ability !== ability) return false;
    if (keyword) {
      const fullText = `${item.map || ""} ${item.agent || ""} ${item.ability || ""} ${item.start_loc || ""} ${item.end_loc || ""} ${item.throw_type || ""} ${item.notes || ""}`.toLowerCase();
      const words = keyword.split(/\s+/);
      for (const w of words) {
        if (w && !fullText.includes(w)) return false;
      }
    }
    return true;
  });

  // マップ50音 ➔ エージェント50音 ➔ スキル順 ➔ クラウドID順 でソート
  state.filteredLineups.sort(compareLineups);

  renderLineupCards();
  updateOverviewMinimap();
}

// HTML特殊文字エスケープ
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 定点一覧カードのレンダリング (アプリ完全準拠・エージェント/スキル画像なし)
function renderLineupCards() {
  const container = document.getElementById("lineup-cards-container");
  const countBadge = document.getElementById("list-count-badge");
  const mobileCount = document.getElementById("mobile-lineup-count");
  if (!container) return;

  const count = state.filteredLineups.length;
  if (countBadge) countBadge.textContent = `${count} 件`;
  if (mobileCount) mobileCount.textContent = `${count}`;

  if (count === 0) {
    container.innerHTML = `
      <div style="padding: 28px 12px; text-align: center; color: var(--text-dim); font-size: 13px;">
        条件に一致する定点が見つかりませんでした
      </div>
    `;
    return;
  }

  let html = "";
  state.filteredLineups.forEach(item => {
    const isSelected = state.selectedLineup && Boolean(item.cloud_id) && (state.selectedLineup.cloud_id === item.cloud_id);
    const activeClass = isSelected ? "active" : "";

    const enName = MAP_JA_TO_EN[item.map] || item.map;
    const splashImg = `assets/maps/splash/${enName}.webp`;

    // クラウドバッジ
    const cloudBadgeHtml = `
      <span class="badge-cloud-icon" title="クラウド定点">
        <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>
      </span>`;

    // NEWバッジ
    const newBadgeHtml = item.is_new ? `<span class="badge-new">NEW</span>` : "";

    html += `
      <div class="custom-lineup-card ${activeClass}" data-key="${item.cloud_id}" style="background-image: url('${splashImg}');">
        <div class="card-center-texts">
          <div class="card-row-top">
            <span>[${escapeHtml(item.map)}] ${escapeHtml(item.agent)}</span>
          </div>
          <div class="card-row-mid">${escapeHtml(item.ability)}</div>
          <div class="card-row-bot">(${escapeHtml(item.start_loc || "立ち位置")} ➔ ${escapeHtml(item.end_loc || "着弾位置")})</div>
        </div>
        <div class="card-right-badges">
          ${cloudBadgeHtml}
          ${newBadgeHtml}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll(".custom-lineup-card").forEach(card => {
    card.addEventListener("click", () => {
      const key = card.dataset.key;
      const target = state.filteredLineups.find(l => String(l.cloud_id || "").trim() === key);
      if (target) {
        selectLineup(target);
        if (window.innerWidth <= 960) {
          switchMobileTab("detail");
        }
      }
    });
  });
}

// ==============================================================================
// 5. 定点詳細プレビュー表示
// ==============================================================================
function selectLineup(lineup) {
  state.selectedLineup = lineup;

  // カードのアクティブ状態更新
  document.querySelectorAll(".custom-lineup-card").forEach(card => {
    card.classList.toggle("active", card.dataset.key == (lineup.cloud_id || lineup.id));
  });

  // 全体ミニマップのアクティブピン更新
  document.querySelectorAll(".overview-pin").forEach(pin => {
    pin.classList.toggle("is-active", pin.dataset.key == (lineup.cloud_id || lineup.id));
  });

  const emptyBox = document.getElementById("preview-empty-state");
  const contentBox = document.getElementById("preview-content-box");
  if (emptyBox) emptyBox.style.display = "none";
  if (contentBox) contentBox.style.display = "flex";

  // タイトル・ヘッダー情報
  const titleEl = document.getElementById("view-title");
  if (titleEl) titleEl.textContent = `${lineup.map} - ${lineup.agent} (${lineup.ability})`;

  document.getElementById("tag-map").textContent = lineup.map || "マップ未指定";
  document.getElementById("tag-agent").textContent = lineup.agent || "エージェント";
  document.getElementById("tag-ability").textContent = lineup.ability || "スキル";
  document.getElementById("tag-loc").textContent = `${lineup.start_loc || "立ち位置"} ➔ ${lineup.end_loc || "着弾位置"}`;
  document.getElementById("tag-throw").textContent = lineup.throw_type || "立ち投げ";
  document.getElementById("view-notes").textContent = `メモ: ${lineup.notes || "特になし"}`;

  // ヘッダー背景（スプラッシュアート）
  const headerCard = document.getElementById("title-info-card");
  if (headerCard && state.masters) {
    const mapObj = state.masters.maps.find(m => m.name === lineup.map);
    const splashName = mapObj ? (mapObj.icon || mapObj.name) : "Ascent";
    headerCard.style.backgroundImage = `url('assets/maps/splash/${splashName}.webp')`;
  }

  // 1. 全体画面・立ち位置・拡大図の画像URL解決
  const aimUrl = resolveImageUrl(lineup.img_aim);
  const standUrl = resolveImageUrl(lineup.img_stand);
  const zoomUrl = resolveImageUrl(lineup.img_zoom);

  const imgAim = document.getElementById("img-aim-view");
  const imgStand = document.getElementById("img-stand-view");
  const imgZoom = document.getElementById("img-zoom-view");

  if (imgAim) imgAim.src = aimUrl;
  if (imgStand) imgStand.src = standUrl;
  if (imgZoom) {
    imgZoom.src = zoomUrl;
    if (imgZoom.complete && imgZoom.naturalWidth) {
      updateZoomRing(lineup);
    } else {
      imgZoom.onload = () => updateZoomRing(lineup);
    }
  }

  // 2. ミニマップおよび青・赤ピンの更新
  updateMinimapPins(lineup);

  if (window.innerWidth <= 960) {
    updateMobileImageVisibility();
  }
}

// ミニマップの陣営切り替え（アタッカー／ディフェンダー）
function setMapSide(side) {
  if (state.currentMapSide === side) return;
  state.currentMapSide = side;

  const btnAtk = document.getElementById("btn-side-atk");
  const btnDef = document.getElementById("btn-side-def");
  if (btnAtk) {
    btnAtk.classList.toggle("active-atk", side === "atk");
  }
  if (btnDef) {
    btnDef.classList.toggle("active-def", side === "def");
  }

  if (state.selectedLineup) {
    updateMinimapPins(state.selectedLineup);
  }
}

// 0°基準元画像座標 (origX, origY) -> 表示用回転後画面座標 (dispX, dispY)
function origCoordToDispCoord(origX, origY, rot) {
  let dispX = origX;
  let dispY = origY;
  const r = ((rot % 360) + 360) % 360;
  if (r === 90) {
    dispX = 1023 - origY;
    dispY = origX;
  } else if (r === 180) {
    dispX = 1023 - origX;
    dispY = 1023 - origY;
  } else if (r === 270) {
    dispX = origY;
    dispY = 1023 - origX;
  }
  return {
    x: Math.max(0, Math.min(1023, dispX)),
    y: Math.max(0, Math.min(1023, dispY))
  };
}

// 画像が object-fit: contain で表示される場合の実際の描画領域 (x, y, width, height) を計算
function getDrawnImageRect(containerEl, imgEl) {
  const box = containerEl.getBoundingClientRect();
  const nw = imgEl.naturalWidth;
  const nh = imgEl.naturalHeight;
  if (!nw || !nh || box.width <= 0 || box.height <= 0) {
    return { x: 0, y: 0, width: box.width, height: box.height };
  }
  const scale = Math.min(box.width / nw, box.height / nh);
  const width = nw * scale;
  const height = nh * scale;
  const x = (box.width - width) / 2;
  const y = (box.height - height) / 2;
  return { x, y, width, height };
}

// ミニマップおよび青・赤ピンの描画更新（デスクトップアプリ完全準拠・正確ピクセル配置・陣営回転対応）
function updateMinimapPins(lineup) {
  const pinStart = document.getElementById("pin-start-marker");
  const pinEnd = document.getElementById("pin-end-marker");
  const imgMinimap = document.getElementById("img-minimap-view");
  const viewport = document.getElementById("minimap-viewport");
  if (!pinStart || !pinEnd || !imgMinimap || !viewport) return;

  // ミニマップ画像を設定（同じマップならsrcを再代入せずチラつき・回転リセットを防止）
  const enName = MAP_JA_TO_EN[lineup.map] || lineup.map;
  const targetSrc = `assets/maps/${enName}.png`;
  if (imgMinimap.getAttribute("src") !== targetSrc) {
    imgMinimap.src = targetSrc;
  }

  // デスクトップアプリ完全準拠のデフォルト回転角を算出
  const baseRot = MAP_DEFAULT_ROTATIONS[lineup.map] ?? MAP_DEFAULT_ROTATIONS[enName] ?? 0;
  const currentRot = (state.currentMapSide === "atk") ? baseRot : ((baseRot + 180) % 360);
  imgMinimap.style.transform = `rotate(${currentRot}deg)`;

  const doUpdate = () => {
    const rect = viewport.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const size = Math.min(rect.width, rect.height);
    const offsetX = (rect.width - size) / 2;
    const offsetY = (rect.height - size) / 2;

    // 立ち位置ピン（青）: pos_x, pos_y (0〜1023)
    const px = parseFloat(lineup.pos_x);
    const py = parseFloat(lineup.pos_y);
    if (!isNaN(px) && !isNaN(py) && px > 0 && py > 0) {
      const dispStart = origCoordToDispCoord(px, py, currentRot);
      const pinX = offsetX + (dispStart.x / 1023.0) * size;
      const pinY = offsetY + (dispStart.y / 1023.0) * size;
      pinStart.style.left = `${pinX.toFixed(1)}px`;
      pinStart.style.top = `${pinY.toFixed(1)}px`;
      pinStart.style.display = "block";
      pinStart.title = `投げる位置: (${Math.round(px)}, ${Math.round(py)})`;
    } else {
      pinStart.style.display = "none";
    }

    // 着弾位置ピン（赤）: target_x, target_y (0〜1023)
    const tx = parseFloat(lineup.target_x);
    const ty = parseFloat(lineup.target_y);
    if (!isNaN(tx) && !isNaN(ty) && tx > 0 && ty > 0) {
      const dispEnd = origCoordToDispCoord(tx, ty, currentRot);
      const pinX = offsetX + (dispEnd.x / 1023.0) * size;
      const pinY = offsetY + (dispEnd.y / 1023.0) * size;
      pinEnd.style.left = `${pinX.toFixed(1)}px`;
      pinEnd.style.top = `${pinY.toFixed(1)}px`;
      pinEnd.style.display = "block";
      pinEnd.title = `着弾位置: (${Math.round(tx)}, ${Math.round(ty)})`;
    } else {
      pinEnd.style.display = "none";
    }
  };

  requestAnimationFrame(() => {
    doUpdate();
  });

  if (!imgMinimap.complete || !imgMinimap.naturalWidth) {
    imgMinimap.onload = () => {
      requestAnimationFrame(() => doUpdate());
    };
  }
}

// 拡大図の中空赤丸マーカー位置計算（実描画領域を基準に正確にピクセル配置）
function updateZoomRing(lineup) {
  const ring = document.getElementById("aim-target-ring");
  const imgZoom = document.getElementById("img-zoom-view");
  const container = document.querySelector(".zoom-canvas-wrap");
  if (!ring || !imgZoom || !container) return;

  const nw = imgZoom.naturalWidth || 400;
  const nh = imgZoom.naturalHeight || 400;

  const rawZx = parseFloat(lineup.zoom_pos_x);
  const rawZy = parseFloat(lineup.zoom_pos_y);
  const rawZr = parseFloat(lineup.zoom_size);

  const zx = !isNaN(rawZx) ? rawZx : (nw / 2);
  const zy = !isNaN(rawZy) ? rawZy : (nh / 2);
  const zr = !isNaN(rawZr) ? rawZr : 16.0;

  const rect = getDrawnImageRect(container, imgZoom);
  const scale = rect.width / nw;
  const cx = rect.x + (zx * scale);
  const cy = rect.y + (zy * scale);
  const r = Math.max(8, zr * scale);

  ring.style.left = `${cx.toFixed(1)}px`;
  ring.style.top = `${cy.toFixed(1)}px`;
  ring.style.width = `${(r * 2).toFixed(1)}px`;
  ring.style.height = `${(r * 2).toFixed(1)}px`;
  ring.style.display = "block";
}

function resolveImageUrl(rawPath) {
  if (!rawPath) return "";
  let p = String(rawPath).trim();
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  if (p.startsWith("/")) p = p.substring(1);
  if (p.startsWith("data/")) p = p.substring("data/".length);
  return p;
}

// ==============================================================================
// 6. VALORANTログ（ShooterGame.log）の自動連携・継続監視 (File System Access API & IndexedDB)
// ==============================================================================
let activeLogHandle = null;
let logWatchTimer = null;
let lastLogModified = 0;
let lastMatchedSummary = "";

// IndexedDB によるハンドル永続化
function openLogDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    const req = indexedDB.open("ValorantLogStore", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("handles");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function saveSavedLogHandle(handle) {
  try {
    const db = await openLogDB();
    if (!db) return;
    const tx = db.transaction("handles", "readwrite");
    tx.objectStore("handles").put(handle, "logHandle");
  } catch (e) {
    console.warn("ログハンドルの保存に失敗しました:", e);
  }
}

async function getSavedLogHandle() {
  try {
    const db = await openLogDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction("handles", "readonly");
      const req = tx.objectStore("handles").get("logHandle");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function clearSavedLogHandle() {
  try {
    const db = await openLogDB();
    if (!db) return;
    const tx = db.transaction("handles", "readwrite");
    tx.objectStore("handles").delete("logHandle");
  } catch (e) {}
}

// パス一発コピー処理
async function handleCopyLogPath() {
  const logFolderPath = "%LOCALAPPDATA%\\VALORANT\\Saved\\Logs";
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(logFolderPath);
    } else {
      throw new Error("Clipboard API unavailable");
    }
    showToast("ログの場所をコピーしました！ファイル選択画面のアドレス欄に貼り付けてください");
  } catch (err) {
    const input = document.createElement("textarea");
    input.value = logFolderPath;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand("copy");
      showToast("ログの場所をコピーしました！アドレス欄に貼り付けてください");
    } catch (e) {
      prompt("以下のパスをコピーしてファイル選択画面で貼り付けてください:", logFolderPath);
    }
    document.body.removeChild(input);
  }
}

// ログ自動連携ボタン押下時の処理
async function handleAutoLogButtonClick() {
  // すでに監視中の場合は一時停止
  if (logWatchTimer) {
    stopAutoLogWatcher();
    showToast("ログの自動追従を一時停止しました");
    return;
  }

  // File System Access API がサポートされている場合 (Chrome, Edge等)
  if (typeof window.showOpenFilePicker === "function") {
    try {
      let handle = activeLogHandle || (await getSavedLogHandle());
      let needPicker = true;

      if (handle) {
        // 保存済みハンドルの権限確認
        let perm = await handle.queryPermission({ mode: "read" });
        if (perm !== "granted") {
          perm = await handle.requestPermission({ mode: "read" });
        }
        if (perm === "granted") {
          try {
            const testFile = await handle.getFile();
            needPicker = false;
            activeLogHandle = handle;
          } catch (err) {
            needPicker = true;
            await clearSavedLogHandle();
          }
        }
      }

      if (needPicker) {
        showToast("ShooterGame.log を選択してください");
        const handles = await window.showOpenFilePicker({
          types: [
            {
              description: "VALORANT Log File (ShooterGame.log)",
              accept: { "text/plain": [".log", ".txt"] }
            }
          ],
          multiple: false
        });
        if (!handles || handles.length === 0) return;
        activeLogHandle = handles[0];
        await saveSavedLogHandle(activeLogHandle);
      }

      await startAutoLogWatcher(activeLogHandle);
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("ログ連携エラー:", e);
        showToast("ログファイル連携がキャンセルまたは失敗しました");
      }
    }
  } else {
    // 非対応ブラウザ（iOS Safari等）は従来のファイル選択にフォールバック
    const input = document.getElementById("log-file-input");
    if (input) input.click();
  }
}

// 監視開始処理
async function startAutoLogWatcher(handle) {
  if (!handle) return;
  activeLogHandle = handle;
  updateLogUIStatus(true, "自動追従中: ログ待機中");

  // 初回読み込み
  try {
    const file = await handle.getFile();
    lastLogModified = file.lastModified;
    const text = await file.text();
    parseValorantLog(text, false);
  } catch (e) {
    console.warn("初回ログ読み込みエラー:", e);
  }

  // 2秒ごとの定期ポーリング
  if (logWatchTimer) clearInterval(logWatchTimer);
  logWatchTimer = setInterval(async () => {
    try {
      if (!activeLogHandle) return;
      const file = await activeLogHandle.getFile();
      if (file.lastModified !== lastLogModified) {
        lastLogModified = file.lastModified;
        const text = await file.text();
        parseValorantLog(text, true); // true = 差分更新（静かに適用）
      }
    } catch (e) {
      console.warn("ログ自動更新チェックエラー:", e);
    }
  }, 2000);
}

// 監視停止処理
function stopAutoLogWatcher() {
  if (logWatchTimer) {
    clearInterval(logWatchTimer);
    logWatchTimer = null;
  }
  updateLogUIStatus(false, "未接続");
}

// UI表示の更新
function updateLogUIStatus(isWatching, statusText) {
  const btn = document.getElementById("btn-read-log");
  const btnText = document.getElementById("log-btn-text");
  const badge = document.getElementById("log-status-badge");

  if (btn) {
    btn.classList.toggle("watching", isWatching);
    if (btnText) {
      btnText.textContent = isWatching ? "自動追従中" : "ログ自動連携";
    }
  }

  if (badge) {
    badge.textContent = statusText;
    badge.classList.toggle("active", isWatching);
  }
}

// ページ起動時の自動復元チェック
async function initAutoLogOnLoad() {
  if (typeof window.showOpenFilePicker !== "function") {
    return;
  }
  const handle = await getSavedLogHandle();
  if (handle) {
    activeLogHandle = handle;
    const badge = document.getElementById("log-status-badge");
    if (badge) {
      badge.textContent = "前回連携あり (クリックで再開)";
    }
    // すでに許可されている場合は自動で監視を開始
    try {
      const perm = await handle.queryPermission({ mode: "read" });
      if (perm === "granted") {
        await startAutoLogWatcher(handle);
      }
    } catch (e) {}
  }
}

// 通常ファイル選択（非対応ブラウザ用フォールバック）
function handleLogFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target.result;
    parseValorantLog(content, false);
  };
  reader.readAsText(file);
}

function parseValorantLog(logText, isQuiet = false) {
  const badge = document.getElementById("log-status-badge");
  if (!logText) {
    if (!isQuiet) showToast("ログファイルが空です");
    return;
  }

  const lines = logText.split(/\r?\n/);
  let foundMapJa = null;
  let foundAgentJa = null;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];

    if (!foundAgentJa) {
      const mChar = line.match(/Current character:\s*(?:Default__)?([a-zA-Z0-9_]+?)(?:_PC_C)?\b/);
      if (mChar && mChar[1] !== "None") {
        const rawCode = mChar[1];
        if (AGENT_CODENAME_TO_JA[rawCode]) {
          foundAgentJa = AGENT_CODENAME_TO_JA[rawCode];
        }
      }
    }

    if (!foundMapJa) {
      const mMap1 = line.match(/\[Map Name:\s*([a-zA-Z0-9_]+)/);
      if (mMap1 && MAP_CODENAME_TO_JA[mMap1[1]]) {
        foundMapJa = MAP_CODENAME_TO_JA[mMap1[1]];
      } else {
        const mMap2 = line.match(/\/Game\/Maps\/([a-zA-Z0-9_]+)/);
        if (mMap2 && MAP_CODENAME_TO_JA[mMap2[1]]) {
          foundMapJa = MAP_CODENAME_TO_JA[mMap2[1]];
        }
      }
    }

    if (foundMapJa && foundAgentJa) break;
  }

  if (foundMapJa || foundAgentJa) {
    const matchKey = `${foundMapJa || ""}_${foundAgentJa || ""}`;
    const hasChanged = matchKey !== lastMatchedSummary;
    lastMatchedSummary = matchKey;

    if (foundMapJa) state.filters.map = foundMapJa;
    if (foundAgentJa) {
      state.filters.agent = foundAgentJa;
      state.filters.ability = "";
    }
    updateSlotsDisplay();
    applyFilters();

    const statusText = `自動追従中: ${foundMapJa || "マップ未定"} - ${foundAgentJa || "キャラ未定"}`;
    if (badge) {
      badge.textContent = statusText;
      badge.classList.add("active");
    }
    if (!isQuiet || hasChanged) {
      showToast(`${foundMapJa || "マップ"} - ${foundAgentJa || "キャラ"} を自動反映しました`);
    }
  } else {
    if (!isQuiet) {
      showToast("ログから有効な対戦データを検出できませんでした");
    }
  }
}

// ==============================================================================
// 7. 共有機能 (まとめ画像 + Web版URL同時コピー)
// ==============================================================================
async function handleShareCurrentLineup() {
  if (!state.selectedLineup) return;
  const btn = document.getElementById("btn-share-lineup");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "コピー中...";
  }

  try {
    const lineup = state.selectedLineup;
    const canvas = document.getElementById("share-canvas");
    const ctx = canvas.getContext("2d");

    await drawShareImageToCanvas(ctx, lineup);

    const targetKey = lineup.cloud_id;
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(targetKey)}`;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      throw new Error("画像の生成に失敗しました");
    }

    let writeSuccess = false;
    try {
      const data = [new ClipboardItem({
        "image/png": blob,
        "text/plain": new Blob([shareUrl], { type: "text/plain" })
      })];
      await navigator.clipboard.write(data);
      writeSuccess = true;
    } catch (e1) {
      try {
        const data = [new ClipboardItem({ "image/png": blob })];
        await navigator.clipboard.write(data);
        writeSuccess = true;
      } catch (e2) {
        console.warn("画像クリップボード書き込み失敗:", e2);
      }
    }

    if (!writeSuccess) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("URLのみクリップボードにコピーしました（ブラウザが画像直接コピー非対応です）");
        return;
      } catch (e3) {
        showToast("クリップボードにコピーできませんでした");
        return;
      }
    }

    if (btn) {
      btn.classList.add("success");
      btn.textContent = "画像＋URLコピー完了！";
      setTimeout(() => {
        btn.classList.remove("success");
        btn.textContent = "共有 (画像+URL)";
        btn.disabled = false;
      }, 1500);
    }

    showToast("まとめ画像とWeb版URLをクリップボードにコピーしました！");
  } catch (err) {
    console.error("共有エラー:", err);
    showToast("共有処理中にエラーが発生しました: " + err);
  } finally {
    if (btn && !btn.classList.contains("success")) {
      btn.textContent = "共有 (画像+URL)";
      btn.disabled = false;
    }
  }
}

// 1430x900px まとめ画像のCanvas描画
async function drawShareImageToCanvas(ctx, lineup) {
  const W = 1430, H = 900;
  ctx.fillStyle = "#0b0e14";
  ctx.fillRect(0, 0, W, H);

  // 1. 上段ヘッダーカード
  const hx = 20, hy = 14, hw = W - 40, hh = 88;
  ctx.save();
  roundRect(ctx, hx, hy, hw, hh, 12);
  ctx.clip();
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(hx, hy, hw, hh);

  if (state.masters) {
    const mapObj = state.masters.maps.find(m => m.name === lineup.map);
    const splashName = mapObj ? (mapObj.icon || mapObj.name) : "Ascent";
    try {
      const splashImg = await loadImage(`assets/maps/splash/${splashName}.webp`);
      ctx.drawImage(splashImg, hx, hy, hw, hh);
    } catch (e) {}
  }

  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.fillRect(hx, hy, hw, hh);
  ctx.restore();

  ctx.strokeStyle = "#2b374a";
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, hx, hy, hw, hh, 12);

  ctx.fillStyle = "#f5f6f8";
  ctx.font = "bold 20px Meiryo, sans-serif";
  ctx.fillText(`${lineup.map} - ${lineup.agent} (${lineup.ability})`, hx + 16, hy + 28);

  ctx.fillStyle = "#8e9aaf";
  ctx.font = "11px Meiryo, sans-serif";
  ctx.fillText("VALORANT 定点アシスタント", hx + hw - 170, hy + 26);

  const badges = [
    { text: lineup.map || "マップ", bg: "#0369a1", fg: "#ffffff" },
    { text: lineup.agent || "エージェント", bg: "#2e1065", fg: "#c084fc" },
    { text: lineup.ability || "スキル", bg: "#064e3b", fg: "#34d399" },
    { text: `${lineup.start_loc || "立ち位置"} ➔ ${lineup.end_loc || "着弾位置"}`, bg: "#1e2634", fg: "#f1f5f9" },
    { text: lineup.throw_type || "立ち投げ", bg: "#7c2d12", fg: "#fb923c" }
  ];

  let curBx = hx + 16;
  const by = hy + 40, bh = 18;
  ctx.font = "bold 11px Meiryo, sans-serif";
  badges.forEach(b => {
    const tw = ctx.measureText(b.text).width;
    const bw = tw + 14;
    ctx.fillStyle = b.bg;
    fillRoundRect(ctx, curBx, by, bw, bh, 4);
    ctx.fillStyle = b.fg;
    ctx.fillText(b.text, curBx + 7, by + 13);
    curBx += bw + 6;
  });

  ctx.fillStyle = "#8e9aaf";
  ctx.font = "12px Meiryo, sans-serif";
  ctx.fillText(`メモ: ${lineup.notes || "特になし"}`, hx + 16, hy + 76);

  // 2. メイン画像領域 (y: 114 ~ 884)
  const mainY = 114;
  const wImg = 624, hImg = 351;
  const cardLeftW = wImg + 4, cardLeftH = hImg + 28;
  const zImg = 742;
  const cardRightW = zImg + 4, cardRightH = zImg + 28;

  // 照準・全体画面プレビュー (アスペクト比維持 contain 描画)
  const c1x = 20, c1y = mainY;
  drawPreviewCardBg(ctx, c1x, c1y, cardLeftW, cardLeftH, "照準・全体画面プレビュー");
  try {
    const aimImg = await loadImage(resolveImageUrl(lineup.img_aim));
    drawContainedImage(ctx, aimImg, c1x + 2, c1y + 26, wImg, hImg);
  } catch (e) {}

  // 立ち位置 (アスペクト比維持 contain 描画)
  const c2x = 20, c2y = mainY + cardLeftH + 12;
  drawPreviewCardBg(ctx, c2x, c2y, cardLeftW, cardLeftH, "立ち位置");
  try {
    const standImg = await loadImage(resolveImageUrl(lineup.img_stand));
    drawContainedImage(ctx, standImg, c2x + 2, c2y + 26, wImg, hImg);
  } catch (e) {}

  // 拡大図 (照準合わせ位置)
  const c3x = 20 + cardLeftW + 16, c3y = mainY;
  drawPreviewCardBg(ctx, c3x, c3y, cardRightW, cardRightH, "拡大図 (照準合わせ位置)");
  try {
    const zoomImg = await loadImage(resolveImageUrl(lineup.img_zoom));
    ctx.drawImage(zoomImg, c3x + 2, c3y + 26, zImg, zImg);

    const nw = zoomImg.naturalWidth || 400;
    const nh = zoomImg.naturalHeight || 400;
    const rawZx = parseFloat(lineup.zoom_pos_x);
    const rawZy = parseFloat(lineup.zoom_pos_y);
    const rawZr = parseFloat(lineup.zoom_size);

    const zx = !isNaN(rawZx) ? rawZx : (nw / 2);
    const zy = !isNaN(rawZy) ? rawZy : (nh / 2);
    const zr = !isNaN(rawZr) ? rawZr : 16.0;

    const markScale = zImg / nw;
    const cx = c3x + 2 + (zx * markScale);
    const cy = c3y + 26 + (zy * markScale);
    const scaledR = Math.max(8, zr * markScale);

    ctx.beginPath();
    ctx.arc(cx, cy, scaledR, 0, Math.PI * 2);
    ctx.strokeStyle = "#ff4655";
    ctx.lineWidth = 4;
    ctx.stroke();
  } catch (e) {}
}

// アスペクト比を維持して指定矩形の中央に contain 描画する関数
function drawContainedImage(ctx, img, dx, dy, dw, dh) {
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  if (!nw || !nh) return;

  const imgAspect = nw / nh;
  const boxAspect = dw / dh;
  let drawW, drawH, ox, oy;

  if (imgAspect > boxAspect) {
    drawW = dw;
    drawH = dw / imgAspect;
    ox = dx;
    oy = dy + (dh - drawH) / 2;
  } else {
    drawH = dh;
    drawW = dh * imgAspect;
    ox = dx + (dw - drawW) / 2;
    oy = dy;
  }

  ctx.fillStyle = "#000000";
  ctx.fillRect(dx, dy, dw, dh);
  ctx.drawImage(img, ox, oy, drawW, drawH);
}

function drawPreviewCardBg(ctx, x, y, w, h, title) {
  ctx.fillStyle = "#0f141c";
  fillRoundRect(ctx, x, y, w, h, 10);
  ctx.strokeStyle = "#2b374a";
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x, y, w, h, 10);

  ctx.fillStyle = "#8e9aaf";
  ctx.font = "bold 13px Meiryo, sans-serif";
  ctx.fillText(title, x + 12, y + 18);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error("画像URLが空です"));
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
}

function strokeRoundRect(ctx, x, y, w, h, r) {
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
}

// ==============================================================================
// 8. モバイルタブ切り替え＆トースト通知
// ==============================================================================
function switchMobileTab(tab) {
  const tabList = document.getElementById("tab-btn-list");
  const tabDetail = document.getElementById("tab-btn-detail");
  const sidebar = document.getElementById("sidebar-lineup-list");
  const preview = document.getElementById("detail-preview-panel");

  if (tab === "list") {
    if (tabList) tabList.classList.add("active");
    if (tabDetail) tabDetail.classList.remove("active");
    if (sidebar) sidebar.classList.remove("mobile-hidden");
    if (preview) preview.classList.add("mobile-hidden");
  } else {
    if (tabList) tabList.classList.remove("active");
    if (tabDetail) tabDetail.classList.add("active");
    if (sidebar) sidebar.classList.add("mobile-hidden");
    if (preview) preview.classList.remove("mobile-hidden");
  }
}

function updateMobileImageVisibility() {
  const colAimStand = document.querySelector(".preview-col-aim-stand");
  const cardAim = document.getElementById("card-aim");
  const cardStand = document.getElementById("card-stand");
  const cardMinimap = document.getElementById("card-minimap");
  const cardZoom = document.getElementById("card-zoom");
  if (!cardAim || !cardStand || !cardMinimap || !cardZoom) return;

  if (window.innerWidth > 960) {
    if (colAimStand) colAimStand.classList.remove("mobile-hidden-card");
    cardAim.classList.remove("mobile-hidden-card");
    cardStand.classList.remove("mobile-hidden-card");
    cardMinimap.classList.remove("mobile-hidden-card");
    cardZoom.classList.remove("mobile-hidden-card");
    return;
  }

  const target = state.currentMobileImage;
  if (colAimStand) colAimStand.classList.toggle("mobile-hidden-card", target !== "aim" && target !== "stand");
  cardAim.classList.toggle("mobile-hidden-card", target !== "aim");
  cardStand.classList.toggle("mobile-hidden-card", target !== "stand");
  cardMinimap.classList.toggle("mobile-hidden-card", target !== "minimap");
  cardZoom.classList.toggle("mobile-hidden-card", target !== "zoom");
}

function showToast(message) {
  const toast = document.getElementById("toast-message");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// ==============================================================================
// 10. 左カラム上半分: マップ全体インタラクティブミニマップ
// ==============================================================================
const overviewMapState = {
  scale: 1.0,
  panX: 0,
  panY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  currentMap: null
};

function setupOverviewMinimapEvents() {
  const viewport = document.getElementById("overview-map-viewport");
  const stage = document.getElementById("overview-map-stage");
  const btnIn = document.getElementById("btn-zoom-in");
  const btnOut = document.getElementById("btn-zoom-out");
  const btnReset = document.getElementById("btn-zoom-reset");
  if (!viewport || !stage) return;

  const applyTransform = () => {
    stage.style.transform = `translate(${overviewMapState.panX}px, ${overviewMapState.panY}px) scale(${overviewMapState.scale})`;
  };

  // ホイールスクロールによるズーム
  viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.min(Math.max(overviewMapState.scale * zoomFactor, 1.0), 4.0);

    if (newScale === 1.0) {
      overviewMapState.scale = 1.0;
      overviewMapState.panX = 0;
      overviewMapState.panY = 0;
    } else {
      overviewMapState.panX = mouseX - (mouseX - overviewMapState.panX) * (newScale / overviewMapState.scale);
      overviewMapState.panY = mouseY - (mouseY - overviewMapState.panY) * (newScale / overviewMapState.scale);
      overviewMapState.scale = newScale;
    }
    applyTransform();
  }, { passive: false });

  // ドラッグによるパン操作
  viewport.addEventListener("mousedown", (e) => {
    if (e.target.closest(".overview-pin") || e.target.closest(".btn-map-control")) return;
    overviewMapState.isDragging = true;
    overviewMapState.dragStartX = e.clientX - overviewMapState.panX;
    overviewMapState.dragStartY = e.clientY - overviewMapState.panY;
    viewport.classList.add("is-dragging");
  });

  window.addEventListener("mousemove", (e) => {
    if (!overviewMapState.isDragging) return;
    overviewMapState.panX = e.clientX - overviewMapState.dragStartX;
    overviewMapState.panY = e.clientY - overviewMapState.dragStartY;
    applyTransform();
  });

  window.addEventListener("mouseup", () => {
    if (overviewMapState.isDragging) {
      overviewMapState.isDragging = false;
      viewport.classList.remove("is-dragging");
    }
  });

  // ズームボタン
  if (btnIn) {
    btnIn.addEventListener("click", () => {
      overviewMapState.scale = Math.min(overviewMapState.scale * 1.25, 4.0);
      applyTransform();
    });
  }
  if (btnOut) {
    btnOut.addEventListener("click", () => {
      overviewMapState.scale = Math.max(overviewMapState.scale / 1.25, 1.0);
      if (overviewMapState.scale === 1.0) {
        overviewMapState.panX = 0;
        overviewMapState.panY = 0;
      }
      applyTransform();
    });
  }
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      overviewMapState.scale = 1.0;
      overviewMapState.panX = 0;
      overviewMapState.panY = 0;
      applyTransform();
    });
  }
}

// 全体ミニマップのレンダリング・ピン配置
function updateOverviewMinimap() {
  const section = document.getElementById("overview-map-section");
  const imgMap = document.getElementById("img-overview-map");
  const pinsContainer = document.getElementById("overview-pins-container");
  const lineSvg = document.getElementById("overview-line-svg");
  const mapNameBadge = document.getElementById("overview-map-name");
  const viewport = document.getElementById("overview-map-viewport");
  const stage = document.getElementById("overview-map-stage");
  if (!section || !imgMap || !pinsContainer || !lineSvg) return;

  const currentMap = state.filters.map;

  // マップ未選択（全マップ）の場合は非表示
  if (!currentMap) {
    section.style.display = "none";
    overviewMapState.currentMap = null;
    return;
  }

  // 表示
  section.style.display = "flex";
  if (mapNameBadge) mapNameBadge.textContent = currentMap;

  const enName = MAP_JA_TO_EN[currentMap] || currentMap;
  const targetSrc = `assets/maps/${enName}.png`;

  if (overviewMapState.currentMap !== currentMap) {
    overviewMapState.currentMap = currentMap;
    overviewMapState.scale = 1.0;
    overviewMapState.panX = 0;
    overviewMapState.panY = 0;
    if (stage) stage.style.transform = "none";
  }

  if (imgMap.getAttribute("src") !== targetSrc) {
    imgMap.src = targetSrc;
  }

  const vpRect = viewport.getBoundingClientRect();
  const vpW = vpRect.width || 350;
  const vpH = vpRect.height || 260;
  const size = Math.min(vpW, vpH) - 10;
  const offsetX = Math.max(0, (vpW - size) / 2);
  const offsetY = Math.max(0, (vpH - size) / 2);

  imgMap.style.width = `${size}px`;
  imgMap.style.height = `${size}px`;
  imgMap.style.left = `${offsetX}px`;
  imgMap.style.top = `${offsetY}px`;

  lineSvg.style.width = `${vpW}px`;
  lineSvg.style.height = `${vpH}px`;

  pinsContainer.innerHTML = "";
  lineSvg.innerHTML = "";

  const activeKey = state.selectedLineup ? (state.selectedLineup.cloud_id || state.selectedLineup.id) : null;

  // 現在のマップに属する定点群から投げる位置(pos_x, pos_y)があるものを薄いピンでプロット
  state.filteredLineups.forEach((item) => {
    const px = parseFloat(item.pos_x);
    const py = parseFloat(item.pos_y);
    if (isNaN(px) || isNaN(py) || px <= 0 || py <= 0) return;

    const pinX = offsetX + (px / 1024.0) * size;
    const pinY = offsetY + (py / 1024.0) * size;

    const pin = document.createElement("div");
    pin.className = "overview-pin";
    const itemKey = item.cloud_id || item.id;
    if (activeKey && itemKey === activeKey) {
      pin.classList.add("is-active");
    }

    pin.style.left = `${pinX.toFixed(1)}px`;
    pin.style.top = `${pinY.toFixed(1)}px`;
    pin.dataset.key = itemKey;
    pin.title = `${item.agent || ""} - ${item.ability || ""}`;

    // ホバー時に濃く強調 ＆ 着弾位置への直線描画（着弾位置にピンは置かない）
    pin.addEventListener("mouseenter", () => {
      showOverviewHoverLine(item, pinX, pinY, size, offsetX, offsetY);
      showOverviewTooltip(item, pinX, pinY);
    });

    pin.addEventListener("mouseleave", () => {
      clearOverviewHoverLine();
      hideOverviewTooltip();
    });

    // クリックで該当定点を選択
    pin.addEventListener("click", (e) => {
      e.stopPropagation();
      selectLineup(item);

      // 下半分のカード一覧で該当カードへスクロール
      const card = document.querySelector(`.custom-lineup-card[data-key="${itemKey}"]`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });

    pinsContainer.appendChild(pin);
  });
}

// ホバー時直線描画（着弾位置にはピンは置かず直線＋十字ターゲットのみ）
function showOverviewHoverLine(item, startX, startY, mapSize, offsetX, offsetY) {
  const lineSvg = document.getElementById("overview-line-svg");
  if (!lineSvg) return;
  lineSvg.innerHTML = "";

  const tx = parseFloat(item.target_x);
  const ty = parseFloat(item.target_y);
  if (isNaN(tx) || isNaN(ty) || tx <= 0 || ty <= 0) return;

  const endX = offsetX + (tx / 1024.0) * mapSize;
  const endY = offsetY + (ty / 1024.0) * mapSize;

  // グローライン
  const glow = document.createElementNS("http://www.w3.org/2000/svg", "line");
  glow.setAttribute("x1", startX);
  glow.setAttribute("y1", startY);
  glow.setAttribute("x2", endX);
  glow.setAttribute("y2", endY);
  glow.setAttribute("stroke", "rgba(255, 70, 85, 0.45)");
  glow.setAttribute("stroke-width", "6");
  glow.setAttribute("stroke-linecap", "round");

  // メイン破線ライン
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", startX);
  line.setAttribute("y1", startY);
  line.setAttribute("x2", endX);
  line.setAttribute("y2", endY);
  line.setAttribute("stroke", "#ff4655");
  line.setAttribute("stroke-width", "2.2");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("stroke-dasharray", "5,3");

  // 着弾地点ターゲット（ピンは置かず十字ターゲットのみ）
  const cross = document.createElementNS("http://www.w3.org/2000/svg", "path");
  cross.setAttribute("d", `M ${endX - 5} ${endY} L ${endX + 5} ${endY} M ${endX} ${endY - 5} L ${endX} ${endY + 5}`);
  cross.setAttribute("stroke", "#ff4655");
  cross.setAttribute("stroke-width", "2");

  lineSvg.appendChild(glow);
  lineSvg.appendChild(line);
  lineSvg.appendChild(cross);
}

function clearOverviewHoverLine() {
  const lineSvg = document.getElementById("overview-line-svg");
  if (lineSvg) lineSvg.innerHTML = "";
}

function showOverviewTooltip(item, x, y) {
  const tooltip = document.getElementById("overview-tooltip");
  if (!tooltip) return;
  const title = `${escapeHtml(item.agent || "")} - ${escapeHtml(item.ability || "")}`;
  const path = `${escapeHtml(item.start_loc || "投げる位置")} ➔ ${escapeHtml(item.end_loc || "着弾位置")}`;
  tooltip.innerHTML = `<strong>${title}</strong><br><span style="color:#38bdf8;">${path}</span>`;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.style.display = "block";
}

function hideOverviewTooltip() {
  const tooltip = document.getElementById("overview-tooltip");
  if (tooltip) tooltip.style.display = "none";
}
