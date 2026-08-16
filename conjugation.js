console.log("CONJUGATION.JS LOADED");

const CONJUGATION_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDsHNJvUyc4jvwafQ6za_fgxj-7DLbE8EbftLINQFD-4h5lpiH9LxmkkHyBfLa6XPKyuq4L7P0tlgr/pub?output=csv";

// ============================================================
// CONJUGATION
// ============================================================

let conjugationData = [];

const CONJUGATION_SHEET_GIDS = {
  Spanish: "2013416718",
  French: "1784006245",
  Korean: "688505735"
};

async function loadConjugationData() {

  try {

    const savedUsername =
      localStorage.getItem("nachoCurrentUser");

    let language =
      "Spanish";

    if (savedUsername && typeof allAccounts !== "undefined") {

      const user =
        allAccounts.find(
          account =>
            String(account.username).trim().toLowerCase() ===
            String(savedUsername).trim().toLowerCase()
        );

      if (user && user.language) {
        language = user.language;
      }

    }

    const gid =
      CONJUGATION_SHEET_GIDS[language];

    if (!gid) {
      throw new Error(
        `No conjugation sheet configured for language: ${language}`
      );
    }

    console.log(
      "CONJUGATION LANGUAGE:",
      language
    );

    console.log(
      "CONJUGATION GID:",
      gid
    );

    const response =
      await fetch(
        `${CONJUGATION_CSV_URL}&gid=${gid}`
      );

    if (!response.ok) {
      throw new Error(
        `Conjugation request failed: ${response.status}`
      );
    }

    const text =
      await response.text();

    conjugationData =
      parseConjugationCSV(text);

    console.log(
      "CONJUGATION DATA LOADED:",
      conjugationData.length,
      conjugationData.slice(0, 3)
    );

    populateConjugationSettings();

  } catch (error) {

    console.error(
      "Failed to load conjugation data:",
      error
    );

  }

}

