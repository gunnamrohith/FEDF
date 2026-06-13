const { ORDER_STORAGE_KEY: orderStorageKey } = window.AppData;

const ORDER_STATUS_FLOW = ["ordered", "sample_collected", "processing", "result_ready", "reviewed"];

function listOrders() {
  return readOrders().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function createOrder(orderInput) {
  const nowIso = new Date().toISOString();
  const order = {
    id: buildOrderId(),
    patientName: String(orderInput.patientName || "").trim(),
    patientId: String(orderInput.patientId || "").trim(),
    priority: orderInput.priority || "routine",
    scheduledAt: orderInput.scheduledAt || "",
    notes: String(orderInput.notes || "").trim(),
    tests: Array.isArray(orderInput.tests) ? orderInput.tests : [],
    createdAt: nowIso,
    status: "ordered",
    timeline: [{ status: "ordered", at: nowIso, note: "Order created" }],
    result: null,
    doctorReview: null
  };

  const orders = readOrders();
  orders.unshift(order);
  saveOrders(orders);
  return order;
}

function updateOrderStatus(orderId, nextStatus) {
  if (!ORDER_STATUS_FLOW.includes(nextStatus)) {
    throw new Error("Invalid order status.");
  }

  const orders = readOrders();
  const order = orders.find((entry) => entry.id === orderId);
  if (!order) {
    throw new Error("Order not found.");
  }

  const nowIso = new Date().toISOString();
  order.status = nextStatus;
  order.timeline = Array.isArray(order.timeline) ? order.timeline : [];
  order.timeline.push({ status: nextStatus, at: nowIso, note: "Status updated" });

  saveOrders(orders);
  return order;
}

function advanceOrderStatus(orderId) {
  const order = getOrderById(orderId);
  if (!order) {
    throw new Error("Order not found.");
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);
  if (currentIndex < 0 || currentIndex === ORDER_STATUS_FLOW.length - 1) {
    return order;
  }

  return updateOrderStatus(orderId, ORDER_STATUS_FLOW[currentIndex + 1]);
}

function attachResultToOrder(orderId, analysisResult) {
  const orders = readOrders();
  const order = orders.find((entry) => entry.id === orderId);
  if (!order) {
    throw new Error("Order not found.");
  }

  const nowIso = new Date().toISOString();
  order.result = {
    attachedAt: nowIso,
    sourceName: analysisResult?.sourceName || "Analyzed Report",
    score: analysisResult?.score ?? null,
    abnormalCount: Array.isArray(analysisResult?.measurements)
      ? analysisResult.measurements.filter((item) => item.status !== "normal").length
      : 0,
    totalParameters: Array.isArray(analysisResult?.measurements) ? analysisResult.measurements.length : 0,
    measurements: Array.isArray(analysisResult?.measurements) ? analysisResult.measurements : [],
    issues: Array.isArray(analysisResult?.issues) ? analysisResult.issues : []
  };

  if (ORDER_STATUS_FLOW.indexOf(order.status) < ORDER_STATUS_FLOW.indexOf("result_ready")) {
    order.status = "result_ready";
    order.timeline = Array.isArray(order.timeline) ? order.timeline : [];
    order.timeline.push({ status: "result_ready", at: nowIso, note: "Result attached" });
  }

  saveOrders(orders);
  return order;
}

function addDoctorReview(orderId, reviewInput) {
  const orders = readOrders();
  const order = orders.find((entry) => entry.id === orderId);
  if (!order) {
    throw new Error("Order not found.");
  }

  const nowIso = new Date().toISOString();
  order.doctorReview = {
    reviewedBy: String(reviewInput.reviewedBy || "").trim(),
    note: String(reviewInput.note || "").trim(),
    reviewedAt: nowIso
  };

  if (ORDER_STATUS_FLOW.indexOf(order.status) < ORDER_STATUS_FLOW.indexOf("reviewed")) {
    order.status = "reviewed";
    order.timeline = Array.isArray(order.timeline) ? order.timeline : [];
    order.timeline.push({ status: "reviewed", at: nowIso, note: "Doctor review completed" });
  }

  saveOrders(orders);
  return order;
}

function getOrderById(orderId) {
  return readOrders().find((entry) => entry.id === orderId) || null;
}

function readOrders() {
  try {
    const raw = localStorage.getItem(orderStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(orderStorageKey, JSON.stringify(orders));
}

function buildOrderId() {
  const stamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 900 + 100);
  return `LAB-${stamp}-${random}`;
}

window.AppOrder = {
  ORDER_STATUS_FLOW,
  listOrders,
  createOrder,
  updateOrderStatus,
  advanceOrderStatus,
  attachResultToOrder,
  addDoctorReview,
  getOrderById
};
