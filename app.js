// ============================================================
// CONFIGURATION
// ============================================================
const CARDS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdtcoqgPsn4JIkFDVYhyaFFtxjhpdI4zkI0kJw5745vTFTzdwQ6wc8czNPQznrHEroZ7_SasZ5EAnd/pub";

const LANGUAGE_CARD_TABS = {

  Spanish: {
    "Primary": "0",
    "Spanish 1": "205808895",
    "Spanish 2": "1458645106",
    "Spanish 3": "2121606325",
    "IB Spanish HL1": "178791964",
    "IB Spanish HL2": "901279306"
  },

  French: {
    "French 1": "1705935107",
    "French 2": "261179956",
    "French 3": "1787215808",
    "IB French HL1": "1119347960",
    "IB French HL2": "1193572625"
  },

  Korean: {
    "Korean 1": "1877065019"
  }

};

function getCardTabsForLanguage(language) {
  return LANGUAGE_CARD_TABS[language] || {};
}

const CARDS_SHEET_URL = CARDS_CSV_URL;

const ACCOUNTS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQOW8Q53UWa4lEsH1Sk9P_8KmWatSJCqjoCVpTA_uJ-XHH0HGsNzAaqyeuL-sBCNatAC4uAMhhlB6o3/pub?output=csv";
const BORED_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSJaLVNNtFXTgvxl_BVwGz4efup2RNkgyjdOBcW_DNS7Erg9slS40p8u95XN2p5j0M3iIDoPCswGQMv/pub?output=csv";
const HISTORY_STORAGE_KEY = "spanish-practice-history-v1";
const NACHO_STORAGE_KEY   = "nacho-bowl-count-v1";
const PERFECT_STORAGE_KEY = "nacho-perfect-sessions-v1";
const CONVERSATIONS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXkS0P0pDGSxXKQqtbPpv5lQb03OkgJW4p8o9fHpTdmiSJBHN8klf8cOrWxd-3iv_5J2stOk0m-Z_t/pub?output=csv";

let maxCardsPerSession = 25;

// ============================================================
// NACHO TIERS
// ============================================================
const NACHO_TIERS = [
  { min: 100, icon: "🌮", title: "Nacho Legend", messages: [
    "Every chip landed perfectly. Legendary work!",
    "The kitchen is speechless. Absolute perfection.",
    "This bowl belongs on the menu.",
    "Not a single topping out of place. Incredible!",
    "You just served a five-star nacho masterpiece.",
  ]},
  { min: 90, icon: "👑", title: "Supreme Chef", messages: [
    "That bowl is almost legendary. One more chip!",
    "Chef's special! That was a fantastic round.",
    "Only the pickiest food critic could find a flaw.",
    "You loaded that plate like a pro.",
    "Supreme status achieved. Nicely done!",
  ]},
  { min: 80, icon: "🧀", title: "Queso Master", messages: [
    "The cheese is flowing! Great work.",
    "That's a bowl worth sharing.",
    "Your nachos are looking delicious. Keep stacking!",
    "Another handful of chips and you'll be Supreme.",
    "You're building something tasty. Keep going!",
  ]},
  { min: 70, icon: "🥑", title: "Guac Guru", messages: [
    "Fresh guacamole added! Nice progress.",
    "Your bowl is coming together nicely.",
    "Every round adds another layer.",
    "A few more toppings and this feast gets serious.",
    "Solid work—keep the chips coming!",
  ]},
  { min: 60, icon: "🌽", title: "Chip Stacker", messages: [
    "Every legendary bowl starts with a single chip.",
    "You've got the foundation. Time to add toppings!",
    "Keep stacking—you'll be surprised how fast it grows.",
    "Good start! The next round is calling.",
    "One more game could change this whole plate.",
  ]},
  { min: 0, icon: "🍽️", title: "Prep Cook", messages: [
    "Every chef starts in the kitchen. Let's cook another batch!",
    "Don't worry—the chips are warm and ready for another try.",
    "Practice is today's secret ingredient.",
    "The recipe isn't finished yet. Give it another shot!",
    "Every legendary nacho bowl begins with the first chip.",
  ]},
];

function getTier(pct) {
  return NACHO_TIERS.find(t => pct >= t.min);
}

function randomMessage(tier) {
  return tier.messages[Math.floor(Math.random() * tier.messages.length)];
}

// ============================================================
// PRACTICE MODE SETTINGS
// ============================================================
const PRACTICE_MODES = {
  "spanish-english": {
    label: "🇪🇸 Spanish → English",
    enabled: true
  },

  "english-spanish": {
    label: "🇺🇸 English → Spanish",
    enabled: true
  },

  "mixed": {
    label: "↔️ Mixed",
    enabled: true
  },

  "answer": {
    label: "📝 Answer: Shuffled",
    enabled: true
  },

  "ordered-answer": {
    label: "📋 Answer: Ordered",
    enabled: true
  },

  "multiple-choice": {
    label: "🎯 Multiple Choice",
    enabled: true
  },

  "study-set": {
    label: "📚 Study Set",
    enabled: true
  },
  
  "nacho-builder": {
    label: "🌮 Nacho Builder",
    enabled: true
  },
  
  };

// ============================================================
// STATE
// ============================================================
let allCards = [];       // All cards loaded from Google Sheet
let allAccounts = [];    // All accounts loaded from Google Sheet
let boredCards = [];     // Bored button emoji cards
let currentUser = null;  // Logged-in student { name, username, password }
let teacherSettings = {};

let selectedLevels = new Set();
let selectedUnits = new Set();
let selectedSets = new Set();
let selectedMyStudySet = null;

let practiceCards = [];         // Cards for current session (up to 25)
let currentCardIndex = -1;
let attemptedIndices = new Set();
let correctCount = 0;
let incorrectCount = 0;
let hintedCorrectCount = 0;
let currentCardState = "fresh"; // "fresh" | "hint_shown" | "done"
let currentCardFirstWrongAnswer = ""; // student's first wrong answer for tracking
let currentCardPromptWord = "";  // the prompt word shown on the current card
let wrongAnswers = [];          // [{ prompt, studentAnswer }] for history
let practiceMode = "spanish-english";
let sessionModeLabel = "Spanish→English"; // Locked at start of session
let sessionStartMode = "";
let sessionStartLength = 0;
let practiceActive = false;
let lastFilterSettings = null;  // For "practice again" button

const savedFilterSettings =
  localStorage.getItem("nachoLastFilterSettings");

if (savedFilterSettings) {
  try {
    const saved = JSON.parse(savedFilterSettings);

    selectedLevels = new Set(saved.levels || []);
    selectedUnits = new Set(saved.units || []);
    selectedSets = new Set(saved.sets || []);

    lastFilterSettings = {
      levels: new Set(selectedLevels),
      units: new Set(selectedUnits),
      sets: new Set(selectedSets)
    };
  } catch (error) {
    console.error(
      "Could not restore filter settings:",
      error
    );
  }
}

let studySetSortColumn = "spanish";
let studySetSortDirection = "asc";

const practiceModes = {
  "spanish-english": "🇪🇸 Spanish → English",
  "english-spanish": "🇺🇸 English → Spanish",
  "mixed": "🔄 SP ⇄ EN Mixed",
  "answer": "🎲 Answer: Shuffled",
  "ordered-answer": "📋 Answer: Ordered",
  "multiple-choice": "🔢 Multiple Choice",
  "study-set": "📚 Study Set",
  "nacho-builder": "🌮 Nacho Builder",
};

const TEACHER_SETTINGS_KEY = "nachoBowlTeacherSettings";

const TEACHER_SETTINGS_API =
  "https://script.google.com/macros/s/AKfycbw275NX6F4cyt7jxhoVVHvoBQY6s1HrOsnsL5ws9AoEh2kK2Q6_hCEAmthwPt-TL9G3/exec"

async function loadTeacherSettings() {
  // Start with everything ON
  Object.keys(PRACTICE_MODES).forEach(mode => {
    PRACTICE_MODES[mode].enabled = true;
  });

  if (!currentUser) {
    return;
  }

  let teacherKey = currentUser.accountType;

  // Student C → Teacher C
  if (teacherKey.startsWith("Student ")) {
    teacherKey =
      teacherKey.replace("Student ", "Teacher ");
  }

  const languageKey =
    currentUser.language;

  const period =
    currentUser.period?.[0];

  try {
    const url =
      `${TEACHER_SETTINGS_API}` +
      `?action=getSettings` +
      `&teacher=${encodeURIComponent(teacherKey)}` +
      `&language=${encodeURIComponent(languageKey)}` +
      `&period=${encodeURIComponent(period)}`;

    const response =
      await fetch(url);

    const result =
      await response.json();

    console.log("TEACHER SETTINGS LOADED:", result.settings);

    if (result.success && result.settings) {

      Object.keys(result.settings).forEach(mode => {

        if (PRACTICE_MODES[mode]) {
          PRACTICE_MODES[mode].enabled =
            result.settings[mode];
        }

      });
    }

  } catch (error) {

    console.error(
      "Could not load teacher settings:",
      error
    );
  }
}

async function saveTeacherSettings(
  teacherKey,
  languageKey,
  period,
  settings
) {
  if (
    !teacherKey ||
    !languageKey ||
    !period ||
    !settings
  ) {
    return;
  }

  try {
    const response = await fetch(
      TEACHER_SETTINGS_API,
      {
        method: "POST",
        body: JSON.stringify({
          action: "saveSettings",
          teacher: teacherKey,
          language: languageKey,
          period: period,
          settings: settings
        })
      }
    );

    const result =
      await response.json();

    if (!result.success) {
      console.error(
        "Teacher settings were not saved:",
        result.error
      );
    }

  } catch (error) {
    console.error(
      "Could not save teacher settings:",
      error
    );
  }
}

// ============================================================
// NACHO BUILDER GAME STATE
// ============================================================

let nachoBuilderWord = "";
let nachoBuilderDisplay = [];
let nachoBuilderGuessedLetters = new Set();
let nachoBuilderWrongGuesses = 0;
let nachoBuilderMaxWrongGuesses = 8;
let nachoBuilderCurrentSet = "";
let nachoBuilderCurrentSpanish = "";
let nachoBuilderCurrentBowl = "";

// ============================================================
// DOM REFERENCES
// ============================================================
const loginScreen      = document.getElementById("loginScreen");
const practiceScreen   = document.getElementById("practiceScreen");
const loginForm        = document.getElementById("loginForm");

const landingPanel     = document.getElementById("landingPanel");
const landingWelcomeTarget =
  document.getElementById("landingWelcomeTarget");
const landingWelcomeEnglish =
  document.getElementById("landingWelcomeEnglish");

const studySetsNavBtn =
  document.getElementById("studySetsNavBtn");

const conversationNavBtn =
  document.getElementById("conversationNavBtn");

const conjugationNavBtn =
  document.getElementById("conjugationNavBtn");

const studySetsDescription =
  document.getElementById("studySetsDescription");

const conversationDescription =
  document.getElementById("conversationDescription");

const conjugationDescription =
  document.getElementById("conjugationDescription");

const usernameInput    = document.getElementById("usernameInput");
const passwordInput    = document.getElementById("passwordInput");
const loginError       = document.getElementById("loginError");
const loadingMsg       = document.getElementById("loadingMsg");
const welcomeName      = document.getElementById("welcomeName");
const signOutBtn       = document.getElementById("signOutBtn");
const homeBtn = document.getElementById("homeBtn");

const filterPanel      = document.getElementById("filterPanel");
const practicePanel    = document.getElementById("practicePanel");
const resultsPanel     = document.getElementById("resultsPanel");

const levelOptions     = document.getElementById("levelOptions");
const unitOptions      = document.getElementById("unitOptions");
const setOptions       = document.getElementById("setOptions");

const modeOptions = document.getElementById("modeOptions");

const cardCountPreview = document.getElementById("cardCountPreview");
const startPracticeBtn = document.getElementById("startPracticeBtn");

const teacherModeBtn = document.getElementById("teacherModeBtn");

const teacherDialog = document.getElementById("teacherDialog");
const teacherModeList = document.getElementById("teacherModeList");
const closeTeacherBtn = document.getElementById("closeTeacherBtn");

const practiceSetLabel = document.getElementById("practiceSetLabel");
const practiceProgress = document.getElementById("practiceProgress");
const endPracticeBtn   = document.getElementById("endPracticeBtn");
const promptText       = document.getElementById("promptText");
const responseDisplay  = document.getElementById("responseDisplay");
const responseIcon     = document.getElementById("responseIcon");
const responseText     = document.getElementById("responseText");
const correctAnswerDisplay = document.getElementById("correctAnswerDisplay");
const directionLabel   = document.getElementById("directionLabel");
const answerInput      = document.getElementById("answerInput");
const multipleChoiceOptions = document.getElementById("multipleChoiceOptions");
const practiceModeTitle = document.getElementById("practiceModeTitle");

const studySetPanel = document.getElementById("studySetPanel");

