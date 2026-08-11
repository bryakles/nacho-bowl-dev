// ============================================================
// NACHO BOWL — CONVERSATION ENGINE
// Spreadsheet-driven TPRS conversation practice
//
// SPREADSHEET FORMAT
//
// Title | Concept | Statement | Q1 | Q2 | Q3 | ...
//
// Each question cell uses:
//
// TYPE | PROMPT | ANSWER
//
// Examples:
//
// YES_NO | ¿Había un chico? | SÍ
//
// EITHER_OR | ¿Había un chico o una chica? | un chico
//
// MULTIPLE_CHOICE | ¿Qué había? | A. un chico | B. una chica | C. un mono | A
//
// SHORT_WRITE | ¿Qué había? | un chico OR el chico OR George
//
// LONG_WRITE | Describe la situación. ¿Quiénes habían? ¿Dónde estaban?
//
// RULES
//
// | separates fields/options.
// OR separates genuinely different accepted SHORT_WRITE answers.
//
// SHORT_WRITE answers are accepted when one of the accepted
// keywords/phrases appears in the student's response.
//
// LONG_WRITE responses are not automatically judged.
// They are saved for teacher review.
//
// ============================================================


// ============================================================
// GOOGLE SHEET
// ============================================================

const CONVERSATION_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXkS0P0pDGSxXKQqtbPpv5lQb03OkgJW4p8o9fHpTdmiSJBHN8klf8cOrWxd-3iv_5J2stOk0m-Z_t/pub?output=csv";

// ============================================================
// STATE
// ============================================================

let conversationIndex = [];
let conversationData = null;

let conversationRows = [];
let currentConceptIndex = 0;
let currentQuestionIndex = 0;

let conversationAttempts = 0;

// Tracks whether the current concept has been mastered.
// A concept is mastered only after every question in
// that concept has been answered successfully.
let currentConceptMastered = false;

// Prevents an old retry timer from interfering with
// a new question/conversation.
let conversationRetryTimer = null;

// Teacher report data
let conversationReport = [];


// ============================================================
// DOM REFERENCES
// ============================================================

const conversationBtn =
  document.getElementById("conversationBtn");

const homeOnlyContent =
  document.getElementById("homeOnlyContent");

const conversationSelectionPanel =
  document.getElementById("conversationSelectionPanel");

const conversationPanel =
  document.getElementById("conversationPanel");

const conversationList =
  document.getElementById("conversationList");

const conversationSelectionBackBtn =
  document.getElementById("conversationSelectionBackBtn");

const conversationEndBtn =
  document.getElementById("conversationEndBtn");

const conversationTitle =
  document.getElementById("conversationTitle");

const conversationLevel =
  document.getElementById("conversationLevel");

const conversationProgress =
  document.getElementById("conversationProgress");

const conversationScene =
  document.getElementById("conversationScene");

const conversationSceneImage =
  document.getElementById("conversationSceneImage");

const conversationSceneText =
  document.getElementById("conversationSceneText");

const conversationPrompt =
  document.getElementById("conversationPrompt");

const conversationReplayBtn =
  document.getElementById("conversationReplayBtn");

const conversationYesNo =
  document.getElementById("conversationYesNo");

const conversationChoices =
  document.getElementById("conversationChoices");

const conversationWriting =
  document.getElementById("conversationWriting");

const conversationWritingInput =
  document.getElementById("conversationWritingInput");

const conversationSubmitWriting =
  document.getElementById("conversationSubmitWriting");

const conversationFeedback =
  document.getElementById("conversationFeedback");

const conversationScaffold =
  document.getElementById("conversationScaffold");

const conversationScaffoldText =
  document.getElementById("conversationScaffoldText");

const conversationNextBtn =
  document.getElementById("conversationNextBtn");

// ============================================================
// OPEN CONVERSATIONS
// ============================================================

conversationBtn.addEventListener(
  "click",
  () => {

    openConversationSelection();

  }
);


// ============================================================
// OPEN CONVERSATION SELECTION
// ============================================================

async function openConversationSelection() {

  if (homeOnlyContent) {
    homeOnlyContent.classList.add("hidden");
  }
  
  if (
    typeof filterPanel !==
    "undefined"
  ) {

    filterPanel.classList.add(
      "hidden"
    );

  }

  if (
    typeof practicePanel !==
    "undefined"
  ) {

    practicePanel.classList.add(
      "hidden"
    );

  }

  if (
    typeof resultsPanel !==
    "undefined"
  ) {

    resultsPanel.classList.add(
      "hidden"
    );

  }

  if (
    typeof studySetPanel !==
    "undefined"
  ) {

    studySetPanel.classList.add(
      "hidden"
    );

  }

  if (
    typeof nachoBuilderPanel !==
    "undefined"
  ) {

    nachoBuilderPanel.classList.add(
      "hidden"
    );

  }

  conversationSelectionPanel.classList.remove(
    "hidden"
  );

  await loadConversationIndex();

}


// ============================================================
// LOAD CONVERSATION INDEX
// ============================================================

