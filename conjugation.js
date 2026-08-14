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

function populateConjugationVerbs() {

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
        document.createElement("option");

      option.value =
        verb.Verb;

      option.textContent =
        document.getElementById(
          "conjugationEnglishToggle"
        )?.checked
          ? `${verb.Verb} — ${verb.English}`
          : verb.Verb;

      select.appendChild(
        option
      );

    }
  );

}

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

}

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
    "filter-chip active";

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
        "filter-chip active";

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

      buttons.forEach(
        btn => {

          btn.classList.add(
            "active"
          );

        }
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
    // INDIVIDUAL BUTTON
    // --------------------------------------------------------

    if (
      button.dataset.selectionValue
    ) {

      button.classList.toggle(
        "active"
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
        "filter-chip active";

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

      // --------------------------------------------------------
      // SELECTED VERB FILTER
      // --------------------------------------------------------

      const selectedVerbFilter =
        document.querySelector(
          '[data-verb-filter].active'
        )?.dataset.verbFilter ||
        "all";

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
          true,

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
  // FAVORITE FILTER
  // ----------------------------------------------------------

  if (
    settings.verbFilter ===
    "favorite"
  ) {

    rows =
      rows.filter(
        row =>
          String(row.Favorite)
            .trim()
            .toUpperCase() ===
          "TRUE"
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

  window.conjugationPracticeData =
    rows;

  startConjugationPractice();

}

// ============================================================
// START PRACTICE
// ============================================================

function startConjugationPractice() {

  const practiceData =
    window.conjugationPracticeData;

  if (
    !practiceData ||
    !practiceData.length
  ) {
    return;
  }

  console.log(
    "STARTING CONJUGATION PRACTICE:",
    practiceData.length,
    "questions"
  );

  // Temporary proof that the filtering works.
  // We will replace this with the actual practice screen next.

  const firstQuestion =
    practiceData[0];

  console.log(
    "FIRST CONJUGATION QUESTION:",
    {
      verb:
        firstQuestion.Verb,

      english:
        firstQuestion.English,

      subject:
        firstQuestion.Subject ||
        firstQuestion.Formality,

      tense:
        firstQuestion.practiceTense,

      answer:
        firstQuestion.practiceAnswer
    }
  );

}
