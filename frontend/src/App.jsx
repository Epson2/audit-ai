import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import "./App.css";

const API_URL = "http://localhost:3001";

function App() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const loadExpenses = async () => {
    const res = await fetch(`${API_URL}/expenses`);
    const data = await res.json();
    setExpenses(data);
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const totalSpending = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  }, [expenses]);

  const suspiciousCount = expenses.filter(
    (expense) => expense.riskFlag === "Suspicious" || expense.riskFlag === "Review"
  ).length;

  const categoryData = useMemo(() => {
    const totals = {};

    expenses.forEach((expense) => {
      const category = expense.category || "Other";
      totals[category] = (totals[category] || 0) + Number(expense.amount || 0);
    });

    return Object.entries(totals).map(([category, total]) => ({
      category,
      total,
    }));
  }, [expenses]);

  const riskData = useMemo(() => {
    const totals = {};

    expenses.forEach((expense) => {
      const risk = expense.riskFlag || "Normal";
      totals[risk] = (totals[risk] || 0) + 1;
    });

    return Object.entries(totals).map(([risk, count]) => ({
      risk,
      count,
    }));
  }, [expenses]);

  const analyzeExpense = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/agent/expense`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description,
          amount,
          date,
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.details || data.error);
        return;
      }

      setDescription("");
      setAmount("");
      setDate("");
      await loadExpenses();
    } catch (error) {
      alert("Failed to analyze expense.");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setReportLoading(true);

    try {
      const res = await fetch(`${API_URL}/agent/report`);
      const data = await res.json();
      setReport(data.report || "No report generated.");
    } catch (error) {
      alert("Failed to generate report.");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logoIcon">A</div>
          <div>
            <h2>AuditAI</h2>
            <p>Expense Intelligence</p>
          </div>
        </div>

        <nav>
          <a className="active">Dashboard</a>
          <a>Expenses</a>
          <a>Reports</a>
          <a>Risk Review</a>
          <a>Settings</a>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Business finance agent</p>
            <h1>Invoice & Expense Dashboard</h1>
          </div>

          <button className="reportBtn" onClick={generateReport}>
            {reportLoading ? "Generating..." : "Generate AI Report"}
          </button>
        </header>

        <section className="cards">
          <div className="card">
            <p>Total Spending</p>
            <h2>${totalSpending.toFixed(2)}</h2>
            <span>Tracked expenses</span>
          </div>

          <div className="card">
            <p>Total Expenses</p>
            <h2>{expenses.length}</h2>
            <span>Saved records</span>
          </div>

          <div className="card">
            <p>Needs Review</p>
            <h2>{suspiciousCount}</h2>
            <span>Review or suspicious</span>
          </div>

          <div className="card">
            <p>Top Category</p>
            <h2>{categoryData[0]?.category || "None"}</h2>
            <span>Highest spend area</span>
          </div>
        </section>

        <section className="grid">
          <div className="panel formPanel">
            <h3>Add New Expense</h3>
            <p>Submit an expense and let the agent classify it.</p>

            <form onSubmit={analyzeExpense}>
              <label>Description</label>
              <input
                placeholder="Uber ride to client meeting"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <label>Amount</label>
              <input
                type="number"
                step="0.01"
                placeholder="24.50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              <button type="submit" disabled={loading}>
                {loading ? "Analyzing..." : "Analyze Expense"}
              </button>
            </form>
          </div>

          <div className="panel chartPanel">
            <h3>Spending by Category</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="panel chartPanel">
            <h3>Risk Breakdown</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={riskData}
                  dataKey="count"
                  nameKey="risk"
                  outerRadius={90}
                  label
                >
                  {riskData.map((entry, index) => (
                    <Cell key={index} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="panel reportPanel">
            <h3>AI Financial Report</h3>
            <div className="reportBox">
              {report ? report : "Generate a report to see AI business insights here."}
            </div>
          </div>
        </section>

        <section className="panel tablePanel">
          <div className="tableHeader">
            <div>
              <h3>Recent Expenses</h3>
              <p>All agent-classified transactions.</p>
            </div>
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Deductible</th>
                  <th>Risk</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <strong>{expense.description}</strong>
                      <span>{expense.summary}</span>
                    </td>
                    <td>{expense.category}</td>
                    <td>${Number(expense.amount).toFixed(2)}</td>
                    <td>{expense.deductible}</td>
                    <td>
                      <span className={`badge ${expense.riskFlag?.toLowerCase()}`}>
                        {expense.riskFlag}
                      </span>
                    </td>
                    <td>{expense.date}</td>
                  </tr>
                ))}

                {expenses.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty">
                      No expenses yet. Add your first one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;