const nachoBuilderPanel = document.getElementById("nachoBuilderPanel");
const nachoBowlProgress = document.getElementById("nachoBowlProgress");
const nachoWordDisplay = document.getElementById("nachoWordDisplay");
const nachoGuessedLetters = document.getElementById("nachoGuessedLetters");
const nachoStrikes = document.getElementById("nachoStrikes");
const nachoKeyboard = document.getElementById("nachoKeyboard");
const nachoGameMessage = document.getElementById("nachoGameMessage");
const nachoNextWordBtn = document.getElementById("nachoNextWordBtn");
const nachoBackBtn = document.getElementById("nachoBackBtn");
const nachoPracticeSets = document.getElementById("nachoPracticeSets");

const studySetContainer = document.getElementById("studySetContainer");
const backFromStudySet = document.getElementById("backFromStudySet");

const checkBtn         = document.getElementById("checkBtn");
const feedbackText     = document.getElementById("feedbackText");
const hintText         = document.getElementById("hintText");
const nextBtn          = document.getElementById("nextBtn");
let selectedCardCount = 25;

const statCorrect      = document.getElementById("statCorrect");
const statHinted       = document.getElementById("statHinted");
const statIncorrect    = document.getElementById("statIncorrect");
const statTotal        = document.getElementById("statTotal");

const resultsSummary   = document.getElementById("resultsSummary");
const celebrationIcon  = document.getElementById("celebrationIcon");
const celebrationTitle = document.getElementById("celebrationTitle");
const celebrationMsg   = document.getElementById("celebrationMessage");
const nachoCountDisplay = document.getElementById("nachoCountDisplay");
const nachoEarnedMessage = document.getElementById("nachoEarnedMessage");
const footerNachoName  = document.getElementById("footerNachoName");
const footerNachoCount = document.getElementById("footerNachoCount");

const boredBtn = document.getElementById("boredBtn");
const boredDisplay = document.getElementById("boredDisplay");

const practiceAgainBtn = document.getElementById("practiceAgainBtn");
const newPracticeBtn   = document.getElementById("newPracticeBtn");

const confirmDialog    = document.getElementById("confirmDialog");
const confirmMsg       = document.getElementById("confirmMsg");
const confirmEndBtn    = document.getElementById("confirmEndBtn");
const cancelEndBtn     = document.getElementById("cancelEndBtn");

const attemptHistoryList = document.getElementById("attemptHistoryList");
const historyToggle = document.getElementById("historyToggle");
const historyContent = document.getElementById("historyContent");

const boredEmoji = document.getElementById("boredEmoji");
const boredWord = document.getElementById("boredWord");

// ============================================================
// CSV PARSING
// ============================================================
function parseCSV(text) {
  const lines = text.trim().split("\n").map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    // Handle commas inside quoted fields
    const cols = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { cols.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    cols.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] || ""; });
    return obj;
  });
}

function parseCards(csvText) {
  const rows = parseCSV(csvText);

  return rows
    .filter(r =>
      (r.spanish || r.french || r.korean) &&
      r.english
    )
    .map(r => ({
      spanish:
        r.spanish ||
        r.french ||
        r.korean ||
        "",

      english:
        r.english,

      setName:
        r["card set"] || "",

      level:
        r.level || "",

      unit:
        r.unit || "",
    }));
}

function parseAccounts(csvText) {
  const rows = parseCSV(csvText);

  return rows
    .filter(r => r.username && r.password)
    .map(r => ({
      name:
        r.name ||
        r["student name"] ||
        r.username,

      username:
        r.username
          .trim()
          .toLowerCase(),

      password:
        r.password.trim(),

      accountType:
        r["account type"]?.trim() || "",

      language:
        r.language?.trim() || "",

      period:
        (r.period || "")
          .split(",")
          .map(p => p.trim())
          .filter(Boolean)
    }));
}

function parseBoredCards(csvText) {
  const rows = parseCSV(csvText);

  return rows
    .filter(r => r.emoji && r.content)
    .map(r => ({
      emoji: r.emoji,
      content: r.content,
      category: r.category || "",
      weight: Number(r.weight) || 1,
    }));
}

// ============================================================
// DATA LOADING
// ============================================================
const CARDS_CACHE_KEY    = "nachoCardsCache_";
const ACCOUNTS_CACHE_KEY = "spanish-accounts-cache-v1";
const BORED_CACHE_KEY = "spanish-bored-cache-v1";

async function loadData() {
  
  allCards = [];
  
  console.log(
    "LOAD DATA CALLED"
  );
  
  loadingMsg.classList.remove("hidden");

  let cardsText = null;
  let accountsText = null;
  let boredText = null;

  // ----------------------------------------------------------
  // USE CACHE FIRST
  // ----------------------------------------------------------
  
  accountsText =
    localStorage.getItem(ACCOUNTS_CACHE_KEY);
  
  boredText =
    localStorage.getItem(BORED_CACHE_KEY);
  
  console.log(
    "CACHED ACCOUNTS LENGTH:",
    accountsText ? accountsText.length : 0
  );
  
  console.log(
    "CACHED ACCOUNTS START:",
    accountsText
      ? accountsText.substring(0, 300)
      : "NO CACHE"
  );
  
  boredText =
    localStorage.getItem(BORED_CACHE_KEY);

  // ----------------------------------------------------------
  // IF CACHE EXISTS, LOAD IT IMMEDIATELY
  // ----------------------------------------------------------

  if (accountsText) {
  
    allAccounts =
      parseAccounts(accountsText);
  
    boredCards =
      parseBoredCards(boredText || "");
  
    // --------------------------------------------------------
    // DETERMINE USER LANGUAGE
    // --------------------------------------------------------
    
    const savedUsername =
      localStorage.getItem("nachoCurrentUser");
    
    let language =
      "Spanish";
    
    console.log(
      "LOAD DATA LANGUAGE:",
      language
    );
    
    if (savedUsername) {
    
      const user =
        allAccounts.find(
          a =>
            String(a.username).trim().toLowerCase() ===
            String(savedUsername).trim().toLowerCase()
        );
    
      if (user && user.language) {
    
        language =
          user.language;
    
        console.log(
          "LOAD DATA USER LANGUAGE:",
          user.language
        );
      }
    
    }
    
    // --------------------------------------------------------
    // LOAD CACHED TABS FOR THIS LANGUAGE
    // --------------------------------------------------------
  
    console.log(
      "ABOUT TO LOAD TABS:",
      language
    );
    
    const tabs =
      getCardTabsForLanguage(language);

    console.log(
      "LANGUAGE TABS:",
      language,
      Object.entries(tabs)
    );

    for (const [level, gid] of Object.entries(tabs)) {

      const cachedCards =
        localStorage.getItem(
          `${CARDS_CACHE_KEY}${level}`
        );
    
      console.log(
        "CACHED TAB:",
        level,
        cachedCards ? cachedCards.length : 0
      );
    
      if (level === "French 1") {
        console.log(
          "FRENCH 1 CACHE CONTENT:",
          cachedCards
        );
      }
    }
  
    allCards = [];
  
    for (const [level, gid] of Object.entries(tabs)) {
  
      const cachedCards =
        localStorage.getItem(
          `${CARDS_CACHE_KEY}${level}`
        );
  
      if (cachedCards) {
  
        const cards =
          parseCards(cachedCards);

        console.log(
          "PARSED CARDS:",
          level,
          cards
        );
  
        cards.forEach(card => {
          card.level = level;
        });
  
        allCards.push(...cards);

        console.log(
          "CARD LANGUAGE CHECK:",
          level,
          cards.length,
          cards.slice(0, 3)
        );
      }
    }
  
    loadingMsg.textContent = "";
  
    // --------------------------------------------------------
    // REFRESH DATA IN BACKGROUND
    // --------------------------------------------------------
  
    try {
  
      const [accountsRes, boredRes] =
        await Promise.all([
          fetch(ACCOUNTS_CSV_URL),
          fetch(BORED_CSV_URL)
        ]);
  
      if (!accountsRes.ok) {
        throw new Error(
          `Accounts request failed: ${accountsRes.status}`
        );
      }
  
      if (!boredRes.ok) {
        throw new Error(
          `Bored request failed: ${boredRes.status}`
        );
      }
  
      const freshAccountsText =
        await accountsRes.text();
  
      const freshBoredText =
        await boredRes.text();
  
      const freshAccounts =
        parseAccounts(freshAccountsText);
  
      let freshLanguage =
        language;
  
      if (savedUsername) {
  
        const user =
          freshAccounts.find(
            a =>
              String(a.username).trim().toLowerCase() ===
              String(savedUsername).trim().toLowerCase()
          );
  
        if (user && user.language) {
          freshLanguage = user.language;
        }
      }
  
      // ------------------------------------------------------
      // LOAD ALL TABS FOR USER'S LANGUAGE
      // ------------------------------------------------------
  
      const freshTabs =
        getCardTabsForLanguage(freshLanguage);
  
      const cardResults =
        await Promise.all(
          Object.entries(freshTabs).map(
            async ([level, gid]) => {
  
              const response =
                await fetch(
                  `${CARDS_SHEET_URL}?output=csv&gid=${gid}`
                );
  
              if (!response.ok) {
                throw new Error(
                  `Cards request failed for ${level}: ${response.status}`
                );
              }
  
              const text =
                await response.text();
  
              return {
                level,
                text
              };
            }
          )
        );
  
      // ------------------------------------------------------
      // CACHE ALL TABS
      // ------------------------------------------------------
  
      cardResults.forEach(
        ({ level, text }) => {
  
          localStorage.setItem(
            `${CARDS_CACHE_KEY}${level}`,
            text
          );
  
        }
      );
  
      localStorage.setItem(
        ACCOUNTS_CACHE_KEY,
        freshAccountsText
      );
  
      localStorage.setItem(
        BORED_CACHE_KEY,
        freshBoredText
      );
  
      // ------------------------------------------------------
      // USE FRESH DATA
      // ------------------------------------------------------
  
      allCards = [];
  
      cardResults.forEach(
        ({ level, text }) => {
  
          const cards =
            parseCards(text);
  
          cards.forEach(card => {
            card.level = level;
          });
  
          allCards.push(...cards);

          console.log(
            "CARD LANGUAGE CHECK:",
            level,
            cards.length,
            cards.slice(0, 3)
          );
  
        }
      );
  
      allAccounts =
        freshAccounts;
  
      boredCards =
        parseBoredCards(freshBoredText);
  
    } catch (err) {
  
      console.warn(
        "Background data refresh failed. Using cached data.",
        err
      );
    }
  
    return;
  }

  // ----------------------------------------------------------
  // NO CACHE — LOAD FROM NETWORK
  // ----------------------------------------------------------
  
  try {
  
    const [
      accountsRes,
      boredRes
    ] = await Promise.all([
      fetch(ACCOUNTS_CSV_URL),
      fetch(BORED_CSV_URL)
    ]);
  
    if (!accountsRes.ok) {
      throw new Error(
        `Accounts request failed: ${accountsRes.status}`
      );
    }
  
    if (!boredRes.ok) {
      throw new Error(
        `Bored request failed: ${boredRes.status}`
      );
    }
  
    accountsText =
      await accountsRes.text();
  
    boredText =
      await boredRes.text();
  
    allAccounts =
      parseAccounts(accountsText);
  
    boredCards =
      parseBoredCards(boredText);
  
    // --------------------------------------------------------
    // DETERMINE USER LANGUAGE
    // --------------------------------------------------------
  
    const savedUsername =
      localStorage.getItem("nachoCurrentUser");
  
    let language =
      "Spanish";
  
    if (savedUsername) {
  
      const user =
        allAccounts.find(
          a =>
            String(a.username).trim().toLowerCase() ===
            String(savedUsername).trim().toLowerCase()
        );
  
      if (user && user.language) {
        language =
          user.language;
      }
    }
  
    // --------------------------------------------------------
    // LOAD ALL TABS FOR USER LANGUAGE
    // --------------------------------------------------------
  
    console.log(
      "ABOUT TO LOAD TABS:",
      language
    );
    
    const tabs =
      getCardTabsForLanguage(language);
  
    const cardResults =
      await Promise.all(
        Object.entries(tabs).map(
          async ([level, gid]) => {
  
            const response =
              await fetch(
                `${CARDS_SHEET_URL}?output=csv&gid=${gid}`
              );
  
            if (!response.ok) {
              throw new Error(
                `Cards request failed for ${level}: ${response.status}`
              );
            }
  
            const text =
              await response.text();
  
            return {
              level,
              text
            };
          }
        )
      );
  
    // --------------------------------------------------------
    // CACHE DATA
    // --------------------------------------------------------
  
    localStorage.setItem(
      ACCOUNTS_CACHE_KEY,
      accountsText
    );
  
    localStorage.setItem(
      BORED_CACHE_KEY,
      boredText
    );
  
    cardResults.forEach(
      ({ level, text }) => {
  
        localStorage.setItem(
          `${CARDS_CACHE_KEY}${level}`,
          text
        );
  
      }
    );
  
    // --------------------------------------------------------
    // BUILD ALL CARDS
    // --------------------------------------------------------
  
    allCards = [];
  
    cardResults.forEach(
      ({ level, text }) => {
  
        const cards =
          parseCards(text);
  
        cards.forEach(card => {
          card.level = level;
        });
  
        allCards.push(...cards);

        console.log(
          "CARD LANGUAGE CHECK:",
          level,
          cards.length,
          cards.slice(0, 3)
        );
  
      }
    );
  
    loadingMsg.textContent = "";
  
  } catch (err) {
  
    loadingMsg.textContent =
      "Could not load data. Check your internet connection.";
  
    console.error(
      "Initial data load failed:",
      err
    );
  
    return;
  }

}