async function loadConversationIndex() {

  conversationList.innerHTML =
    '<p class="filter-hint">Loading conversations...</p>';

  try {

    const response =
      await fetch(
        CONVERSATION_SHEET_URL,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    if (!response.ok) {

      throw new Error(
        `Could not load conversations (${response.status})`
      );

    }

    const csv =
      await response.text();


    // ----------------------------------------------------------
    // Parse the entire conversation spreadsheet
    // ----------------------------------------------------------

    const rows =
      parseSpreadsheetCSV(
        csv
      );


    if (!rows.length) {

      throw new Error(
        "The conversation spreadsheet is empty."
      );

    }


    // ----------------------------------------------------------
    // First row contains:
    //
    // Title | Concept | Statement | Q1 | Q2 | ...
    // ----------------------------------------------------------

    const headers =
      rows[0].map(
        cell =>
          String(cell).trim()
      );


    const titleIndex =
      headers.findIndex(
        header =>
          header.toLowerCase() ===
          "title"
      );


    if (
      titleIndex === -1
    ) {

      throw new Error(
        'The conversation spreadsheet must contain a "Title" column.'
      );

    }


    // ----------------------------------------------------------
    // Find unique conversation titles
    //
    // The first occurrence determines the order.
    // ----------------------------------------------------------

    const titles = [];

    const seenTitles =
      new Set();


    for (
      let r = 1;
      r < rows.length;
      r++
    ) {

      const title =
        String(
          rows[r][titleIndex] || ""
        ).trim();


      if (
        !title ||
        seenTitles.has(
          title
        )
      ) {

        continue;

      }


      seenTitles.add(
        title
      );

      titles.push(
        title
      );

    }


    // ----------------------------------------------------------
    // Build the conversation index
    // ----------------------------------------------------------

    conversationIndex =
      titles.map(
        (
          title,
          index
        ) => ({

          title,

          level: "",

          topic: "",

          description:
            `Practice conversation: ${title}`,

          docURL: "",

          active: true,

          order:
            index + 1,

          imageURL: ""

        })
      );


    renderConversationList();

  } catch (error) {

    console.error(
      "Conversation index loading error:",
      error
    );

    conversationList.innerHTML =
      `<p class="error-msg">
        ⚠️ Could not load conversations.
      </p>`;

  }

}

// ============================================================
// PARSE CONVERSATION INDEX CSV
// ============================================================

function parseConversationCSV(csv) {

  const lines =
    csv
      .replace(/\r/g, "")
      .split("\n")
      .filter(
        line =>
          line.trim() !== ""
      );

  if (
    lines.length < 2
  ) {

    return [];

  }

  const headers =
    parseCSVLine(
      lines[0]
    );

  return lines
    .slice(1)
    .map(
      line => {

        const values =
          parseCSVLine(
            line
          );

        const row = {};

        headers.forEach(
          (
            header,
            index
          ) => {

            row[
              header.trim()
            ] =
              values[index]
                ? values[index].trim()
                : "";

          }
        );

        return {

          title:
            row["Title"] || "",

          level:
            row["Level"] || "",

          topic:
            row["Topic"] || "",

          description:
            row["Description"] || "",

          docURL:
            row["Doc URL"] || "",

          active:
            String(
              row["Active"]
            )
              .toLowerCase() ===
            "true",

          order:
            Number(
              row["Order"]
            ) || 9999,

          imageURL:
            row["Image URL"] || ""

        };

      }
    );

}


// ============================================================
// CSV LINE PARSER
// ============================================================

function parseCSVLine(line) {

  const values = [];

  let current = "";
  let insideQuotes = false;

  for (
    let i = 0;
    i < line.length;
    i++
  ) {

    const character =
      line[i];

    if (
      character === '"'
    ) {

      if (
        insideQuotes &&
        line[i + 1] === '"'
      ) {

        current += '"';
        i++;

      } else {

        insideQuotes =
          !insideQuotes;

      }

    } else if (
      character === "," &&
      !insideQuotes
    ) {

      values.push(
        current
      );

      current = "";

    } else {

      current += character;

    }

  }

  values.push(
    current
  );

  return values;

}


// ============================================================
// RENDER CONVERSATION LIST
// ============================================================

function renderConversationList() {

  conversationList.innerHTML =
    "";

  if (
    !conversationIndex.length
  ) {

    conversationList.innerHTML =
      '<p class="filter-hint">No conversations are currently available.</p>';

    return;

  }

  conversationIndex.forEach(
    conversation => {

      const card =
        document.createElement(
          "button"
        );

      card.type =
        "button";

      card.className =
        "conversation-list-card";


      // --------------------------------------------------------
      // IMAGE
      // --------------------------------------------------------

      if (
        conversation.imageURL
      ) {

        const image =
          document.createElement(
            "img"
          );

        image.src =
          conversation.imageURL;

        image.alt =
          conversation.title;

        image.className =
          "conversation-list-image";

        card.appendChild(
          image
        );

      }


      // --------------------------------------------------------
      // CONTENT
      // --------------------------------------------------------

      const content =
        document.createElement(
          "div"
        );

      content.className =
        "conversation-list-content";


      const title =
        document.createElement(
          "h3"
        );

      title.textContent =
        conversation.title;


      const meta =
        document.createElement(
          "div"
        );

      meta.className =
        "conversation-list-meta";

      meta.textContent =
        `Level ${conversation.level} • ${conversation.topic}`;


      const description =
        document.createElement(
          "p"
        );

      description.textContent =
        conversation.description;


      content.appendChild(
        title
      );

      content.appendChild(
        meta
      );

      content.appendChild(
        description
      );

      card.appendChild(
        content
      );


      // --------------------------------------------------------
      // SELECT
      // --------------------------------------------------------

      card.addEventListener(
        "click",
        () => {

          selectConversation(
            conversation
          );

        }
      );

      conversationList.appendChild(
        card
      );

    }
  );

}


// ============================================================
// SELECT CONVERSATION
// ============================================================

function selectConversation(
  conversation
) {

  if (
    !conversation ||
    !conversation.title
  ) {

    return;

  }


  conversationSelectionPanel.classList.add(
    "hidden"
  );

  conversationPanel.classList.remove(
    "hidden"
  );


  loadConversationFromSheet(
    conversation.title
  );

}

async function loadConversationFromSheet(
  selectedTitle
) {

  try {

    const response =
      await fetch(
        CONVERSATION_SHEET_URL,
        {
          method: "GET",
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `Could not load conversation (${response.status})`
      );

    }


    const csv =
      await response.text();


    const rows =
      parseSpreadsheetCSV(
        csv
      );


    if (
      !rows.length
    ) {

      throw new Error(
        "The conversation spreadsheet is empty."
      );

    }


    const headers =
      rows[0].map(
        cell =>
          String(cell).trim()
      );


    const titleIndex =
      headers.findIndex(
        header =>
          header.toLowerCase() ===
          "title"
      );


    if (
      titleIndex === -1
    ) {

      throw new Error(
        'The conversation spreadsheet must contain a "Title" column.'
      );

    }


    // ----------------------------------------------------------
    // Keep only rows belonging to the selected conversation.
    // ----------------------------------------------------------

    const conversationRowsOnly =
      rows
        .slice(1)
        .filter(
          row =>
            String(
              row[titleIndex] || ""
            ).trim() ===
            selectedTitle
        );


    if (
      !conversationRowsOnly.length
    ) {

      throw new Error(
        `No rows found for "${selectedTitle}".`
      );

    }


    // ----------------------------------------------------------
    // Convert those spreadsheet rows into the format
    // expected by the existing conversation engine.
    // ----------------------------------------------------------

    conversationData = {

      title:
        selectedTitle,

      level: "",

      topic: "",

      scene: {

        imageURL: "",

        text: ""

      },

      rows: [],

      endTeacher: ""

    };


    conversationRows =
      [];


    conversationRowsOnly.forEach(
      spreadsheetRow => {

        const title =
          String(
            spreadsheetRow[0] || ""
          ).trim();

        const concept =
          String(
            spreadsheetRow[1] || ""
          ).trim();

        const statement =
          String(
            spreadsheetRow[2] || ""
          ).trim();


        const questions = [];


        for (
          let c = 3;
          c < spreadsheetRow.length;
          c++
        ) {

          const cell =
            String(
              spreadsheetRow[c] || ""
            ).trim();


          if (!cell) {

            continue;

          }


          const question =
            parseQuestionCell(
              cell
            );


          if (question) {

            question.number =
              questions.length + 1;

            questions.push(
              question
            );

          }

        }


        conversationRows.push({

          title,

          concept,

          statement,

          questions

        });

      }
    );


    // ----------------------------------------------------------
    // Reset progress
    // ----------------------------------------------------------

    currentConceptIndex =
      0;

    currentQuestionIndex =
      0;

    conversationAttempts =
      0;

    conversationReport =
      [];


    // ----------------------------------------------------------
    // Render
    // ----------------------------------------------------------

    renderConversationHeader();

    renderConversationScene();

    showConversationQuestion();


  } catch (error) {

    console.error(
      "Conversation loading error:",
      error
    );


    conversationPrompt.textContent =
      "⚠️ Could not load this conversation.";

    conversationFeedback.textContent =
      error.message;

    conversationFeedback.className =
      "conversation-feedback error";

  }

}

// ============================================================
// GOOGLE DOC URL
// ============================================================

function convertGoogleDocURL(
  url
) {

  const match =
    url.match(
      /docs\.google\.com\/document\/d\/([^/]+)/
    );

  if (!match) {

    throw new Error(
      "Invalid Google Docs URL."
    );

  }

  const documentId =
    match[1];

  return (
    `https://docs.google.com/document/d/` +
    `${documentId}/export?format=txt`
  );

}


// ============================================================
// LOAD CONVERSATION DOCUMENT
// ============================================================

async function loadConversationDocument(
  conversation,
  docURL
) {

  try {

    const response =
      await fetch(
        docURL
      );

    if (!response.ok) {

      throw new Error(
        `Could not load conversation (${response.status})`
      );

    }

    const text =
      await response.text();


    conversationData =
      parseConversation(
        text
      );


    if (
      !conversationData.rows.length
    ) {

      throw new Error(
        "No conversation rows found."
      );

    }


    conversationRows =
      conversationData.rows;

    currentConceptIndex = 0;

    currentQuestionIndex = 0;
    
    conversationAttempts = 0;
    
    currentConceptMastered = false;
    
    if (conversationRetryTimer) {
      clearTimeout(conversationRetryTimer);
      conversationRetryTimer = null;
    }
    
    conversationReport = [];


    // ----------------------------------------------------------
    // FALLBACK METADATA
    // ----------------------------------------------------------

    if (
      !conversationData.title
    ) {

      conversationData.title =
        conversation.title;

    }

    if (
      !conversationData.level
    ) {

      conversationData.level =
        conversation.level;

    }


    // ----------------------------------------------------------
    // RENDER
    // ----------------------------------------------------------

    renderConversationHeader();

    renderConversationScene();

    showConversationQuestion();

  } catch (error) {

    console.error(
      "Conversation loading error:",
      error
    );

    conversationPrompt.textContent =
      "⚠️ Could not load this conversation.";

    conversationFeedback.textContent =
      error.message;

    conversationFeedback.className =
      "conversation-feedback error";

  }

}


// ============================================================
// PARSE CONVERSATION SPREADSHEET
//
// Expected:
//
// Title | Concept | Statement | Q1 | Q2 | Q3...
//
// The first three columns are:
//
// 0 = Title
// 1 = Concept
// 2 = Statement
//
// Questions begin in column 3.
//
// ============================================================

function parseConversation(
  text
) {

  const rows =
    parseSpreadsheetCSV(
      text
    );


  if (
    !rows.length
  ) {

    return {

      title: "",
      level: "",
      topic: "",

      scene: {
        imageURL: "",
        text: ""
      },

      rows: [],

      endTeacher: ""

    };

  }


  const headers =
    rows[0].map(
      cell =>
        String(cell).trim()
    );


  const conversation = {

    title: "",
    level: "",
    topic: "",

    scene: {
      imageURL: "",
      text: ""
    },

    rows: [],

    endTeacher: ""

  };


  // ----------------------------------------------------------
  // HEADER METADATA
  // ----------------------------------------------------------

  const titleIndex =
    headers.findIndex(
      header =>
        header.toLowerCase() ===
        "title"
    );

  const levelIndex =
    headers.findIndex(
      header =>
        header.toLowerCase() ===
        "level"
    );

  const topicIndex =
    headers.findIndex(
      header =>
        header.toLowerCase() ===
        "topic"
    );


  // ----------------------------------------------------------
  // DATA ROWS
  // ----------------------------------------------------------

  for (
    let r = 1;
    r < rows.length;
    r++
  ) {

    const spreadsheetRow =
      rows[r];


    if (
      !spreadsheetRow ||
      !spreadsheetRow.length
    ) {

      continue;

    }


    const title =
      String(
        spreadsheetRow[0] || ""
      ).trim();

    const concept =
      String(
        spreadsheetRow[1] || ""
      ).trim();

    const statement =
      String(
        spreadsheetRow[2] || ""
      ).trim();


    // Ignore completely empty rows.

    if (
      !title &&
      !concept &&
      !statement
    ) {

      continue;

    }


    const questions = [];


    // --------------------------------------------------------
    // QUESTIONS
    // --------------------------------------------------------

    for (
      let c = 3;
      c < spreadsheetRow.length;
      c++
    ) {

      const cell =
        String(
          spreadsheetRow[c] || ""
        ).trim();


      if (!cell) {
        continue;
      }


      const question =
        parseQuestionCell(
          cell
        );


      if (question) {

        question.number =
          questions.length + 1;

        questions.push(
          question
        );

      }

    }


    // --------------------------------------------------------
    // STORE CONCEPT
    // --------------------------------------------------------

    conversation.rows.push({

      title,

      concept,

      statement,

      questions

    });

  }


  return conversation;

}


// ============================================================
// PARSE SPREADSHEET CSV
//
// Google Sheets published CSV is comma-delimited.
//
// This parser correctly handles quoted cells containing
// commas and embedded pipe characters.
//
// ============================================================

function parseSpreadsheetCSV(
  text
) {

  const cleaned =
    String(text)
      .replace(/\r/g, "");

  const lines =
    cleaned.split("\n");

  const rows = [];

  lines.forEach(
    line => {

      if (
        line.trim() === ""
      ) {

        return;

      }

      rows.push(
        parseCSVLine(
          line
        )
      );

    }
  );

  return rows;

}


// ============================================================
// PARSE QUESTION CELL
//
// Cell format:
//
// TYPE | PROMPT | ANSWER
//
// MULTIPLE_CHOICE:
//
// MULTIPLE_CHOICE | ¿Qué había? | A. un chico | B. una chica | C. un mono | A
//
// SHORT_WRITE:
//
// SHORT_WRITE | ¿Qué había? | un chico OR el chico OR George
//
// LONG_WRITE:
//
// LONG_WRITE | Describe la situación.
//
// ============================================================

// ============================================================
// PARSE QUESTION CELL
//
// Format:
//
// TYPE | SAY:... | SHOW:... | ASK:... | OPTIONS:... | ANSWER:...
//
// Fields are optional depending on question type.
//
// SAY     = spoken by TTS, not displayed
// SHOW    = displayed, not spoken
// ASK     = displayed AND spoken as the question
// OPTIONS = answer choices for multiple choice
// ANSWER  = correct answer
//
// Examples:
//
// YES_NO | ASK:¿Había un chico? | ANSWER:SÍ
//
// YES_NO | SHOW:Había un chico. | ASK:¿Había un chico? | ANSWER:SÍ
//
// MULTIPLE_CHOICE | ASK:¿Dónde estaba George? |
// SHOW:George estaba en California. |
// OPTIONS:A. California | B. Utah | C. España |
// ANSWER:California
//
// ============================================================

function parseQuestionCell(cell) {

  const parts =
    String(cell)
      .split("|")
      .map(part => part.trim());

  if (!parts.length) {
    return null;
  }

  const type =
    parts[0].toUpperCase();

  const validTypes = [
    "YES_NO",
    "EITHER_OR",
    "MULTIPLE_CHOICE",
    "SHORT_WRITE",
    "LONG_WRITE",
  ];

  if (!validTypes.includes(type)) {

    console.warn(
      "Unknown conversation question type:",
      type,
      cell
    );

    return null;
  }


  // ----------------------------------------------------------
  // BASIC QUESTION OBJECT
  // ----------------------------------------------------------
  
  const question = {
  
    type,
  
    ask: "",
  
    show: "",
  
    answer: "",

    acceptedKeywords: [],

    options: [],

    correctOption: "",

    responseRequired: true

  };


  // ----------------------------------------------------------
  // PARSE FIELDS
  // ----------------------------------------------------------

  parts.slice(1).forEach(part => {

    const colonIndex =
      part.indexOf(":");

    if (colonIndex === -1) {
      return;
    }

    const field =
      part
        .slice(0, colonIndex)
        .trim()
        .toUpperCase();

    const value =
      part
        .slice(colonIndex + 1)
        .trim();

    // --------------------------------------------------------
    // SHOW
    // --------------------------------------------------------

    if (field === "SHOW") {

      question.show =
        value;

      return;
    }


    // --------------------------------------------------------
    // ASK
    // --------------------------------------------------------
    
    if (field === "ASK") {
    
      question.ask =
        value;
    
      return;
    }


    // --------------------------------------------------------
    // ANSWER
    // --------------------------------------------------------

    if (field === "ANSWER") {

      question.answer =
        value;

      return;
    }


    // --------------------------------------------------------
    // OPTIONS
    //
    // OPTIONS may contain additional "|" characters.
    //
    // Example:
    //
    // OPTIONS:A. California | B. Utah | C. España
    //
    // Because the cell is already split on "|", each
    // subsequent field beginning with a letter + "." is
    // treated as another option.
    // --------------------------------------------------------

    if (field === "OPTIONS") {

      if (value) {

        question.options.push(
          value
        );

      }

      return;
    }

  });


  // ----------------------------------------------------------
  // CLEAN MULTIPLE-CHOICE OPTIONS
  //
  // Because "|" separates spreadsheet fields, additional
  // options appear as standalone pieces such as:
  //
  // B. Utah
  // C. España
  //
  // ----------------------------------------------------------

  if (
    type ===
    "MULTIPLE_CHOICE"
  ) {

    question.options = [];

    parts.slice(1).forEach(part => {

      const trimmed =
        part.trim();

      if (
        /^[A-Z]\.\s*/i.test(
          trimmed
        )
      ) {

        question.options.push(
          trimmed
        );

      }

    });


    // ANSWER: may have been parsed normally above.
    // If the final standalone field is just a letter,
    // support the older format too.

    if (
      !question.answer &&
      /^[A-Z]$/i.test(
        parts[parts.length - 1]
      )
    ) {

      question.correctOption =
        parts[
          parts.length - 1
        ]
          .trim()
          .toUpperCase();

    } else {

      question.correctOption =
        question.answer
          .trim()
          .toUpperCase();

    }

    return question;
  }


  // ----------------------------------------------------------
  // EITHER / OR
  // ----------------------------------------------------------

  if (
    type ===
    "EITHER_OR"
  ) {

    return question;
  }


  // ----------------------------------------------------------
  // YES / NO
  // ----------------------------------------------------------

  if (
    type ===
    "YES_NO"
  ) {

    return question;
  }


  // ----------------------------------------------------------
  // SHORT WRITE
  // ----------------------------------------------------------

  if (
    type ===
    "SHORT_WRITE"
  ) {

    question.acceptedKeywords =
      question.answer
        .split(/\s+OR\s+/i)
        .map(answer =>
          normalizeConversationAnswer(
            answer
          )
        )
        .filter(Boolean);

    return question;
  }

  // ----------------------------------------------------------
  // LONG WRITE
  // ----------------------------------------------------------

  if (
    type ===
    "LONG_WRITE"
  ) {

    question.responseRequired =
      false;

    return question;
  }


  return question;
}

// ============================================================
// HEADER
// ============================================================

function renderConversationHeader() {

  conversationTitle.textContent =
    conversationData.title ||
    "Conversation";

  conversationLevel.textContent =
    conversationData.level
      ? `Level ${conversationData.level}`
      : "";

}


// ============================================================
// SCENE
// ============================================================

function renderConversationScene() {

  const scene =
    conversationData.scene;


  if (
    typeof conversationSceneText !==
    "undefined"
  ) {

    conversationSceneText.textContent =
      scene.text || "";

  }


  if (
    typeof conversationSceneImage !==
    "undefined"
  ) {

    if (
      scene.imageURL
    ) {

      conversationSceneImage.src =
        scene.imageURL;

      conversationSceneImage.alt =
        conversationData.title ||
        "Conversation scene";

      conversationSceneImage.classList.remove(
        "hidden"
      );

    } else {

      conversationSceneImage.classList.add(
        "hidden"
      );

    }

  }

}


// ============================================================
// GET CURRENT ROW
// ============================================================

function getCurrentConversationRow() {

  return conversationRows[
    currentConceptIndex
  ] || null;

}


// ============================================================
// GET CURRENT QUESTION
// ============================================================

function getCurrentQuestion() {

  const row =
    getCurrentConversationRow();


  if (!row) {
    return null;
  }


  return row.questions[
    currentQuestionIndex
  ] || null;

}

// ============================================================
// RESET CURRENT CONCEPT
// ============================================================
//
// When a student answers incorrectly, the current concept
// restarts at Question 1.
//
// This does NOT reset the entire conversation.
//
// Attempts already recorded in conversationReport remain.
// ============================================================

function resetCurrentConcept() {

  currentQuestionIndex = 0;

  currentConceptMastered = false;

  conversationAttempts = 0;

}

// ============================================================
// SHOW QUESTION
// ============================================================

// ============================================================
// SHOW CURRENT QUESTION
// ============================================================
//
// Progression:
//
// Question correct
//      ↓
// Next question
//
// Question incorrect
//      ↓
// Restart current concept at Q1
//
// Final question correct
//      ↓
// Concept mastered
//      ↓
// Next concept
//
// Final question of final concept correct
//      ↓
// Conversation complete
// ============================================================

function showConversationQuestion() {

  const row =
    getCurrentConversationRow();


  // ----------------------------------------------------------
  // CONVERSATION COMPLETE
  // ----------------------------------------------------------

  if (!row) {

    finishConversation();

    return;

  }


  // ----------------------------------------------------------
  // EMPTY CONCEPT
  //
  // If a row contains no usable questions, skip it rather
  // than trapping the student.
  // ----------------------------------------------------------

  if (
    !row.questions ||
    row.questions.length === 0
  ) {

    currentConceptIndex++;

    currentQuestionIndex = 0;

    currentConceptMastered = false;

    showConversationQuestion();

    return;

  }


  // ----------------------------------------------------------
  // SAFETY CHECK
  // ----------------------------------------------------------

  if (
    currentQuestionIndex >=
    row.questions.length
  ) {

    currentConceptMastered = true;

    currentConceptIndex++;

    currentQuestionIndex = 0;

    currentConceptMastered = false;

    showConversationQuestion();

    return;

  }


  const question =
    getCurrentQuestion();


  if (!question) {

    finishConversation();

    return;

  }


  // ----------------------------------------------------------
  // RESET PER-QUESTION ATTEMPT COUNTER
  //
  // The teacher report maintains the permanent attempt
  // count. This variable is only for the current interaction.
  // ----------------------------------------------------------

  conversationAttempts = 0;


  // ----------------------------------------------------------
  // CLEAR OLD RESPONSE UI
  // ----------------------------------------------------------

  clearConversationResponseAreas();


  conversationFeedback.textContent =
    "";

  conversationFeedback.className =
    "conversation-feedback";


  conversationNextBtn.classList.add(
    "hidden"
  );


  conversationEndBtn.classList.remove(
    "hidden"
  );


  // ----------------------------------------------------------
  // PROGRESS
  // ----------------------------------------------------------

  conversationProgress.textContent =
    `Concept ${
      currentConceptIndex + 1
    } of ${
      conversationRows.length
    } • Question ${
      currentQuestionIndex + 1
    } of ${
      row.questions.length
    }`;


  // ----------------------------------------------------------
  // SHOW TEXT
  //
  // SHOW = text specifically attached to this question.
  // If no SHOW field exists, fall back to the row statement.
  // ----------------------------------------------------------
  
  if (
    typeof conversationSceneText !==
    "undefined"
  ) {
  
    conversationSceneText.textContent =
      conversationSceneText.textContent =
        question.show || "";
  
  }


  // ----------------------------------------------------------
  // QUESTION PROMPT
  //
  // ASK is TTS only.
  // It should NOT appear on screen.
  // SHOW is handled by conversationSceneText above.
  // ----------------------------------------------------------
  
  conversationPrompt.textContent =
    "";
  
  
  // ----------------------------------------------------------
  // TEXT TO SPEECH
  //
  // ASK = spoken only
  // SHOW = never spoken
  // ----------------------------------------------------------
  
  if (question.ask) {
  
    playSpanishText(
      getConversationDisplayPrompt(
        question.ask
      )
    );
  
  }

  // ----------------------------------------------------------
  // QUESTION TYPE
  // ----------------------------------------------------------

  switch (
    question.type
  ) {

    case "YES_NO":

      showYesNo();

      break;


    case "EITHER_OR":

      showEitherOr(
        question
      );

      break;


    case "MULTIPLE_CHOICE":

      showMultipleChoice(
        question
      );

      break;


    case "SHORT_WRITE":

      showWriting();

      break;


    case "SHORT_SPEAK":

      showShortSpeak(
        question
      );

      break;


    case "LONG_WRITE":

      showLongWriting();

      break;


    default:

      conversationFeedback.textContent =
        `⚠️ Unknown question type: ${
          question.type
        }`;

      conversationFeedback.className =
        "conversation-feedback error";

  }

}

function showShortSpeak(
  question
) {

  // ----------------------------------------------------------
  // SHORT SPEAK
  //
  // Student records their response.
  // There is NO answer checking.
  // Students can:
  // - record
  // - stop
  // - listen
  // - record again
  // - download the recording
  //
  // Recordings use WebM format.
  // ----------------------------------------------------------

  // Clear the normal response area

  clearConversationResponseAreas();


  // ----------------------------------------------------------
  // PROMPT
  // ----------------------------------------------------------

  conversationPrompt.textContent =
    "";


  if (
    question.ask
  ) {

    playSpanishText(
      getConversationDisplayPrompt(
        question.ask
      )
    );

  }


  // ----------------------------------------------------------
  // CREATE RECORDING UI
  // ----------------------------------------------------------

  const recorderContainer =
    document.createElement(
      "div"
    );

  recorderContainer.className =
    "short-speak-container";


  // ----------------------------------------------------------
  // RECORD BUTTON
  // ----------------------------------------------------------

  const recordButton =
    document.createElement(
      "button"
    );

  recordButton.type =
    "button";

  recordButton.textContent =
    "🎙️ Start Recording";

  recordButton.className =
    "conversation-button";


  // ----------------------------------------------------------
  // STOP BUTTON
  // ----------------------------------------------------------

  const stopButton =
    document.createElement(
      "button"
    );

  stopButton.type =
    "button";

  stopButton.textContent =
    "⏹️ Stop";

  stopButton.className =
    "conversation-button";

  stopButton.disabled =
    true;


  // ----------------------------------------------------------
  // AUDIO PLAYER
  // ----------------------------------------------------------

  const audio =
    document.createElement(
      "audio"
    );

  audio.controls =
    true;

  audio.style.display =
    "none";

  // ----------------------------------------------------------
  // DOWNLOAD BUTTON
  // ----------------------------------------------------------

  const downloadButton =
    document.createElement(
      "button"
    );

  downloadButton.type =
    "button";

  downloadButton.textContent =
    "💾 Download Recording";

  downloadButton.className =
    "conversation-button";

  downloadButton.disabled =
    true;

  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  const status =
    document.createElement(
      "div"
    );

  status.className =
    "short-speak-status";

  status.textContent =
    "Ready to record.";


  // ----------------------------------------------------------
  // ADD TO PAGE
  // ----------------------------------------------------------

  recorderContainer.appendChild(
    status
  );

  recorderContainer.appendChild(
    recordButton
  );

  recorderContainer.appendChild(
    stopButton
  );

  recorderContainer.appendChild(
    audio
  );

  recorderContainer.appendChild(
    downloadButton
  );

  conversationFeedback
    .parentNode
    .insertBefore(
      recorderContainer,
      conversationFeedback
    );


  // ----------------------------------------------------------
  // RECORDING VARIABLES
  // ----------------------------------------------------------

  let mediaRecorder =
    null;

  let audioChunks =
    [];

  let audioBlob =
    null;

  // ----------------------------------------------------------
  // DOWNLOAD FILENAME
  // ----------------------------------------------------------
  
  function getShortSpeakFilename() {

  const studentName =
    currentUser?.name ||
    "Student";

  const title =
    conversationTitle?.textContent?.trim() ||
    "Conversation";

  const date =
    new Date()
      .toISOString()
      .slice(0, 10);

  return (
    `${sanitizeFilenamePart(studentName)} - ` +
    `${sanitizeFilenamePart(title)} - ` +
    `${date}.webm`
  );
}


function sanitizeFilenamePart(text) {

  return String(text)
    .trim()
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ");

}
  
  
   // ----------------------------------------------------------
  // START RECORDING
  // ----------------------------------------------------------

  recordButton.addEventListener(
    "click",
    async () => {

      try {

        const stream =
          await navigator
            .mediaDevices
            .getUserMedia({
              audio: true
            });


        audioChunks =
          [];


        mediaRecorder =
          new MediaRecorder(
            stream,
            {
              mimeType:
                "audio/webm"
            }
          );


        mediaRecorder.addEventListener(
          "dataavailable",
          event => {

            if (
              event.data.size >
              0
            ) {

              audioChunks.push(
                event.data
              );

            }

          }
        );


        mediaRecorder.addEventListener(
          "stop",
          () => {

            audioBlob =
              new Blob(
                audioChunks,
                {
                  type:
                    "audio/webm"
                }
              );


            const audioURL =
              URL.createObjectURL(
                audioBlob
              );


            audio.src =
              audioURL;
            
            audio.style.display =
              "block";
            
            downloadButton.disabled =
              false;
            
            status.textContent =
              "Recording ready. Listen before downloading.";
            
            recordButton.disabled =
              false;
            
            stopButton.disabled =
              true;


            stream
              .getTracks()
              .forEach(
                track =>
                  track.stop()
              );

          }
        );


        mediaRecorder.start();


        status.textContent =
          "🔴 Recording...";


        recordButton.disabled =
          true;

        stopButton.disabled =
          false;


        audio.style.display =
          "none";

      }

      catch (
        error
      ) {

        console.error(
          error
        );

        status.textContent =
          "⚠️ Microphone access was not available.";

      }

    }
  );


  // ----------------------------------------------------------
  // STOP RECORDING
  // ----------------------------------------------------------

  stopButton.addEventListener(
    "click",
    () => {

      if (
        mediaRecorder &&
        mediaRecorder.state !==
        "inactive"
      ) {

        mediaRecorder.stop();

      }

    }
  );

}

  // ----------------------------------------------------------
  // DOWNLOAD RECORDING
  // ----------------------------------------------------------
  
  downloadButton.addEventListener(
    "click",
    () => {
  
      if (!audioBlob) {
        return;
      }
  
      const downloadURL =
        URL.createObjectURL(
          audioBlob
        );
  
      const link =
        document.createElement(
          "a"
        );
  
      link.href =
        downloadURL;
  
      link.download =
        getShortSpeakFilename();
  
      document.body.appendChild(
        link
      );
  
      link.click();
  
      link.remove();
  
      URL.revokeObjectURL(
        downloadURL
      );
  
    }
  );

// ============================================================
// CLEAR RESPONSE AREAS
// ============================================================

function clearConversationResponseAreas() {

  if (
    typeof conversationYesNo !==
    "undefined"
  ) {

    conversationYesNo.classList.add(
      "hidden"
    );

    conversationYesNo
      .querySelectorAll(
        ".conversation-answer-btn"
      )
      .forEach(
        button => {

          button.classList.remove(
            "hidden"
          );

        }
      );

  }


  if (
    typeof conversationChoices !==
    "undefined"
  ) {

    conversationChoices.classList.add(
      "hidden"
    );

    conversationChoices.innerHTML =
      "";

  }


  if (
    typeof conversationWriting !==
    "undefined"
  ) {

    conversationWriting.classList.add(
      "hidden"
    );

  }

   if (
    typeof conversationWritingInput !==
    "undefined"
  ) {

    conversationWritingInput.value =
      "";

    conversationWritingInput.disabled =
      false;

  }


  if (
    typeof conversationSubmitWriting !==
    "undefined"
  ) {

    conversationSubmitWriting.disabled =
      false;

  }

}


// ============================================================
// YES / NO
// ============================================================

function showYesNo() {

  conversationYesNo.classList.remove(
    "hidden"
  );

  const buttons =
    conversationYesNo.querySelectorAll(
      ".conversation-answer-btn"
    );

  buttons.forEach(
    (button, index) => {

      button.classList.remove(
        "hidden"
      );

      button.disabled =
        false;

      if (index === 0) {

        button.textContent =
          "Sí";

        button.dataset.answer =
          "SÍ";

      } else {

        button.textContent =
          "No";

        button.dataset.answer =
          "NO";

      }

      button.onclick =
        () => {

          checkConversationAnswer(
            button.dataset.answer
          );

        };

    }
  );

}

// ============================================================
// EITHER / OR
// ============================================================
//
// The choices are extracted from the question prompt.
//
// Example:
//
// ¿Había un chico o una chica?
//
// becomes:
//
// [un chico] [una chica]
//
// ============================================================

function showEitherOr(question) {

  conversationYesNo.classList.remove("hidden");

  const buttons =
    conversationYesNo.querySelectorAll(
      ".conversation-answer-btn"
    );

  const choices =
    extractBracketChoices(question.ask);

  if (choices.length !== 2) {

    conversationFeedback.textContent =
      "⚠️ This either/or question needs exactly two bracketed choices.";

    conversationFeedback.className =
      "conversation-feedback error";

    return;
  }

  buttons.forEach(
    (button, index) => {

      if (!choices[index]) {

        button.classList.add("hidden");
        return;

      }

      button.classList.remove("hidden");
      button.disabled = false;

      // THIS replaces Sí / No
      button.textContent = choices[index];

      button.dataset.answer = choices[index];

      button.onclick = () => {

        checkConversationAnswer(
          choices[index]
        );

      };

    }
  );

}

function extractBracketChoices(prompt) {

  const matches =
    String(prompt).match(
      /\[([^\]]+)\]/g
    );

  if (!matches) {
    return [];
  }

  return matches
    .map(
      match =>
        match
          .replace(/^\[/, "")
          .replace(/\]$/, "")
          .trim()
    )
    .filter(Boolean);

}

