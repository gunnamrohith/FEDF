import { useEffect, useMemo, useRef, useState } from "react";
import {
  VALID_SECTIONS,
  LOGIN_STORAGE_KEY,
  THEME_STORAGE_KEY,
  demoReportText,
  measurementRules
} from "./modules/data";
import {
  normalizeText,
  extractMeasurements,
  buildMeasurementIssues,
  buildKeywordIssues,
  calculateScore
} from "./modules/analysis";
import {
  createOrder,
  listOrders,
  advanceOrderStatus,
  attachResultToOrder,
  addDoctorReview,
  getOrderById
} from "./modules/order";

const DEFAULT_CHART_TEXT = {
  risk: "Run analysis to view chart interpretation.",
  wellness: "Run analysis to view chart interpretation.",
  nutrition: "Run analysis to view chart interpretation."
};

function createInitialOrderForm() {
  return {
    patientName: "",
    patientId: "",
    priority: "routine",
    sampleDateTime: "",
    notes: "",
    tests: [],
    addressLabel: "Sample Collection Address",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    landmark: ""
  };
}

function getInitialSession() {
  const saved = safeStorageGet(LOGIN_STORAGE_KEY);

  if (!saved) {
    return null;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!parsed?.email || !parsed?.name) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

let chartJsPromise;
let fileModulePromise;

async function loadChartJs() {
  if (!chartJsPromise) {
    chartJsPromise = import("chart.js/auto");
  }

  return chartJsPromise;
}

async function loadFileModule() {
  if (!fileModulePromise) {
    fileModulePromise = import("./modules/file");
  }

  return fileModulePromise;
}

function getInitialSection() {
  const hashSection = window.location.hash.replace("#", "");
  return VALID_SECTIONS.has(hashSection) ? hashSection : "home";
}

function getInitialTheme() {
  const saved = safeStorageGet(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [activeSection, setActiveSectionState] = useState(getInitialSection);
  const [theme, setTheme] = useState(getInitialTheme);
  const [userSession, setUserSession] = useState(getInitialSession);
  const [loginForm, setLoginForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient"
  });
  const [hasStartedAnalysisFlow, setHasStartedAnalysisFlow] = useState(false);
  const [flowStep, setFlowStep] = useState("upload");
  const [status, setStatus] = useState("No file selected");
  const [analyzing, setAnalyzing] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [chartMeaning, setChartMeaning] = useState(DEFAULT_CHART_TEXT);

  const [orderForm, setOrderForm] = useState(createInitialOrderForm);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [reviewForm, setReviewForm] = useState({ reviewedBy: "", note: "" });
  const [ordersVersion, setOrdersVersion] = useState(0);

  const fileInputRef = useRef(null);
  const riskPieRef = useRef(null);
  const wellnessRadarRef = useRef(null);
  const nutritionBarRef = useRef(null);
  const chartInstancesRef = useRef({ risk: null, wellness: null, nutrition: null });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    safeStorageSet(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (userSession) {
      safeStorageSet(LOGIN_STORAGE_KEY, JSON.stringify(userSession));
      return;
    }

    safeStorageRemove(LOGIN_STORAGE_KEY);
  }, [userSession]);

  useEffect(() => {
    const onHashChange = () => {
      const section = window.location.hash.replace("#", "");
      if (VALID_SECTIONS.has(section)) {
        setActiveSectionState(section);
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    destroyCharts(chartInstancesRef);

    if (!lastAnalysis || !riskPieRef.current || !wellnessRadarRef.current || !nutritionBarRef.current) {
      setChartMeaning(DEFAULT_CHART_TEXT);
      return;
    }

    const isDark = theme === "dark";
    const textColor = isDark ? "#d3e2ef" : "#37516b";
    const gridColor = isDark ? "rgba(211, 226, 239, 0.22)" : "rgba(55, 81, 107, 0.15)";
    const tooltipBg = isDark ? "#142434" : "#ffffff";
    const tooltipBorder = isDark ? "#33506c" : "#bdd4e6";

    const renderCharts = async () => {
      const { default: Chart } = await loadChartJs();

      if (cancelled || !riskPieRef.current || !wellnessRadarRef.current || !nutritionBarRef.current) {
        return;
      }

      const { measurements, issues, score } = lastAnalysis;
      const normalCount = measurements.filter((item) => item.status === "normal").length;
      const abnormalCount = measurements.filter((item) => item.status !== "normal").length;
      const unknownCount = Math.max(0, issues.length - abnormalCount);
      const pieTotal = normalCount + abnormalCount + unknownCount;

      const pieLabels = pieTotal > 0 ? ["In Normal Range", "Need Attention", "Other Mentions"] : ["No Data Extracted"];
      const pieData = pieTotal > 0 ? [normalCount, abnormalCount, unknownCount] : [1];
      const pieColors = pieTotal > 0 ? ["#66aee0", "#e5b079", "#b4c8d8"] : ["#c8d6e3"];

      chartInstancesRef.current.risk = new Chart(riskPieRef.current, {
        type: "pie",
        data: {
          labels: pieLabels,
          datasets: [{ data: pieData, backgroundColor: pieColors }]
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { color: textColor } },
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

      chartInstancesRef.current.wellness = new Chart(wellnessRadarRef.current, {
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
            legend: { labels: { color: textColor } },
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
              ticks: { stepSize: 20, color: textColor },
              grid: { color: gridColor },
              angleLines: { color: gridColor },
              pointLabels: { color: textColor }
            }
          }
        }
      });

      const nutritionValues = computeNutritionPriorities(issues);

      chartInstancesRef.current.nutrition = new Chart(nutritionBarRef.current, {
        type: "bar",
        data: {
          labels: ["Fiber", "Protein", "Hydration", "Micronutrients", "Low Sugar"],
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
              ticks: { color: textColor },
              grid: { color: gridColor }
            },
            x: {
              ticks: { color: textColor },
              grid: { color: "transparent" }
            }
          },
          plugins: {
            legend: { display: false },
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

      setChartMeaning(buildChartMeaning({ normalCount, abnormalCount, unknownCount, areaScores, nutritionValues, score }));
    };

    renderCharts().catch(() => {
      if (!cancelled) {
        setChartMeaning(DEFAULT_CHART_TEXT);
      }
    });

    return () => destroyCharts(chartInstancesRef);
  }, [lastAnalysis, theme]);

  const measurements = lastAnalysis?.measurements ?? [];
  const issues = lastAnalysis?.issues ?? [];
  const score = lastAnalysis?.score ?? null;

  const abnormalCount = measurements.filter((m) => m.status !== "normal").length;
  const normalCount = measurements.filter((m) => m.status === "normal").length;

  const allOrders = useMemo(() => listOrders(), [ordersVersion]);
  const filteredOrders = useMemo(() => {
    if (historyFilter === "all") {
      return allOrders;
    }
    return allOrders.filter((order) => order.status === historyFilter);
  }, [allOrders, historyFilter]);

  const selectedOrder = useMemo(() => {
    if (!filteredOrders.length) {
      return null;
    }
    if (!selectedOrderId) {
      return filteredOrders[0];
    }
    return getOrderById(selectedOrderId) || filteredOrders[0];
  }, [filteredOrders, selectedOrderId, ordersVersion]);

  useEffect(() => {
    if (selectedOrder) {
      setSelectedOrderId(selectedOrder.id);
      setReviewForm({ reviewedBy: "", note: "" });
    }
  }, [selectedOrder?.id]);

  function setActiveSection(sectionName) {
    if (!VALID_SECTIONS.has(sectionName)) {
      return;
    }

    setActiveSectionState(sectionName);
    window.location.hash = sectionName;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startAnalysisFlow() {
    setHasStartedAnalysisFlow(true);
    setFlowStep("upload");
    setStatus("Choose a file and click Analyze Report.");
  }

  function handleAnalyzeAnother() {
    setActiveFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFlowStep("upload");
    setStatus("Choose a new file and click Analyze Report.");
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSelectedFile(file, fromDrop = false) {
    if (!file) {
      setActiveFile(null);
      setStatus("No file selected");
      return;
    }

    const { isSupportedFile } = await loadFileModule();

    if (!isSupportedFile(file)) {
      setActiveFile(null);
      setStatus("Unsupported file. Please use PDF, DOCX, or TXT.");
      return;
    }

    setActiveFile(file);
    setStatus(`${fromDrop ? "Dropped" : "Selected"}: ${file.name}`);
  }

  async function handleAnalyzeClick() {
    const file = activeFile || fileInputRef.current?.files?.[0];

    if (!file) {
      setStatus("Please choose a report file first.");
      return;
    }

    setAnalyzing(true);
    setStatus("Reading and analyzing report...");

    try {
      const { extractTextFromFile } = await loadFileModule();
      const extractedText = await extractTextFromFile(file);
      runAnalysis(extractedText, file.name);
      setStatus("Analysis complete.");
    } catch (error) {
      setStatus("Could not read this file. Use PDF, DOCX, or TXT.");
    } finally {
      setAnalyzing(false);
    }
  }

  function runAnalysis(rawText, sourceName = "Uploaded Report") {
    const normalizedText = normalizeText(rawText);
    const foundMeasurements = extractMeasurements(normalizedText);
    const measurementIssues = buildMeasurementIssues(foundMeasurements);
    const keywordIssues = buildKeywordIssues(normalizedText, measurementIssues);
    const allIssues = [...measurementIssues, ...keywordIssues];
    const computedScore = calculateScore(foundMeasurements, allIssues);

    setLastAnalysis({
      measurements: foundMeasurements,
      issues: allIssues,
      score: computedScore,
      sourceName,
      analyzedAt: new Date().toISOString()
    });

    setHasStartedAnalysisFlow(true);
    setFlowStep("results");
    setActiveSection("home");
    document.getElementById("resultsSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleDemoClick() {
    runAnalysis(demoReportText, "Demo Report");
    setStatus("Demo report analyzed.");
  }

  function refreshOrders() {
    setOrdersVersion((prev) => prev + 1);
  }

  function handleOrderSubmit(event) {
    event.preventDefault();

    if (!userSession) {
      setStatus("Sign in first to place an order.");
      setActiveSection("login");
      return;
    }

    if (!orderForm.tests.length) {
      setStatus("Select at least one test before placing an order.");
      return;
    }

    const missingFields = [];
    if (!orderForm.patientName.trim()) missingFields.push("patient name");
    if (!orderForm.patientId.trim()) missingFields.push("patient ID");
    if (!orderForm.sampleDateTime.trim()) missingFields.push("sample date/time");
    if (!orderForm.addressLine1.trim()) missingFields.push("address line 1");
    if (!orderForm.city.trim()) missingFields.push("city");
    if (!orderForm.state.trim()) missingFields.push("state");
    if (!orderForm.postalCode.trim()) missingFields.push("postal code");

    if (missingFields.length) {
      setStatus(`Please complete: ${missingFields.join(", ")}.`);
      return;
    }

    const createdOrder = createOrder({
      patientName: orderForm.patientName,
      patientId: orderForm.patientId,
      priority: orderForm.priority,
      scheduledAt: normalizeScheduledAt(orderForm.sampleDateTime),
      notes: orderForm.notes,
      address: {
        label: orderForm.addressLabel,
        line1: orderForm.addressLine1,
        line2: orderForm.addressLine2,
        city: orderForm.city,
        state: orderForm.state,
        postalCode: orderForm.postalCode,
        landmark: orderForm.landmark
      },
      tests: orderForm.tests
    });

    setStatus(`Order ${createdOrder.id} created successfully.`);
    setOrderForm(createInitialOrderForm());
    refreshOrders();
    setActiveSection("history");
  }

  function handleLoginSubmit(event) {
    event.preventDefault();

    if (!loginForm.name.trim() || !loginForm.email.trim() || !loginForm.password.trim()) {
      setStatus("Name, email, and password are required to sign in.");
      return;
    }

    setUserSession({
      name: loginForm.name.trim(),
      email: loginForm.email.trim(),
      role: loginForm.role,
      signedInAt: new Date().toISOString()
    });
    setLoginForm({ name: "", email: "", password: "", role: "patient" });
    setStatus(`Signed in as ${loginForm.email.trim()}.`);
    setActiveSection("order");
  }

  function handleLogout() {
    setUserSession(null);
    setStatus("Signed out successfully.");
    setActiveSection("login");
  }

  function toggleTestSelection(testId) {
    setOrderForm((prev) => {
      const tests = prev.tests.includes(testId) ? prev.tests.filter((id) => id !== testId) : [...prev.tests, testId];
      return { ...prev, tests };
    });
  }

  function handleAdvance(orderId) {
    try {
      advanceOrderStatus(orderId);
      setStatus(`Order ${orderId} moved to next status.`);
      refreshOrders();
    } catch {
      setStatus("Unable to advance order status.");
    }
  }

  function handleAttach(orderId) {
    if (!lastAnalysis) {
      setStatus("Analyze a report first, then attach result to an order.");
      return;
    }

    try {
      attachResultToOrder(orderId, lastAnalysis);
      setStatus(`Result attached to order ${orderId}.`);
      refreshOrders();
    } catch {
      setStatus("Could not attach result to this order.");
    }
  }

  function handleDoctorReviewSubmit(event) {
    event.preventDefault();

    if (!selectedOrder) {
      return;
    }

    if (!reviewForm.reviewedBy.trim() || !reviewForm.note.trim()) {
      setStatus("Doctor name and review note are required.");
      return;
    }

    try {
      addDoctorReview(selectedOrder.id, {
        reviewedBy: reviewForm.reviewedBy,
        note: reviewForm.note
      });
      setStatus(`Doctor review recorded for ${selectedOrder.id}.`);
      setReviewForm({ reviewedBy: "", note: "" });
      refreshOrders();
    } catch {
      setStatus("Doctor review could not be saved.");
    }
  }

  function handleDownloadSummary() {
    if (!lastAnalysis) {
      setStatus("Run analysis first, then download summary.");
      return;
    }

    const text = buildSummaryText(lastAnalysis);
    downloadTextFile("health-report-summary.txt", text);
  }

  function handleDownloadOrderSummary(orderId) {
    const order = getOrderById(orderId);
    if (!order || !order.result) {
      setStatus("This order does not have a result to export yet.");
      return;
    }

    const summaryData = {
      sourceName: `${order.id} - ${order.result.sourceName}`,
      analyzedAt: order.result.attachedAt,
      score: order.result.score ?? 0,
      measurements: order.result.measurements,
      issues: order.result.issues
    };

    const text = buildSummaryText(summaryData);
    downloadTextFile(`${order.id.toLowerCase()}-summary.txt`, text);
  }

  const summaryHeadline = lastAnalysis
    ? `${abnormalCount} markers need attention, ${normalCount} are in normal range.`
    : "Upload and analyze to see your health overview.";

  const summaryMeta = lastAnalysis
    ? `Source: ${lastAnalysis.sourceName} | Analyzed: ${new Date(lastAnalysis.analyzedAt).toLocaleString()}`
    : "No report analyzed yet.";

  return (
    <>
      <div className="background-shape shape-one"></div>
      <div className="background-shape shape-two"></div>

      <div className="layout">
        <header className="topbar">
          <div className="brand-wrap">
            <p className="brand-kicker">Clinical Intelligence</p>
            <h1 className="brand-title">Medical Report Analyzer</h1>
          </div>
          <nav className="quick-nav">
            {[
              ["home", "Home"],
              ["login", userSession ? "Account" : "Login"],
              ["catalogue", "Catalogue"],
              ["order", "Order Test"],
              ["history", "History"],
              ["about", "About"]
            ].map(([key, label]) => (
              <a
                key={key}
                href={`#${key}`}
                className={activeSection === key ? "active" : ""}
                aria-current={activeSection === key ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  setActiveSection(key);
                }}
              >
                {label}
              </a>
            ))}
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              aria-label="Toggle color theme"
            >
              {theme === "dark" ? "Light Theme" : "Dark Theme"}
            </button>
          </nav>
        </header>

        <main className="container py-3 py-md-4">
          <section className={`page-section ${activeSection === "home" ? "is-active" : ""}`} data-section="home">
            <section id="homeIntro" className={`hero ${hasStartedAnalysisFlow ? "hidden" : ""}`}>
              <p className="badge">Structured Lab-Agent Style Experience</p>
              <h2 className="hero-title">Simple, Calm, and Useful Report Understanding</h2>
              <p className="subtitle">
                Upload a medical report and get a balanced, patient-friendly summary with both normal findings and gentle
                improvement suggestions.
              </p>
              <div className="hero-actions d-flex flex-wrap gap-2">
                <button
                  id="startAnalysisBtn"
                  className="hero-link hero-link-primary btn btn-primary"
                  type="button"
                  onClick={() => {
                    startAnalysisFlow();
                    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Start Analysis
                </button>
                <a
                  className="hero-link hero-link-secondary btn btn-outline-secondary"
                  href="#about"
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveSection("about");
                  }}
                >
                  How It Works
                </a>
              </div>

              <div className="how-grid">
                <article className="how-item">
                  <span className="how-index">01</span>
                  <h3>Upload Report</h3>
                  <p>Add PDF, DOCX, or TXT lab reports safely.</p>
                </article>
                <article className="how-item">
                  <span className="how-index">02</span>
                  <h3>Analyze Values</h3>
                  <p>Ranges are compared and summarized in plain language.</p>
                </article>
                <article className="how-item">
                  <span className="how-index">03</span>
                  <h3>Follow Guidance</h3>
                  <p>Get practical food and lifestyle priorities.</p>
                </article>
              </div>
            </section>

            <section id="analysisFlow" className={hasStartedAnalysisFlow ? "" : "hidden"}>
              <section className="panel flow-stepper-wrap" aria-label="Analysis progress">
                <div className={`flow-step ${flowStep === "upload" || flowStep === "results" ? "is-complete" : ""}`}>
                  <span className="flow-dot">1</span>
                  <div>
                    <p className="flow-title">Start</p>
                    <p className="flow-note">Begin analysis journey</p>
                  </div>
                </div>
                <div className={`flow-step ${flowStep === "upload" ? "is-active" : ""} ${flowStep === "results" ? "is-complete" : ""}`}>
                  <span className="flow-dot">2</span>
                  <div>
                    <p className="flow-title">Upload</p>
                    <p className="flow-note">Choose report and run analyzer</p>
                  </div>
                </div>
                <div className={`flow-step ${flowStep === "results" ? "is-active" : ""}`}>
                  <span className="flow-dot">3</span>
                  <div>
                    <p className="flow-title">Results</p>
                    <p className="flow-note">View findings and recommendations</p>
                  </div>
                </div>
              </section>

              <section id="upload" className="panel upload-panel">
                <div className="upload-left">
                  <h2>Upload Medical Report</h2>
                  <p>Supported file types: PDF, DOCX, TXT</p>
                  <div
                    className="drop-zone"
                    role="button"
                    tabIndex={0}
                    aria-label="Upload medical report by drag and drop or file picker"
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.currentTarget.classList.add("is-dragover");
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      event.currentTarget.classList.remove("is-dragover");
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.currentTarget.classList.remove("is-dragover");
                      const droppedFile = event.dataTransfer?.files?.[0];
                      if (droppedFile) {
                        handleSelectedFile(droppedFile, true);
                      }
                    }}
                  >
                    <p className="drop-zone-title">Drop your report here</p>
                    <p className="drop-zone-subtitle">or click to choose a file</p>
                    <p className="drop-zone-types">PDF, DOCX, TXT</p>
                  </div>
                  <input
                    id="reportFile"
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(event) => handleSelectedFile(event.target.files?.[0])}
                  />
                  <div className="actions d-flex flex-wrap gap-2">
                    <button
                      id="analyzeBtn"
                      className="btn-primary btn btn-primary"
                      type="button"
                      onClick={handleAnalyzeClick}
                      disabled={analyzing}
                    >
                      {analyzing ? "Analyzing..." : "Analyze Report"}
                    </button>
                    <button
                      id="demoBtn"
                      className="btn-secondary btn btn-outline-secondary"
                      type="button"
                      onClick={handleDemoClick}
                      disabled={analyzing}
                    >
                      Try Demo Data
                    </button>
                  </div>
                  <p id="status" className="status">
                    {status}
                  </p>
                  <p className="privacy-note">
                    Your file is processed locally in this browser session for analysis preview.
                  </p>
                </div>

                <div className="upload-right">
                  <h3>Output Includes</h3>
                  <ul>
                    <li>Normal parameters shown clearly to avoid unnecessary panic.</li>
                    <li>Detected abnormal parameters with measured values.</li>
                    <li>Simple explanation and practical food guidance.</li>
                    <li>Easy analytics focused on overall wellness trends.</li>
                  </ul>
                  <p className="disclaimer">
                    For educational guidance only. Always confirm with qualified medical professionals.
                  </p>
                </div>
              </section>

              <section id="resultsSection" className={`results ${lastAnalysis ? "" : "hidden"}`}>
                <div className="panel summary-panel">
                  <div>
                    <p className="summary-kicker">Quick Summary</p>
                    <h3>{summaryHeadline}</h3>
                    <p className="summary-meta">{summaryMeta}</p>
                  </div>
                  <div className="summary-actions d-flex flex-wrap gap-2">
                    <button className="btn-secondary btn btn-outline-secondary" type="button" onClick={handleDownloadSummary}>
                      Download Summary
                    </button>
                    <button className="btn-primary btn btn-primary" type="button" onClick={handleAnalyzeAnother}>
                      Analyze Another Report
                    </button>
                  </div>
                </div>

                <div className="kpi-grid">
                  <article className="panel kpi-card">
                    <p className="kpi-kicker">Overall</p>
                    <h3>Wellness Score</h3>
                    <p className="score-value">{score == null ? "--" : `${score}/100`}</p>
                    <p className="score-label">{getScoreLabel(score)}</p>
                  </article>
                  <article className="panel kpi-card">
                    <p className="kpi-kicker">Watchlist</p>
                    <h3>Need Attention</h3>
                    <p className="kpi-value">{abnormalCount}</p>
                    <p className="kpi-note">Parameters slightly outside reference range.</p>
                  </article>
                  <article className="panel kpi-card">
                    <p className="kpi-kicker">Stable</p>
                    <h3>In Normal Range</h3>
                    <p className="kpi-value">{normalCount}</p>
                    <p className="kpi-note">Extracted parameters currently within range.</p>
                  </article>
                  <article className="panel kpi-card">
                    <p className="kpi-kicker">Coverage</p>
                    <h3>Analyzed Parameters</h3>
                    <p className="kpi-value">{measurements.length}</p>
                    <p className="kpi-note">Numerical markers successfully extracted.</p>
                  </article>
                </div>

                <div className="grid-two">
                  <div className="panel">
                    <h3>Health Notes</h3>
                    <div className="issues-list">
                      {issues.length ? (
                        issues.map((issue) => (
                          <article className="issue-item" key={`${issue.id}-${issue.name}`}>
                            <span className={`severity ${issue.severity}`}>{capitalize(issue.severity)} Severity</span>
                            <h4>{issue.name}</h4>
                            <p>{issue.improve}</p>
                          </article>
                        ))
                      ) : (
                        <p>Most extracted values are within normal range. Keep regular checkups.</p>
                      )}
                    </div>
                  </div>
                  <div className="panel">
                    <h3>Simple Food Guidance</h3>
                    <div className="recommendations">
                      {issues.length ? (
                        issues.map((issue) => (
                          <article className="recommendation-item" key={`rec-${issue.id}-${issue.name}`}>
                            <h4>{issue.name}</h4>
                            <p>Eat more: {issue.foods}</p>
                            <p>Reduce: {issue.avoid}</p>
                          </article>
                        ))
                      ) : (
                        <p>Maintain balanced meals, hydration, sleep, and regular movement.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="panel metrics-panel">
                  <h3>Extracted Lab Parameters</h3>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          <th>Measured</th>
                          <th>Range</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {measurements.length ? (
                          [...measurements]
                            .sort((a, b) => {
                              if (a.status === b.status) {
                                return a.name.localeCompare(b.name);
                              }
                              if (a.status === "normal") return -1;
                              if (b.status === "normal") return 1;
                              return a.name.localeCompare(b.name);
                            })
                            .map((measurement) => (
                              <tr key={measurement.id}>
                                <td>{measurement.name}</td>
                                <td>
                                  {measurement.value} {measurement.unit}
                                </td>
                                <td>{measurement.refRange}</td>
                                <td>
                                  <span className={`status-chip ${measurement.status}`}>{capitalize(measurement.status)}</span>
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={4}>No numerical lab parameters were extracted. Try a clearer report format.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid-charts">
                  <div className="panel chart-panel">
                    <h3>Normal vs Attention Areas</h3>
                    <p className="chart-note">Compares stable parameters against values needing follow-up.</p>
                    <canvas ref={riskPieRef}></canvas>
                    <p className="chart-meaning">{chartMeaning.risk}</p>
                  </div>
                  <div className="panel chart-panel">
                    <h3>Overall Wellness Overview</h3>
                    <p className="chart-note">Health index by key domains.</p>
                    <canvas ref={wellnessRadarRef}></canvas>
                    <p className="chart-meaning">{chartMeaning.wellness}</p>
                  </div>
                  <div className="panel chart-panel">
                    <h3>Nutrition Support Priorities</h3>
                    <p className="chart-note">Higher bars indicate stronger improvement focus.</p>
                    <canvas ref={nutritionBarRef}></canvas>
                    <p className="chart-meaning">{chartMeaning.nutrition}</p>
                  </div>
                </div>
              </section>
            </section>
          </section>

          <section className={`page-section ${activeSection === "login" ? "is-active" : ""}`} data-section="login">
            <section className="panel login-panel">
              <div className="login-copy">
                <p className="badge">Patient Access</p>
                <h2>Login Before Placing an Order</h2>
                <p>
                  Sign in to keep your orders tied to a patient account and make the sample collection address visible in
                  order history.
                </p>
                <div className="login-benefits">
                  <article>
                    <h3>Track Every Order</h3>
                    <p>See status, attached reports, review notes, and delivery location in one place.</p>
                  </article>
                  <article>
                    <h3>Use Saved Identity</h3>
                    <p>Once signed in, you can create lab requests without losing context during the session.</p>
                  </article>
                </div>
              </div>

              <div className="login-card">
                {userSession ? (
                  <div className="account-summary">
                    <p className="summary-kicker">Active Session</p>
                    <h3>{userSession.name}</h3>
                    <p className="history-meta">{userSession.email}</p>
                    <p className="history-meta">Role: {capitalizeLabel(userSession.role)}</p>
                    <p className="history-meta">Signed in: {formatDateTime(userSession.signedInAt)}</p>
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      <button type="button" className="btn btn-primary" onClick={() => setActiveSection("order")}>
                        Continue To Order
                      </button>
                      <button type="button" className="btn btn-outline-secondary" onClick={handleLogout}>
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <form className="login-form" onSubmit={handleLoginSubmit}>
                    <h3>Sign In</h3>
                    <label>
                      Full Name
                      <input
                        type="text"
                        value={loginForm.name}
                        onChange={(event) => setLoginForm((prev) => ({ ...prev, name: event.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Email Address
                      <input
                        type="email"
                        value={loginForm.email}
                        onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Password
                      <input
                        type="password"
                        value={loginForm.password}
                        onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Role
                      <select
                        value={loginForm.role}
                        onChange={(event) => setLoginForm((prev) => ({ ...prev, role: event.target.value }))}
                      >
                        <option value="patient">Patient</option>
                        <option value="doctor">Doctor</option>
                        <option value="lab_staff">Lab Staff</option>
                      </select>
                    </label>
                    <button type="submit" className="btn btn-primary">
                      Login
                    </button>
                  </form>
                )}
              </div>
            </section>
          </section>

          <section className={`page-section ${activeSection === "catalogue" ? "is-active" : ""}`} data-section="catalogue">
            <section className="panel about-panel">
              <div className="section-head">
                <h2>Lab Test Catalogue</h2>
                <p>Available tests with reference ranges used in your result interpretation.</p>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Test</th>
                      <th>Category</th>
                      <th>Reference Range</th>
                      <th>Severity Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurementRules.map((rule) => (
                      <tr key={rule.id}>
                        <td>{rule.name}</td>
                        <td>{capitalizeLabel(rule.category)}</td>
                        <td>{rule.refRange}</td>
                        <td>{capitalizeLabel(rule.severity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>

          <section className={`page-section ${activeSection === "order" ? "is-active" : ""}`} data-section="order">
            <section className="panel about-panel">
              <div className="section-head">
                <h2>Order Lab Test</h2>
                <p>Create a lab order with patient details and selected tests.</p>
              </div>

              <div className="order-context-card">
                <div>
                  <p className="summary-kicker">Ordering Account</p>
                  <h3>{userSession ? userSession.name : "Sign in required"}</h3>
                  <p className="history-meta">
                    {userSession ? `${userSession.email} | ${capitalizeLabel(userSession.role)}` : "Login first to place an order."}
                  </p>
                </div>
                {!userSession ? (
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setActiveSection("login")}>
                    Go To Login
                  </button>
                ) : null}
              </div>

              <form className="order-grid" onSubmit={handleOrderSubmit}>
                <label>
                  Patient Name
                  <input
                    type="text"
                    required
                    value={orderForm.patientName}
                    onChange={(event) => setOrderForm((prev) => ({ ...prev, patientName: event.target.value }))}
                  />
                </label>
                <label>
                  Patient ID
                  <input
                    type="text"
                    required
                    value={orderForm.patientId}
                    onChange={(event) => setOrderForm((prev) => ({ ...prev, patientId: event.target.value }))}
                  />
                </label>
                <label>
                  Priority
                  <select
                    value={orderForm.priority}
                    onChange={(event) => setOrderForm((prev) => ({ ...prev, priority: event.target.value }))}
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT</option>
                  </select>
                </label>
                <label>
                  Sample Date & Time
                  <input
                    type="datetime-local"
                    required
                    value={orderForm.sampleDateTime}
                    onChange={(event) => setOrderForm((prev) => ({ ...prev, sampleDateTime: event.target.value }))}
                  />
                </label>
                <label className="span-2">
                  Clinical Notes
                  <textarea
                    rows={3}
                    placeholder="Any special instructions"
                    value={orderForm.notes}
                    onChange={(event) => setOrderForm((prev) => ({ ...prev, notes: event.target.value }))}
                  ></textarea>
                </label>
                <fieldset className="span-2 test-select address-block">
                  <legend>Sample Collection Address</legend>
                  <div className="address-grid">
                    <label>
                      Address Label
                      <input
                        type="text"
                        value={orderForm.addressLabel}
                        onChange={(event) => setOrderForm((prev) => ({ ...prev, addressLabel: event.target.value }))}
                        placeholder="Home, Clinic, Office"
                      />
                    </label>
                    <label>
                      Landmark
                      <input
                        type="text"
                        value={orderForm.landmark}
                        onChange={(event) => setOrderForm((prev) => ({ ...prev, landmark: event.target.value }))}
                        placeholder="Near reception or gate number"
                      />
                    </label>
                    <label className="span-2">
                      Address Line 1
                      <input
                        type="text"
                        required
                        value={orderForm.addressLine1}
                        onChange={(event) => setOrderForm((prev) => ({ ...prev, addressLine1: event.target.value }))}
                        placeholder="Street, building, house number"
                      />
                    </label>
                    <label className="span-2">
                      Address Line 2
                      <input
                        type="text"
                        value={orderForm.addressLine2}
                        onChange={(event) => setOrderForm((prev) => ({ ...prev, addressLine2: event.target.value }))}
                        placeholder="Area, floor, apartment, optional"
                      />
                    </label>
                    <label>
                      City
                      <input
                        type="text"
                        required
                        value={orderForm.city}
                        onChange={(event) => setOrderForm((prev) => ({ ...prev, city: event.target.value }))}
                      />
                    </label>
                    <label>
                      State
                      <input
                        type="text"
                        required
                        value={orderForm.state}
                        onChange={(event) => setOrderForm((prev) => ({ ...prev, state: event.target.value }))}
                      />
                    </label>
                    <label>
                      Postal Code
                      <input
                        type="text"
                        required
                        value={orderForm.postalCode}
                        onChange={(event) => setOrderForm((prev) => ({ ...prev, postalCode: event.target.value }))}
                      />
                    </label>
                  </div>
                </fieldset>
                <fieldset className="span-2 test-select">
                  <legend>Select Tests</legend>
                  <div className="test-list">
                    {measurementRules.map((rule) => (
                      <label className="test-check-item" key={`test-${rule.id}`}>
                        <input
                          type="checkbox"
                          checked={orderForm.tests.includes(rule.id)}
                          onChange={() => toggleTestSelection(rule.id)}
                        />
                        <span>
                          <strong>{rule.name}</strong>
                          <small>{rule.refRange}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="span-2 d-flex flex-wrap gap-2">
                  <button type="submit" className="btn btn-primary">
                    Create Order
                  </button>
                  <a
                    href="#history"
                    className="btn btn-outline-secondary"
                    onClick={(event) => {
                      event.preventDefault();
                      setActiveSection("history");
                    }}
                  >
                    View Order History
                  </a>
                </div>
              </form>
              <p className="status">{status}</p>
            </section>
          </section>

          <section className={`page-section ${activeSection === "history" ? "is-active" : ""}`} data-section="history">
            <section className="panel about-panel">
              <div className="section-head history-head">
                <div>
                  <h2>Order History & Sample Tracking</h2>
                  <p>Track sample progress, attach results, and complete doctor review.</p>
                </div>
                <div className="history-filters">
                  <label htmlFor="historyFilter">Status</label>
                  <select
                    id="historyFilter"
                    value={historyFilter}
                    onChange={(event) => setHistoryFilter(event.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="ordered">Ordered</option>
                    <option value="sample_collected">Sample Collected</option>
                    <option value="processing">Processing</option>
                    <option value="result_ready">Result Ready</option>
                    <option value="reviewed">Reviewed</option>
                  </select>
                </div>
              </div>

              <div className="history-list">
                {filteredOrders.length ? (
                  filteredOrders.map((order) => (
                    <article className="history-card" key={order.id}>
                      <header>
                        <h4>
                          {order.id} · {order.patientName}
                        </h4>
                        <span className={`status-chip ${order.status}`}>{formatStatus(order.status)}</span>
                      </header>
                      <p className="history-meta">
                        Patient ID: {order.patientId} | Priority: {capitalizeLabel(order.priority)} | Tests: {order.tests.length}
                      </p>
                      <p className="history-meta">
                        Scheduled: {formatDateTime(order.scheduledAt)} | Created: {formatDateTime(order.createdAt)}
                      </p>
                      <p className="history-meta">
                        Address: {formatAddress(order.address)}
                      </p>
                      <div className="d-flex flex-wrap gap-2 mt-2">
                        <button
                          className="btn btn-outline-secondary"
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          Details
                        </button>
                        <button
                          className="btn btn-outline-secondary"
                          type="button"
                          onClick={() => handleAdvance(order.id)}
                          disabled={order.status === "reviewed"}
                        >
                          Advance Status
                        </button>
                        <button
                          className="btn btn-primary"
                          type="button"
                          onClick={() => handleAttach(order.id)}
                          disabled={!lastAnalysis}
                        >
                          Attach Current Result
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="status">No orders found for this filter.</p>
                )}
              </div>

              {selectedOrder ? (
                <article className="history-detail">
                  <h3>Order Detail</h3>
                  <p className="history-meta">
                    <strong>Order:</strong> {selectedOrder.id}
                  </p>
                  <p className="history-meta">
                    <strong>Current Status:</strong> {formatStatus(selectedOrder.status)}
                  </p>
                  <p className="history-meta">
                    <strong>Scheduled Sample:</strong> {formatDateTime(selectedOrder.scheduledAt)}
                  </p>
                  <p className="history-meta">
                    <strong>Collection Address:</strong> {formatAddress(selectedOrder.address)}
                  </p>

                  <h4>Tests</h4>
                  <ul>
                    {selectedOrder.tests.length ? (
                      selectedOrder.tests.map((testId) => {
                        const test = measurementRules.find((rule) => rule.id === testId);
                        return <li key={`det-${testId}`}>{test ? test.name : testId}</li>;
                      })
                    ) : (
                      <li>No tests selected</li>
                    )}
                  </ul>

                  <h4>Status Timeline</h4>
                  <ul>
                    {(selectedOrder.timeline || []).length ? (
                      selectedOrder.timeline.map((entry, index) => (
                        <li key={`timeline-${index}`}>
                          {formatStatus(entry.status)} · {formatDateTime(entry.at)}
                        </li>
                      ))
                    ) : (
                      <li>No timeline available</li>
                    )}
                  </ul>

                  {selectedOrder.result ? (
                    <div className="history-result">
                      <h4>Attached Result</h4>
                      <p>
                        Source: {selectedOrder.result.sourceName} | Score: {selectedOrder.result.score ?? "--"}/100
                      </p>
                      <p>
                        Abnormal: {selectedOrder.result.abnormalCount} / {selectedOrder.result.totalParameters}
                      </p>
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => handleDownloadOrderSummary(selectedOrder.id)}
                      >
                        Download Order Summary
                      </button>
                    </div>
                  ) : (
                    <p className="history-meta">No result attached yet. Analyze a report and use Attach Current Result.</p>
                  )}

                  {selectedOrder.doctorReview ? (
                    <div className="history-result">
                      <h4>Doctor Review</h4>
                      <p>Reviewed by: {selectedOrder.doctorReview.reviewedBy}</p>
                      <p>Time: {formatDateTime(selectedOrder.doctorReview.reviewedAt)}</p>
                      <p>Note: {selectedOrder.doctorReview.note}</p>
                    </div>
                  ) : (
                    <form className="review-form" onSubmit={handleDoctorReviewSubmit}>
                      <h4>Doctor Review</h4>
                      <label>
                        Reviewed By
                        <input
                          type="text"
                          required
                          value={reviewForm.reviewedBy}
                          onChange={(event) => setReviewForm((prev) => ({ ...prev, reviewedBy: event.target.value }))}
                        />
                      </label>
                      <label>
                        Review Note
                        <textarea
                          rows={3}
                          required
                          value={reviewForm.note}
                          onChange={(event) => setReviewForm((prev) => ({ ...prev, note: event.target.value }))}
                        ></textarea>
                      </label>
                      <button type="submit" className="btn btn-primary">
                        Save Review
                      </button>
                    </form>
                  )}
                </article>
              ) : null}
            </section>
          </section>

          <section className={`page-section ${activeSection === "about" ? "is-active" : ""}`} data-section="about">
            <section className="panel about-panel">
              <div>
                <h2>About This Website</h2>
                <p>
                  This website converts difficult lab report text into simple sections so patients can understand their normal
                  values, markers that need attention, and food support priorities.
                </p>
              </div>
              <div className="about-grid">
                <article className="about-card">
                  <h3>Patient Friendly</h3>
                  <p>Shows normal parameters clearly first and avoids alarming wording.</p>
                </article>
                <article className="about-card">
                  <h3>Data Based</h3>
                  <p>Extracts measured values and compares them against clinical ranges.</p>
                </article>
                <article className="about-card">
                  <h3>Action Oriented</h3>
                  <p>Provides simple lifestyle and food guidance for follow-up discussion.</p>
                </article>
              </div>
            </section>
          </section>
        </main>
      </div>
    </>
  );
}

function destroyCharts(chartInstancesRef) {
  Object.values(chartInstancesRef.current).forEach((chart) => {
    if (chart) {
      chart.destroy();
    }
  });
  chartInstancesRef.current = { risk: null, wellness: null, nutrition: null };
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

function buildChartMeaning({ normalCount, abnormalCount, unknownCount, areaScores, nutritionValues, score }) {
  const dominantState =
    abnormalCount > normalCount
      ? "More parameters need attention than those in normal range."
      : "Most extracted parameters are currently in normal range.";
  const mentionText = unknownCount ? ` ${unknownCount} additional keyword-based concerns were detected.` : "";

  const labels = ["Cardiac", "Metabolic", "Blood", "Nutrition", "Lifestyle"];
  const weakestIndex = areaScores.reduce((bestIdx, value, idx, values) => (value < values[bestIdx] ? idx : bestIdx), 0);

  const nutritionLabels = ["Fiber", "Protein", "Hydration", "Micronutrients", "Low Sugar"];
  const topNutritionIndex = nutritionValues.reduce((bestIdx, value, idx, values) =>
    value > values[bestIdx] ? idx : bestIdx
  , 0);

  return {
    risk: `${dominantState}${mentionText}`,
    wellness: `Overall score is ${score}/100. ${labels[weakestIndex]} is the lowest area and should be discussed first.`,
    nutrition: `${nutritionLabels[topNutritionIndex]} has the highest improvement priority from the detected findings.`
  };
}

function buildSummaryText(summaryData) {
  const abnormalMeasurements = (summaryData.measurements || []).filter((measurement) => measurement.status !== "normal");
  const normalMeasurements = (summaryData.measurements || []).filter((measurement) => measurement.status === "normal");
  const issues = summaryData.issues || [];

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
    ...(issues.length
      ? issues.map((issue, index) => `${index + 1}. ${issue.name} - ${issue.improve}`)
      : ["1. Most extracted values are currently within normal range."]),
    "",
    "Note: This summary is educational and does not replace clinical diagnosis."
  ].join("\n");
}

function getScoreLabel(score) {
  if (score == null) {
    return "Upload a report to begin analysis.";
  }
  if (score >= 88) {
    return "Overall profile looks strong. Continue your current healthy routine.";
  }
  if (score >= 76) {
    return "Mostly stable profile with a few areas to keep monitoring.";
  }
  if (score >= 66) {
    return "Some markers are outside ideal range. Small habit changes can help improve this.";
  }
  return "Several markers need follow-up, but this can be improved with guided medical advice and routine changes.";
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function normalizeScheduledAt(rawValue) {
  if (!rawValue) {
    return "";
  }
  const parsedTime = Date.parse(rawValue);
  if (!Number.isNaN(parsedTime)) {
    return new Date(parsedTime).toISOString();
  }
  return rawValue;
}

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors.
  }
}

function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
}

function capitalize(word) {
  return String(word).charAt(0).toUpperCase() + String(word).slice(1);
}

function capitalizeLabel(text) {
  return String(text || "")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatus(status) {
  const map = {
    ordered: "Ordered",
    sample_collected: "Sample Collected",
    processing: "Processing",
    result_ready: "Result Ready",
    reviewed: "Reviewed"
  };

  return map[status] || capitalizeLabel(String(status || "").replaceAll("_", " "));
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

function formatAddress(address) {
  if (!address) {
    return "No address added";
  }

  const parts = [
    address.label,
    address.line1,
    address.line2,
    address.landmark ? `Landmark: ${address.landmark}` : "",
    [address.city, address.state, address.postalCode].filter(Boolean).join(", ")
  ].filter(Boolean);

  return parts.length ? parts.join(" | ") : "No address added";
}