function getRandomBoredCard() {
  if (!boredCards.length) return null;

  const totalWeight = boredCards.reduce((sum, card) => {
    return sum + card.weight;
  }, 0);

  let random = Math.random() * totalWeight;

  for (const card of boredCards) {
    random -= card.weight;

    if (random <= 0) {
      return card;
    }
  }

  return boredCards[0];
}

// ============================================================
// AUTH
// ============================================================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username =
    usernameInput.value.trim().toLowerCase();

  const password =
    passwordInput.value.trim();

  const user =
    allAccounts.find(
      a =>
        a.username === username &&
        a.password === password
    );

  if (!user) {
    loginError.textContent =
      "Username or password not found.";

    loginError.classList.remove("hidden");

    return;
  }

  loginError.classList.add("hidden");

  currentUser = user;

  localStorage.setItem(
    "nachoCurrentUser",
    user.username
  );

  console.log(
    "RESTORED ACCOUNT LANGUAGE:",
    currentUser.language,
    "TYPE:",
    currentUser.accountType
  );

  console.log(
    "SAVED USER:",
    localStorage.getItem("nachoCurrentUser")
  );

  await loadData();

  await loadTeacherSettings();

  console.log(
    "CURRENT ACCOUNT OBJECT:",
    allAccounts.find(
      a =>
        String(a.username).trim().toLowerCase() ===
        String(
          localStorage.getItem("nachoCurrentUser")
        ).trim().toLowerCase()
    )
  );

  showPracticeScreen();
});

signOutBtn.addEventListener("click", () => {
  currentUser = null;
  localStorage.removeItem("nachoCurrentUser");

  usernameInput.value = "";
  passwordInput.value = "";
  practiceScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  resetPracticeState();
});

boredBtn.addEventListener("click", () => {
  const card = getRandomBoredCard();

  if (!card) return;

  boredEmoji.textContent = card.emoji;
  boredWord.textContent = card.content;
});

teacherModeBtn.addEventListener("click", () => {
  if (
    !currentUser ||
    !currentUser.accountType.startsWith("Teacher")
  ) {
    return;
  }

  openTeacherSettings();
});


closeTeacherBtn.addEventListener("click", () => {
  teacherDialog.classList.add("hidden");
});

// ============================================================
// LANDING PAGE
// ============================================================
const LANDING_LANGUAGE_CONTENT = {

  Spanish: {
    welcome:
      "¡Hola, {name}! ¿Qué quieres practicar hoy?",
    description: {
      studySets:
        "Practice Spanish vocabulary and phrases",
      conversation:
        "Practice Spanish through conversations",
      conjugation:
        "Practice Spanish verb conjugation"
    }
  },

  French: {
    welcome:
      "Bonjour, {name} ! Qu'est-ce que tu veux pratiquer aujourd'hui?",
    description: {
      studySets:
        "Practice French vocabulary and phrases",
      conversation:
        "Practice French through conversations",
      conjugation:
        "Practice French verb conjugation"
    }
  },

  Korean: {
    welcome:
      "안녕하세요, {name} 님! 오늘은 무엇을 연습하고 싶으신가요?",
    description: {
      studySets:
        "Practice Korean vocabulary and phrases",
      conversation:
        "Practice Korean through conversations",
      conjugation:
        "Practice Korean verb conjugation"
    }
  }

};

function showLandingPage() {

  saveCurrentPanel("landing");

  const language =
    currentUser?.language || "Spanish";

  console.log("LANDING LANGUAGE:", currentUser?.language);
  console.log("LANDING USER:", currentUser);

  const content =
    LANDING_LANGUAGE_CONTENT[language] ||
    LANDING_LANGUAGE_CONTENT.Spanish;

  const name =
    currentUser?.name || "";

  landingWelcomeTarget.textContent =
    content.welcome.replace("{name}", name);

  landingWelcomeEnglish.textContent =
    "What would you like to practice today?";

  studySetsDescription.textContent =
    content.description.studySets;

  conversationDescription.textContent =
    content.description.conversation;

  conjugationDescription.textContent =
    content.description.conjugation;

  landingPanel.classList.remove("hidden");

  filterPanel.classList.add("hidden");
  practicePanel.classList.add("hidden");
  resultsPanel.classList.add("hidden");
  conversationSelectionPanel.classList.add("hidden");
  conversationPanel.classList.add("hidden");
}

// ============================================================
// LANDING PAGE NAVIGATION
// ============================================================

homeBtn.addEventListener("click", () => {

  console.log("HOME BUTTON CLICKED");

  showLandingPage();

});;

studySetsNavBtn.addEventListener("click", () => {
  showFilterPanel();
});

conversationNavBtn.addEventListener("click", () => {
  console.log("CONVERSATION NAV CLICKED");

  if (typeof openConversationSelection === "function") {
    openConversationSelection();
  } else {
    console.error(
      "openConversationSelection is not available."
    );
  }
});

conjugationNavBtn.addEventListener("click", () => {
  alert("Conjugation practice is coming soon!");
});

// ============================================================
// SCREEN TRANSITIONS
// ============================================================
function showPracticeScreen() {
  loginScreen.classList.add("hidden");
  practiceScreen.classList.remove("hidden");

  welcomeName.textContent =
    currentUser.name;

  showLandingPage();

  renderAttemptHistory();
  updateFooterNachos();

  loadTeacherSettings();
}

function saveCurrentPanel(panelName) {
  localStorage.setItem("nachoCurrentPanel", panelName);
}

function loadFilterSettings() {
  const saved =
    localStorage.getItem("nachoLastFilterSettings");

  if (!saved) {
    return;
  }

  try {
    const settings = JSON.parse(saved);

    selectedLevels = new Set(settings.levels || []);
    selectedUnits = new Set(settings.units || []);
    selectedSets = new Set(settings.sets || []);

    lastFilterSettings = {
      levels: new Set(selectedLevels),
      units: new Set(selectedUnits),
      sets: new Set(selectedSets)
    };

  } catch (error) {
    console.error(
      "Could not restore filter settings:",
      error
    );
  }
}

function showFilterPanel() {
  saveCurrentPanel("filter");

  landingPanel.classList.add("hidden");

  filterPanel.classList.remove("hidden");
  practicePanel.classList.add("hidden");
  resultsPanel.classList.add("hidden");

  conversationSelectionPanel.classList.add("hidden");
  conversationPanel.classList.add("hidden");

  loadFilterSettings();

  renderLevelChips();
  renderUnitChips();
  renderSetChips();
  loadMyStudySets();
  updateCardCountPreview();
}
// ============================================================
// FILTER CHIPS
// ============================================================
function renderModeChips() {
  modeOptions.innerHTML = "";

  Object.keys(PRACTICE_MODES).forEach(mode => {
    if (!PRACTICE_MODES[mode].enabled) {
      return;
    }

    const chip = document.createElement("button");

    chip.type = "button";
    chip.className =
      "mode-chip" +
      (practiceMode === mode ? " active" : "");

    chip.dataset.mode = mode;

    chip.textContent =
      PRACTICE_MODES[mode].label;

    chip.addEventListener("click", () => {
      practiceMode = mode;

      document
        .querySelectorAll(".mode-chip")
        .forEach(c => {
          c.classList.remove("active");
        });

      chip.classList.add("active");
    });

    modeOptions.appendChild(chip);
  });
}

function renderLevelChips() {
  const levels = [
    ...new Set(
      allCards
        .map(c => c.level)
        .filter(Boolean)
    )
  ].sort();

  levelOptions.innerHTML = "";

  levels.forEach(level => {

    const chip =
      makeChip(
        level,
        selectedLevels,
        () => {

          // Selecting a regular filter
          // cancels any My Study Set selection.
          selectedMyStudySet = null;

          document
            .querySelectorAll(
              "#myStudySetOptions .my-study-set-chip"
            )
            .forEach(myChip => {
              myChip.classList.remove("active");
            });

          toggleSelection(
            selectedLevels,
            level
          );

          // Reset lower selections when levels change.
          selectedUnits.clear();
          selectedSets.clear();

          localStorage.setItem(
            "nachoLastFilterSettings",
            JSON.stringify({
              levels: [...selectedLevels],
              units: [...selectedUnits],
              sets: [...selectedSets]
            })
          );

          renderUnitChips();
          renderSetChips();
          updateCardCountPreview();
        }
      );

    levelOptions.appendChild(chip);
  });
}

function renderUnitChips() {

  unitOptions.innerHTML = "";

  const filtered =
    selectedLevels.size
      ? allCards.filter(c =>
          selectedLevels.has(c.level)
        )
      : allCards;

  const units =
    [
      ...new Set(
        filtered
          .map(c => c.unit)
          .filter(Boolean)
      )
    ].sort();

  if (!units.length) {

    unitOptions.innerHTML =
      '<span class="filter-hint">Select a level first</span>';

    return;
  }

  units.forEach(unit => {

    const chip =
      makeChip(
        unit,
        selectedUnits,
        () => {

          // Selecting a regular filter
          // cancels any My Study Set selection.
          selectedMyStudySet = null;

          document
            .querySelectorAll(
              "#myStudySetOptions .my-study-set-chip"
            )
            .forEach(myChip => {
              myChip.classList.remove("active");
            });

          toggleSelection(
            selectedUnits,
            unit
          );

          // Reset set selections when units change.
          selectedSets.clear();

          localStorage.setItem(
            "nachoLastFilterSettings",
            JSON.stringify({
              levels: [...selectedLevels],
              units: [...selectedUnits],
              sets: [...selectedSets]
            })
          );

          renderSetChips();
          updateCardCountPreview();
        }
      );

    unitOptions.appendChild(chip);
  });
}

// ============================================================
// REGULAR STUDY SET CHIPS
// ============================================================

function renderSetChips() {

  setOptions.innerHTML = "";

  let filtered = allCards;

  if (selectedLevels.size) {
    filtered =
      filtered.filter(c =>
        selectedLevels.has(c.level)
      );
  }

  if (selectedUnits.size) {
    filtered =
      filtered.filter(c =>
        selectedUnits.has(c.unit)
      );
  }

  const sets =
    [
      ...new Set(
        filtered
          .map(c => c.setName)
          .filter(Boolean)
      )
    ].sort();

  if (!sets.length) {

    setOptions.innerHTML =
      '<span class="filter-hint">Select a unit first</span>';

    return;
  }

  sets.forEach(set => {

    const chip =
      makeChip(
        set,
        selectedSets,
        () => {

          // Selecting a regular Study Set
          // cancels any My Study Set selection.
          selectedMyStudySet = null;

          document
            .querySelectorAll(
              "#myStudySetOptions .my-study-set-chip"
            )
            .forEach(myChip => {
              myChip.classList.remove("active");
            });

          toggleSelection(
            selectedSets,
            set
          );

          localStorage.setItem(
            "nachoLastFilterSettings",
            JSON.stringify({
              levels: [...selectedLevels],
              units: [...selectedUnits],
              sets: [...selectedSets]
            })
          );

          updateCardCountPreview();
        }
      );

    setOptions.appendChild(chip);
  });
}

function makeChip(label, selectionSet, onClick) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip" + (selectionSet.has(label) ? " active" : "");
  chip.textContent = label;
  chip.addEventListener("click", () => {
    onClick();
    chip.classList.toggle("active", selectionSet.has(label));
  });
  return chip;
}

function toggleSelection(set, value) {
  if (set.has(value)) set.delete(value);
  else set.add(value);
}

function getFilteredCards() {

  // If a saved My Study Set is selected,
  // use its cards instead of the regular filters.
  if (selectedMyStudySet) {
    return selectedMyStudySet.cards;
  }

  let cards = allCards;

  if (selectedLevels.size) {
    cards =
      cards.filter(c =>
        selectedLevels.has(c.level)
      );
  }

  if (selectedUnits.size) {
    cards =
      cards.filter(c =>
        selectedUnits.has(c.unit)
      );
  }

  if (selectedSets.size) {
    cards =
      cards.filter(c =>
        selectedSets.has(c.setName)
      );
  }

  return cards;
}

function updateCardCountPreview() {
  const count = getFilteredCards().length;
  if (count === 0) {
    cardCountPreview.textContent = "No cards match your selection";
    cardCountPreview.className = "card-count-preview";
    startPracticeBtn.disabled = true;
  } else {
    const shown = Math.min(count, maxCardsPerSession);
    cardCountPreview.textContent = `${count} card${count !== 1 ? "s" : ""} available — ${shown} will be selected randomly`;
    cardCountPreview.className = "card-count-preview has-cards";
    startPracticeBtn.disabled = false;
  }
}