// ============================================================
// EXTRACT EITHER / OR CHOICES
// ============================================================

function extractEitherOrChoices(
  prompt
) {

  const cleaned =
    String(prompt)
      .replace(
        /[¿?]/g,
        ""
      )
      .trim();


  // ----------------------------------------------------------
  // Common TPRS question patterns
  //
  // ¿Había un chico o una chica?
  // ¿Era George o Robert el chico?
  // ¿Estaba George en California o Utah?
  // ----------------------------------------------------------


  const words =
    cleaned.split(
      /\s+/
    );


  const oIndex =
    words.findIndex(
      word =>
        word.toLowerCase() ===
        "o"
    );


  if (
    oIndex <= 0 ||
    oIndex >= words.length - 1
  ) {

    return [];

  }


  // ----------------------------------------------------------
  // Pattern:
  //
  // "¿Había un chico o una chica?"
  //
  // First choice is normally the final
  // noun phrase before "o".
  //
  // Second choice is normally the phrase
  // immediately after "o".
  // ----------------------------------------------------------

  let first =
    words
      .slice(
        Math.max(
          0,
          oIndex - 2
        ),
        oIndex
      )
      .join(" ");


  let second =
    words[
      oIndex + 1
    ] || "";


  // ----------------------------------------------------------
  // Remove question lead-in.
  //
  // "Había un chico"
  // becomes
  // "un chico"
  // ----------------------------------------------------------

  const firstPrefixes = [
    "habia",
    "era",
    "estaba",
    "estuvieron",
    "estaban",
    "tenia",
    "tenían"
  ];


  const firstWords =
    first.split(
      /\s+/
    );


  if (
    firstWords.length > 1 &&
    firstPrefixes.includes(
      normalizeConversationAnswer(
        firstWords[0]
      )
    )
  ) {

    first =
      firstWords
        .slice(1)
        .join(" ");

  }


  // ----------------------------------------------------------
  // Remove trailing context from second choice.
  //
  // "Robert el chico"
  // becomes
  // "Robert"
  //
  // "Utah"
  // remains
  // "Utah"
  // ----------------------------------------------------------

  const secondWords =
    second.split(
      /\s+/
    );


  if (
    secondWords.length > 1
  ) {

    second =
      secondWords[0];

  }


  return [
    first,
    second
  ];

}


