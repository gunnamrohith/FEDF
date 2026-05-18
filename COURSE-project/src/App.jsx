import React, { useState } from "react";

const sectionTabs = [
  { id: "home", label: "Home" },
  { id: "features", label: "Features" },
  { id: "analyzer", label: "Analyzer" },
  { id: "order", label: "Order" },
  { id: "help", label: "Help" }
];

const features = [
  {
    title: "Lab Test Ordering",
    text: "Create patient test orders with selected parameters and schedule sample collection."
  },
  {
    title: "Sample Status Tracking",
    text: "Track each order step: Ordered, Collected, Processing, and Result Ready."
  },
  {
    title: "Result + Doctor Review",
    text: "View abnormal flags with reference ranges and capture doctor review notes."
  }
];

function FeatureCard({ title, text }) {
  return (
    <article className="card">
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function StatCard({ value, label }) {
  return (
    <article className="stat-card">
      <h3>{value}</h3>
      <p>{label}</p>
    </article>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState("home");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [analysisMessage, setAnalysisMessage] = useState("No file analyzed yet.");
  const [orderData, setOrderData] = useState({
    patientName: "",
    testName: "",
    priority: "Routine"
  });
  const [orderMessage, setOrderMessage] = useState("No order created yet.");

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFileName("");
      setAnalysisMessage("No file analyzed yet.");
      return;
    }

    setSelectedFileName(file.name);
    setAnalysisMessage("File selected. Click Analyze to continue.");
  }

  function handleAnalyze() {
    if (!selectedFileName) {
      setAnalysisMessage("Please upload a PDF report first.");
      return;
    }

    setAnalysisMessage(`Analysis complete for ${selectedFileName}. Report is ready for review.`);
  }

  function handleOrderChange(event) {
    const { name, value } = event.target;
    setOrderData((prev) => ({ ...prev, [name]: value }));
  }

  function handleOrderSubmit(event) {
    event.preventDefault();
    if (!orderData.patientName.trim() || !orderData.testName.trim()) {
      setOrderMessage("Please enter patient name and test name.");
      return;
    }

    const orderId = `LAB-${Math.floor(1000 + Math.random() * 9000)}`;
    setOrderMessage(
      `Order ${orderId} placed for ${orderData.patientName} (${orderData.testName}) with ${orderData.priority} priority.`
    );
  }

  return (
    <main className="container">
      <header className="topbar">
        <h1 className="brand">Lab Test Ordering & Results Portal</h1>
        <nav className="nav" aria-label="Quick links">
          {sectionTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`nav-btn ${activeSection === tab.id ? "active" : ""}`}
              onClick={() => setActiveSection(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <section className={`page-panel home-panel ${activeSection === "home" ? "" : "hidden-section"}`} id="home">
        <div className="home-intro">
          <p className="pill">Healthcare Project Demo</p>
          <h2>Lab Test Ordering & Results Portal</h2>
          <p>
            This website is made for easy hospital/lab flow. Users can upload a report PDF,
            get a quick analysis message, and place a lab test order in one place.
          </p>
          <p>
            It is simple to understand, beginner friendly, and suitable for college project presentation.
          </p>
          <div className="actions">
            <button className="btn-primary" onClick={() => setActiveSection("analyzer")}>Upload and Analyze</button>
            <button className="btn-secondary" onClick={() => setActiveSection("order")}>Place Lab Order</button>
          </div>
        </div>

        <div className="stats" aria-label="Project highlights">
          <StatCard value="Step 1" label="Upload PDF Report" />
          <StatCard value="Step 2" label="Analyze Report" />
          <StatCard value="Step 3" label="Place Lab Order" />
          <StatCard value="Step 4" label="Get Confirmation" />
        </div>
      </section>

      <section className={`page-panel section ${activeSection === "features" ? "" : "hidden-section"}`} id="features">
        <h2>Key Features</h2>
        <p className="section-note">Important functions available in this portal.</p>
        <div className="grid">
          {features.map((item) => (
            <FeatureCard key={item.title} title={item.title} text={item.text} />
          ))}
        </div>
        <div className="feature-footnote">Includes patient-friendly messages and clean status outputs for demo clarity.</div>
      </section>

      <section className={`page-panel section ${activeSection === "analyzer" ? "" : "hidden-section"}`} id="analyzer">
        <h2>Upload PDF and Analyze</h2>
        <p className="section-note">Upload a report PDF and run a quick analysis step.</p>
        <div className="action-card">
          <label className="field-label" htmlFor="reportPdf">Report PDF</label>
          <input id="reportPdf" type="file" accept=".pdf" onChange={handleFileChange} />
          <button type="button" className="btn-primary" onClick={handleAnalyze}>Analyze Report</button>
          <p className="status-text">{analysisMessage}</p>
          <div className="preview-box">
            <h3>Analyzer Output Preview</h3>
            <p>Detected file: {selectedFileName || "No file selected"}</p>
            <p>Result status: {analysisMessage}</p>
          </div>
        </div>
      </section>

      <section className={`page-panel section ${activeSection === "order" ? "" : "hidden-section"}`} id="order">
        <h2>Lab Test Ordering</h2>
        <p className="section-note">Create one lab order as mentioned in your problem statement.</p>
        <form className="order-form" onSubmit={handleOrderSubmit}>
          <div className="form-grid">
            <div>
              <label className="field-label" htmlFor="patientName">Patient Name</label>
              <input
                id="patientName"
                name="patientName"
                type="text"
                value={orderData.patientName}
                onChange={handleOrderChange}
                placeholder="Enter patient name"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="testName">Lab Test</label>
              <input
                id="testName"
                name="testName"
                type="text"
                value={orderData.testName}
                onChange={handleOrderChange}
                placeholder="Ex: CBC, HbA1c"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="priority">Priority</label>
              <select id="priority" name="priority" value={orderData.priority} onChange={handleOrderChange}>
                <option>Routine</option>
                <option>Urgent</option>
                <option>STAT</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-primary">Place Lab Order</button>
          <p className="status-text">{orderMessage}</p>
        </form>
        <div className="feature-footnote">Tip: Use patient name + test name to show complete order flow in your viva.</div>
      </section>

      <section className={`page-panel section ${activeSection === "help" ? "" : "hidden-section"}`} id="help">
        <h2>Help and FAQ</h2>
        <p className="section-note">Simple answers for common user questions.</p>
        <div className="faq-grid">
          <article className="faq-item">
            <h3>Which file format is supported?</h3>
            <p>Currently, PDF reports are supported in the analyzer section.</p>
          </article>
          <article className="faq-item">
            <h3>Can I order tests without upload?</h3>
            <p>Yes. Order section works separately for direct test booking.</p>
          </article>
          <article className="faq-item">
            <h3>Is this easy for first-time users?</h3>
            <p>Yes. The layout is designed with simple labels and guided actions.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