startPracticeBtn.addEventListener("click", () => {
  const filtered = getFilteredCards();
  if (!filtered.length) return;

  lastFilterSettings = {
    levels: new Set(selectedLevels),
    units: new Set(selectedUnits),
    sets: new Set(selectedSets),
  };

  localStorage.setItem(
  "nachoLastFilterSettings",
  JSON.stringify({
    levels: [...selectedLevels],
    units: [...selectedUnits],
    sets: [...selectedSets]
  })
);
  
  localStorage.setItem(
    "nachoLastFilterSettings",
    JSON.stringify({
      levels: [...selectedLevels],
      units: [...selectedUnits],
      sets: [...selectedSets]
    })
  );

  if (practiceMode === "nacho-builder") {
    startNachoBuilder(filtered);
    return;
  }
  
  if (practiceMode === "study-set") {
    showStudySet(filtered);
    return;
  }
  
  beginPractice(filtered);
});

nachoNextWordBtn.addEventListener("click", () => {
  nachoGameMessage.classList.add("hidden");
  nachoNextWordBtn.classList.add("hidden");

  nachoBuilderGuessedLetters.clear();
  nachoBuilderWrongGuesses = 0;

  updateNachoBuilderBowl();
  updateNachoBuilderStrikes();

  startNachoBuilder(getFilteredCards());
});

nachoBackBtn.addEventListener("click", () => {
  nachoBuilderPanel.classList.add("hidden");
  showFilterPanel();
});

