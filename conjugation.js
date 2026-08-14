console.log("CONJUGATION.JS LOADED");

const CONJUGATION_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQDsHNJvUyc4jvwafQ6za_fgxj-7DLbE8EbftLINQFD-4h5lpiH9LxmkkHyBfLa6XPKyuq4L7P0tlgr/pub?output=csv";

// ============================================================
// CONJUGATION
// ============================================================

let conjugationData = [];

async function loadConjugationData() {

  try {

    const response =
      await fetch(CONJUGATION_CSV_URL);

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

  if (!conjugationVerbSelect) {
    return;
  }

  conjugationVerbSelect.innerHTML = `
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
        conjugationEnglishToggle?.checked
          ? `${verb.Verb} — ${verb.English}`
          : verb.Verb;

      conjugationVerbSelect.appendChild(
        option
      );

    }
  );

}

conjugationVerbSelect?.addEventListener(
  "change",
  () => {

    if (!conjugationVerbSelect.value) {

      conjugationTableContainer.innerHTML =
        "";

      return;
    }

    renderConjugationTable(
      conjugationVerbSelect.value
    );

  }
);