// ============================================================
// MULTIPLE CHOICE
// ============================================================

function showMultipleChoice(
  question
) {

  conversationChoices.innerHTML =
    "";


  question.options.forEach(
    option => {

      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      button.className =
        "btn btn-primary conversation-choice-btn";

      button.textContent =
        option;


      button.addEventListener(
        "click",
        () => {

          const match =
            option
              .trim()
              .match(
                /^([A-Z])\./i
              );


          const selectedLetter =
            match
              ? match[1]
                  .toUpperCase()
              : "";


          checkConversationAnswer(
            selectedLetter
          );

        }
      );


      conversationChoices.appendChild(
        button
      );

    }
  );


  conversationChoices.classList.remove(
    "hidden"
  );

}


// ============================================================
// SHORT WRITE
// ============================================================

function showWriting() {

  conversationWriting.classList.remove(
    "hidden"
  );

  conversationWritingInput.focus();

}


// ============================================================
// LONG WRITE
// ============================================================

function showLongWriting() {

  conversationWriting.classList.remove(
    "hidden"
  );

  conversationWritingInput.focus();

}


// ============================================================
// CHECK ANSWER
// ============================================================

function checkConversationAnswer(
  studentAnswer
) {

  const question =
    getCurrentQuestion();


  if (!question) {
    return;
  }


  const cleanedAnswer =
    String(
      studentAnswer || ""
    ).trim();


  if (!cleanedAnswer) {
    return;
  }

  // ----------------------------------------------------------
  // LONG WRITE
  //
  // Save response and allow student to continue.
  // LONG_WRITE does NOT count as correct/incorrect.
  // ----------------------------------------------------------

  if (
    question.type ===
    "LONG_WRITE"
  ) {

    recordQuestionAttempt(
      question,
      cleanedAnswer,
      true
    );


    conversationFeedback.textContent =
      "Respuesta guardada ✓";

    conversationFeedback.className =
      "conversation-feedback correct";


    disableCurrentConversationResponse();


    conversationNextBtn.classList.remove(
      "hidden"
    );


    return;

  }


  // ----------------------------------------------------------
  // DETERMINE CORRECTNESS
  // ----------------------------------------------------------

  let correct =
    false;

  let flagForReview =
    false;


  // ----------------------------------------------------------
  // YES / NO
  // ----------------------------------------------------------

  if (
    question.type ===
    "YES_NO"
  ) {

    correct =
      normalizedAnswersMatch(
        cleanedAnswer,
        question.answer
      );

  }


  // ----------------------------------------------------------
  // EITHER / OR
  // ----------------------------------------------------------

  else if (
    question.type ===
    "EITHER_OR"
  ) {

    correct =
      normalizedAnswersMatch(
        cleanedAnswer,
        question.answer
      );

  }


  // ----------------------------------------------------------
  // MULTIPLE CHOICE
  // ----------------------------------------------------------

  else if (
    question.type ===
    "MULTIPLE_CHOICE"
  ) {

    correct =
      normalizedAnswersMatch(
        cleanedAnswer,
        question.correctOption
      );

  }


  // ----------------------------------------------------------
  // SHORT WRITE
  // ----------------------------------------------------------

  else if (
    question.type ===
    "SHORT_WRITE"
  ) {

    const result =
      evaluateShortWrite(
        cleanedAnswer,
        question.acceptedKeywords
      );


    correct =
      result.correct;


    flagForReview =
      result.flagForReview;

  }


  // ----------------------------------------------------------
  // RECORD ATTEMPT
  // ----------------------------------------------------------

  recordQuestionAttempt(
    question,
    cleanedAnswer,
    correct,
    flagForReview
  );


  // ----------------------------------------------------------
  // CORRECT
  // ----------------------------------------------------------

  if (correct) {

    conversationFeedback.textContent =
      "¡Muy bien! ✓";

    conversationFeedback.className =
      "conversation-feedback correct";


    disableCurrentConversationResponse();


    conversationNextBtn.classList.remove(
      "hidden"
    );


    return;

  }


  // ----------------------------------------------------------
  // INCORRECT
  //
  // IMPORTANT:
  //
  // The student DOES NOT repeat this question.
  //
  // The student is told the correct answer and then
  // continues to the next question.
  //
  // The incorrect answer counts as one strike for the
  // current concept.
  // ----------------------------------------------------------

  conversationAttempts++;
  
  conversationFeedback.textContent =
    `No exactamente. La respuesta correcta es: ${
      getConversationCorrectAnswerText(
        question
      )
    }`;

  conversationFeedback.className =
    "conversation-feedback incorrect";


  disableCurrentConversationResponse();


  conversationNextBtn.classList.remove(
    "hidden"
  );

}