async function openTeacherSettings() {

  teacherModeList.innerHTML = "";

  if (
    !currentUser ||
    !currentUser.accountType.startsWith("Teacher")
  ) {
    return;
  }

  const teacherKey =
    currentUser.accountType;

  const languageKey =
    currentUser.language;

  const periods =
    currentUser.period || [];

  // ----------------------------------------------------------
  // GET ALL SETTINGS WITH ONE REQUEST
  // ----------------------------------------------------------

  let periodSettings = {};

  try {

    const url =
      `${TEACHER_SETTINGS_API}` +
      `?action=getSettings` +
      `&teacher=${encodeURIComponent(teacherKey)}` +
      `&language=${encodeURIComponent(languageKey)}`;

    const response =
      await fetch(url);

    const result =
      await response.json();

    if (result.success && result.settings) {
      periodSettings =
        result.settings;
    }

  } catch (error) {

    console.error(
      "Could not load teacher settings:",
      error
    );
  }

  // ----------------------------------------------------------
  // TABLE
  // ----------------------------------------------------------

  const table =
    document.createElement("table");

  table.className =
    "teacher-settings-table";

  // ----------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------

  const thead =
    document.createElement("thead");

  const headerRow =
    document.createElement("tr");

  const periodHeader =
    document.createElement("th");

  periodHeader.textContent =
    "Period";

  headerRow.appendChild(periodHeader);

  Object.keys(PRACTICE_MODES).forEach(mode => {

    const th =
      document.createElement("th");

    th.textContent =
      PRACTICE_MODES[mode].label;

    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // ----------------------------------------------------------
  // BODY
  // ----------------------------------------------------------

  const tbody =
    document.createElement("tbody");

  periods.forEach(period => {

    const row =
      document.createElement("tr");

    const periodCell =
      document.createElement("td");

    periodCell.textContent =
      `Period ${period}`;

    row.appendChild(periodCell);

    const existingSettings =
      periodSettings[period] || {};

    Object.keys(PRACTICE_MODES).forEach(mode => {

      const cell =
        document.createElement("td");

      const button =
        document.createElement("button");

      let enabled =
        existingSettings[mode] ?? true;

      function updateButton() {

        button.className =
          enabled
            ? "toggle-on"
            : "toggle-off";

        button.textContent =
          enabled
            ? "ON"
            : "OFF";
      }

      updateButton();

      button.addEventListener(
        "click",
        async () => {

          enabled = !enabled;

          updateButton();

          const settings = {
            ...existingSettings,
            [mode]: enabled
          };

          existingSettings[mode] =
            enabled;

          await saveTeacherSettings(
            teacherKey,
            languageKey,
            period,
            settings
          );
        }
      );

      cell.appendChild(button);
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);

  teacherModeList.appendChild(table);

  teacherDialog.classList.remove("hidden");
}

// ============================================================
// SESSION LENGTH CHIPS
// ============================================================
document.querySelectorAll(".session-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    selectedCardCount = Number(chip.dataset.count);

    document.querySelectorAll(".session-chip").forEach(c => {
      c.classList.remove("active");
    });

    chip.classList.add("active");
  });
});

// ============================================================
// PRACTICE SESSION
// ============================================================

// ------------------------------------------------------------
// SESSION SETUP
// ------------------------------------------------------------

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function beginPractice(filtered) {

  saveCurrentPanel("practice");
  
  console.log("beginPractice() called");
  console.log("MODE:", practiceMode);
  console.log(filtered.map(card => card.spanish));

  maxCardsPerSession = selectedCardCount;

  sessionStartMode = practiceMode;
  sessionStartLength = maxCardsPerSession;

  localStorage.setItem(
    "nachoPracticeMode",
    practiceMode
  );
  
  localStorage.setItem(
    "nachoPracticeLength",
    maxCardsPerSession
  );

  if (practiceMode === "ordered-answer") {
    practiceCards = [...filtered].slice(0, maxCardsPerSession);
  } else {
    practiceCards = shuffleArray(filtered).slice(0, maxCardsPerSession);
  }
  
  localStorage.setItem(
    "nachoPracticeCards",
    JSON.stringify(practiceCards)
  );
  
  resetPracticeState();  practiceActive = true;

  sessionModeLabel =
    PRACTICE_MODES[practiceMode]?.label || practiceMode;

  filterPanel.classList.add("hidden");
  practicePanel.classList.remove("hidden");
  resultsPanel.classList.add("hidden");

  practiceModeTitle.textContent =
    PRACTICE_MODES[practiceMode].label;

  const setNames = [
    ...new Set(practiceCards.map(c => c.setName))
  ].join(", ");

  practiceSetLabel.textContent = setNames;

  updateStats();
  showNextCard();
}

function resetPracticeState() {
  currentCardIndex = -1;
  attemptedIndices = new Set();

  correctCount = 0;
  incorrectCount = 0;
  hintedCorrectCount = 0;

  currentCardState = "fresh";
  currentCardFirstWrongAnswer = "";
  currentCardFirstWrongChoice = "";

  wrongAnswers = [];
  practiceActive = false;
}

// ============================================================
// MY STUDY SETS
// ============================================================

function loadMyStudySets() {

  const container =
    document.getElementById("myStudySetOptions");

  if (!container) {
    return;
  }

  const savedStudySets =
    JSON.parse(
      localStorage.getItem("nachoSavedStudySets") || "[]"
    );

  container.innerHTML = "";

  if (savedStudySets.length === 0) {

    container.innerHTML = `
      <span class="filter-hint">
        No saved study sets yet
      </span>
    `;

    return;
  }

  savedStudySets.forEach(savedSet => {

    const chip =
      document.createElement("button");

    chip.type = "button";
    chip.className =
      "my-study-set-chip";

    chip.textContent =
      savedSet.name;

    chip.addEventListener("click", () => {
    
      // Remove selection from other My Study Sets.
      container
        .querySelectorAll(".my-study-set-chip")
        .forEach(otherChip => {
          otherChip.classList.remove("active");
        });
    
      chip.classList.add("active");
    
      // Select this saved study set.
      selectedMyStudySet =
        savedSet;
    
      // Clear the regular Level / Unit / Study Set filters.
      selectedLevels.clear();
      selectedUnits.clear();
      selectedSets.clear();
    
      // Refresh their visual state.
      document
        .querySelectorAll("#levelOptions .chip")
        .forEach(chip => {
          chip.classList.remove("active");
        });
    
      document
        .querySelectorAll("#unitOptions .chip")
        .forEach(chip => {
          chip.classList.remove("active");
        });
    
      document
        .querySelectorAll("#setOptions .chip")
        .forEach(chip => {
          chip.classList.remove("active");
        });
    
      // Update the card count and Start Practice button.
      updateCardCountPreview();
    });

    container.appendChild(chip);
  });
}

document
  .getElementById("manageStudySetsBtn")
  .addEventListener("click", () => {
    openManageStudySets();
  });

document
  .getElementById("closeManageStudySetsBtn")
  .addEventListener("click", () => {
    document
      .getElementById("manageStudySetsDialog")
      .classList.add("hidden");
  });

function openManageStudySets() {

  const dialog =
    document.getElementById("manageStudySetsDialog");

  if (!dialog) {
    return;
  }

  renderManageStudySets();

  dialog.classList.remove("hidden");
}


// ------------------------------------------------------------
// RENDER MANAGE STUDY SETS
// ------------------------------------------------------------

function renderManageStudySets() {

  const container =
    document.getElementById("manageStudySetsList");

  if (!container) {
    return;
  }

  const savedStudySets =
    JSON.parse(
      localStorage.getItem("nachoSavedStudySets") || "[]"
    );

  container.innerHTML = "";

  if (savedStudySets.length === 0) {

    container.innerHTML = `
      <p class="filter-hint">
        You don't have any saved study sets yet.
      </p>
    `;

    return;
  }

  const list =
    document.createElement("div");

  list.className =
    "manage-study-set-list";

  savedStudySets.forEach((savedSet, index) => {

    const row =
      document.createElement("div");

    row.className =
      "manage-study-set-row";

    row.innerHTML = `
      <span class="manage-study-set-name">
        ${savedSet.name}
      </span>

      <div class="manage-study-set-actions">

        <button
          type="button"
          class="manage-rename-btn"
        >
          Rename
        </button>

        <button
          type="button"
          class="manage-delete-btn"
        >
          Delete
        </button>

      </div>
    `;

    // --------------------------------------------------------
    // RENAME
    // --------------------------------------------------------

    row
      .querySelector(".manage-rename-btn")
      .addEventListener("click", () => {

        const newName =
          prompt(
            "Enter a new name for this study set:",
            savedSet.name
          );

        if (newName === null) {
          return;
        }

        const trimmedName =
          newName.trim();

        if (!trimmedName) {
          alert("Please enter a study set name.");
          return;
        }

        savedStudySets[index].name =
          trimmedName;

        localStorage.setItem(
          "nachoSavedStudySets",
          JSON.stringify(savedStudySets)
        );

        // Refresh the manager
        renderManageStudySets();

        // Refresh the My Study Sets chips
        loadMyStudySets();
      });


    // --------------------------------------------------------
    // DELETE
    // --------------------------------------------------------

    row
      .querySelector(".manage-delete-btn")
      .addEventListener("click", () => {

        const confirmed =
          confirm(
            `Delete "${savedSet.name}"? This cannot be undone.`
          );

        if (!confirmed) {
          return;
        }

        savedStudySets.splice(index, 1);

        localStorage.setItem(
          "nachoSavedStudySets",
          JSON.stringify(savedStudySets)
        );

        // If the deleted set was selected,
        // clear that selection.
        if (
          selectedMyStudySet &&
          selectedMyStudySet === savedSet
        ) {
          selectedMyStudySet = null;
        }

        // Refresh both interfaces
        renderManageStudySets();
        loadMyStudySets();
        updateCardCountPreview();
      });


    list.appendChild(row);
  });

  container.appendChild(list);
}

// ------------------------------------------------------------
// CARD DISPLAY / NAVIGATION
// ------------------------------------------------------------

function showNextCard() {
  if (attemptedIndices.size >= practiceCards.length) {
    endPractice(false);
    return;
  }

  let next;

  if (practiceMode === "ordered-answer") {
    next = attemptedIndices.size;
  } else {
    const remaining = practiceCards
      .map((_, i) => i)
      .filter(i => !attemptedIndices.has(i));

    next =
      remaining[Math.floor(Math.random() * remaining.length)];
  }

  currentCardIndex = next;

  currentCardState = "fresh";
  currentCardFirstWrongAnswer = "";
  currentCardFirstWrongChoice = "";
  currentCardPromptWord = "";

  const card = practiceCards[currentCardIndex];

  const mode =
    (practiceMode === "mixed" ||
      practiceMode === "multiple-choice")
      ? (Math.random() < 0.5
          ? "spanish-english"
          : "english-spanish")
      : practiceMode;

  if (
    mode === "spanish-english" ||
    mode === "answer"
  ) {
    currentCardPromptWord = card.spanish;

    promptText.innerHTML =
      formatPromptText(card.spanish);

    directionLabel.textContent =
      mode === "answer"
        ? ""
        : "Spanish → English";

    answerInput.placeholder =
      "Type the English meaning...";
  } else {
    currentCardPromptWord = card.english;

    promptText.innerHTML =
      formatPromptText(card.english);

    directionLabel.textContent =
      "English → Spanish";

    answerInput.placeholder =
      "Type the Spanish word...";
  }

  // ----------------------------------------------------------
  // MULTIPLE CHOICE DISPLAY
  // ----------------------------------------------------------

  if (practiceMode === "multiple-choice") {
    answerInput.classList.add("hidden");
    checkBtn.classList.add("hidden");
    multipleChoiceOptions.classList.remove("hidden");

    document
      .querySelector(".accent-legend")
      .classList.add("hidden");

    createMultipleChoiceOptions(card, mode);
  } else {
    answerInput.classList.remove("hidden");
    checkBtn.classList.remove("hidden");
    multipleChoiceOptions.classList.add("hidden");

    document
      .querySelector(".accent-legend")
      .classList.remove("hidden");
  }

  // Store expected direction on card
  card._mode = mode;

  // Reset answer area
  answerInput.value = "";

  feedbackText.textContent = "";
  feedbackText.className = "feedback-text";

  hintText.textContent = "";

  directionLabel.style.color = "";

  responseDisplay.className =
    "response-display hidden";

  responseIcon.textContent = "";
  responseText.textContent = "";

  correctAnswerDisplay.textContent = "";
  correctAnswerDisplay.className =
    "correct-answer-display hidden";

  answerInput.disabled = false;
  checkBtn.disabled = false;

  if (practiceMode !== "multiple-choice") {
    answerInput.focus();
  }

  const remaining =
    practiceCards.length - attemptedIndices.size;

  practiceProgress.textContent =
    `${attemptedIndices.size} done · ${remaining} remaining`;

  updateStats();
}

function getExpectedAnswer(card) {
  const mode =
    card._mode || "spanish-english";

  return (
    mode === "spanish-english" ||
    mode === "answer"
  )
    ? card.english
    : card.spanish;
}


// ------------------------------------------------------------
// MULTIPLE CHOICE
// ------------------------------------------------------------

function createMultipleChoiceOptions(card, mode) {
  const correctAnswer =
    mode === "spanish-english"
      ? card.english
      : card.spanish;

  const answerPool = getFilteredCards()
    .map(c =>
      mode === "spanish-english"
        ? c.english
        : c.spanish
    )
    .filter(
      a => a && a !== correctAnswer
    );

  const distractors = shuffleArray(answerPool)
    .filter(
      (value, index, self) =>
        self.indexOf(value) === index
    )
    .slice(0, 4);

  let choices;
  let correctChoice;

  // 20% chance that "None of these" is correct
  if (Math.random() < 0.2) {
    choices = [
      ...distractors,
      "None of these"
    ];

    correctChoice = "None of these";
  } else {
    choices = [
      correctAnswer,
      ...distractors.slice(0, 3),
      "None of these"
    ];

    correctChoice = correctAnswer;
  }

  // Shuffle everything except "None of these"
  choices = shuffleArray(
    choices.filter(
      choice => choice !== "None of these"
    )
  );

  // Always put "None of these" last
  choices.push("None of these");

  multipleChoiceOptions.innerHTML = "";

  choices.forEach((choice, index) => {
    const button =
      document.createElement("button");

    button.className =
      "multiple-choice-btn";

    button.textContent =
      `${String.fromCharCode(65 + index)}. ${choice}`;

    button.addEventListener("click", () => {
      checkMultipleChoiceAnswer(
        choice,
        correctChoice
      );
    });

    multipleChoiceOptions.appendChild(button);
  });
}

function checkMultipleChoiceAnswer(selectedAnswer, correctAnswer) {
  if (currentCardIndex < 0 || currentCardState === "done") return;

  const buttons = document.querySelectorAll("#multipleChoiceOptions button");

  // ============================================================
  // FIRST ATTEMPT
  // ============================================================
  if (currentCardState === "fresh") {

    if (selectedAnswer === correctAnswer) {
      // First attempt correct
      correctCount++;
      currentCardState = "done";
      attemptedIndices.add(currentCardIndex);

      buttons.forEach(btn => {
        btn.disabled = true;

        const text = btn.textContent.replace(/^[A-E]\.\s/, "");

        if (text === selectedAnswer) {
          btn.style.borderColor = "var(--color-success)";
          btn.style.background = "#dcfce7";
        }
      });

      responseIcon.textContent = "✓";
      responseText.textContent = selectedAnswer;
      responseDisplay.className = "response-display correct";
      directionLabel.textContent = "Press Enter for the next card.";

    } else {
      // First attempt wrong:
      // Turn selected answer RED and allow exactly one retry.
      currentCardState = "hint_shown";
    
      buttons.forEach(btn => {
        const text = btn.textContent.replace(/^[A-E]\.\s/, "");
    
        if (text === selectedAnswer) {
          btn.style.borderColor = "var(--color-danger)";
          btn.style.background = "#fee2e2";
          btn.classList.add("mc-wrong-first");
    
          // Add feedback directly inside the button
          btn.textContent = `${btn.textContent} — Try again!`;
    
          // Prevent selecting the same wrong answer again
          btn.disabled = true;
        } else {
          // Other choices remain available
          btn.disabled = false;
        }
      });
    
      // Remove the extra feedback underneath the prompt
      feedbackText.textContent = "";
      hintText.textContent = "";
      responseDisplay.className = "response-display hidden";
      directionLabel.textContent = "";
    }
    updateStats();
    return;
  }

  // ============================================================
  // SECOND ATTEMPT
  // ============================================================
  if (currentCardState === "hint_shown") {

    if (selectedAnswer === correctAnswer) {
      // Second attempt correct = HINTED CORRECT
      hintedCorrectCount++;
      currentCardState = "done";
      attemptedIndices.add(currentCardIndex);

      buttons.forEach(btn => {
        btn.disabled = true;

        const text = btn.textContent.replace(/^[A-E]\.\s/, "");

        if (text === selectedAnswer) {
          btn.style.borderColor = "var(--color-warning)";
          btn.style.background = "#fef3c7";
        }
      });

      responseIcon.textContent = "✓";
      responseText.textContent = selectedAnswer;
      responseDisplay.className = "response-display hinted";
      directionLabel.textContent = "Press Enter for the next card.";

      feedbackText.textContent = "";
      hintText.textContent = "";

    } else {
      // Second attempt wrong = INCORRECT
      incorrectCount++;
      currentCardState = "done";
      attemptedIndices.add(currentCardIndex);

      buttons.forEach(btn => {
        btn.disabled = true;

        const text = btn.textContent.replace(/^[A-E]\.\s/, "");

        // Keep both wrong choices red
        if (text === selectedAnswer || btn.classList.contains("mc-wrong-first")) {
          btn.style.borderColor = "var(--color-danger)";
          btn.style.background = "#fee2e2";
        }

        // Now reveal the correct answer
        if (text === correctAnswer) {
          btn.style.borderColor = "var(--color-success)";
          btn.style.background = "#dcfce7";
        }
      });

      responseIcon.textContent = "✗";
      responseText.textContent = selectedAnswer;
      responseDisplay.className = "response-display incorrect";

      correctAnswerDisplay.textContent = correctAnswer;
      correctAnswerDisplay.className = "correct-answer-display";

      directionLabel.textContent = "Press Enter for the next card.";

      feedbackText.textContent = "";
      hintText.textContent = "";

      wrongAnswers.push({
        prompt: currentCardPromptWord,
        studentAnswer: selectedAnswer
      });
    }

    updateStats();
  }
}


// ------------------------------------------------------------
// ANSWER NORMALIZATION
// ------------------------------------------------------------

function normalizeAnswer(str) {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/[.,!?;:¡¿]/g, "")
    .replace(/\s+/g, " ");
}

function stripAccents(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getAcceptedAnswers(answerString) {
  // Remove teacher notes in parentheses
  const withoutNotes =
    answerString.replace(
      /\([^)]*\)/g,
      ""
    );

  // Split alternatives inside brackets
  return withoutNotes
    .replace("[", "|")
    .replace("]", "")
    .split("|")
    .map(a => normalizeAnswer(a))
    .filter(Boolean);
}


// ------------------------------------------------------------
// TYPED ANSWER CHECKING
// ------------------------------------------------------------

function checkAnswer() {
  if (
    currentCardIndex < 0 ||
    currentCardState === "done"
  ) {
    return;
  }

  const card =
    practiceCards[currentCardIndex];

  const expectedAnswers =
    getAcceptedAnswers(
      getExpectedAnswer(card)
    );

  const student =
    answerInput.value;

  if (!student.trim()) return;

  const isCorrect =
    expectedAnswers.includes(
      normalizeAnswer(student)
    );

  if (currentCardState === "fresh") {

    if (isCorrect) {

      // First attempt correct
      correctCount++;

      currentCardState = "done";

      attemptedIndices.add(
        currentCardIndex
      );

      answerInput.disabled = true;
      checkBtn.disabled = true;

      responseIcon.textContent = "✓";
      responseText.textContent =
        student;

      responseDisplay.className =
        "response-display correct";

      directionLabel.textContent =
        "Press Enter for the next card.";

      feedbackText.textContent = "";
      hintText.textContent = "";

    } else {

      // First attempt wrong
      // Give typed-answer diagnostic hint
      // and allow one retry.

      currentCardState =
        "hint_shown";

      currentCardFirstWrongAnswer =
        student;

      feedbackText.textContent =
        "✗ Not quite — try again!";

      feedbackText.className =
        "feedback-text incorrect";

      hintText.textContent =
        getHint(
          student,
          expectedAnswers[0]
        );

      answerInput.value = "";
      answerInput.focus();
    }

  } else if (
    currentCardState === "hint_shown"
  ) {

    // --------------------------------------------------------
    // SECOND TYPED ATTEMPT
    // --------------------------------------------------------

    if (isCorrect) {

      hintedCorrectCount++;

      currentCardState = "done";

      attemptedIndices.add(
        currentCardIndex
      );

      answerInput.disabled = true;
      checkBtn.disabled = true;

      responseIcon.textContent = "✓";
      responseText.textContent =
        student;

      responseDisplay.className =
        "response-display hinted";

      directionLabel.textContent =
        "Press Enter for the next card.";

      feedbackText.textContent = "";
      hintText.textContent = "";

    } else {

      // Second attempt wrong
      incorrectCount++;

      currentCardState = "done";

      attemptedIndices.add(
        currentCardIndex
      );

      wrongAnswers.push({
        prompt:
          currentCardPromptWord,
        studentAnswer:
          currentCardFirstWrongAnswer
      });

      answerInput.disabled = true;
      checkBtn.disabled = true;

      responseIcon.textContent = "✗";

      responseText.textContent =
        currentCardFirstWrongAnswer;

      responseDisplay.className =
        "response-display incorrect";

      correctAnswerDisplay.textContent =
        expectedAnswers.join(" / ");

      correctAnswerDisplay.className =
        "correct-answer-display";

      directionLabel.textContent =
        "Press Enter for the next card.";

      feedbackText.textContent = "";
      hintText.textContent = "";
    }
  }

  updateStats();
}

function showAnswer() {
  // Show Answer removed —
  // students must answer themselves
}


// ------------------------------------------------------------
// ANSWER DIAGNOSTICS / HINTS
// ------------------------------------------------------------

function getHint(
  studentAnswer,
  correctAnswer
) {
  const student =
    studentAnswer.trim();

  const correct =
    correctAnswer.trim();

  const diagnostics = [];

  const removeAccents = text =>
    text
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );

  const studentBase =
    removeAccents(student);

  const correctBase =
    removeAccents(correct);

  // ----------------------------------------------------------
  // ACCENTS
  // Only mention accents when everything else
  // is essentially correct.
  // ----------------------------------------------------------

  if (
    studentBase.toLowerCase() ===
      correctBase.toLowerCase() &&
    student !== correct
  ) {

    const studentHasAccent =
      /[áéíóúüñ]/i.test(student);

    const correctHasAccent =
      /[áéíóúüñ]/i.test(correct);

    if (
      correctHasAccent &&
      !studentHasAccent
    ) {
      diagnostics.push(
        "Accents: add accent(s)"
      );

    } else if (
      !correctHasAccent &&
      studentHasAccent
    ) {
      diagnostics.push(
        "Accents: remove accent(s)"
      );

    } else {
      diagnostics.push(
        "Accents: check accent(s)"
      );
    }

    return (
      "Hint: " +
      diagnostics.join(" • ")
    );
  }

  // ----------------------------------------------------------
  // ARTICLE
  // ----------------------------------------------------------

  const articleRegex =
    /^(el|la|los|las|un|una|unos|unas)\s+/i;

  const studentArticle =
    student.match(articleRegex)
      ?.[1]
      ?.toLowerCase() || "";

  const correctArticle =
    correct.match(articleRegex)
      ?.[1]
      ?.toLowerCase() || "";

  if (
    studentArticle !== correctArticle
  ) {

    if (
      !studentArticle &&
      correctArticle
    ) {

      diagnostics.push(
        "Article: missing"
      );

    } else if (
      studentArticle &&
      !correctArticle
    ) {

      diagnostics.push(
        "Article: remove it"
      );

    } else {

      diagnostics.push(
        "Article: incorrect"
      );
    }
  }

  // ----------------------------------------------------------
  // WORD ORDER
  // ----------------------------------------------------------

  const sortedStudentWords =
    student
      .split(/\s+/)
      .map(word =>
        removeAccents(
          word.toLowerCase()
        )
      )
      .sort();

  const sortedCorrectWords =
    correct
      .split(/\s+/)
      .map(word =>
        removeAccents(
          word.toLowerCase()
        )
      )
      .sort();

  const sameWordsDifferentOrder =
    student.split(/\s+/).length ===
      correct.split(/\s+/).length &&
    JSON.stringify(
      sortedStudentWords
    ) ===
      JSON.stringify(
        sortedCorrectWords
      ) &&
    student.toLowerCase() !==
      correct.toLowerCase();

  if (
    sameWordsDifferentOrder
  ) {

    diagnostics.push(
      "Word order: incorrect"
    );
  }

  // ----------------------------------------------------------
  // BEGINNING / MIDDLE / END
  // ----------------------------------------------------------

  const studentLetters =
    studentBase
      .replace(/\s/g, "")
      .toLowerCase();

  const correctLetters =
    correctBase
      .replace(/\s/g, "")
      .toLowerCase();

  if (
    studentLetters.length &&
    correctLetters.length
  ) {

    const length =
      Math.min(
        studentLetters.length,
        correctLetters.length
      );

    // Beginning
    const beginningEnd =
      Math.ceil(length / 3);

    let beginningCorrect =
      true;

    for (
      let i = 0;
      i < beginningEnd;
      i++
    ) {

      if (
        studentLetters[i] !==
        correctLetters[i]
      ) {

        beginningCorrect =
          false;

        break;
      }
    }

    // Middle
    const middleStart =
      Math.floor(
        correctLetters.length / 3
      );

    const middleEnd =
      Math.ceil(
        correctLetters.length * 2 / 3
      );

    let middleCorrect =
      true;

    for (
      let i = middleStart;
      i < Math.min(
        middleEnd,
        length
      );
      i++
    ) {

      if (
        studentLetters[i] !==
        correctLetters[i]
      ) {

        middleCorrect =
          false;

        break;
      }
    }

    // End
    const endLength =
      Math.ceil(
        correctLetters.length / 3
      );

    const correctEnd =
      correctLetters.slice(
        -endLength
      );

    const studentEnd =
      studentLetters.slice(
        -endLength
      );

    const endCorrect =
      studentEnd === correctEnd;

    if (!beginningCorrect) {
      diagnostics.push(
        "Beginning: incorrect"
      );
    }

    if (!middleCorrect) {
      diagnostics.push(
        "Middle: incorrect"
      );
    }

    if (!endCorrect) {
      diagnostics.push(
        "End: incorrect"
      );
    }
  }

  // ----------------------------------------------------------
  // FALLBACK
  // ----------------------------------------------------------

  if (diagnostics.length) {
    return (
      "Hint: " +
      diagnostics.join(" • ")
    );
  }

  return (
    "Hint: Check your spelling and try again."
  );
}


