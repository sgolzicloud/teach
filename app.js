const form = document.querySelector("#concept-form");
const generateButton = document.querySelector("#generate-button");
const statusMessage = document.querySelector("#form-status");
const resultSection = document.querySelector("#result-section");
const conceptOutput = document.querySelector("#concept-output");
const template = document.querySelector("#concept-template");

function appendList(container, values) {
  container.replaceChildren(
    ...values.map((value) => {
      const item = document.createElement("li");
      item.textContent = value;
      return item;
    }),
  );
}

function renderTimeline(container, phases) {
  container.replaceChildren(
    ...phases.map((phase) => {
      const item = document.createElement("article");
      item.className = "timeline-item";

      const time = document.createElement("div");
      time.className = "timeline-time";
      time.textContent = `${phase.minutes} Min.`;

      const details = document.createElement("div");
      const heading = document.createElement("h5");
      heading.textContent = phase.phase;
      details.append(heading);

      [
        ["Methode / Sozialform", phase.method],
        ["Lehrkraft", phase.teacherActivity],
        ["Lernende", phase.studentActivity],
        ["Material", phase.materials],
      ].forEach(([label, value]) => {
        const paragraph = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = `${label}: `;
        paragraph.append(strong, value);
        details.append(paragraph);
      });

      item.append(time, details);
      return item;
    }),
  );
}

function renderVocabulary(container, entries) {
  container.replaceChildren(
    ...entries.map((entry) => {
      const item = document.createElement("li");
      const term = document.createElement("strong");
      term.textContent = `${entry.term}: `;
      item.append(term, `${entry.explanation} – ${entry.example}`);
      return item;
    }),
  );
}

function renderGames(container, games) {
  container.replaceChildren(
    ...games.map((game) => {
      const item = document.createElement("article");
      item.className = "game-item";

      const heading = document.createElement("h5");
      heading.textContent = game.name;
      item.append(heading);

      [
        ["Ziel", game.goal],
        ["Vorbereitung", game.preparation],
        ["Ablauf", game.procedure.join(" ")],
        ["Sprachfokus", game.languageFocus],
        ["Variation", game.variation],
      ].forEach(([label, value]) => {
        const paragraph = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = `${label}: `;
        paragraph.append(strong, value);
        item.append(paragraph);
      });

      return item;
    }),
  );
}

function renderConcept(concept) {
  const fragment = template.content.cloneNode(true);
  fragment.querySelector("h3").textContent = concept.title;
  fragment.querySelector(".concept-summary").textContent = concept.summary;
  appendList(fragment.querySelector(".learning-objectives"), concept.learningObjectives);
  appendList(fragment.querySelector(".materials"), concept.materials);
  renderTimeline(fragment.querySelector(".timeline"), concept.timeline);
  appendList(fragment.querySelector(".language-support"), concept.languageSupport);
  renderVocabulary(fragment.querySelector(".vocabulary"), concept.vocabulary);
  renderGames(fragment.querySelector(".games"), concept.games);
  fragment.querySelector(".differentiation").textContent = concept.differentiation;
  fragment.querySelector(".assessment").textContent = concept.assessment;

  conceptOutput.replaceChildren(fragment);
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.reportValidity()) {
    return;
  }

  const values = new FormData(form);
  const payload = Object.fromEntries(values.entries());
  payload.studentCount = payload.studentCount ? Number(payload.studentCount) : null;
  payload.durationMinutes = Number(payload.durationMinutes);

  generateButton.disabled = true;
  statusMessage.classList.remove("error");
  statusMessage.textContent = "Konzeption wird erstellt …";

  try {
    const response = await fetch("https://teach-concept-api.teachger.workers.dev/api/concept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body.error || "Die Konzeption konnte nicht erstellt werden.");
    }

    renderConcept(body.concept);
    statusMessage.textContent = "Konzeption erstellt.";
  } catch (error) {
    statusMessage.classList.add("error");
    statusMessage.textContent = error.message;
  } finally {
    generateButton.disabled = false;
  }
});

document.querySelector("#print-button").addEventListener("click", () => window.print());

document.querySelector("#pdf-button").addEventListener("click", () => {
  const { jsPDF } = window.jspdf ?? {};
  if (!jsPDF) {
    statusMessage.classList.add("error");
    statusMessage.textContent = "Der PDF-Download ist derzeit nicht verfügbar.";
    return;
  }

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 15;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const lineHeight = 6;
  let y = margin;

  conceptOutput.innerText.split("\n").forEach((paragraph) => {
    const lines = pdf.splitTextToSize(paragraph || " ", pageWidth - margin * 2);
    if (y + lines.length * lineHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(lines, margin, y);
    y += lines.length * lineHeight;
  });

  const title = conceptOutput.querySelector("h3")?.textContent || "konzeption-lerneinheit";
  const fileName = title
    .toLocaleLowerCase("de-DE")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  pdf.save(`${fileName || "konzeption-lerneinheit"}.pdf`);
});

document.querySelector("#copy-button").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(conceptOutput.innerText);
    statusMessage.classList.remove("error");
    statusMessage.textContent = "Konzeption wurde in die Zwischenablage kopiert.";
  } catch {
    statusMessage.classList.add("error");
    statusMessage.textContent = "Kopieren nicht möglich. Bitte markiere und kopiere den Text manuell.";
  }
});