function getConversationCorrectAnswerText(
  question
) {

  if (
    question.type ===
    "YES_NO"
  ) {

    return question.answer;

  }


  if (
    question.type ===
    "EITHER_OR"
  ) {

    return question.answer;

  }


  if (
    question.type ===
    "MULTIPLE_CHOICE"
  ) {

    const correctOption =
      question.options.find(
        option => {

          const match =
            option
              .trim()
              .match(
                /^([A-Z])\./i
              );

          return (
            match &&
            match[1]
              .toUpperCase() ===
              question.correctOption
          );

        }
      );


    return (
      correctOption ||
      question.correctOption
    );

  }


  if (
    question.type ===
    "SHORT_WRITE"
  ) {

    return (
      question.answer ||
      question.acceptedKeywords.join(
        " / "
      )
    );

  }


  return (
    question.answer ||
    "—"
  );

}

// ============================================================
// SHORT WRITE EVALUATION
// ============================================================
//
// Accepted answers are keywords/phrases.
//
// Example:
//
// accepted:
// "un chico OR el chico OR George"
//
// Student:
// "George era el chico"
//
// Result:
// ACCEPTED
//
// because "george" appears in the response.
//
// ============================================================

function evaluateShortWrite(
  studentAnswer,
  acceptedKeywords
) {

  const student =
    normalizeConversationAnswer(
      studentAnswer
    );


  if (!student) {

    return {
      correct: false,
      flagForReview: false
    };

  }


  const exactMatch =
    acceptedKeywords.some(
      keyword => {

        if (!keyword) {
          return false;
        }

        return (
          student ===
          keyword
        );

      }
    );


  if (exactMatch) {

    return {
      correct: true,
      flagForReview: false
    };

  }


  const containsAcceptedAnswer =
    acceptedKeywords.some(
      keyword => {

        if (!keyword) {
          return false;
        }

        return student.includes(
          keyword
        );

      }
    );


  if (containsAcceptedAnswer) {

    return {
      correct: true,
      flagForReview: true
    };

  }


  return {
    correct: false,
    flagForReview: false
  };

}