// ============================================================
// PRACTICE UI & CONTROLS
// ============================================================


// ------------------------------------------------------------
// PRACTICE STATS
// ------------------------------------------------------------

function updateStats() {
  statCorrect.textContent = correctCount;
  statHinted.textContent = hintedCorrectCount;
  statIncorrect.textContent = incorrectCount;
  statTotal.textContent = practiceCards.length;

  const remaining =
    practiceCards.length - attemptedIndices.size;

  practiceProgress.textContent =
    `${attemptedIndices.size} done · ${remaining} remaining`;
}


// ------------------------------------------------------------
// TEXT INPUT: AUTO-ACCENTS
// ------------------------------------------------------------

// Automatically convert capital letters into accented characters
const ACCENT_MAP = {
  "A": "á",
  "E": "é",
  "I": "í",
  "O": "ó",
  "U": "ú",
  "N": "ñ",
  "Y": "ü"
};

answerInput.addEventListener("input", () => {
  const pos = answerInput.selectionStart;
  const original = answerInput.value;

  const converted =
    original.replace(
      /[AEIOUNY]/g,
      ch => ACCENT_MAP[ch]
    );

  if (converted !== original) {
    answerInput.value = converted;
    answerInput.setSelectionRange(pos, pos);
  }
});


// ------------------------------------------------------------
// BUTTON EVENTS
// ------------------------------------------------------------

// Check typed answer
checkBtn.addEventListener(
  "click",
  checkAnswer
);

// Advance to next card
nextBtn.addEventListener(
  "click",
  advanceCard
);

// Return from study set to filter/home screen
backFromStudySet.addEventListener(
  "click",
  () => {
    studySetPanel.classList.add("hidden");
    showFilterPanel();
  }
);


// ------------------------------------------------------------
// KEYBOARD: TYPED ANSWERS
// ------------------------------------------------------------

// Enter while answering a typed-response question
answerInput.addEventListener(
  "keydown",
  e => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();

      if (currentCardState === "done") {
        advanceCard();
      } else {
        checkAnswer();
      }
    }
  }
);


// ------------------------------------------------------------
// KEYBOARD: MULTIPLE CHOICE
// ------------------------------------------------------------

// A–E selects multiple-choice answers
document.addEventListener(
  "keydown",
  e => {
    if (
      practiceMode !== "multiple-choice" ||
      !practiceActive ||
      currentCardIndex < 0 ||
      currentCardState === "done"
    ) {
      return;
    }

    // Don't trigger A–E while typing in an input
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA"
    ) {
      return;
    }

    const key =
      e.key.toUpperCase();

    if (
      !["A", "B", "C", "D", "E"].includes(key)
    ) {
      return;
    }

    const index =
      key.charCodeAt(0) -
      "A".charCodeAt(0);

    const buttons =
      document.querySelectorAll(
        "#multipleChoiceOptions button"
      );

    const button =
      buttons[index];

    // Ignore disabled choices
    if (!button || button.disabled) {
      return;
    }

    e.preventDefault();
    button.click();
  }
);


// ------------------------------------------------------------
// KEYBOARD: NEXT CARD
// ------------------------------------------------------------

// Enter advances after an answer is complete
document.addEventListener(
  "keydown",
  e => {
    if (
      e.key === "Enter" &&
      currentCardState === "done" &&
      practiceActive
    ) {
      e.preventDefault();
      advanceCard();
    }
  }
);

function advanceCard() {
  if (currentCardIndex >= 0 && currentCardState !== "done") {
    // Card skipped via Next button — mark as attempted (unanswered)
    attemptedIndices.add(currentCardIndex);
  }

  showNextCard();
}

function formatPromptText(text) {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, label, url) => {
      return `<a href="${url.replace(/&/g, "&amp;")}" target="_blank">${label}</a>`;
    })
    .replaceAll("|", "<br>");
}

function launchGiantTaco() {
  const taco = document.getElementById("giantTaco");

  taco.classList.remove("hidden");
  
  // Restart animation if it has already happened before
  taco.classList.remove("taco-drop");
  void taco.offsetWidth;
  
  taco.classList.add("taco-drop");
}

document.getElementById("giantTaco").addEventListener("click", () => {
  const taco = document.getElementById("giantTaco");

  taco.classList.add("hidden");
  taco.classList.remove("taco-drop");
});

function launchNachoConfetti() {
  const container = document.getElementById("nachoConfetti");

  container.innerHTML = "";

  for (let i = 0; i < 50; i++) {
    const piece = document.createElement("div");

    piece.className = "nacho-piece";
    piece.textContent = "🌮";

    piece.style.left = Math.random() * 100 + "%";
    piece.style.animationDuration = (2 + Math.random() * 2) + "s";

    container.appendChild(piece);
  }

  setTimeout(() => {
    container.innerHTML = "";
  }, 4500);
}

// ============================================================
// END PRACTICE
// ============================================================
endPracticeBtn.addEventListener("click", () => {
  const unanswered = practiceCards.length - attemptedIndices.size;
  confirmMsg.textContent = unanswered > 0
    ? `You have ${unanswered} unanswered card${unanswered !== 1 ? "s" : ""}. Your progress so far will be recorded.`
    : "You've answered all cards. Your results will be recorded.";
  confirmDialog.classList.remove("hidden");
});

confirmEndBtn.addEventListener("click", () => {
  confirmDialog.classList.add("hidden");
  endPractice(true);
});

cancelEndBtn.addEventListener("click", () => {
  confirmDialog.classList.add("hidden");
});

function updateFooterNachos() {
  const count = getNachoCount();
  if (footerNachoName) footerNachoName.textContent = currentUser?.name || "";
  if (footerNachoCount) footerNachoCount.textContent = `${count.toLocaleString()} nacho${count !== 1 ? "s" : ""}`;
}

function getNachoCount() {
  const key = `${NACHO_STORAGE_KEY}-${currentUser?.username || "guest"}`;
  return parseInt(localStorage.getItem(key) || "0", 10);
}

function addNachos(n) {
  const key = `${NACHO_STORAGE_KEY}-${currentUser?.username || "guest"}`;
  const total = getNachoCount() + n;
  localStorage.setItem(key, total);
  return total;
}

function getPerfectSessionCount() {
  const key = `${PERFECT_STORAGE_KEY}-${currentUser?.username || "guest"}`;
  return parseInt(localStorage.getItem(key) || "0", 10);
}

function addPerfectSession() {
  const key = `${PERFECT_STORAGE_KEY}-${currentUser?.username || "guest"}`;
  const total = getPerfectSessionCount() + 1;
  localStorage.setItem(key, total);
  return total;
}

function endPractice(early) {
  practiceActive = false;
  const unanswered = practiceCards.length - attemptedIndices.size;
  const total = practiceCards.length;
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

 let perfectSessions = getPerfectSessionCount();

if (pct === 100) {
  perfectSessions = addPerfectSession();

  if (perfectSessions % 10 === 0) {
    launchGiantTaco();
  } else {
    launchNachoConfetti();
  }
}

  // Build set name label
  const setNames = [...new Set(practiceCards.map(c => c.setName))].join(", ");

  // Format timestamp
  const now = new Date().toLocaleString("en-US", {
    month: "numeric", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true
  });

  // Build wrong answers suffix e.g. [❌hola - ola][❌adiós - adios]
  const wrongSuffix = wrongAnswers.length
    ? " " + wrongAnswers.map(w => `[❌${w.prompt} - ${w.studentAnswer}]`).join("")
    : "";

  const entry = `${setNames} — ${sessionModeLabel} — ${pct}% — ${correctCount} correct, ${incorrectCount} incorrect, ${hintedCorrectCount} hinted correct, ${unanswered} unanswered — ${currentUser.name} (${currentUser.username}) — ${now}${wrongSuffix}`;

  saveAttemptHistory(entry);

  // Add nachos
let nachosEarned = correctCount;

if (sessionStartMode === "multiple-choice") {
  const completedSession = unanswered === 0 && !early;

  nachosEarned = completedSession
    ? (sessionStartLength === 25 ? 3 : 1)
    : 0;
}

const totalNachos = addNachos(nachosEarned);
updateFooterNachos();

nachoEarnedMessage.textContent = nachosEarned > 0
  ? `+${nachosEarned} nacho${nachosEarned !== 1 ? "s" : ""} earned!`
  : "No nachos earned this session.";

  // Pick celebration tier
  const tier = getTier(pct);
  celebrationIcon.textContent = tier.icon;
  celebrationTitle.textContent = tier.title;
  celebrationMsg.textContent = randomMessage(tier);
  nachoCountDisplay.textContent = `${totalNachos.toLocaleString()} nachos collected`;

  practicePanel.classList.add("hidden");
  resultsPanel.classList.remove("hidden");

  resultsSummary.textContent = entry;
  renderAttemptHistory();
}

// ============================================================
// PRACTICE AGAIN
// ============================================================
practiceAgainBtn.addEventListener("click", () => {
  if (!lastFilterSettings) return;
  selectedLevels = new Set(lastFilterSettings.levels);
  selectedUnits = new Set(lastFilterSettings.units);
  selectedSets = new Set(lastFilterSettings.sets);
  const filtered = getFilteredCards();
  if (!filtered.length) return;
  beginPractice(filtered);
});

newPracticeBtn.addEventListener("click", () => {
  selectedLevels.clear();
  selectedUnits.clear();
  selectedSets.clear();
  showFilterPanel();
});

// ============================================================
// ATTEMPT HISTORY (localStorage)
// ============================================================
function loadAttemptHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveAttemptHistory(entry) {
  const history = loadAttemptHistory();
  history.unshift(entry);
  const trimmed = history.slice(0, 20); // keep last 20
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
}

function renderAttemptHistory() {
  const history = loadAttemptHistory().filter(e => {
    // Only show entries for the current user
    return currentUser && e.includes(`(${currentUser.username})`);
  });

  if (!history.length) {
    attemptHistoryList.innerHTML = '<li class="no-history">No attempts yet.</li>';
    return;
  }
  attemptHistoryList.innerHTML = history
    .map(e => `<li>${e}</li>`)
    .join("");
}

// ============================================================
// HISTORY TOGGLE
// ============================================================
historyToggle.addEventListener("click", () => {
  historyContent.classList.toggle("hidden");

  historyToggle.textContent = historyContent.classList.contains("hidden")
    ? "Attempt History ▸"
    : "Attempt History ▾";
});

// ============================================================
// STUDY SET
// ============================================================


// ------------------------------------------------------------
// STUDY SET STATE
// ------------------------------------------------------------

