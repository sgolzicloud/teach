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

function exportFileName(extension) {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("-");

  return `Konzept_${timestamp}_${time}.${extension}`;
}

function createPdfExport() {
  const exportFrame = document.createElement("div");
  exportFrame.className = "pdf-export";

  const conceptCopy = conceptOutput.cloneNode(true);
  conceptCopy.removeAttribute("contenteditable");
  exportFrame.append(conceptCopy);
  document.body.append(exportFrame);

  return exportFrame;
}

function pdfBreakpoints(exportFrame, canvas) {
  const frameBounds = exportFrame.getBoundingClientRect();
  const canvasScale = canvas.width / frameBounds.width;
  const selector = "section, p, li, .timeline-item, .game-item";

  return [...new Set(
    Array.from(exportFrame.querySelectorAll(selector))
      .map((element) => Math.round((element.getBoundingClientRect().bottom - frameBounds.top) * canvasScale))
      .filter((position) => position > 0 && position < canvas.height),
  )].sort((first, second) => first - second);
}

function pageSliceHeight(sourceY, maximumHeight, breakpoints, canvasHeight) {
  const minimumHeight = Math.floor(maximumHeight * 0.65);
  const maximumY = Math.min(sourceY + maximumHeight, canvasHeight);
  const safeBreakpoint = breakpoints
    .filter((position) => position >= sourceY + minimumHeight && position <= maximumY)
    .pop();

  return (safeBreakpoint ?? maximumY) - sourceY;
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

document.querySelector("#pdf-button").addEventListener("click", async () => {
  const { jsPDF } = window.jspdf ?? {};
  if (!jsPDF || !window.html2canvas) {
    statusMessage.classList.add("error");
    statusMessage.textContent = "Der PDF-Download ist derzeit nicht verfügbar.";
    return;
  }

  const button = document.querySelector("#pdf-button");
  button.disabled = true;
  statusMessage.classList.remove("error");
  statusMessage.textContent = "PDF wird erstellt …";

  const exportFrame = createPdfExport();

  try {
    await document.fonts?.ready;
    const canvas = await window.html2canvas(exportFrame, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 15;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;
    const sourcePageHeight = Math.floor((printableHeight * canvas.width) / imageWidth);
    const breakpoints = pdfBreakpoints(exportFrame, canvas);

    for (let sourceY = 0; sourceY < canvas.height;) {
      const sliceHeight = pageSliceHeight(sourceY, sourcePageHeight, breakpoints, canvas.height);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      pageCanvas.getContext("2d").drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight,
      );

      if (sourceY > 0) {
        pdf.addPage();
      }
      pdf.addImage(
        pageCanvas.toDataURL("image/png"),
        "PNG",
        margin,
        margin,
        imageWidth,
        (sliceHeight * imageWidth) / canvas.width,
      );

      sourceY += sliceHeight;
    }

    pdf.save(exportFileName("pdf"));
    statusMessage.textContent = "PDF wurde heruntergeladen.";
  } catch {
    statusMessage.classList.add("error");
    statusMessage.textContent = "Die PDF-Datei konnte nicht erstellt werden.";
  } finally {
    exportFrame.remove();
    button.disabled = false;
  }
});

document.querySelector("#word-button").addEventListener("click", async () => {
  const docx = window.docx;
  if (!docx) {
    statusMessage.classList.add("error");
    statusMessage.textContent = "Der Word-Download ist derzeit nicht verfügbar.";
    return;
  }

  const textRuns = (element, options = {}) =>
    Array.from(element.childNodes)
      .filter((node) => node.textContent.trim())
      .map(
        (node) =>
          new docx.TextRun({
            text: node.textContent,
            bold: node.nodeType === Node.ELEMENT_NODE && node.tagName === "STRONG",
            ...options,
          }),
      );
  const textParagraph = (element, { runOptions = {}, ...options } = {}) =>
    new docx.Paragraph({
      children: textRuns(element, runOptions),
      spacing: { after: 120 },
      ...options,
    });
  const paragraphs = [
    new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: conceptOutput.querySelector("h3").textContent,
          bold: true,
          color: "4739AA",
          size: 36,
        }),
      ],
      spacing: { after: 180 },
    }),
    textParagraph(conceptOutput.querySelector(".concept-summary"), { runOptions: { italics: true } }),
  ];

  Array.from(conceptOutput.children)
    .filter((element) => element.tagName === "SECTION")
    .forEach((section) => {
      const heading = section.querySelector("h4");
      paragraphs.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: heading.textContent,
              bold: true,
              color: "4739AA",
              size: 26,
            }),
          ],
          spacing: { before: 260, after: 120 },
        }),
      );

      const list = section.querySelector("ul");
      if (list) {
        Array.from(list.children).forEach((item) => {
          paragraphs.push(textParagraph(item, { bullet: { level: 0 } }));
        });
      }

      const timeline = section.querySelector(".timeline");
      if (timeline) {
        Array.from(timeline.children).forEach((item) => {
          const time = item.querySelector(".timeline-time").textContent;
          const phase = item.querySelector("h5").textContent;
          paragraphs.push(
            new docx.Paragraph({
              children: [new docx.TextRun({ text: `${time} – ${phase}`, bold: true, color: "4739AA" })],
              shading: { fill: "FFF0D7" },
              spacing: { before: 100, after: 80 },
            }),
          );
          Array.from(item.querySelectorAll("p")).forEach((paragraph) => {
            paragraphs.push(textParagraph(paragraph));
          });
        });
      }

      const games = section.querySelector(".games");
      if (games) {
        Array.from(games.children).forEach((game) => {
          paragraphs.push(
            new docx.Paragraph({
              children: [new docx.TextRun({ text: game.querySelector("h5").textContent, bold: true, color: "9D5C08" })],
              shading: { fill: "FFF6E8" },
              spacing: { before: 100, after: 80 },
            }),
          );
          Array.from(game.querySelectorAll("p")).forEach((paragraph) => {
            paragraphs.push(textParagraph(paragraph));
          });
        });
      }

      Array.from(section.children)
        .filter((element) => element.tagName === "P")
        .forEach((paragraph) => paragraphs.push(textParagraph(paragraph)));
    });

  const wordDocument = new docx.Document({
    sections: [{ children: paragraphs }],
  });

  try {
    const blob = await docx.Packer.toBlob(wordDocument);
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = exportFileName("docx");
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
    statusMessage.classList.remove("error");
    statusMessage.textContent = "Word-Datei wurde heruntergeladen.";
  } catch {
    statusMessage.classList.add("error");
    statusMessage.textContent = "Die Word-Datei konnte nicht erstellt werden.";
  }
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
