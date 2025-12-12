import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

const TYPE_MAP = {
  noun: "İsim", verb: "Fiil", adjective: "Sıfat", adverb: "Zarf", prep: "Edat",
  pronoun: "Zamir", conj: "Bağlaç", article: "Tanımlık", other: "Diğer",
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// 🔒 TEK KERE OLUŞTURULAN CLIENT + MODEL
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", safetySettings });

// 🔒 GLOBAL KİLİT
let inflight = false;

const cleanAndParseJSON = (text) => {
  if (!text) return null;
  try {
    let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start !== -1 && end !== -1) clean = clean.substring(start, end + 1);
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return null;
  }
};

export const fetchWordAnalysisFromAI = async (word) => {
  if (inflight) return null;
  inflight = true;
  try {
    const prompt = `Analyze the English word: "${word}". Return ONLY JSON.`;
    const result = await model.generateContent(prompt);
    const data = cleanAndParseJSON(result.response.text());
    if (data?.definitions) {
      const tags = new Set();
      data.definitions.forEach(d => tags.add(TYPE_MAP[d.type] || "Diğer"));
      data.tags = [...tags];
    }
    return data;
  } catch (e) {
    console.error(e);
    return null;
  } finally {
    inflight = false;
  }
};

export const fetchRootFromAI = async (word) => {
  if (inflight) return { root: word, original: word, changed: false };
  inflight = true;
  try {
    const result = await model.generateContent(
      `Find lemma of "${word}". Return JSON.`
    );
    return cleanAndParseJSON(result.response.text()) || { root: word, original: word, changed: false };
  } finally {
    inflight = false;
  }
};