function parseConjugationCSV(text) {

  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {

    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      cell += '"';
      i++;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (
      (char === "\n" || char === "\r") &&
      !insideQuotes
    ) {

      if (char === "\r" && next === "\n") {
        i++;
      }

      row.push(cell);
      rows.push(row);

      row = [];
      cell = "";

      continue;
    }

    cell += char;
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  if (rows.length < 2) {
    return [];
  }

  const headers =
    rows[0].map(
      header => header.trim()
    );

  return rows
    .slice(1)
    .filter(row =>
      row.some(
        cell => cell.trim() !== ""
      )
    )
    .map(row => {

      const verb = {};

      headers.forEach(
        (header, index) => {

          verb[header] =
            (row[index] || "").trim();

        }
      );

      return verb;

    });

}

window.populateConjugationVerbs = function() {

  const select =
    document.getElementById(
      "conjugationVerbSelect"
    );

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">
      Choose a verb
    </option>
  `;

  const verbs =
    [
      ...new Map(
        conjugationData.map(
          row => [
            row.Verb,
            row
          ]
        )
      ).values()
    ];

  verbs.forEach(
    verb => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        verb.Verb;

      option.textContent =
        document.getElementById(
          "conjugationEnglishToggle"
        )?.classList.contains("active")
          ? `${verb.Verb} — ${verb.English}`
          : verb.Verb;

      select.appendChild(
        option
      );

    }
  );

};

document
  .getElementById("conjugationVerbSelect")
  ?.addEventListener(
    "change",
    () => {

      const select =
        document.getElementById(
          "conjugationVerbSelect"
        );

      const container =
        document.getElementById(
          "conjugationTableContainer"
        );

      if (!select.value) {

        container.innerHTML =
          "";

        return;
      }

      renderConjugationTable(
        select.value
      );

    }
  );

function renderConjugationTable(verbName) {

  const rows =
    conjugationData.filter(
      row =>
        row.Verb === verbName
    );

  if (!rows.length) {

    conjugationTableContainer.innerHTML =
      "<p>Verb not found.</p>";

    return;
  }

  const headers =
    Object.keys(rows[0]);

  const excludedHeaders = [
    "Verb",
    "English",
    "Favorite"
  ];

  const tableHeaders =
    headers.filter(
      header =>
        !excludedHeaders.includes(header)
    );

  let html = `
    <table class="conjugation-table">
      <thead>
        <tr>
  `;

  tableHeaders.forEach(
    header => {

      html += `
        <th>${header}</th>
      `;

    }
  );

  html += `
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach(
    row => {

      html += "<tr>";

      tableHeaders.forEach(
        header => {

          html += `
            <td>${row[header] || ""}</td>
          `;

        }
      );

      html += "</tr>";

    }
  );

  html += `
      </tbody>
    </table>
  `;

  conjugationTableContainer.innerHTML =
    html;

}

// ============================================================
// CONJUGATION SETTINGS
// ============================================================

function populateConjugationSettings() {

  populateConjugationSelectionDimension();
  populateConjugationTenses();

  setupConjugationSelectionButtons();
  setupConjugationTenseButtons();
  setupConjugationVerbFilterButtons();
  setupConjugationSessionLengthButtons();
  setupConjugationEnglishToggle();

  const label =
    document.querySelector(
      "#conjugationSubjectOptions"
    )?.closest(".filter-group")
      ?.querySelector("label");

  if (label) {

    const hasFormality =
      conjugationData.length &&
      Object.prototype.hasOwnProperty.call(
        conjugationData[0],
        "Formality"
      );

    label.textContent =
      hasFormality
        ? "Formality"
        : "Subjects";

  }

}

// ============================================================
// LANGUAGE-AWARE SELECTION DIMENSION
// ============================================================

function populateConjugationSelectionDimension() {

  const container =
    document.getElementById(
      "conjugationSubjectOptions"
    );

  if (!container || !conjugationData.length) {
    return;
  }

  container.innerHTML = "";

  const headers =
    Object.keys(conjugationData[0]);

  let selectionColumn = null;

  if (headers.includes("Formality")) {

    selectionColumn = "Formality";

  } else if (headers.includes("Subject")) {

    selectionColumn = "Subject";

  }

  if (!selectionColumn) {
    return;
  }

  const values = [
    ...new Set(
      conjugationData
        .map(row => row[selectionColumn])
        .filter(value => value)
    )
  ];

  // ----------------------------------------------------------
  // SELECT ALL
  // ----------------------------------------------------------

  const selectAllButton =
    document.createElement("button");

  selectAllButton.type =
    "button";

  selectAllButton.className =
    "filter-chip";

  selectAllButton.dataset.selectionAction =
    "all";

  selectAllButton.textContent =
    "Select All";

  container.appendChild(
    selectAllButton
  );

  // ----------------------------------------------------------
  // SPANISH: ALL BUT VOSOTROS
  // ----------------------------------------------------------

  if (
    selectionColumn === "Subject" &&
    values.includes("vosotros")
  ) {

    const allButVosotrosButton =
      document.createElement("button");

    allButVosotrosButton.type =
      "button";

    allButVosotrosButton.className =
      "filter-chip";

    allButVosotrosButton.dataset.selectionAction =
      "all-but-vosotros";

    allButVosotrosButton.textContent =
      "All but vosotros";

    container.appendChild(
      allButVosotrosButton
    );

  }

  // ----------------------------------------------------------
  // INDIVIDUAL OPTIONS
  // ----------------------------------------------------------

  values.forEach(
    value => {

      const button =
        document.createElement("button");

      button.type =
        "button";

      button.className =
        "filter-chip";

      button.dataset.selectionValue =
        value;

      button.dataset.selectionColumn =
        selectionColumn;

      button.textContent =
        value;

      container.appendChild(
        button
      );

    }
  );

}

// ============================================================
// CONJUGATION SELECTION BUTTONS
// ============================================================

function setupConjugationSelectionButtons() {

  const container =
    document.getElementById(
      "conjugationSubjectOptions"
    );

  if (!container) {
    return;
  }

  container.onclick = event => {

    const button =
      event.target.closest(
        ".filter-chip"
      );

    if (!button) {
      return;
    }

    const buttons =
      [
        ...container.querySelectorAll(
          ".filter-chip"
        )
      ];

    const action =
      button.dataset.selectionAction;

    // --------------------------------------------------------
    // SELECT ALL
    // --------------------------------------------------------

    if (action === "all") {

      const shouldSelectAll =
        !button.classList.contains("active");
    
      buttons.forEach(
        btn => {
    
          if (btn.dataset.selectionValue) {
    
            btn.classList.toggle(
              "active",
              shouldSelectAll
            );
    
          }
    
        }
      );
    
      button.classList.toggle(
        "active",
        shouldSelectAll
      );
    
      return;
    }

    // --------------------------------------------------------
    // ALL BUT VOSOTROS
    // --------------------------------------------------------

    if (
      action ===
      "all-but-vosotros"
    ) {

      buttons.forEach(
        btn => {

          const value =
            btn.dataset.selectionValue;

          if (
            value === "vosotros"
          ) {

            btn.classList.remove(
              "active"
            );

          } else if (value) {

            btn.classList.add(
              "active"
            );

          }

        }
      );

      return;
    }

    // --------------------------------------------------------
    // INDIVIDUAL OPTION
    // --------------------------------------------------------

    if (
      button.dataset.selectionValue
    ) {

      button.classList.toggle(
        "active"
      );

      // Update Select All state
      const individualButtons =
        buttons.filter(
          btn =>
            btn.dataset.selectionValue
        );

      const allSelected =
        individualButtons.every(
          btn =>
            btn.classList.contains(
              "active"
            )
        );

      const selectAllButton =
        buttons.find(
          btn =>
            btn.dataset.selectionAction ===
            "all"
        );

      if (selectAllButton) {

        selectAllButton.classList.toggle(
          "active",
          allSelected
        );

      }

    }

  };

}

// ============================================================
// SHOW ENGLISH TOGGLE
// ============================================================

function setupConjugationEnglishToggle() {

  const toggle =
    document.getElementById(
      "conjugationEnglishToggle"
    );

  if (!toggle) {
    return;
  }

  toggle.onclick = () => {

    const isOn =
      toggle.classList.toggle("active");

    toggle.textContent =
      isOn
        ? "ON"
        : "OFF";

    window.populateConjugationVerbs();

  };

}

// ============================================================
// VERB FILTER BUTTONS
// ============================================================

function setupConjugationVerbFilterButtons() {

  const container =
    document.getElementById(
      "conjugationVerbOptions"
    );

  const allButton =
    document.getElementById(
      "conjugationAllVerbsBtn"
    );

  const favoriteButton =
    document.getElementById(
      "conjugationFavoriteVerbsBtn"
    );

  const favoriteList =
    document.getElementById(
      "conjugationFavoriteList"
    );

  if (
    !container ||
    !allButton ||
    !favoriteButton ||
    !favoriteList
  ) {
    return;
  }

  // ----------------------------------------------------------
  // ALL VERBS
  // ----------------------------------------------------------

  allButton.onclick = () => {

    allButton.classList.add("active");
    favoriteButton.classList.remove("active");

    favoriteList.classList.add("hidden");

  };

  // ----------------------------------------------------------
  // FAVORITE VERBS
  // ----------------------------------------------------------

  favoriteButton.onclick = () => {

    favoriteButton.classList.add("active");
    allButton.classList.remove("active");

    favoriteList.classList.toggle("hidden");

    if (
      !favoriteList.classList.contains("hidden")
    ) {

      favoriteList.innerHTML = "";

      const favoriteVerbs =
        [
          ...new Map(
            conjugationData
              .filter(
                row =>
                  String(row.Favorite)
                    .trim()
                    .toUpperCase() ===
                  "TRUE"
              )
              .map(
                row => [
                  row.Verb,
                  row
                ]
              )
          ).values()
        ];

      favoriteVerbs.forEach(
        verb => {

          const label =
            document.createElement(
              "label"
            );

          label.className =
            "conjugation-favorite-option";

          const checkbox =
            document.createElement(
              "input"
            );

          checkbox.type =
            "checkbox";

          checkbox.value =
            verb.Verb;

          const text =
            document.createElement(
              "span"
            );

          text.textContent =
            verb.Verb;

          label.appendChild(
            checkbox
          );

          label.appendChild(
            text
          );

          favoriteList.appendChild(
            label
          );

        }
      );

    }

  };

}

// ============================================================
// TENSES
// ============================================================

function populateConjugationTenses() {

  const container =
    document.getElementById(
      "conjugationTenseOptions"
    );

  if (!container || !conjugationData.length) {
    return;
  }

  container.innerHTML = "";

  const excludedHeaders = [
    "Verb",
    "English",
    "Favorite",
    "Regularity",
    "Subject",
    "Formality"
  ];

  const tenses =
    Object.keys(
      conjugationData[0]
    ).filter(
      header =>
        !excludedHeaders.includes(header)
    );

  tenses.forEach(
    tense => {

      const button =
        document.createElement("button");

      button.type =
        "button";

      button.className =
        "filter-chip";

      button.dataset.tense =
        tense;

      button.textContent =
        tense;

      container.appendChild(
        button
      );

    }
  );

}

function setupConjugationTenseButtons() {

  const container =
    document.getElementById(
      "conjugationTenseOptions"
    );

  if (!container) {
    return;
  }

  container.onclick = event => {

    const button =
      event.target.closest(
        ".filter-chip"
      );

    if (!button) {
      return;
    }

    button.classList.toggle(
      "active"
    );

  };

}

// ============================================================
// SESSION LENGTH
// ============================================================

function setupConjugationSessionLengthButtons() {

  const container =
    document.getElementById(
      "conjugationSessionLengthOptions"
    );

  if (!container) {
    return;
  }

  container.onclick = event => {

    const button =
      event.target.closest(
        "[data-session-length]"
      );

    if (!button) {
      return;
    }

    const buttons =
      [
        ...container.querySelectorAll(
          "[data-session-length]"
        )
      ];

    buttons.forEach(
      btn => {
        btn.classList.remove("active");
      }
    );

    button.classList.add("active");

  };

}

// ============================================================
// START CONJUGATION
// ============================================================

document
  .getElementById("startConjugationBtn")
  ?.addEventListener(
    "click",
    () => {

      const subjectContainer =
        document.getElementById(
          "conjugationSubjectOptions"
        );

      const tenseContainer =
        document.getElementById(
          "conjugationTenseOptions"
        );

      if (
        !subjectContainer ||
        !tenseContainer
      ) {
        return;
      }

      // --------------------------------------------------------
      // SELECTED SUBJECTS / FORMALITY
      // --------------------------------------------------------

      const selectedSubjects =
        [
          ...subjectContainer.querySelectorAll(
            ".filter-chip.active[data-selection-value]"
          )
        ]
        .map(
          button =>
            button.dataset.selectionValue
        );

      // --------------------------------------------------------
      // SELECTED TENSES
      // --------------------------------------------------------

      const selectedTenses =
        [
          ...tenseContainer.querySelectorAll(
            ".filter-chip.active[data-tense]"
          )
        ]
        .map(
          button =>
            button.dataset.tense
        );
      
      if (!selectedSubjects.length) {
      
        alert(
          "Please select at least one subject/formality."
        );
      
        return;
      
      }
      
      if (!selectedTenses.length) {
      
        alert(
          "Please select at least one tense."
        );
      
        return;
      
      }

      // --------------------------------------------------------
      // SELECTED VERB FILTER
      // --------------------------------------------------------

      const selectedVerbFilter =
        document.querySelector(
          '[data-verb-filter].active'
        )?.dataset.verbFilter ||
        "all";

      // --------------------------------------------------------
      // SELECTED SESSION LENGTH
      // --------------------------------------------------------
      
      const selectedSessionLength =
        Number(
          document.querySelector(
            '[data-session-length].active'
          )?.dataset.sessionLength
        ) || 25;

      // --------------------------------------------------------
      // SAVE SETTINGS
      // --------------------------------------------------------

      window.conjugationPracticeSettings = {

        subjects:
          selectedSubjects,

        tenses:
          selectedTenses,

        verbFilter:
          selectedVerbFilter,

        showEnglish:
          document
            .getElementById(
              "conjugationEnglishToggle"
            )
            ?.classList.contains("active") ??
          true

      };

      console.log(
        "CONJUGATION SETTINGS:",
        window.conjugationPracticeSettings
      );

      // --------------------------------------------------------
      // BUILD PRACTICE DATA
      // --------------------------------------------------------

      buildConjugationPractice();

    }
  );


// ============================================================
// BUILD PRACTICE DATA
// ============================================================

function buildConjugationPractice() {

  const settings =
    window.conjugationPracticeSettings;

  if (!settings) {
    return;
  }

  let rows =
    [...conjugationData];

  // ----------------------------------------------------------
  // FAVORITE / SELECTED VERB FILTER
  // ----------------------------------------------------------

  if (
    settings.verbFilter ===
    "favorite"
  ) {

    const selectedVerbs =
      [
        ...document.querySelectorAll(
          "#conjugationFavoriteList input[type='checkbox']:checked"
        )
      ]
      .map(
        checkbox =>
          checkbox.value
      );

    if (!selectedVerbs.length) {

      alert(
        "Please select at least one verb."
      );

      return;
    }

    rows =
      rows.filter(
        row =>
          selectedVerbs.includes(
            row.Verb
          )
      );

  }

  // ----------------------------------------------------------
  // SUBJECT / FORMALITY FILTER
  // ----------------------------------------------------------

  if (
    settings.subjects.length
  ) {

    rows =
      rows.filter(
        row => {

          const value =
            row.Subject ||
            row.Formality ||
            "";

          return settings.subjects.includes(
            value
          );

        }
      );

  }

  // ----------------------------------------------------------
  // TENSE FILTER
  // ----------------------------------------------------------

  if (
    settings.tenses.length
  ) {

    const filteredRows = [];

    rows.forEach(
      row => {

        settings.tenses.forEach(
          tense => {

            if (
              row[tense] &&
              String(row[tense]).trim()
            ) {

              filteredRows.push({

                ...row,

                practiceTense:
                  tense,

                practiceAnswer:
                  row[tense]

              });

            }

          }
        );

      }
    );

    rows =
      filteredRows;

  }

  console.log(
    "CONJUGATION PRACTICE DATA:",
    rows
  );

  if (!rows.length) {

    alert(
      "No conjugation questions match your selected settings."
    );

    return;
  }

  // ----------------------------------------------------------
  // SHUFFLE QUESTIONS
  // ----------------------------------------------------------

  for (
    let i = rows.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [rows[i], rows[j]] =
      [rows[j], rows[i]];

  }

  // ----------------------------------------------------------
  // LIMIT SESSION LENGTH
  // ----------------------------------------------------------

  rows =
    rows.slice(
      0,
      settings.sessionLength || 25
    );

  console.log(
    "CONJUGATION PRACTICE DATA:",
    rows
  );

  window.conjugationPracticeData =
    rows;

  startConjugationPractice();

}

// ============================================================
// START PRACTICE
// ============================================================
const conjugationAnswerInput =
  document.getElementById(
    "conjugationAnswerInput"
  );

if (conjugationAnswerInput) {

  conjugationAnswerInput.addEventListener(
    "input",
    () => {

      const pos =
        conjugationAnswerInput.selectionStart;

      const original =
        conjugationAnswerInput.value;

      const converted =
        original.replace(
          /[AEIOUNY]/g,
          ch => ACCENT_MAP[ch]
        );

      if (converted !== original) {

        conjugationAnswerInput.value =
          converted;

        conjugationAnswerInput.setSelectionRange(
          pos,
          pos
        );

      }

    }
  );

}

function startConjugationPractice() {

  const practiceData =
    window.conjugationPracticeData;

  if (
    !practiceData ||
    !practiceData.length
  ) {
    return;
  }

  window.conjugationPracticeIndex = 0;

  const selectionPanel =
    document.getElementById(
      "conjugationSelectionPanel"
    );

  const practicePanel =
    document.getElementById(
      "conjugationPanel"
    );

  selectionPanel?.classList.add(
    "hidden"
  );

  practicePanel?.classList.remove(
    "hidden"
  );

  showNextConjugationQuestion();

}

// ============================================================
// RETURN TO CONJUGATION SETTINGS
// ============================================================

document
  .getElementById("conjugationEndBtn")
  ?.addEventListener(
    "click",
    () => {

      const practicePanel =
        document.getElementById(
          "conjugationPanel"
        );

      const selectionPanel =
        document.getElementById(
          "conjugationSelectionPanel"
        );

      practicePanel?.classList.add(
        "hidden"
      );

      selectionPanel?.classList.remove(
        "hidden"
      );

    }
  );

// ============================================================
// ENTER KEY — CHECK → NEXT
// ============================================================

document
  .getElementById("conjugationAnswerInput")
  ?.addEventListener(
    "keydown",
    event => {

      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();

      const answerInput =
        document.getElementById(
          "conjugationAnswerInput"
        );

      const actionButton =
        document.getElementById(
          "conjugationActionBtn"
        );

      if (!answerInput || !actionButton) {
        return;
      }

      // First Enter: check the answer
      if (!answerInput.disabled) {

        actionButton.click();

        // Keep keyboard focus in the answer field
        setTimeout(() => {
          answerInput.focus();
        }, 0);

        return;
      }

      // Second Enter: move to the next question
      actionButton.click();

    }
  );

// ============================================================
// CONJUGATION ACTION BUTTON — CHECK → NEXT
// ============================================================

document
  .getElementById("conjugationActionBtn")
  ?.addEventListener(
    "click",
    () => {

      const actionButton =
        document.getElementById(
          "conjugationActionBtn"
        );

      if (!actionButton) {
        return;
      }

      // --------------------------------------------------------
      // NEXT QUESTION
      // --------------------------------------------------------

      if (
        actionButton.dataset.action === "next"
      ) {

        const practiceData =
          window.conjugationPracticeData;

        if (
          !practiceData ||
          !practiceData.length
        ) {
          return;
        }

        window.conjugationPracticeIndex =
          (window.conjugationPracticeIndex || 0) + 1;

        if (
          window.conjugationPracticeIndex >=
          practiceData.length
        ) {
        
          // Practice session is finished.
          window.conjugationPracticeIndex =
            practiceData.length - 1;
        
          actionButton.textContent =
            "Finished";
        
          actionButton.disabled =
            true;
        
          return;
        
        }

        actionButton.dataset.action =
          "check";

        actionButton.textContent =
          "Check";

        showNextConjugationQuestion();

        return;
      }

      // --------------------------------------------------------
      // CHECK ANSWER
      // --------------------------------------------------------

      const practiceData =
        window.conjugationPracticeData;

      if (
        !practiceData ||
        !practiceData.length
      ) {
        return;
      }

      const currentIndex =
        window.conjugationPracticeIndex || 0;

      const question =
        practiceData[currentIndex];

      const answerInput =
        document.getElementById(
          "conjugationAnswerInput"
        );

      const feedback =
        document.getElementById(
          "conjugationFeedback"
        );

      if (!answerInput || !feedback) {
        return;
      }

      const studentAnswer =
        answerInput.value.trim();

      const correctAnswer =
        String(
          question.practiceAnswer || ""
        )
        .split("[")[0]
        .trim();

      if (!studentAnswer) {

        feedback.textContent =
          "Please enter an answer.";

        return;

      }

      const normalize =
        value =>
          String(value)
            .trim()
            .toLowerCase()
            .replace(/[.!?]+$/g, "");

      if (
        normalize(studentAnswer) ===
        normalize(correctAnswer)
      ) {

        feedback.textContent =
          "✓ Correct!";

      } else {

        feedback.textContent =
          `✗ Correct answer: ${correctAnswer}`;

      }

      answerInput.readOnly =
        true;

      // Change the SAME button from Check → Next
      actionButton.dataset.action =
        "next";

      actionButton.textContent =
        "Next →";

    }
  );

// ============================================================
// SHOW CONJUGATION QUESTION
// ============================================================

function showNextConjugationQuestion() {

  const practiceData =
    window.conjugationPracticeData;

  const index =
    window.conjugationPracticeIndex || 0;

  if (
    !practiceData ||
    !practiceData[index]
  ) {
    return;
  }

  const question =
    practiceData[index];

  const verbTitle =
    document.getElementById(
      "conjugationVerbTitle"
    );

  const verbEnglish =
    document.getElementById(
      "conjugationVerbEnglish"
    );

  const subject =
    document.getElementById(
      "conjugationSubject"
    );

  const tense =
    document.getElementById(
      "conjugationTense"
    );

  const prompt =
    document.getElementById(
      "conjugationPrompt"
    );

  const answerInput =
    document.getElementById(
      "conjugationAnswerInput"
    );

  const feedback =
    document.getElementById(
      "conjugationFeedback"
    );

  if (verbTitle) {
    verbTitle.textContent =
      question.Verb;
  }

  if (verbEnglish) {

    const showEnglish =
      window.conjugationPracticeSettings
        ?.showEnglish;

    verbEnglish.textContent =
      showEnglish
        ? question.English || ""
        : "";

  }

  const progressFill =
    document.getElementById(
      "conjugationProgressFill"
    );
  
  if (progressFill) {
  
    const percentage =
      ((index + 1) / practiceData.length) * 100;
  
    progressFill.style.width =
      `${percentage}%`;
  
  }

  if (subject) {

    subject.textContent =
      question.Subject ||
      question.Formality ||
      "";

  }

  const englishAnswer =
    document.getElementById(
      "conjugationEnglishAnswer"
    );
  
  if (englishAnswer) {
  
    const showEnglish =
      window.conjugationPracticeSettings
        ?.showEnglish;
  
    englishAnswer.textContent =
      showEnglish
        ? String(
            question.practiceAnswer || ""
          )
          .split("[")[1]
          ?.replace("]", "")
          .trim() || ""
        : "";
  
    englishAnswer.classList.toggle(
      "hidden",
      !showEnglish
    );
  
  }

  if (tense) {

    tense.textContent =
      question.practiceTense || "";

  }

  if (prompt) {
  
    prompt.textContent =
      "Type the correct conjugation:";
  
  }

  if (answerInput) {

    answerInput.value = "";
    answerInput.readOnly = false;
    answerInput.focus();
  
  }

  if (feedback) {

    feedback.textContent = "";
    feedback.className =
      "conjugation-feedback";

  }

  const actionButton =
    document.getElementById(
      "conjugationActionBtn"
    );
  
  if (actionButton) {
  
    actionButton.dataset.action =
      "check";
  
    actionButton.textContent =
      "Check";
  
  }

}
