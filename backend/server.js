import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const EXPENSE_FILE = "./expenses.json";

function loadExpenses() {
  if (!fs.existsSync(EXPENSE_FILE)) {
    fs.writeFileSync(EXPENSE_FILE, "[]");
    return [];
  }

  const data = fs.readFileSync(EXPENSE_FILE, "utf8").trim();

  if (!data) {
    fs.writeFileSync(EXPENSE_FILE, "[]");
    return [];
  }

  return JSON.parse(data);
}

function saveExpenses(expenses) {
  fs.writeFileSync(EXPENSE_FILE, JSON.stringify(expenses, null, 2));
}

app.get("/", (req, res) => {
  res.send("Invoice & Expense Agent API is running");
});

app.get("/expenses", (req, res) => {
  try {
    const expenses = loadExpenses();
    res.json(expenses);
  } catch (error) {
    console.error("GET EXPENSES ERROR:", error);
    res.status(500).json({ error: "Failed to load expenses" });
  }
});

app.post("/agent/expense", async (req, res) => {
  try {
    const { description, amount, date } = req.body;

    if (!description || !amount || !date) {
      return res.status(400).json({
        error: "description, amount, and date are required",
      });
    }

    const prompt = `
You are an invoice and expense agent for a small business.

Analyze this expense and return ONLY valid JSON. Do not include markdown.

Expense:
Description: ${description}
Amount: ${amount}
Date: ${date}

Return this exact JSON format:
{
  "category": "",
  "businessPurpose": "",
  "deductible": "",
  "riskFlag": "",
  "summary": ""
}

Categories can include:
Meals, Travel, Software, Office Supplies, Marketing, Rent, Utilities, Payroll, Equipment, Other.

riskFlag must be one of:
Normal, Review, Suspicious.
`;

    const response = await client.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 500,
    });

    const text = response.choices[0].message.content;
    console.log("AI RESPONSE:", text);

    const cleaned = text.replace(/```json|```/g, "").trim();
    const aiResult = JSON.parse(cleaned);

    const expense = {
      id: Date.now(),
      description,
      amount: Number(amount),
      date,
      ...aiResult,
    };

    const expenses = loadExpenses();
    expenses.push(expense);
    saveExpenses(expenses);

    res.json(expense);
  } catch (error) {
    console.error("REAL ERROR:", error);
    res.status(500).json({
      error: "Failed to analyze expense",
      details: error.message,
    });
  }
});

app.get("/agent/report", async (req, res) => {
  try {
    const expenses = loadExpenses();

    const prompt = `
You are a business finance assistant.

Create a simple monthly expense report from these expenses:

${JSON.stringify(expenses, null, 2)}

Include:
1. Total spending
2. Spending by category
3. Unusual expenses
4. Business recommendations
5. Short executive summary
`;

    const response = await client.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 700,
    });

    const report = response.choices[0].message.content;

    res.json({ report });
  } catch (error) {
    console.error("REPORT ERROR:", error);
    res.status(500).json({
      error: "Failed to generate report",
      details: error.message,
    });
  }
});

app.listen(3001, () => {
  console.log("Invoice & Expense Agent running on http://localhost:3001");
});