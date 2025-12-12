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

// 🔒 TEK KERE OLUŞTURULAN GEMINI INSTANCE
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const wordModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  safetySettings,
});

const sentenceModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  safetySettings,
  generationConfig: { temperature: 0.2 },
});

// 🔒 GLOBAL KİLİTLER
let inflightWord = false;
let inflightRoot = false;
let inflightSentence = false;

const cleanAndParseJSON = (text) => {
  if (!text) return null;
  try {
    let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      clean = clean.substring(start, end + 1);
    }
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error:", e, text);
    return null;
  }
};

// --- 1. KELİME ANALİZİ ---
export const fetchWordAnalysisFromAI = async (word) => {
  if (inflightWord) return null;
  inflightWord = true;

  try {
    const prompt = `
      Analyze the English word: "${word}".
      Return ONLY a valid JSON object.

      Rules:
      1. "definitions": 
         - "meaning": Meaning in TURKISH. 
         - "engExplanation": Definition in ENGLISH.
         - "trExplanation": TURKISH translation of the "engExplanation".
      2. "type": MUST be one of: noun, verb, adjective, adverb, prep, pronoun, conj, article, other.
      3. Fill ALL grammar forms (v2, v3, plural etc.) if applicable.
      4. "sentence": A simple English example sentence using the word.
      5. "sentence_tr": The TURKISH translation of that example sentence.

      JSON Structure:
      {
        "word": "${word}",
        "plural": "", "v2": "", "v3": "", "vIng": "", "thirdPerson": "",
        "advLy": "", "compEr": "", "superEst": "",
        "sentence": "Simple sentence example.",
        "sentence_tr": "Basit cümle örneğinin Türkçesi.",
        "definitions": [
          { "type": "noun", "meaning": "TR", "engExplanation": "EN Def", "trExplanation": "TR Translation of EN Def" }
        ]
      }
    `;

    const result = await wordModel.generateContent(prompt);
    const data = cleanAndParseJSON(result.response.text());

    if (data?.definitions) {
      const tagsSet = new Set();
      data.definitions.forEach((def) => {
        tagsSet.add(TYPE_MAP[def.type] || "Diğer");
      });
      data.tags = Array.from(tagsSet);
    } else if (data) {
      data.tags = ["Diğer"];
    }

    return data;
  } catch (e) {
    console.error("Word Analysis Error:", e);
    return null;
  } finally {
    inflightWord = false;
  }
};

// --- 2. KÖK BULMA ---
export const fetchRootFromAI = async (word) => {
  if (inflightRoot) return { root: word, original: word, changed: false };
  inflightRoot = true;

  try {
    const prompt = `Find lemma of "${word}". Return JSON: { "root": "base", "original": "${word}", "changed": true/false }`;
    const result = await wordModel.generateContent(prompt);
    return cleanAndParseJSON(result.response.text()) || { root: word, original: word, changed: false };
  } catch {
    return { root: word, original: word, changed: false };
  } finally {
    inflightRoot = false;
  }
};

// --- 3. CÜMLE ANALİZİ ---
export const fetchSentenceAnalysisFromAI = async (text) => {
  if (inflightSentence) return null;
  inflightSentence = true;

  try {
    const prompt = `
      You are an expert English teacher.
      Analyze the ORIGINAL English text: "${text}"
      RETURN ONLY THIS JSON: {...}
    `;
    const result = await sentenceModel.generateContent(prompt);
    return cleanAndParseJSON(result.response.text()) || {};
  } catch {
    return null;
  } finally {
    inflightSentence = false;
  }
};