// ============================================================
// NORMALIZED ANSWER COMPARISON
// ============================================================

function normalizedAnswersMatch(
  studentAnswer,
  correctAnswer
) {

  return (
    normalizeConversationAnswer(
      studentAnswer
    ) ===
    normalizeConversationAnswer(
      correctAnswer
    )
  );

}


// ============================================================
// NORMALIZE
// ============================================================

function normalizeConversationAnswer(
  value
) {

  return String(
    value
  )
    .trim()
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[¿?¡!.,;:"']/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    );

}

function getConversationDisplayPrompt(prompt) {

  return String(prompt || "")
    .replace(
      /\[([^\]]+)\]/g,
      "$1"
    )
    .trim();

}

// ============================================================
// RECORD QUESTION ATTEMPT
// ============================================================
//
// Stores:
// - number
// - type
// - attempts
// - SHORT_WRITE responses
// - LONG_WRITE responses
//
// For SHORT_WRITE:
// accepted = true/false
//
// For LONG_WRITE:
// accepted is always null because the teacher reviews it.
//
// ============================================================

function recordQuestionAttempt(
  question,
  studentAnswer,
  accepted,
  flagForReview = false
) {

  const existing =
    conversationReport.find(
      item =>
        item.conceptIndex ===
          currentConceptIndex &&
        item.questionIndex ===
          currentQuestionIndex
    );


  // ----------------------------------------------------------
  // EXISTING REPORT ITEM
  // ----------------------------------------------------------

  if (existing) {

    existing.attempts++;


    if (
      question.type ===
      "SHORT_WRITE"
    ) {

      existing.responses.push({

        text:
          studentAnswer,
      
        accepted:
          Boolean(
            accepted
          ),
      
        flagForReview:
          Boolean(
            flagForReview
          )
      
      });

    }


    if (
      question.type ===
      "LONG_WRITE"
    ) {

      existing.responses.push({

        text:
          studentAnswer,

        accepted:
          null

      });

    }


    return;

  }


  // ----------------------------------------------------------
  // NEW REPORT ITEM
  // ----------------------------------------------------------

  const responses =
    [];


  if (
    question.type ===
      "SHORT_WRITE"
  ) {

    responses.push({

      text:
        studentAnswer,
    
      accepted:
        Boolean(
          accepted
        ),
    
      flagForReview:
        Boolean(
          flagForReview
        )
    
    });

  }


  if (
    question.type ===
      "LONG_WRITE"
  ) {

    responses.push({

      text:
        studentAnswer,

      accepted:
        null

    });

  }


  conversationReport.push({

  conversation:
    conversationData.title || "",

  studentName:
    typeof currentStudentName !== "undefined"
      ? currentStudentName
      : "",

  username:
    typeof currentUsername !== "undefined"
      ? currentUsername
      : "",

  dateTime:
    new Date().toLocaleString(),

  conceptIndex:
    currentConceptIndex,

  concept:
    getCurrentConversationRow()
      ?.concept || "",

  questionIndex:
    currentQuestionIndex,

  questionNumber:
    currentQuestionIndex + 1,

  type:
    question.type,

  prompt:
    question.ask ||
    question.show ||
    "",

  attempts:
    1,

  responses

});

}


