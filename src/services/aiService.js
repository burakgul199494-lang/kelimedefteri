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
        generationConfig: { temperature: 0.0 } // TAM KARARLILIK
    });

    const prompt = `
Act as an English teacher.
Analyze the following full text EXACTLY as given:

"${text}"

You MUST follow these steps:

1) Translate the FULL text into Turkish.
2) Detect grammar errors. If any, provide corrected version and explain the mistake in Turkish. If no error: hasError=false.
3) Identify the tense of the main clause (Turkish).
4) Provide simple bullet-point explanation of the sentence structure (Turkish).
5) MOST IMPORTANT STEP:
   - Extract EVERY SINGLE UNIQUE WORD from the text.
   - Normalize each word (remove punctuation at start/end ONLY).
   - Convert each word to its lemma/root form (strict).
   - DO NOT SKIP ANY WORD.
   - DO NOT SUMMARIZE OR GROUP WORDS.
   - RETURN THE COMPLETE LIST.

Return ONLY valid JSON with this structure:

{
  "correction": {
    "hasError": boolean,
    "corrected": "string or null",
    "explanation": "string or null"
  },
  "turkishTranslation": "string",
  "detectedTense": "string",
  "simplePoints": ["string", "string"],
  "rootWords": ["word1", "word2", "word3"]
}
    `;

    const result = await model.generateContent(prompt);
    const rawData = cleanAndParseJSON(result.response.text());

    const safeData = {
      correction: {
        hasError: rawData?.correction?.hasError || false,
        corrected: rawData?.correction?.corrected || null,
        explanation: rawData?.correction?.explanation || null
      },
      turkishTranslation: rawData?.turkishTranslation || "Çeviri alınamadı.",
      detectedTense: rawData?.detectedTense || "Belirsiz",
      simplePoints: Array.isArray(rawData?.simplePoints) ? rawData.simplePoints : [],
      rootWords: []
    };

    // --- ROOT KELİME TEMİZLİĞİ (GÜÇLENDİRİLMİŞ) ---
    if (rawData?.rootWords && Array.isArray(rawData.rootWords)) {
      const cleaned = rawData.rootWords
        .map(w => {
          let clean = w.toLowerCase();

          // İç yapıyı bozmadan sadece baş/son karakterleri temizle
          clean = clean.replace(/^[^a-z']+|[^a-z']+$/g, "");

          // Boşları at
          return clean.trim();
        })
        .filter(w => w.length > 0);

      // Tekrar kaldır
      safeData.rootWords = [...new Set(cleaned)];
    }

    return safeData;

  } catch (e) {
    console.error("Analiz Hatası:", e);
    return {
      turkishTranslation: "Hata oluştu.",
      correction: { hasError: false },
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
