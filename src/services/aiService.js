import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// 🔒 tek client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", safetySettings });

// 🔒 global kilit (429 fix)
let inflight = false;

const cleanAndParseJSON = (text) => {
  if (!text) return null;
  try {
    let c = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(c.substring(c.indexOf("{"), c.lastIndexOf("}") + 1));
  } catch {
    return null;
  }
};

export const fetchWordAnalysisFromAI = async (word) => {
  if (inflight) return null;
  inflight = true;
  try {
    const result = await model.generateContent(`Analyze the English word "${word}" and return JSON.`);
    return cleanAndParseJSON(result.response.text());
  } finally {
    inflight = false;
  }
};

export const fetchRootFromAI = async (word) => {
  if (inflight) return { root: word, original: word, changed: false };
  inflight = true;
  try {
    const result = await model.generateContent(`Find lemma of "${word}". Return JSON.`);
    return cleanAndParseJSON(result.response.text()) || { root: word, original: word, changed: false };
  } finally {
    inflight = false;
  }
};