// ============================================================
// DISABLE RESPONSE
// ============================================================

function disableCurrentConversationResponse() {

  if (
    typeof conversationYesNo !==
    "undefined"
  ) {

    conversationYesNo
      .querySelectorAll(
        "button"
      )
      .forEach(
        button => {

          button.disabled =
            true;

        }
      );

  }


  if (
    typeof conversationChoices !==
    "undefined"
  ) {

    conversationChoices
      .querySelectorAll(
        "button"
      )
      .forEach(
        button => {

          button.disabled =
            true;

        }
      );

  }


  if (
    typeof conversationWritingInput !==
    "undefined"
  ) {

    conversationWritingInput.disabled =
      true;

  }


  if (
    typeof conversationSubmitWriting !==
    "undefined"
  ) {

    conversationSubmitWriting.disabled =
      true;

  }

}


// ============================================================
// NEXT QUESTION
// ============================================================

conversationNextBtn.addEventListener(
  "click",
  () => {

    const row =
      getCurrentConversationRow();


    if (!row) {

      finishConversation();

      return;

    }


    // --------------------------------------------------------
    // MOVE TO NEXT QUESTION
    // --------------------------------------------------------

    currentQuestionIndex++;


    // --------------------------------------------------------
    // CONCEPT COMPLETE
    // --------------------------------------------------------

    if (
      currentQuestionIndex >=
      row.questions.length
    ) {

      // ------------------------------------------------------
      // TWO OR MORE STRIKES
      //
      // Repeat this concept from Question 1.
      // ------------------------------------------------------

      if (
        conversationAttempts >= 2
      ) {

        conversationFeedback.textContent =
          "Vamos a practicar esta idea otra vez.";

        conversationFeedback.className =
          "conversation-feedback incorrect";


        currentQuestionIndex =
          0;

        conversationAttempts =
          0;

        currentConceptMastered =
          false;


        showConversationQuestion();

        return;

      }


      // ------------------------------------------------------
      // ZERO OR ONE STRIKE
      //
      // Concept is complete.
      // Move permanently to the next concept.
      // ------------------------------------------------------

      currentConceptMastered =
        true;


      currentConceptIndex++;

      currentQuestionIndex =
        0;

      conversationAttempts =
        0;

      currentConceptMastered =
        false;

    }


    showConversationQuestion();

  }
);


// ============================================================
// WRITING SUBMIT
// ============================================================

conversationSubmitWriting.addEventListener(
  "click",
  () => {

    const answer =
      conversationWritingInput.value.trim();


    if (!answer) {
      return;
    }


    checkConversationAnswer(
      answer
    );

  }
);


// ============================================================
// ENTER KEY
// ============================================================

conversationWritingInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
        "Enter" &&
      !event.shiftKey
    ) {

      const question =
        getCurrentQuestion();


      // ------------------------------------------------------
      // LONG WRITE
      //
      // Enter creates a new line.
      // ------------------------------------------------------

      if (
        question &&
        question.type ===
          "LONG_WRITE"
      ) {

        return;

      }


      event.preventDefault();


      conversationSubmitWriting.click();

    }

  }
);


// ============================================================
// TEXT TO SPEECH
// ============================================================

function playSpanishText(
  text
) {

  if (
    !text ||
    !(
      "speechSynthesis"
      in window
    )
  ) {

    return;

  }


  window.speechSynthesis.cancel();


  const utterance =
    new SpeechSynthesisUtterance(
      text
    );


  utterance.lang =
    "es-ES";

  utterance.rate =
    0.9;


  window.speechSynthesis.speak(
    utterance
  );

}


// ============================================================
// REPLAY
// ============================================================

conversationReplayBtn.addEventListener(
  "click",
  () => {

    const question =
      getCurrentQuestion();


    if (question && question.ask) {
    
      playSpanishText(
        getConversationDisplayPrompt(
          question.ask
        )
      );
    
    }

  }
);


// ============================================================
// FINISH
// ============================================================

function finishConversation() {

  clearConversationResponseAreas();


  conversationPrompt.textContent =
    conversationData.endTeacher ||
    "¡Muy bien! Has terminado la conversación.";


  conversationFeedback.textContent =
    "🎉 ¡Conversación completada!";


  conversationFeedback.className =
    "conversation-feedback correct";


  conversationNextBtn.classList.add(
    "hidden"
  );


  renderConversationReport();

}


// ============================================================
// TEACHER REPORT
// ============================================================
//
// FORMAT:
//
// Question | Type | Attempts | Short Write Responses
//
// Then:
//
// LONG WRITE RESPONSES
//
// Long writes are displayed separately in large,
// spacious text for easy teacher review/copying.
//
// ============================================================

