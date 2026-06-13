const { THEME_STORAGE_KEY: uiThemeStorageKey, VALID_SECTIONS: uiValidSections } = window.AppData;


let riskPieChart;
let wellnessRadarChart;
let nutritionBarChart;
let hasStartedAnalysisFlow = false;
let currentAnalysis = null;
let elements = {};

function initUI(uiElements) {
  elements = uiElements;
  initializeSectionNavigation();
  initializeTheme();
}

function setCurrentAnalysis(summaryData) {
  currentAnalysis = summaryData;
}

function getActiveSection() {
  const activeSectionEl = document.querySelector(".page-section.is-active");
  if (!activeSectionEl) {
    return "home";
  }

  return activeSectionEl.dataset.section || "home";
}

function setActiveSection(sectionName, skipHashUpdate = false) {
  if (!uiValidSections.has(sectionName)) {
    return;
  }

  elements.pageSections.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.section === sectionName);
  });

  elements.topNavLinks.forEach((link) => {
    const isActive = link.dataset.view === sectionName;
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
      return;
    }

    link.removeAttribute("aria-current");
  });

  if (!skipHashUpdate) {
    window.location.hash = sectionName;
  }

  if (sectionName === "home") {
    updateHomeFlowUI();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startAnalysisFlow() {
  hasStartedAnalysisFlow = true;
  updateHomeFlowUI();
  updateFlowStep("upload");

  if (elements.statusEl) {
    elements.statusEl.textContent = "Choose a file and click Analyze Report.";
  }
}

function updateFlowStep(activeStep) {
  const stepMap = {
    intro: elements.flowStepIntroEl,
    upload: elements.flowStepUploadEl,
    results: elements.flowStepResultsEl
  };

  Object.entries(stepMap).forEach(([stepKey, stepEl]) => {
    if (!stepEl) {
      return;
    }

    stepEl.classList.remove("is-active", "is-complete");

    if (stepKey === activeStep) {
      stepEl.classList.add("is-active");
    }

    if (
      (activeStep === "upload" && stepKey === "intro") ||
      (activeStep === "results" && (stepKey === "intro" || stepKey === "upload"))
    ) {
      stepEl.classList.add("is-complete");
    }
  });
}

function setAnalyzing(isAnalyzing) {
  if (elements.analyzeBtn) {
    elements.analyzeBtn.disabled = isAnalyzing;
    elements.analyzeBtn.textContent = isAnalyzing ? "Analyzing..." : "Analyze Report";
  }

  if (elements.demoBtn) {
    elements.demoBtn.disabled = isAnalyzing;
  }
}

function renderSummary(summaryData) {
  if (!elements.summaryHeadlineEl || !elements.summaryMetaEl || !summaryData) {
    return;
  }

  const abnormalCount = summaryData.measurements.filter((measurement) => measurement.status !== "normal").length;
  const normalCount = summaryData.measurements.filter((measurement) => measurement.status === "normal").length;
  const analyzedAt = new Date(summaryData.analyzedAt);
  const dateText = Number.isNaN(analyzedAt.getTime()) ? "just now" : analyzedAt.toLocaleString();

  elements.summaryHeadlineEl.textContent = `${abnormalCount} markers need attention, ${normalCount} are in normal range.`;
  elements.summaryMetaEl.textContent = `Source: ${summaryData.sourceName} | Analyzed: ${dateText}`;
}

function buildSummaryText(summaryData) {
  const abnormalMeasurements = summaryData.measurements.filter((measurement) => measurement.status !== "normal");
  const normalMeasurements = summaryData.measurements.filter((measurement) => measurement.status === "normal");

  return [
    "Medical Report Summary",
    "======================",
    `Source: ${summaryData.sourceName}`,
    `Analyzed: ${new Date(summaryData.analyzedAt).toLocaleString()}`,
    `Wellness Score: ${summaryData.score}/100`,
    `Need Attention: ${abnormalMeasurements.length}`,
    `In Normal Range: ${normalMeasurements.length}`,
    "",
    "Top Findings:",
    ...(summaryData.issues.length
      ? summaryData.issues.map((issue, index) => `${index + 1}. ${issue.name} - ${issue.improve}`)
      : ["1. Most extracted values are currently within normal range."]),
    "",
    "Note: This summary is educational and does not replace clinical diagnosis."
  ].join("\n");
}

function renderScore(score) {
  elements.scoreValueEl.textContent = `${score}/100`;

  if (score >= 88) {
    elements.scoreLabelEl.textContent = "Overall profile looks strong. Continue your current healthy routine.";
    return;
  }

  if (score >= 76) {
    elements.scoreLabelEl.textContent = "Mostly stable profile with a few areas to keep monitoring.";
    return;
  }

  if (score >= 66) {
    elements.scoreLabelEl.textContent = "Some markers are outside ideal range. Small habit changes can help improve this.";
    return;
  }

  elements.scoreLabelEl.textContent = "Several markers need follow-up, but this can be improved with guided medical advice and routine changes.";
}

function renderKpis(measurements, issues) {
  const abnormalCount = measurements.filter((measurement) => measurement.status !== "normal").length;
  const normalCount = measurements.filter((measurement) => measurement.status === "normal").length;

  elements.abnormalCountEl.textContent = String(abnormalCount);
  elements.normalCountEl.textContent = String(normalCount);
  elements.parameterCountEl.textContent = String(measurements.length);

  if (!issues.length && measurements.length > 0) {
    elements.abnormalCountEl.textContent = "0";
  }
}

function renderIssues(issues) {
  elements.issuesListEl.innerHTML = "";

  if (!issues.length) {
    const emptyEl = document.createElement("p");
    emptyEl.textContent = "Most extracted values are within normal range. Keep regular checkups.";
    elements.issuesListEl.appendChild(emptyEl);
    return;
  }

  issues.forEach((issue) => {
    const issueEl = document.createElement("article");
    issueEl.className = "issue-item";

    const severityEl = document.createElement("span");
    severityEl.className = `severity ${issue.severity}`;
    severityEl.textContent = `${capitalize(issue.severity)} Severity`;

    const titleEl = document.createElement("h4");
    titleEl.textContent = issue.name;

    const improveEl = document.createElement("p");
    improveEl.textContent = issue.improve;

    issueEl.append(severityEl, titleEl, improveEl);
    elements.issuesListEl.appendChild(issueEl);
  });
}

function renderRecommendations(issues) {
  elements.recommendationsEl.innerHTML = "";

  if (!issues.length) {
    const emptyEl = document.createElement("p");
    emptyEl.textContent = "Maintain balanced meals, hydration, sleep, and regular movement.";
    elements.recommendationsEl.appendChild(emptyEl);
    return;
  }

  issues.forEach((issue) => {
    const recEl = document.createElement("article");
    recEl.className = "recommendation-item";

    const titleEl = document.createElement("h4");
    titleEl.textContent = issue.name;

    const eatEl = document.createElement("p");
    eatEl.textContent = `Eat more: ${issue.foods}`;

    const avoidEl = document.createElement("p");
    avoidEl.textContent = `Reduce: ${issue.avoid}`;

    recEl.append(titleEl, eatEl, avoidEl);
    elements.recommendationsEl.appendChild(recEl);
  });
}

function renderMeasurementTable(measurements) {
  elements.metricsTableBodyEl.innerHTML = "";

  if (!measurements.length) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="4">No numerical lab parameters were extracted. Try a clearer report format.</td>';
    elements.metricsTableBodyEl.appendChild(row);
    return;
  }

  const sortedMeasurements = [...measurements].sort((a, b) => {
    if (a.status === b.status) {
      return a.name.localeCompare(b.name);
    }

    if (a.status === "normal") {
      return -1;
    }

    if (b.status === "normal") {
      return 1;
    }

    return a.name.localeCompare(b.name);
  });

  sortedMeasurements.forEach((measurement) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${measurement.name}</td>
      <td>${measurement.value} ${measurement.unit}</td>
      <td>${measurement.refRange}</td>
      <td><span class="status-chip ${measurement.status}">${capitalize(measurement.status)}</span></td>
    `;

    elements.metricsTableBodyEl.appendChild(row);
  });
}

function renderCharts(measurements, issues, score) {
  const pieCtx = document.getElementById("riskPieChart");
  const radarCtx = document.getElementById("wellnessRadarChart");
  const barCtx = document.getElementById("nutritionBarChart");
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#d3e2ef" : "#37516b";
  const gridColor = isDark ? "rgba(211, 226, 239, 0.22)" : "rgba(55, 81, 107, 0.15)";
  const tooltipBg = isDark ? "#142434" : "#ffffff";
  const tooltipBorder = isDark ? "#33506c" : "#bdd4e6";

  destroyExistingCharts();

  const normalCount = measurements.filter((item) => item.status === "normal").length;
  const abnormalCount = measurements.filter((item) => item.status !== "normal").length;
  const unknownCount = Math.max(0, issues.length - abnormalCount);
  const pieTotal = normalCount + abnormalCount + unknownCount;
  const pieHasData = pieTotal > 0;
  const pieLabels = pieHasData ? ["In Normal Range", "Need Attention", "Other Mentions"] : ["No Data Extracted"];
  const pieData = pieHasData ? [normalCount, abnormalCount, unknownCount] : [1];
  const pieColors = pieHasData ? ["#66aee0", "#e5b079", "#b4c8d8"] : ["#c8d6e3"];

  riskPieChart = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: pieLabels,
      datasets: [
        {
          data: pieData,
          backgroundColor: pieColors
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: textColor
          }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          borderWidth: 1,
          titleColor: textColor,
          bodyColor: textColor,
          callbacks: {
            label(context) {
              const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
              const value = context.raw;
              const ratio = total ? Math.round((value / total) * 100) : 0;
              return `${context.label}: ${value} (${ratio}%)`;
            }
          }
        }
      }
    }
  });

  const areaScores = computeAreaScores(measurements, score);

  wellnessRadarChart = new Chart(radarCtx, {
    type: "radar",
    data: {
      labels: ["Cardiac", "Metabolic", "Blood", "Nutrition", "Lifestyle"],
      datasets: [
        {
          label: "Health Area Index",
          data: areaScores,
          backgroundColor: "rgba(61, 130, 175, 0.2)",
          borderColor: "#1f6db0",
          pointBackgroundColor: "#1f6db0"
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        },
        tooltip: {
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          borderWidth: 1,
          titleColor: textColor,
          bodyColor: textColor,
          callbacks: {
            label(context) {
              return `${context.label}: ${context.raw}/100`;
            }
          }
        }
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            color: textColor
          },
          grid: {
            color: gridColor
          },
          angleLines: {
            color: gridColor
          },
          pointLabels: {
            color: textColor
          }
        }
      }
    }
  });

  const nutritionFocus = ["Fiber", "Protein", "Hydration", "Micronutrients", "Low Sugar"];
  const nutritionValues = computeNutritionPriorities(issues);

  nutritionBarChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: nutritionFocus,
      datasets: [
        {
          label: "Priority",
          data: nutritionValues,
          borderRadius: 8,
          backgroundColor: ["#6ea8d4", "#71a69f", "#e8be7a", "#8cb27b", "#d3a689"]
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        },
        x: {
          ticks: {
            color: textColor
          },
          grid: {
            color: "transparent"
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          borderWidth: 1,
          titleColor: textColor,
          bodyColor: textColor,
          callbacks: {
            label(context) {
              return `Priority score: ${context.raw}/100`;
            }
          }
        }
      }
    }
  });

  renderChartMeanings({ normalCount, abnormalCount, unknownCount, areaScores, nutritionValues, score });
}

function initializeSectionNavigation() {
  elements.navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const sectionName = link.dataset.view;
      if (!uiValidSections.has(sectionName)) {
        return;
      }

      event.preventDefault();
      setActiveSection(sectionName);
    });
  });

  window.addEventListener("hashchange", () => {
    const hashSection = window.location.hash.replace("#", "");
    if (uiValidSections.has(hashSection)) {
      setActiveSection(hashSection, true);
    }
  });

  const initialSection = window.location.hash.replace("#", "");
  if (uiValidSections.has(initialSection)) {
    setActiveSection(initialSection, true);
    return;
  }

  setActiveSection("home", true);
}

function initializeTheme() {
  const savedTheme = safeStorageGet(uiThemeStorageKey);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (prefersDark ? "dark" : "light");

  applyTheme(theme);

  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  safeStorageSet(uiThemeStorageKey, theme);

  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.textContent = theme === "dark" ? "Light Theme" : "Dark Theme";
  }

  if (currentAnalysis) {
    renderCharts(currentAnalysis.measurements, currentAnalysis.issues, currentAnalysis.score);
  }
}

function updateHomeFlowUI() {
  if (!elements.homeIntroSection || !elements.analysisFlowSection) {
    return;
  }

  const showIntro = !hasStartedAnalysisFlow;
  elements.homeIntroSection.classList.toggle("hidden", !showIntro);
  elements.analysisFlowSection.classList.toggle("hidden", showIntro);
}

function renderChartMeanings({ normalCount, abnormalCount, unknownCount, areaScores, nutritionValues, score }) {
  if (elements.riskPieMeaningEl) {
    const dominantState =
      abnormalCount > normalCount
        ? "More parameters need attention than those in normal range."
        : "Most extracted parameters are currently in normal range.";
    const mentionText = unknownCount ? ` ${unknownCount} additional keyword-based concerns were detected.` : "";
    elements.riskPieMeaningEl.textContent = `${dominantState}${mentionText}`;
  }

  if (elements.wellnessRadarMeaningEl) {
    const labels = ["Cardiac", "Metabolic", "Blood", "Nutrition", "Lifestyle"];
    const weakestIndex = areaScores.reduce((bestIdx, value, idx, values) => (value < values[bestIdx] ? idx : bestIdx), 0);
    elements.wellnessRadarMeaningEl.textContent = `Overall score is ${score}/100. ${labels[weakestIndex]} is the lowest area and should be discussed first.`;
  }

  if (elements.nutritionBarMeaningEl) {
    const labels = ["Fiber", "Protein", "Hydration", "Micronutrients", "Low Sugar"];
    const topIndex = nutritionValues.reduce((bestIdx, value, idx, values) => (value > values[bestIdx] ? idx : bestIdx), 0);
    elements.nutritionBarMeaningEl.textContent = `${labels[topIndex]} has the highest improvement priority from the detected findings.`;
  }
}

function computeAreaScores(measurements, score) {
  const base = {
    cardio: score,
    metabolic: score,
    blood: score,
    nutrition: score,
    lifestyle: score
  };

  measurements.forEach((measurement) => {
    if (measurement.status === "normal") {
      return;
    }

    const deduction = measurement.severity === "high" ? 11 : measurement.severity === "moderate" ? 8 : 5;
    if (measurement.category in base) {
      base[measurement.category] = Math.max(58, base[measurement.category] - deduction);
    }
  });

  base.lifestyle = Math.max(60, score - (measurements.length < 3 ? 6 : 2));

  return [base.cardio, base.metabolic, base.blood, base.nutrition, base.lifestyle];
}

function computeNutritionPriorities(issues) {
  let fiber = 45;
  let protein = 42;
  let hydration = 40;
  let micronutrients = 38;
  let lowSugar = 44;

  issues.forEach((issue) => {
    const severityBoost = issue.severity === "high" ? 11 : issue.severity === "moderate" ? 8 : 5;

    if (/sugar|glucose|hba1c/i.test(issue.name)) {
      lowSugar += severityBoost;
      fiber += Math.round(severityBoost * 0.5);
    }

    if (/cholesterol|triglycerides|blood pressure/i.test(issue.name)) {
      fiber += severityBoost;
      hydration += Math.round(severityBoost * 0.45);
    }

    if (/hemoglobin|anemia|vitamin/i.test(issue.name)) {
      micronutrients += severityBoost;
      protein += Math.round(severityBoost * 0.4);
    }

    if (/uric acid/i.test(issue.name)) {
      hydration += severityBoost;
    }
  });

  return [fiber, protein, hydration, micronutrients, lowSugar].map((value) => Math.min(95, Math.max(15, value)));
}

function destroyExistingCharts() {
  if (riskPieChart) {
    riskPieChart.destroy();
  }

  if (wellnessRadarChart) {
    wellnessRadarChart.destroy();
  }

  if (nutritionBarChart) {
    nutritionBarChart.destroy();
  }
}

function capitalize(word) {
  return String(word).charAt(0).toUpperCase() + String(word).slice(1);
}

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage errors (private mode or blocked storage).
  }
}

window.AppUI = {
  initUI,
  setCurrentAnalysis,
  getActiveSection,
  setActiveSection,
  startAnalysisFlow,
  updateFlowStep,
  setAnalyzing,
  renderSummary,
  buildSummaryText,
  renderScore,
  renderKpis,
  renderIssues,
  renderRecommendations,
  renderMeasurementTable,
  renderCharts
};
