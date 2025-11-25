import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

// ----------------------------------------
// Safety Settings
// ----------------------------------------
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ----------------------------------------
// JSON CLEANER
// ----------------------------------------
const cleanAndParseJSON = (text) => {
  if (!text) return null;
  try {
    let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start !== -1 && end !== -1) clean = clean.substring(start, end + 1);
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error:", e, text);
    return null;
  }
};

// ----------------------------------------
// ADVANCED SENTENCE ANALYSIS
// ----------------------------------------
export const fetchSentenceAnalysisFromAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      safetySettings,
      generationConfig: { temperature: 0.2 }
    });

    const prompt = `
      Act as a professional English teacher.

      Analyze the following text: "${text}"

      Return ONLY a JSON object with this strict structure:

      {
        "correction": {
          "hasError": boolean,
          "corrected": "string or null",
          "explanation": "string or null"
        },
        "turkishTranslation": "string",

        "detectedTense": "string",
        "simplePoints": ["..."],

        "usage": {
          "hasMistake": boolean,
          "wrong": "string",
          "correct": "string",
          "explanation": "Türkçe kısa açıklama"
        },

        "structure": {
          "subject": "string",
          "verb": "string",
          "object": "string",
          "phrases": ["..."]
        },

        "style": {
          "hasIssue": boolean,
          "suggestion": "string",
          "explanation": "string"
        },

        "rootWords": ["word1", "word2", "word3"]
      }
    `;

    const result = await model.generateContent(prompt);
    const raw = cleanAndParseJSON(result?.response?.text?.() || "") || {};

    // ROOT cleaning
    let cleanedRoots = [];
    if (Array.isArray(raw.rootWords)) {
      cleanedRoots = raw.rootWords
        .map((w) => w?.toLowerCase()?.trim() || "")
        .map((w) => w.replace(/'s$/, "").replace(/[^a-z-]/g, ""))
        .filter((w) => w.length > 1);
    }

    return {
      correction: {
        hasError: raw?.correction?.hasError || false,
        corrected: raw?.correction?.corrected || null,
        explanation: raw?.correction?.explanation || null,
      },

      turkishTranslation: raw?.turkishTranslation || "Çeviri alınamadı.",

      detectedTense: raw?.detectedTense || "Belirsiz",
      simplePoints: Array.isArray(raw?.simplePoints) ? raw.simplePoints : [],

      usage: {
        hasMistake: raw?.usage?.hasMistake || false,
        wrong: raw?.usage?.wrong || "",
        correct: raw?.usage?.correct || "",
        explanation: raw?.usage?.explanation || "",
      },

      structure: {
        subject: raw?.structure?.subject || "",
        verb: raw?.structure?.verb || "",
        object: raw?.structure?.object || "",
        phrases: Array.isArray(raw?.structure?.phrases)
          ? raw.structure.phrases
          : [],
      },

      style: {
        hasIssue: raw?.style?.hasIssue || false,
        suggestion: raw?.style?.suggestion || "",
        explanation: raw?.style?.explanation || "",
      },

      rootWords: [...new Set(cleanedRoots)],
    };
  } catch (e) {
    console.error("Sentence Analysis Error:", e);
    return {
      turkishTranslation: "Hata oluştu.",
      correction: { hasError: false },
      detectedTense: "Belirsiz",
      simplePoints: [],
      usage: { hasMistake: false },
      structure: { subject: "", verb: "", object: "", phrases: [] },
      style: { hasIssue: false },
      rootWords: [],
    };
  }
};

// ----------------------------------------
// QUICK TRANSLATE
// ----------------------------------------
export const translateTextWithAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      safetySettings
    });

    const prompt = `Translate to Turkish. Return ONLY the Turkish translation: "${text}"`;

    const res = await model.generateContent(prompt);

    return res?.response?.text?.().trim() || "Çeviri alınamadı.";
  } catch {
    return "Çeviri yapılamadı.";
  }
};

// ----------------------------------------
// OCR FROM IMAGE
// ----------------------------------------
export const extractTextFromImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        const base64 = reader.result.split(",")[1];

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          safetySettings
        });

        const res = await model.generateContent([
          "Extract all text. ONLY raw text.",
          { inlineData: { data: base64, mimeType: file.type } }
        ]);

        resolve(res?.response?.text?.().trim() || "");
      } catch (e) {
        console.error("OCR Error:", e);
        reject(e);
      }
    };

    reader.readAsDataURL(file);
  });
};

// ----------------------------------------
// WORD ROOT FINDER (fetchRootFromAI)
// ----------------------------------------
export const fetchRootFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      safetySettings
    });

    const prompt = `
      Find the root (lemma) of the English word: "${word}".
      Return ONLY JSON:

      {
        "root": "base form",
        "original": "${word}",
        "changed": boolean
      }
    `;

    const result = await model.generateContent(prompt);

    const raw = cleanAndParseJSON(result?.response?.text?.() || "");

    return (
      raw || {
        root: word,
        original: word,
        changed: false,
      }
    );
  } catch (e) {
    console.error("fetchRootFromAI Error:", e);
    return {
      root: word,
      original: word,
      changed: false,
    };
  }
};
