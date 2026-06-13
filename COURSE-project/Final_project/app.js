// Debug block to check if all modules are loaded
console.log('AppData:', typeof window.AppData !== 'undefined');
console.log('AppAnalysis:', typeof window.AppAnalysis !== 'undefined');
console.log('AppUI:', typeof window.AppUI !== 'undefined');
console.log('AppFile:', typeof window.AppFile !== 'undefined');

const {
  buildKeywordIssues: analysisBuildKeywordIssues,
  buildMeasurementIssues: analysisBuildMeasurementIssues,
  calculateScore: analysisCalculateScore,
  extractMeasurements: analysisExtractMeasurements,
  normalizeText: analysisNormalizeText
} = window.AppAnalysis;
const {
  demoReportText: dataDemoReportText,
  measurementRules: dataMeasurementRules,
  VALID_SECTIONS: dataValidSections
} = window.AppData;
const {
  listOrders: orderListOrders,
  createOrder: orderCreateOrder,
  advanceOrderStatus: orderAdvanceOrderStatus,
  attachResultToOrder: orderAttachResultToOrder,
  addDoctorReview: orderAddDoctorReview,
  getOrderById: orderGetOrderById
} = window.AppOrder;
const {
  buildSummaryText: uiBuildSummaryText,
  getActiveSection: uiGetActiveSection,
  initUI: uiInit,
  renderCharts: uiRenderCharts,
  renderIssues: uiRenderIssues,
  renderKpis: uiRenderKpis,
  renderMeasurementTable: uiRenderMeasurementTable,
  renderRecommendations: uiRenderRecommendations,
  renderScore: uiRenderScore,
  renderSummary: uiRenderSummary,
  setActiveSection: uiSetActiveSection,
  setAnalyzing: uiSetAnalyzing,
  setCurrentAnalysis: uiSetCurrentAnalysis,
  startAnalysisFlow: uiStartAnalysisFlow,
  updateFlowStep: uiUpdateFlowStep
} = window.AppUI;
const { extractTextFromFile: fileExtractTextFromFile, isSupportedFile: fileIsSupportedFile } = window.AppFile;

const reportFileInput = document.getElementById("reportFile");
const dropZoneEl = document.getElementById("dropZone");
const analyzeBtn = document.getElementById("analyzeBtn");
const demoBtn = document.getElementById("demoBtn");
const statusEl = document.getElementById("status");

const resultsSection = document.getElementById("resultsSection");
const scoreValueEl = document.getElementById("scoreValue");
const scoreLabelEl = document.getElementById("scoreLabel");
const abnormalCountEl = document.getElementById("abnormalCount");
const normalCountEl = document.getElementById("normalCount");
const parameterCountEl = document.getElementById("parameterCount");
const issuesListEl = document.getElementById("issuesList");
const recommendationsEl = document.getElementById("recommendations");
const metricsTableBodyEl = document.getElementById("metricsTableBody");
const homeIntroSection = document.getElementById("homeIntro");
const analysisFlowSection = document.getElementById("analysisFlow");
const startAnalysisBtn = document.getElementById("startAnalysisBtn");
const downloadSummaryBtn = document.getElementById("downloadSummaryBtn");
const analyzeAnotherBtn = document.getElementById("analyzeAnotherBtn");
const summaryHeadlineEl = document.getElementById("summaryHeadline");
const summaryMetaEl = document.getElementById("summaryMeta");
const riskPieMeaningEl = document.getElementById("riskPieMeaning");
const wellnessRadarMeaningEl = document.getElementById("wellnessRadarMeaning");
const nutritionBarMeaningEl = document.getElementById("nutritionBarMeaning");
const flowStepIntroEl = document.getElementById("flowStepIntro");
const flowStepUploadEl = document.getElementById("flowStepUpload");
const flowStepResultsEl = document.getElementById("flowStepResults");
const navLinks = document.querySelectorAll("a[data-view]");
const topNavLinks = document.querySelectorAll(".quick-nav a[data-view]");
const pageSections = document.querySelectorAll(".page-section");
const themeToggleBtn = document.getElementById("themeToggle");
const catalogueTableBodyEl = document.getElementById("catalogueTableBody");
const orderFormEl = document.getElementById("orderForm");
const orderStatusEl = document.getElementById("orderStatus");
const testChecklistEl = document.getElementById("testChecklist");
const historyFilterEl = document.getElementById("historyFilter");
const historyListEl = document.getElementById("historyList");
const historyDetailEl = document.getElementById("historyDetail");
const historyDetailBodyEl = document.getElementById("historyDetailBody");