function renderConversationReport() {

  // ----------------------------------------------------------
  // REMOVE OLD REPORT
  // ----------------------------------------------------------

  const oldReport =
    conversationPanel.querySelector(
      ".conversation-report"
    );


  if (oldReport) {

    oldReport.remove();

  }


  // ----------------------------------------------------------
  // REPORT CONTAINER
  // ----------------------------------------------------------

  const report =
    document.createElement(
      "div"
    );

  report.className =
    "conversation-report";


  // ----------------------------------------------------------
  // HEADING
  // ----------------------------------------------------------

  const heading =
    document.createElement(
      "h2"
    );

  heading.textContent =
    "Teacher Report";


  report.appendChild(
    heading
  );


  // ----------------------------------------------------------
  // TABLE
  // ----------------------------------------------------------

  const table =
    document.createElement(
      "table"
    );

  table.className =
    "conversation-report-table";


  const thead =
    document.createElement(
      "thead"
    );


  const headerRow =
    document.createElement(
      "tr"
    );


  [
    "Question",
    "Type",
    "Attempts",
    "Student Short_Write Responses"
  ]
    .forEach(
      headingText => {

        const th =
          document.createElement(
            "th"
          );

        th.textContent =
          headingText;

        headerRow.appendChild(
          th
        );

      }
    );


  thead.appendChild(
    headerRow
  );


  table.appendChild(
    thead
  );


  const tbody =
    document.createElement(
      "tbody"
    );


  // ----------------------------------------------------------
  // REPORT ROWS
  // ----------------------------------------------------------

  conversationReport.forEach(
    item => {

      const tr =
        document.createElement(
          "tr"
        );


      // ------------------------------------------------------
      // QUESTION
      // ------------------------------------------------------

      const questionCell =
        document.createElement(
          "td"
        );

      questionCell.textContent =
        item.questionNumber;

      tr.appendChild(
        questionCell
      );


      // ------------------------------------------------------
      // TYPE
      // ------------------------------------------------------

      const typeCell =
        document.createElement(
          "td"
        );

      typeCell.textContent =
        item.type;

      tr.appendChild(
        typeCell
      );


      // ------------------------------------------------------
      // ATTEMPTS
      // ------------------------------------------------------

      const attemptsCell =
        document.createElement(
          "td"
        );

      attemptsCell.textContent =
        item.attempts;

      tr.appendChild(
        attemptsCell
      );


      // ------------------------------------------------------
      // SHORT WRITE RESPONSES
      // ------------------------------------------------------

      const responseCell =
        document.createElement(
          "td"
        );


      if (
        item.type ===
        "SHORT_WRITE"
      ) {

        item.responses.forEach(
          response => {

            const responseDiv =
              document.createElement(
                "div"
              );

            responseDiv.className =
              "conversation-report-response";


            const marker =
              document.createElement(
                "span"
              );


            if (
              response.accepted
            ) {

              marker.textContent =
                "✓ Accepted ";

              marker.className =
                "conversation-report-accepted";

            } else {

              marker.textContent =
                "⚠ Review ";

              marker.className =
                "conversation-report-flagged";

            }


            responseDiv.appendChild(
              marker
            );


            const text =
              document.createElement(
                "span"
              );

            text.textContent =
              response.text;


            responseDiv.appendChild(
              text
            );


            responseCell.appendChild(
              responseDiv
            );

          }
        );

      } else {

        responseCell.textContent =
          "—";

      }


      tr.appendChild(
        responseCell
      );


      tbody.appendChild(
        tr
      );

    }
  );


  table.appendChild(
    tbody
  );


  report.appendChild(
    table
  );


  // ==========================================================
  // LONG WRITE SECTION
  // ==========================================================

  const longWrites =
    conversationReport.filter(
      item =>
        item.type ===
        "LONG_WRITE"
    );


  if (
    longWrites.length
  ) {

    const longWriteSection =
      document.createElement(
        "div"
      );

    longWriteSection.className =
      "conversation-long-write-section";


    const longWriteHeading =
      document.createElement(
        "h2"
      );

    longWriteHeading.textContent =
      "Long Write Responses";


    longWriteSection.appendChild(
      longWriteHeading
    );


    longWrites.forEach(
      item => {

        // ----------------------------------------------------
        // PROMPT
        // ----------------------------------------------------

        const prompt =
          document.createElement(
            "h3"
          );

        prompt.textContent =
          item.prompt;


        longWriteSection.appendChild(
          prompt
        );


        // ----------------------------------------------------
        // RESPONSE(S)
        // ----------------------------------------------------

        item.responses.forEach(
          (
            response,
            index
          ) => {

            const responseBox =
              document.createElement(
                "div"
              );

            responseBox.className =
              "conversation-long-write-response";


            // Preserve line breaks.
            responseBox.style.whiteSpace =
              "pre-wrap";


            // Give the teacher plenty of
            // vertical writing space.
            responseBox.style.fontSize =
              "1.2rem";

            responseBox.style.lineHeight =
              "2";


            responseBox.textContent =
              response.text;


            longWriteSection.appendChild(
              responseBox
            );

          }
        );

      }
    );


    report.appendChild(
      longWriteSection
    );

  }


  // ----------------------------------------------------------
  // COPY REPORT BUTTON
  // ----------------------------------------------------------

  const copyButton =
    document.createElement(
      "button"
    );

  copyButton.type =
    "button";

  copyButton.className =
    "btn btn-primary conversation-copy-report-btn";

  copyButton.textContent =
    "Copy Teacher Report";


  copyButton.addEventListener(
    "click",
    () => {

      copyConversationReport();

    }
  );


  report.appendChild(
    copyButton
  );


  conversationPanel.appendChild(
    report
  );

}


// ============================================================
// CREATE PLAIN-TEXT TEACHER REPORT
// ============================================================
//
// This is intentionally simple so it can be pasted into
// Google Docs.
//
// ============================================================

function createConversationReportText() {

  const lines = [];


  lines.push(
    "TEACHER REPORT"
  );

  lines.push(
    ""
  );


  // ----------------------------------------------------------
  // SHORT WRITE TABLE
  // ----------------------------------------------------------

  lines.push(
    "QUESTION\tTYPE\tATTEMPTS\tSHORT_WRITE RESPONSES"
  );


  conversationReport.forEach(
    item => {

      let responses =
        "—";


      if (
        item.type ===
        "SHORT_WRITE"
      ) {

        responses =
          item.responses
            .map(
              response => {
        
                let label =
                  "⚠ Review";
        
        
                if (
                  response.accepted &&
                  !response.flagForReview
                ) {
        
                  label =
                    "✓ Accepted";
        
                }
        
        
                return `${label}: ${response.text}`;
        
              }
            )
            .join(
              " | "
            );

      }


      lines.push(
        `${item.questionNumber}\t${item.type}\t${item.attempts}\t${responses}`
      );

    }
  );


  // ----------------------------------------------------------
  // LONG WRITES
  // ----------------------------------------------------------

  const longWrites =
    conversationReport.filter(
      item =>
        item.type ===
        "LONG_WRITE"
    );


  if (
    longWrites.length
  ) {

    lines.push(
      ""
    );

    lines.push(
      "LONG WRITE RESPONSES"
    );

    lines.push(
      ""
    );


    longWrites.forEach(
      item => {

        lines.push(
          item.prompt
        );

        lines.push(
          ""
        );


        item.responses.forEach(
          response => {

            lines.push(
              response.text
            );

            lines.push(
              ""
            );

            lines.push(
              ""
            );

          }
        );

      }
    );

  }


  return lines.join(
    "\n"
  );

}


// ============================================================
// COPY TEACHER REPORT
// ============================================================

async function copyConversationReport() {

  const text =
    createConversationReportText();


  try {

    await navigator.clipboard.writeText(
      text
    );


    conversationFeedback.textContent =
      "Teacher report copied ✓";

    conversationFeedback.className =
      "conversation-feedback correct";


  } catch (error) {

    console.error(
      "Could not copy teacher report:",
      error
    );


    conversationFeedback.textContent =
      "Could not copy the report automatically.";

    conversationFeedback.className =
      "conversation-feedback error";

  }

}


// ============================================================
// BACK
// ============================================================

conversationSelectionBackBtn.addEventListener(
  "click",
  () => {

    conversationSelectionPanel.classList.add(
      "hidden"
    );

    conversationPanel.classList.add(
      "hidden"
    );


    if (homeOnlyContent) {
      homeOnlyContent.classList.remove("hidden");
    }
    
    if (
      typeof filterPanel !==
      "undefined"
    ) {
    
      filterPanel.classList.remove(
        "hidden"
      );
    
    }
  }
);


// ============================================================
// END BUTTON
// ============================================================

conversationEndBtn.addEventListener(
  "click",
  () => {

    conversationPanel.classList.add(
      "hidden"
    );

    conversationSelectionPanel.classList.remove(
      "hidden"
    );


    loadConversationIndex();

  }
);