// Cards currently selected by the student.
// Uses the actual card objects so selections survive sorting.


// ============================================================
// STUDY SET FUNCTIONS
// ============================================================

let selectedStudyCards = new Set();
let currentStudySetCards = [];

function showStudySet(cards) {

  saveCurrentPanel("studySet");

  loadFilterSettings();

  currentStudySetCards = cards;

  localStorage.setItem(
    "nachoCurrentStudySetCards",
    JSON.stringify(cards)
  );

  localStorage.setItem(
    "nachoCurrentPanel",
    "studySet"
  );

  filterPanel.classList.add("hidden");
  practicePanel.classList.add("hidden");
  resultsPanel.classList.add("hidden");
  conversationSelectionPanel?.classList.add("hidden");
  conversationPanel?.classList.add("hidden");

  studySetPanel.classList.remove("hidden");

  studySetContainer.innerHTML = `
  
    <div class="study-set-controls">
  
    <button
        id="selectAllStudyCards"
        type="button"
        class="study-set-control-btn"
      >
        Select All
      </button>
    
      <button
        id="clearAllStudyCards"
        type="button"
        class="study-set-control-btn"
      >
        Clear All
      </button>
    
      <button
        id="saveStudySet"
        type="button"
        class="study-set-control-btn"
        disabled
      >
        Save Study Set
      </button>
    
      <button
        id="copySelectedStudyCards"
        type="button"
        class="study-set-copy-btn"
        disabled
      >
        Copy Selected
      </button>
    
    </div>

    <table class="study-table">
      <thead>
        <tr>
          <th class="study-select-column">
            <span class="sr-only">Select</span>
          </th>

          <th id="sortSpanish" class="sortable">
            Spanish <span id="spanishArrow">↕</span>
          </th>

          <th id="sortEnglish" class="sortable">
            English <span id="englishArrow">↕</span>
          </th>
        </tr>
      </thead>

      <tbody></tbody>
    </table>
  `;

  const tbody =
    studySetContainer.querySelector("tbody");

  // ------------------------------------------------------------
  // SORT BUTTONS
  // ------------------------------------------------------------

  document
    .getElementById("sortSpanish")
    .onclick = () => {
      sortStudySet(cards, "spanish");
    };

  document
    .getElementById("sortEnglish")
    .onclick = () => {
      sortStudySet(cards, "english");
    };

  // ------------------------------------------------------------
  // BUILD ROWS
  // ------------------------------------------------------------

  cards.forEach((card, index) => {

    const row =
      document.createElement("tr");

    row.dataset.studyIndex = index;

    row.innerHTML = `
      <td class="study-select-column">
        <input
          type="checkbox"
          class="study-card-checkbox"
          aria-label="Select ${card.spanish}"
        >
      </td>

      <td>
        ${card.spanish}
        <button
          class="study-tts-btn"
          type="button"
          aria-label="Hear Spanish pronunciation"
        >
          🔊
        </button>
      </td>

      <td>
        ${card.english}
      </td>
    `;

    tbody.appendChild(row);

    // ----------------------------------------------------------
    // CHECKBOX
    // ----------------------------------------------------------

    const checkbox =
      row.querySelector(".study-card-checkbox");

    checkbox.addEventListener("change", () => {

      if (checkbox.checked) {
        selectedStudyCards.add(card);
      } else {
        selectedStudyCards.delete(card);
      }

      updateStudySetSelectionUI();
    });

    // ----------------------------------------------------------
    // TEXT-TO-SPEECH
    // ----------------------------------------------------------

    const speakButton =
      row.querySelector(".study-tts-btn");

    speakButton.addEventListener("click", () => {
      speakSpanish(card.spanish);
    });
  });

    // ------------------------------------------------------------
    // SELECT ALL
    // ------------------------------------------------------------
  
    document
      .getElementById("selectAllStudyCards")
      .addEventListener("click", () => {
  
        cards.forEach(card => {
          selectedStudyCards.add(card);
        });
  
        updateStudySetCheckboxes(cards);
        updateStudySetSelectionUI();
      });
  
  
    // ------------------------------------------------------------
    // CLEAR ALL
    // ------------------------------------------------------------
  
    document
      .getElementById("clearAllStudyCards")
      .addEventListener("click", () => {
  
        selectedStudyCards.clear();
  
        updateStudySetCheckboxes(cards);
        updateStudySetSelectionUI();
      });
  
  
    // ------------------------------------------------------------
    // SAVE STUDY SET
    // ------------------------------------------------------------
    
    document
      .getElementById("saveStudySet")
      .addEventListener("click", () => {
        saveSelectedStudySet();
      });
  
  
    // ------------------------------------------------------------
    // COPY SELECTED
    // ------------------------------------------------------------
  
    document
      .getElementById("copySelectedStudyCards")
      .addEventListener("click", () => {
  
        copySelectedStudyCards();
      });
  
  
    // ------------------------------------------------------------
    // RESTORE SELECTION STATE
    // ------------------------------------------------------------
  
    updateStudySetCheckboxes(cards);
    updateStudySetSelectionUI();
  
  
    // ------------------------------------------------------------
    // SCROLL TO STUDY SET
    // ------------------------------------------------------------
  
    studySetPanel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

// ============================================================
// STUDY SET SELECTION UI
// ============================================================

function updateStudySetCheckboxes(cards) {

  const rows =
    studySetContainer.querySelectorAll(
      "tbody tr"
    );

  rows.forEach((row, index) => {

    const checkbox =
      row.querySelector(
        ".study-card-checkbox"
      );

    if (!checkbox) return;

    checkbox.checked =
      selectedStudyCards.has(cards[index]);
  });
}


function updateStudySetSelectionUI() {

  const count =
    selectedStudyCards.size;

  const saveButton =
    document.getElementById(
      "saveStudySet"
    );
  
  if (saveButton) {
    saveButton.disabled =
      count === 0;
  }
  
  const copyButton =
    document.getElementById(
      "copySelectedStudyCards"
    );

  if (copyButton) {
    copyButton.disabled =
      count === 0;
  }
}

// ------------------------------------------------------------
// STUDY SET SELECTION UI
// ------------------------------------------------------------

function updateStudySelectionUI() {

  const count =
    selectedStudyCards.size;

  const countDisplay =
    document.getElementById(
      "studySelectionCount"
    );

  const practiceButton =
    document.getElementById(
      "practiceSelectedStudyCards"
    );

  const copyButton =
    document.getElementById(
      "copySelectedStudyCards"
    );

  if (countDisplay) {
    countDisplay.textContent =
      `${count} selected`;
  }

  if (practiceButton) {
    practiceButton.disabled =
      count === 0;
  }

  if (copyButton) {
    copyButton.disabled =
      count === 0;
  }
}


// ============================================================
// STUDY SET SORTING
// ============================================================

function sortStudySet(cards, column) {

  if (studySetSortColumn === column) {
    studySetSortDirection =
      studySetSortDirection === "asc"
        ? "desc"
        : "asc";
  } else {
    studySetSortColumn = column;
    studySetSortDirection = "asc";
  }

  const sortedCards =
    [...cards].sort((a, b) => {

      const aText =
        cleanSortText(
          a[column] || "",
          column
        );

      const bText =
        cleanSortText(
          b[column] || "",
          column
        );

      return aText.localeCompare(
        bText,
        undefined,
        { sensitivity: "base" }
      );
    });

  if (studySetSortDirection === "desc") {
    sortedCards.reverse();
  }

  // Rebuild the table using the sorted cards.
  // selectedStudyCards is NOT cleared, so
  // previously selected cards remain selected.
  showStudySet(sortedCards);
}

// ------------------------------------------------------------
// CLEAN SORT TEXT
// ------------------------------------------------------------

function cleanSortText(word, language) {

  let text =
    word.trim();


  if (language === "spanish") {

    text =
      text.replace(
        /^(el|la|los|las|un|una|unos|unas)\s+/i,
        ""
      );

  }


  if (language === "english") {

    text =
      text.replace(
        /^(the|a|an|to)\s+/i,
        ""
      );

  }


  return text;
}

// ------------------------------------------------------------
// PRACTICE SELECTED STUDY CARDS
// ------------------------------------------------------------

function practiceSelectedStudyCards() {

  if (selectedStudyCards.size === 0) {
    return;
  }

  // Get cards in the order currently displayed
  // in the Study Set.
  const rows =
    studySetContainer.querySelectorAll(
      "tbody tr"
    );

  const selectedCards = [];

  rows.forEach(row => {

    const index =
      Number(row.dataset.studyIndex);

    const card =
      currentStudySetCards[index];

    if (
      card &&
      selectedStudyCards.has(card)
    ) {
      selectedCards.push(card);
    }
  });

  if (!selectedCards.length) {
    return;
  }

  beginPractice(selectedCards);
}
// ============================================================
// COPY SELECTED STUDY CARDS
// ============================================================

async function copySelectedStudyCards() {

  if (selectedStudyCards.size === 0) {
    return;
  }

  // Preserve the current Study Set display order.
  const rows =
    studySetContainer.querySelectorAll(
      "tbody tr"
    );

  const selectedCards = [];

  rows.forEach(row => {

    const index =
      Number(row.dataset.studyIndex);

    const card =
      currentStudySetCards[index];

    if (
      card &&
      selectedStudyCards.has(card)
    ) {
      selectedCards.push(card);
    }
  });

  // Tab-separated text works well when pasting
  // into Google Docs, Google Sheets, Word, etc.
  const textToCopy = [
    "Spanish\tEnglish",
    ...selectedCards.map(card =>
      `${card.spanish}\t${card.english}`
    )
  ].join("\n");

  try {

    await navigator.clipboard.writeText(
      textToCopy
    );

    const copyButton =
      document.getElementById(
        "copySelectedStudyCards"
      );

    const originalText =
      copyButton.textContent;

    copyButton.textContent =
      "Copied!";

    setTimeout(() => {
      copyButton.textContent =
        originalText;
    }, 1500);

  } catch (error) {

    console.error(
      "Could not copy selected study cards:",
      error
    );

    alert(
      "Sorry, the selected words could not be copied."
    );
  }
}

function saveSelectedStudySet() {

  if (selectedStudyCards.size === 0) {
    return;
  }

  // Get the cards in the order currently displayed.
  const rows =
    studySetContainer.querySelectorAll(
      "tbody tr"
    );

  const selectedCards = [];

  rows.forEach(row => {

    const index =
      Number(row.dataset.studyIndex);

    const card =
      currentStudySetCards[index];

    if (
      card &&
      selectedStudyCards.has(card)
    ) {
      selectedCards.push(card);
    }
  });

  if (!selectedCards.length) {
    return;
  }

  const name =
    prompt("Name this study set:");

  if (!name || !name.trim()) {
    return;
  }

  const savedStudySets =
    JSON.parse(
      localStorage.getItem("nachoSavedStudySets") || "[]"
    );

  savedStudySets.push({
    id: Date.now(),
    name: name.trim(),
    cards: selectedCards
  });

  localStorage.setItem(
    "nachoSavedStudySets",
    JSON.stringify(savedStudySets)
  );

  alert(
    `"${name.trim()}" was saved!`
  );
}

// ============================================================
// NACHO BUILDER FUNCTIONS
// ============================================================

const spanishKeyboard = [
  ["A", "a"],
  ["B", "be"],
  ["C", "ce"],
  ["D", "de"],
  ["E", "e"],
  ["F", "efe"],
  ["G", "ge"],

  ["H", "hache"],
  ["I", "i"],
  ["J", "jota"],
  ["K", "ka"],
  ["L", "ele"],
  ["M", "eme"],
  ["N", "ene"],

  ["Ñ", "eñe"],
  ["O", "o"],
  ["P", "pe"],
  ["Q", "cu"],
  ["R", "ere"],
  ["S", "ese"],
  ["T", "te"],

  ["U", "u"],
  ["V", "uve / ve"],
  ["W", "uve doble / doble ve"],
  ["X", "equis"],
  ["Y", "i griega"],
  ["Z", "zeta"]
];

function startNachoBuilder(cards) {

  saveCurrentPanel("nachoBuilder");
  
  loadFilterSettings();
  
  filterPanel.classList.add("hidden");
  practicePanel.classList.add("hidden");
  studySetPanel.classList.add("hidden");
  resultsPanel.classList.add("hidden");
  conversationSelectionPanel?.classList.add("hidden");
  conversationPanel?.classList.add("hidden");

  nachoBuilderPanel.classList.remove("hidden");

  nachoBuilderGuessedLetters.clear();
  nachoBuilderWrongGuesses = 0;

  updateNachoPracticeSets();
  updateNachoBuilderBowl();
  updateNachoBuilderStrikes();

  nachoBuilderCurrentSet =
    selectedSets.size
      ? [...selectedSets].join(", ")
      : "";

    const randomCard =
    cards[Math.floor(Math.random() * cards.length)];

  nachoBuilderCurrentSpanish =
    randomCard.spanish;

  nachoBuilderWord =
    removeSpanishArticle(randomCard.spanish).toLowerCase();

  localStorage.setItem(
    "nachoBuilderCurrentSpanish",
    nachoBuilderCurrentSpanish
  );

  localStorage.setItem(
    "nachoBuilderCards",
    JSON.stringify(cards)
  );

  localStorage.setItem(
    "nachoCurrentPanel",
    "nachoBuilder"
  );

  console.log("Nacho Builder word:", nachoBuilderWord);
  console.log("Original card:", randomCard);

  renderNachoBuilderWord();
  renderNachoBuilderKeyboard();
  updateNachoBuilderBowl();
}

function removeSpanishArticle(word) {
  return word.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, "");
}