let lastAnalysis;
let activeFile = null;
let selectedOrderId = null;

uiInit({
  analyzeBtn,
  demoBtn,
  statusEl,
  scoreValueEl,
  scoreLabelEl,
  abnormalCountEl,
  normalCountEl,
  parameterCountEl,
  issuesListEl,
  recommendationsEl,
  metricsTableBodyEl,
  homeIntroSection,
  analysisFlowSection,
  summaryHeadlineEl,
  summaryMetaEl,
  riskPieMeaningEl,
  wellnessRadarMeaningEl,
  nutritionBarMeaningEl,
  flowStepIntroEl,
  flowStepUploadEl,
  flowStepResultsEl,
  navLinks,
  topNavLinks,
  pageSections,
  themeToggleBtn
});

initializeLabOrderPortal();

if (startAnalysisBtn) {
  startAnalysisBtn.addEventListener("click", () => {
    uiStartAnalysisFlow();
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

if (analyzeAnotherBtn) {
  analyzeAnotherBtn.addEventListener("click", () => {
    activeFile = null;

    if (reportFileInput) {
      reportFileInput.value = "";
    }

    resultsSection.classList.add("hidden");
    uiUpdateFlowStep("upload");
    statusEl.textContent = "Choose a new file and click Analyze Report.";
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

if (downloadSummaryBtn) {
  downloadSummaryBtn.addEventListener("click", () => {
    if (!lastAnalysis) {
      statusEl.textContent = "Run analysis first, then download summary.";
      return;
    }

    const summaryText = uiBuildSummaryText(lastAnalysis);
    const blob = new Blob([summaryText], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "health-report-summary.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  });
}

reportFileInput.addEventListener("change", () => {
  if (reportFileInput.files.length) {
    setSelectedFile(reportFileInput.files[0]);
    return;
  }

  activeFile = null;
  statusEl.textContent = "No file selected";
});

if (dropZoneEl) {
  dropZoneEl.addEventListener("click", () => {
    reportFileInput?.click();
  });

  dropZoneEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      reportFileInput?.click();
    }
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZoneEl.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropZoneEl.classList.add("is-dragover");
    });
  });

  ["dragleave", "dragend"].forEach((eventName) => {
    dropZoneEl.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropZoneEl.classList.remove("is-dragover");
    });
  });

  dropZoneEl.addEventListener("drop", (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropZoneEl.classList.remove("is-dragover");

    const droppedFile = event.dataTransfer?.files?.[0];
    if (!droppedFile) {
      return;
    }

    if (!isSupportedFile(droppedFile)) {
      statusEl.textContent = "Unsupported file. Please use PDF, DOCX, or TXT.";
      return;
    }

    setSelectedFile(droppedFile, true);
  });
}

analyzeBtn.addEventListener("click", async () => {
  const file = activeFile || reportFileInput.files[0];

  if (!file) {
    statusEl.textContent = "Please choose a report file first.";
    return;
  }

  uiSetAnalyzing(true);
  statusEl.textContent = "Reading and analyzing report...";

  try {
    const extractedText = await fileExtractTextFromFile(file);
    runAnalysis(extractedText, file.name);
    statusEl.textContent = "Analysis complete.";
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Could not read this file. Use PDF, DOCX, or TXT.";
  } finally {
    uiSetAnalyzing(false);
  }
});

demoBtn.addEventListener("click", () => {
  runAnalysis(dataDemoReportText, "Demo Report");
  statusEl.textContent = "Demo report analyzed.";
});

function runAnalysis(rawText, sourceName = "Uploaded Report") {
  const normalizedText = analysisNormalizeText(rawText);
  const measurements = analysisExtractMeasurements(normalizedText);
  const measurementIssues = analysisBuildMeasurementIssues(measurements);
  const keywordIssues = analysisBuildKeywordIssues(normalizedText, measurementIssues);
  const allIssues = [...measurementIssues, ...keywordIssues];

  const score = analysisCalculateScore(measurements, allIssues);
  lastAnalysis = { measurements, issues: allIssues, score, sourceName, analyzedAt: new Date().toISOString() };
  uiSetCurrentAnalysis(lastAnalysis);

  if (uiGetActiveSection() !== "home") {
    uiSetActiveSection("home");
  }

  uiStartAnalysisFlow();
  uiUpdateFlowStep("results");

  uiRenderScore(score);
  uiRenderKpis(measurements, allIssues);
  uiRenderSummary(lastAnalysis);
  uiRenderIssues(allIssues);
  uiRenderRecommendations(allIssues);
  uiRenderMeasurementTable(measurements);
  uiRenderCharts(measurements, allIssues, score);

  resultsSection.classList.remove("hidden");
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

  if (historyListEl && historyListEl.children.length) {
    renderOrderHistory();
  }
}

function setSelectedFile(file, fromDrop = false) {
  if (!isSupportedFile(file)) {
    activeFile = null;
    statusEl.textContent = "Unsupported file. Please use PDF, DOCX, or TXT.";
    return;
  }

  activeFile = file;
  statusEl.textContent = `${fromDrop ? "Dropped" : "Selected"}: ${file.name}`;
}

function isSupportedFile(file) {
  return fileIsSupportedFile(file);
}

function initializeLabOrderPortal() {
  renderTestCatalogue();
  renderTestChecklist();
  bindOrderForm();
  bindHistoryActions();
  renderOrderHistory();
}

function renderTestCatalogue() {
  if (!catalogueTableBodyEl) {
    return;
  }

  catalogueTableBodyEl.innerHTML = "";
  dataMeasurementRules.forEach((rule) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${rule.name}</td>
      <td>${capitalizeLabel(rule.category)}</td>
      <td>${rule.refRange}</td>
      <td>${capitalizeLabel(rule.severity)}</td>
    `;
    catalogueTableBodyEl.appendChild(row);
  });
}

function renderTestChecklist() {
  if (!testChecklistEl) {
    return;
  }

  testChecklistEl.innerHTML = "";
  dataMeasurementRules.forEach((rule) => {
    const item = document.createElement("label");
    item.className = "test-check-item";
    item.innerHTML = `
      <input type="checkbox" name="testSelection" value="${rule.id}" />
      <span>
        <strong>${rule.name}</strong>
        <small>${rule.refRange}</small>
      </span>
    `;
    testChecklistEl.appendChild(item);
  });
}

function bindOrderForm() {
  if (!orderFormEl) {
    return;
  }

  orderFormEl.addEventListener("submit", (event) => {
    event.preventDefault();

    const selectedTests = Array.from(orderFormEl.querySelectorAll('input[name="testSelection"]:checked')).map(
      (input) => input.value
    );

    if (!selectedTests.length) {
      orderStatusEl.textContent = "Select at least one test before placing an order.";
      return;
    }

    const patientName = document.getElementById("patientName")?.value.trim() || "";
    const patientId = document.getElementById("patientId")?.value.trim() || "";
    const priority = document.getElementById("orderPriority")?.value || "routine";
    const sampleDateInput = document.getElementById("sampleDateTime");
    const scheduledAtRaw = sampleDateInput?.value?.trim() || "";
    const scheduledAt = normalizeScheduledAt(scheduledAtRaw, sampleDateInput?.valueAsNumber);
    const notes = document.getElementById("orderNotes")?.value || "";

    const missingFields = [];
    if (!patientName) {
      missingFields.push("patient name");
    }

    if (!patientId) {
      missingFields.push("patient ID");
    }

    if (!scheduledAtRaw) {
      missingFields.push("sample date/time");
    }

    if (missingFields.length) {
      orderStatusEl.textContent = `Please complete: ${missingFields.join(", ")}.`;
      return;
    }

    const createdOrder = orderCreateOrder({
      patientName,
      patientId,
      priority,
      scheduledAt,
      notes,
      tests: selectedTests
    });

    orderStatusEl.textContent = `Order ${createdOrder.id} created successfully.`;
    orderFormEl.reset();
    renderOrderHistory();

    if (dataValidSections.has("history")) {
      uiSetActiveSection("history");
    }
  });
}

function normalizeScheduledAt(rawValue, valueAsNumber) {
  if (!rawValue) {
    return "";
  }

  if (typeof valueAsNumber === "number" && Number.isFinite(valueAsNumber)) {
    return new Date(valueAsNumber).toISOString();
  }

  const parsedTime = Date.parse(rawValue);
  if (!Number.isNaN(parsedTime)) {
    return new Date(parsedTime).toISOString();
  }

  return rawValue;
}

function bindHistoryActions() {
  if (historyFilterEl) {
    historyFilterEl.addEventListener("change", () => {
      renderOrderHistory();
    });
  }

  if (historyListEl) {
    historyListEl.addEventListener("click", (event) => {
      const actionButton = event.target.closest("button[data-action]");
      if (!actionButton) {
        return;
      }

      const orderId = actionButton.dataset.orderId;
      const action = actionButton.dataset.action;

      if (!orderId || !action) {
        return;
      }

      if (action === "view") {
        selectedOrderId = orderId;
        renderOrderHistory();
        return;
      }

      if (action === "advance") {
        try {
          orderAdvanceOrderStatus(orderId);
        } catch (error) {
          orderStatusEl.textContent = "Unable to advance order status.";
        }
        renderOrderHistory();
        return;
      }

      if (action === "attach") {
        if (!lastAnalysis) {
          orderStatusEl.textContent = "Analyze a report first, then attach result to an order.";
          return;
        }

        try {
          orderAttachResultToOrder(orderId, lastAnalysis);
          orderStatusEl.textContent = `Result attached to order ${orderId}.`;
        } catch (error) {
          orderStatusEl.textContent = "Could not attach result to this order.";
        }
        renderOrderHistory();
      }
    });
  }

  if (historyDetailBodyEl) {
    historyDetailBodyEl.addEventListener("submit", (event) => {
      const reviewForm = event.target.closest("form[data-review-form]");
      if (!reviewForm) {
        return;
      }

      event.preventDefault();
      const orderId = reviewForm.dataset.orderId;
      const reviewedBy = reviewForm.querySelector("input[name='reviewedBy']")?.value.trim() || "";
      const note = reviewForm.querySelector("textarea[name='reviewNote']")?.value.trim() || "";

      if (!orderId || !reviewedBy || !note) {
        orderStatusEl.textContent = "Doctor name and review note are required.";
        return;
      }

      try {
        orderAddDoctorReview(orderId, { reviewedBy, note });
        orderStatusEl.textContent = `Doctor review recorded for ${orderId}.`;
      } catch (error) {
        orderStatusEl.textContent = "Doctor review could not be saved.";
      }

      selectedOrderId = orderId;
      renderOrderHistory();
    });

    historyDetailBodyEl.addEventListener("click", (event) => {
      const downloadBtn = event.target.closest("button[data-download-order]");
      if (!downloadBtn) {
        return;
      }

      const orderId = downloadBtn.dataset.downloadOrder;
      if (!orderId) {
        return;
      }

      downloadOrderSummary(orderId);
    });
  }
}

function renderOrderHistory() {
  if (!historyListEl) {
    return;
  }

  const filterValue = historyFilterEl?.value || "all";
  const allOrders = orderListOrders();
  const filteredOrders =
    filterValue === "all" ? allOrders : allOrders.filter((order) => order.status === filterValue);

  historyListEl.innerHTML = "";

  if (!filteredOrders.length) {
    historyListEl.innerHTML = '<p class="status">No orders found for this filter.</p>';
    if (historyDetailEl) {
      historyDetailEl.classList.add("hidden");
    }
    return;
  }

  filteredOrders.forEach((order) => {
    const card = document.createElement("article");
    card.className = "history-card";
    card.innerHTML = `
      <header>
        <h4>${order.id} · ${order.patientName}</h4>
        <span class="status-chip ${order.status}">${formatStatus(order.status)}</span>
      </header>
      <p class="history-meta">Patient ID: ${order.patientId} | Priority: ${capitalizeLabel(order.priority)} | Tests: ${
      order.tests.length
    }</p>
      <p class="history-meta">Scheduled: ${formatDateTime(order.scheduledAt)} | Created: ${formatDateTime(order.createdAt)}</p>
      <div class="d-flex flex-wrap gap-2 mt-2">
        <button class="btn btn-outline-secondary" data-action="view" data-order-id="${order.id}" type="button">Details</button>
        <button class="btn btn-outline-secondary" data-action="advance" data-order-id="${order.id}" type="button" ${
      order.status === "reviewed" ? "disabled" : ""
    }>Advance Status</button>
        <button class="btn btn-primary" data-action="attach" data-order-id="${order.id}" type="button" ${
      lastAnalysis ? "" : "disabled"
    }>Attach Current Result</button>
      </div>
    `;

    historyListEl.appendChild(card);
  });

  const targetOrder = selectedOrderId ? orderGetOrderById(selectedOrderId) : filteredOrders[0];
  if (!targetOrder) {
    if (historyDetailEl) {
      historyDetailEl.classList.add("hidden");
    }
    return;
  }

  selectedOrderId = targetOrder.id;
  renderOrderDetail(targetOrder);
}

function renderOrderDetail(order) {
  if (!historyDetailEl || !historyDetailBodyEl) {
    return;
  }

  const testsHtml = order.tests
    .map((testId) => {
      const match = dataMeasurementRules.find((rule) => rule.id === testId);
      return `<li>${match ? match.name : testId}</li>`;
    })
    .join("");

  const timelineHtml = (order.timeline || [])
    .map((entry) => `<li>${formatStatus(entry.status)} · ${formatDateTime(entry.at)}</li>`)
    .join("");

  const resultBlock = order.result
    ? `<div class="history-result">
        <h4>Attached Result</h4>
        <p>Source: ${order.result.sourceName} | Score: ${order.result.score ?? "--"}/100</p>
        <p>Abnormal: ${order.result.abnormalCount} / ${order.result.totalParameters}</p>
        <button class="btn btn-outline-secondary" type="button" data-download-order="${order.id}">Download Order Summary</button>
      </div>`
    : '<p class="history-meta">No result attached yet. Analyze a report and use "Attach Current Result".</p>';

  const reviewBlock = order.doctorReview
    ? `<div class="history-result">
        <h4>Doctor Review</h4>
        <p>Reviewed by: ${order.doctorReview.reviewedBy}</p>
        <p>Time: ${formatDateTime(order.doctorReview.reviewedAt)}</p>
        <p>Note: ${order.doctorReview.note}</p>
      </div>`
    : `<form data-review-form data-order-id="${order.id}" class="review-form">
        <h4>Doctor Review</h4>
        <label>
          Reviewed By
          <input type="text" name="reviewedBy" required />
        </label>
        <label>
          Review Note
          <textarea name="reviewNote" rows="3" required></textarea>
        </label>
        <button type="submit" class="btn btn-primary">Save Review</button>
      </form>`;

  historyDetailBodyEl.innerHTML = `
    <p class="history-meta"><strong>Order:</strong> ${order.id}</p>
    <p class="history-meta"><strong>Current Status:</strong> ${formatStatus(order.status)}</p>
    <p class="history-meta"><strong>Scheduled Sample:</strong> ${formatDateTime(order.scheduledAt)}</p>
    <h4>Tests</h4>
    <ul>${testsHtml || "<li>No tests selected</li>"}</ul>
    <h4>Status Timeline</h4>
    <ul>${timelineHtml || "<li>No timeline available</li>"}</ul>
    ${resultBlock}
    ${reviewBlock}
  `;

  historyDetailEl.classList.remove("hidden");
}

function downloadOrderSummary(orderId) {
  const order = orderGetOrderById(orderId);
  if (!order || !order.result) {
    orderStatusEl.textContent = "This order does not have a result to export yet.";
    return;
  }

  const summaryData = {
    sourceName: `${order.id} - ${order.result.sourceName}`,
    analyzedAt: order.result.attachedAt,
    score: order.result.score ?? 0,
    measurements: order.result.measurements,
    issues: order.result.issues
  };

  const summaryText = uiBuildSummaryText(summaryData);
  const blob = new Blob([summaryText], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${order.id.toLowerCase()}-summary.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function formatStatus(status) {
  const map = {
    ordered: "Ordered",
    sample_collected: "Sample Collected",
    processing: "Processing",
    result_ready: "Result Ready",
    reviewed: "Reviewed"
  };

  return map[status] || capitalizeLabel(status.replaceAll("_", " "));
}

function formatDateTime(value) {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function capitalizeLabel(text) {
  return String(text || "")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
