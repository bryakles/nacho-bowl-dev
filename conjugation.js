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

    console.log(
      "CONJUGATION CSV LOADED:",
      text.substring(0, 300)
    );

  } catch (error) {

    console.error(
      "Failed to load conjugation data:",
      error
    );

  }

}
