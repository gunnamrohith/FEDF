import { state, setState } from "../state.js";

// Add Employee
window.addEmployee = function () {
  const name = prompt("Enter Name:");
  if (!name) return;

  const newEmp = {
    id: state.allEmployees.length
          ? Math.max(...state.allEmployees.map(emp => emp.id)) + 1
            : 1,
    //id: Date.now(), //generates random ID based on timestamp, but can cause duplicates if added quickly.
    // unique ID fix
    name,
    score: 50,
    present: true
  };

  const updated = [...state.allEmployees, newEmp];

  setState({
    employees: updated,
    allEmployees: updated
  });
};

// Update Score
window.updateScore = function (id) {
  if (!id) {
    id = Number(prompt("Enter Employee ID:"));
  }

  const newScore = prompt("Enter New Score:");
  if (!id || newScore === null) return;

  const updated = state.allEmployees.map(emp =>
    emp.id === id ? { ...emp, score: Number(newScore) } : emp
  );

  setState({
    employees: updated,
    allEmployees: updated
  });
};

// Edit Name
window.editEmployee = function (id) {
  const name = prompt("Enter new name:");

  const updated = state.allEmployees.map(emp =>
    emp.id === id ? { ...emp, name: name || emp.name } : emp
  );

  setState({
    employees: updated,
    allEmployees: updated
  });
};

// Attendance
window.toggleAttendance = function (id) {
  const updated = state.allEmployees.map(emp =>
    emp.id === id ? { ...emp, present: !emp.present } : emp
  );

  setState({
    employees: updated,
    allEmployees: updated
  });
};

// Search
window.searchEmployee = function (query) {
  query = query.toLowerCase();

  if (query === "") {
    setState({ employees: [...state.allEmployees] });
    return;
  }

  const filtered = state.allEmployees.filter(emp =>
    emp.name.toLowerCase().includes(query)
  );

  setState({ employees: filtered });
};

// Delete
window.deleteEmployee = function (id) {
  const updated = state.allEmployees.filter(emp => emp.id !== id);

  setState({
    employees: updated,
    allEmployees: updated
  });
};

// PDF
window.downloadPDF = function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.text("Employee Report", 14, 10);

  const tableData = state.employees.map(emp => [
    emp.id,
    emp.name,
    emp.score,
    emp.present ? "Present" : "Absent"
  ]);

  doc.autoTable({
    head: [["ID", "Name", "Score", "Attendance"]],
    body: tableData
  });

  doc.save("employees.pdf");
};