function normalizeLetter(letter) {

  if (letter === "ñ" || letter === "Ñ") {
    return "ñ";
  }

  return letter
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function renderNachoBuilderWord() {

  const display = nachoBuilderWord
    .split("")
    .map(letter => {

      if (letter === " ") {
        return "\u00A0\u00A0";
      }

      if (nachoBuilderGuessedLetters.has(normalizeLetter(letter))) {
        return letter;
      }

      return "_";
    })
    .join(" ");

  nachoWordDisplay.textContent = display;
}

function updateNachoPracticeSets() {
  const selectedSetNames =
    lastFilterSettings?.sets
      ? [...lastFilterSettings.sets]
      : [];

  nachoPracticeSets.innerHTML = `
    <strong>Practicing:</strong>
    ${selectedSetNames.length
      ? selectedSetNames.join(" · ")
      : "Saved practice set"}
  `;
}

function updateNachoBuilderBowl() {

  const stages = [
    { 
      emoji: "🥣🍚🌽🫘🥩🧀🥑🌶️🌮", 
      label: "Nachos con todo 🎉" 
    },
    { 
      emoji: "🥣🍚🌽🫘🥩🧀🥑🌶️", 
      label: "Chile" 
    },
    { 
      emoji: "🥣🍚🌽🫘🥩🧀🥑", 
      label: "Aguacate" 
    },
    { 
      emoji: "🥣🍚🌽🫘🥩🧀", 
      label: "Queso" 
    },
    { 
      emoji: "🥣🍚🌽🫘🥩", 
      label: "Carne" 
    },
    { 
      emoji: "🥣🍚🌽🫘", 
      label: "Frijoles" 
    },
    { 
      emoji: "🥣🍚🌽", 
      label: "Maíz" 
    },
    { 
      emoji: "🥣🍚", 
      label: "Arroz" 
    },
    { 
      emoji: "🥣", 
      label: "Tazón vacío" 
    }
  ];
  
  const index = Math.min(
    nachoBuilderWrongGuesses,
    stages.length - 1
  );

  nachoBuilderCurrentBowl = `${stages[index].emoji} ${stages[index].label}`;

  nachoBowlProgress.innerHTML = `
    <div class="nacho-bowl-emoji">
      ${stages[index].emoji}
    </div>
    <div class="nacho-bowl-label">
      ${stages[index].label}
    </div>
  `;

}

function renderNachoBuilderKeyboard() {

  nachoKeyboard.innerHTML = "";

  spanishKeyboard.forEach(([letter, sound]) => {

    const button = document.createElement("button");

    button.className = "nacho-letter-btn";

    button.innerHTML = `
      <strong>${letter}</strong>
      <span>${sound}</span>
    `;

    button.addEventListener("click", () => {
      guessNachoBuilderLetter(letter, button);
    });

    nachoKeyboard.appendChild(button);
  });
}

function speakSpanish(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";

  const voices = speechSynthesis.getVoices();

  const spanishVoice =
    voices.find(voice => voice.lang.toLowerCase() === "es-es") ||
    voices.find(voice => voice.lang.toLowerCase().startsWith("es"));

  if (spanishVoice) {
    utterance.voice = spanishVoice;
  }

  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function guessNachoBuilderLetter(letter, button) {

  // Convert keyboard letter to lowercase
  const guessedLetter = normalizeLetter(letter);

  // Don't allow guessing the same letter twice
  if (nachoBuilderGuessedLetters.has(guessedLetter)) {
    return;
  }

  // Play Spanish letter name
  const letterNames = {
    a: "a",
    b: "ve",
    c: "ce",
    d: "de",
    e: "e",
    f: "efe",
    g: "heh",
    h: "hache",
    i: "i",
    j: "jota",
    k: "ka",
    l: "ele",
    m: "eme",
    n: "ene",
    ñ: "eñe",
    o: "o",
    p: "pe",
    q: "ku",
    r: "erre",
    s: "ese",
    t: "te",
    u: "u",
    v: "uve",
    w: "uve doble",
    x: "equis",
    y: "i griega",
    z: "zeta"
  };

  const spokenName = letterNames[guessedLetter];

  if (spokenName) {
    speakSpanish(spokenName);
  }

  nachoBuilderGuessedLetters.add(guessedLetter);

  // Correct guess
  const normalizedWord = normalizeLetter(nachoBuilderWord);

  if (normalizedWord.includes(guessedLetter)) {

    button.classList.add("correct");
    button.disabled = true;

    renderNachoBuilderWord();

  }

  // Wrong guess
  else {

    button.classList.add("wrong");
    button.disabled = true;

    nachoBuilderWrongGuesses++;

    updateNachoBuilderBowl();
    updateNachoBuilderStrikes();

  }

  checkNachoBuilderGameStatus();

}

function lockNachoBuilderKeyboard() {

  const buttons = nachoKeyboard.querySelectorAll("button");

  buttons.forEach(button => {
    button.disabled = true;
  });

}

function showNachoBuilderMessage(message) {

  nachoGameMessage.textContent = message;
  nachoGameMessage.classList.remove("hidden");

  nachoNextWordBtn.classList.remove("hidden");

}

function checkNachoBuilderGameStatus() {

  const solved = nachoBuilderWord
    .split("")
    .every(letter => {
      return letter === " " ||
        nachoBuilderGuessedLetters.has(normalizeLetter(letter));
    });

  if (solved) {
  
  renderNachoBuilderWord();
  
  showNachoBuilderMessage("🎉 Bowl complete! +1 🌮");

  saveAttemptHistory(
    `${nachoBuilderCurrentSet} — Nacho Bowl — ${nachoBuilderCurrentBowl} — ${nachoBuilderCurrentSpanish} — ${currentUser.name} (${currentUser.username}) — ${new Date().toLocaleString()}`
  );
  
  lockNachoBuilderKeyboard();
  
  return;
}
  
  if (nachoBuilderWrongGuesses >= nachoBuilderMaxWrongGuesses) {

  renderNachoBuilderWord();

  showNachoBuilderMessage(
    `💥 ¡Se derramó el tazón! The word was "${nachoBuilderWord}".`
  );

  saveAttemptHistory(
    `${nachoBuilderCurrentSet} — Nacho Bowl — 💥 Se derramó — ${nachoBuilderCurrentSpanish} — ${currentUser.name} (${currentUser.username}) — ${new Date().toLocaleString()}`
  );

  lockNachoBuilderKeyboard();

  return;
}
}

function updateNachoBuilderStrikes() {

  nachoStrikes.textContent =
    `${nachoBuilderWrongGuesses} ❌`;

}

// ============================================================
// INIT
// ============================================================

loadData().then(async () => {
  const savedUsername =
    localStorage.getItem("nachoCurrentUser");

  console.log(
    "RESTORE USER:",
    savedUsername
  );

  if (!savedUsername) {
    console.log("NO SAVED USER");
    return;
  }

  console.log(
    "ACCOUNTS LOADED:",
    allAccounts.length
  );

  const user = allAccounts.find(
    a =>
      String(a.username).trim().toLowerCase() ===
      String(savedUsername).trim().toLowerCase()
  );

  console.log(
    "RESTORED USER OBJECT:",
    user
  );

  if (!user) {
    console.log(
      "SAVED USER NOT FOUND IN ACCOUNTS:",
      savedUsername
    );
    return;
  }

  currentUser = user;

  landingPanel.classList.add("hidden");

  console.log(
    "USER RESTORED:",
    currentUser.username,
    "LANGUAGE:",
    currentUser.language
  );
  
  const savedPanel =
    localStorage.getItem("nachoCurrentPanel");
  
  console.log(
    "SAVED PANEL:",
    savedPanel
  );

  if (savedPanel === "landing") {
  
    showLandingPage();
  
    return;
  }
  
  if (savedPanel === "filter") {
    practiceScreen.classList.remove("hidden");
    loginScreen.classList.add("hidden");
  
    showFilterPanel();
    return;
  }

  // ----------------------------------------------------------
  // RESTORE PRACTICE SCREEN
  // ----------------------------------------------------------

    practiceScreen.classList.remove("hidden");
    loginScreen.classList.add("hidden");
  
    welcomeName.textContent =
      currentUser.name;
  
    try {
      await loadTeacherSettings();
    } catch (error) {
      console.error(
        "Teacher settings failed during restore:",
        error
      );
    }
  
    renderModeChips();
    renderAttemptHistory();
    updateFooterNachos();

  // ----------------------------------------------------------
  // RESTORE STUDY SET
  // ----------------------------------------------------------

  if (savedPanel === "studySet") {

    const savedStudySetCards =
      localStorage.getItem("nachoCurrentStudySetCards");

    if (savedStudySetCards) {

      const cards =
        JSON.parse(savedStudySetCards);

      filterPanel.classList.add("hidden");
      practicePanel.classList.add("hidden");
      resultsPanel.classList.add("hidden");
      conversationSelectionPanel?.classList.add("hidden");
      conversationPanel?.classList.add("hidden");

      showStudySet(cards);

    } else {

      showFilterPanel();

    }

    return;
  }


  // ----------------------------------------------------------
  // RESTORE CONVERSATIONS
  // ----------------------------------------------------------

  if (savedPanel === "conversationSelection") {
  
    filterPanel.classList.add("hidden");
    practicePanel.classList.add("hidden");
    studySetPanel.classList.add("hidden");
    resultsPanel.classList.add("hidden");
    nachoBuilderPanel.classList.add("hidden");
    conversationPanel?.classList.add("hidden");
  
    conversationSelectionPanel?.classList.remove("hidden");
  
    loadConversationIndex();
  
    return;
  }
  
  // ----------------------------------------------------------
  // RESTORE NACHO BUILDER
  // ----------------------------------------------------------

  if (savedPanel === "nachoBuilder") {

    const savedNachoCards =
      localStorage.getItem("nachoBuilderCards");

    const savedNachoSpanish =
      localStorage.getItem("nachoBuilderCurrentSpanish");

    if (savedNachoCards && savedNachoSpanish) {

      const cards =
        JSON.parse(savedNachoCards);

      filterPanel.classList.add("hidden");
      practicePanel.classList.add("hidden");
      studySetPanel.classList.add("hidden");
      resultsPanel.classList.add("hidden");
      conversationSelectionPanel?.classList.add("hidden");
      conversationPanel?.classList.add("hidden");

      nachoBuilderPanel.classList.remove("hidden");

      nachoBuilderGuessedLetters.clear();
      nachoBuilderWrongGuesses = 0;

      nachoBuilderCurrentSpanish =
        savedNachoSpanish;

      nachoBuilderWord =
        removeSpanishArticle(
          savedNachoSpanish
        ).toLowerCase();

      updateNachoBuilderBowl();
      updateNachoBuilderStrikes();

      renderNachoBuilderWord();
      renderNachoBuilderKeyboard();

    } else {

      showFilterPanel();

    }

    return;
  }

  // ----------------------------------------------------------
  // RESTORE PRACTICE SESSION
  // ----------------------------------------------------------

  if (savedPanel === "practice") {

    const savedPracticeCards =
      localStorage.getItem("nachoPracticeCards");

    const savedPracticeMode =
      localStorage.getItem("nachoPracticeMode");

    const savedPracticeLength =
      localStorage.getItem("nachoPracticeLength");

    if (
      savedPracticeCards &&
      savedPracticeMode
    ) {

      practiceCards =
        JSON.parse(savedPracticeCards);

      practiceMode =
        savedPracticeMode;

      maxCardsPerSession =
        Number(savedPracticeLength) ||
        practiceCards.length;

      sessionStartMode =
        practiceMode;

      sessionStartLength =
        maxCardsPerSession;

      resetPracticeState();
      practiceActive = true;

      sessionModeLabel =
        PRACTICE_MODES[practiceMode]?.label ||
        practiceMode;

      filterPanel.classList.add("hidden");
      practicePanel.classList.remove("hidden");
      studySetPanel.classList.add("hidden");
      resultsPanel.classList.add("hidden");
      conversationSelectionPanel?.classList.add("hidden");
      conversationPanel?.classList.add("hidden");

      practiceModeTitle.textContent =
        PRACTICE_MODES[practiceMode]?.label ||
        practiceMode;

      const setNames = [
        ...new Set(
          practiceCards.map(c => c.setName)
        )
      ].join(", ");

      practiceSetLabel.textContent =
        setNames;

      updateStats();
      showNextCard();

      return;
    }
  }

  // ----------------------------------------------------------
  // DEFAULT: LANDING PAGE
  // ----------------------------------------------------------
  
  showLandingPage();
});
