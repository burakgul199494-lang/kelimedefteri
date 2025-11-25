import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// --- ETİKET EŞLEŞTİRME HARİTASI (Gramer -> Türkçe Etiket) ---
const TYPE_MAP = {
  noun: "İsim",
  verb: "Fiil",
  adjective: "Sıfat",
  adverb: "Zarf",
  prep: "Edat",
  pronoun: "Zamir",
  conj: "Bağlaç",
  article: "Tanımlık",
  other: "Diğer"
};

// --- GÜVENLİK AYARLARI ---
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const cleanAndParseJSON = (text) => {
  if (!text) return null;
  try {
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Hatası:", e);
    return null; 
  }
};

// --- 1. KELİME ANALİZİ (Otomatik Gramer Etiketi) ---
export const fetchWordAnalysisFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash", // Çalışan Model
        safetySettings
    });

    const prompt = `
      Analyze the English word: "${word}".
      Return ONLY a valid JSON object.
      
      Rules:
      1. "definitions": Meaning in TURKISH. Explanation in ENGLISH.
      2. "type": MUST be one of: noun, verb, adjective, adverb, prep, pronoun, conj, article, other.
      3. Fill ALL grammar forms (v2, v3, plural etc.) if applicable.
      
      JSON Structure:
      {
        "word": "${word}",
        "plural": "", "v2": "", "v3": "", "vIng": "", "thirdPerson": "",
        "advLy": "", "compEr": "", "superEst": "",
        "sentence": "Simple sentence.",
        "definitions": [
          { "type": "noun", "meaning": "TR", "engExplanation": "EN" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const data = cleanAndParseJSON(result.response.text());

    // --- KOD TARAFI OTOMATİK ETİKETLEME ---
    // AI'ye sormuyoruz, gelen 'type' verisini biz çeviriyoruz.
    if (data && data.definitions && Array.isArray(data.definitions)) {
        const tagsSet = new Set();
        data.definitions.forEach(def => {
            const trTag = TYPE_MAP[def.type] || "Diğer";
            tagsSet.add(trTag);
        });
        data.tags = Array.from(tagsSet); // ["İsim", "Fiil"] gibi
    } else {
        if(data) data.tags = ["Diğer"];
    }
    // ---------------------------------------

    return data;
  } catch (e) {
    console.error("Word Analysis Error:", e);
    return null;
  }
};

// --- 2. KÖK BULMA ---
export const fetchRootFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", safetySettings });
    const prompt = `Find lemma of "${word}". Return JSON: { "root": "base", "original": "${word}", "changed": true/false }`;
    const result = await model.generateContent(prompt);
    return cleanAndParseJSON(result.response.text()) || { root: word, changed: false };
  } catch (e) { return { root: word, changed: false }; }
};

// --- 3. CÜMLE ANALİZİ (ÇÖKME KORUMALI) ---
export const fetchSentenceAnalysisFromAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      safetySettings,
      generationConfig: { temperature: 0.1 }
    });

    const prompt = `
You are an expert English teacher and grammar specialist.

IMPORTANT RULES (STRICT MODE):
- Always analyze the ORIGINAL ENGLISH TEXT (never the Turkish translation).
- Only mark hasError = true if the sentence has a REAL grammar mistake.
- Do NOT mark stylistic improvements as errors.
- When correcting, change ONLY what is necessary. Minimal correction rule.
- Keep the meaning identical (no rephrasing, no adding/removing words).
- Explanation MUST be in Turkish, short (1–2 sentence), simple and clear.

Here is the ORIGINAL English text:
"${text}"

TASKS:
1) Translate the FULL text into Turkish. (Only a translation)
2) Check for grammar errors in the ORIGINAL English sentence.
3) If there is a grammar error:
     - hasError = true
     - corrected = minimally corrected English sentence
     - explanation = short Turkish explanation (max 2 sentence)
4) If the English sentence is correct:
     - hasError = false
     - corrected = null
     - explanation = null
5) Identify the tense used in the ORIGINAL English sentence (output in Turkish only).
6) Provide a short structural explanation (Türkçe maddeler halinde).
7) Extract root/base forms of all English words (only English roots, lowercase).

RETURN ONLY THIS JSON EXACTLY:
{
  "correction": {
    "hasError": boolean,
    "corrected": "Corrected English sentence or null",
    "explanation": "Turkish explanation or null"
  },
  "turkishTranslation": "Full Turkish translation",
  "detectedTense": "Zaman (TR)",
  "simplePoints": ["Madde 1", "Madde 2"],
  "rootWords": ["word1", "word2"]
}
    `;

    const result = await model.generateContent(prompt);
    const raw = cleanAndParseJSON(result.response.text());

    const safeData = {
      correction: {
        hasError: raw?.correction?.hasError || false,
        corrected: raw?.correction?.corrected || null,
        explanation: raw?.correction?.explanation || null
      },
      turkishTranslation: raw?.turkishTranslation || "",
      detectedTense: raw?.detectedTense || "Belirsiz",
      simplePoints: Array.isArray(raw?.simplePoints) ? raw.simplePoints : [],
      rootWords:
        Array.isArray(raw?.rootWords)
          ? [...new Set(raw.rootWords.map(w => w.toLowerCase()))]
          : []
    };

    return safeData;
  } catch (e) {
    console.error("Analiz Hatası:", e);
    return {
      correction: { hasError: false },
      turkishTranslation: "Hata oluştu.",
      detectedTense: "Belirsiz",
      simplePoints: [],
      rootWords: []
    };
  }
};



// --- 4. HIZLI ÇEVİRİ ---
export const translateTextWithAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", safetySettings });
    const prompt = `Translate to Turkish. Return ONLY translation string: "${text}"`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) { return "Çeviri yapılamadı."; }
};

// --- 5. OCR ---
export const extractTextFromImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result.split(",")[1];
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", safetySettings });
        const result = await model.generateContent([
          "Extract all text. No comments.",
          { inlineData: { data: base64Data, mimeType: file.type } },
        ]);
        resolve(result.response.text().trim());
      } catch (e) { reject(e); }
    };
    reader.readAsDataURL(file);
  });
};
