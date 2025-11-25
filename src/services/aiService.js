import { GoogleGenerativeAI } from "@google/generative-ai";

// API KEY
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// --- ORTAK JSON TEMİZLEME FONKSİYONU ---
const cleanAndParseJSON = (text) => {
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

// --- 1. KELİME ANALİZİ ---
export const fetchWordAnalysisFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are a dictionary app helper. Analyze the English word: "${word}".
      IMPORTANT: 
      1. In the "definitions" array, the "meaning" field MUST be the TURKISH translation.
      2. The "engExplanation" field MUST be a simple English explanation.
      3. Generate 1 to 3 relevant categories/tags for this word in TURKISH (e.g., "Yiyecek", "Seyahat").
      
      Return ONLY JSON. No markdown.
      Structure:
      {
        "word": "${word}",
        "plural": "", "v2": "", "v3": "", "vIng": "", "thirdPerson": "",
        "advLy": "", "compEr": "", "superEst": "",
        "tags": ["Tag1"], 
        "sentence": "Simple sentence.",
        "definitions": [
          { "type": "noun", "meaning": "TR", "engExplanation": "EN" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return cleanAndParseJSON(response.text());
  } catch (e) {
    console.error("Word Analysis Error:", e);
    return null;
  }
};

// --- 2. KÖK BULMA ---
export const fetchRootFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Find the dictionary root form (lemma) of english word: "${word}".
      Return ONLY JSON: { "root": "base", "original": "${word}", "changed": true/false }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const data = cleanAndParseJSON(response.text());
    return data || { root: word, changed: false };
  } catch (e) { 
      return { root: word, changed: false }; 
  }
};

// --- 3. CÜMLE ANALİZİ (GÜNCELLENDİ: TÜRKÇE ZORLAMASI) ---
export const fetchSentenceAnalysisFromAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { temperature: 0.2 } 
    });

    const prompt = `
      Act as a strict English grammar teacher for TURKISH students.
      Analyze this text: "${text}"
      
      Tasks:
      1. Check for ANY grammatical errors.
      2. Translate to Turkish naturally.
      3. Identify the MAIN tense (Write TURKISH name).
      4. Explain the sentence structure simply in bullet points.
         - CRITICAL: The explanation MUST be in TURKISH.
         - CRITICAL: Keep English words in single quotes (e.g., 'Teacher' özne...).
      5. Extract root words.

      Return ONLY JSON.
      Structure:
      {
        "correction": {
            "hasError": true/false, 
            "corrected": "Corrected sentence here (or null)",
            "explanation": "Explain the error in TURKISH"
        },
        "turkishTranslation": "Turkish translation",
        "detectedTense": "Zaman Adı (Türkçe)",
        "simplePoints": ["Türkçe açıklama 1", "Türkçe açıklama 2"],
        "rootWords": ["word1", "word2"] 
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const data = cleanAndParseJSON(response.text());

    if (data && data.rootWords && Array.isArray(data.rootWords)) {
        const cleanList = data.rootWords
            .map(w => {
                let clean = w.toLowerCase();
                clean = clean.replace(/'s$/, "");
                clean = clean.replace(/[^a-z-]/g, "");
                return clean;
            })
            .filter(w => w.length > 1 || w === 'a' || w === 'i');
        data.rootWords = [...new Set(cleanList)];
    }
    return data;
  } catch (e) {
    console.error("Sentence Analysis Error:", e);
    throw e;
  }
};

// --- 4. HIZLI ÇEVİRİ ---
export const translateTextWithAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Translate this English text to Turkish accurately. Return ONLY translation: "${text}"`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (e) { 
      return "Çeviri yapılamadı."; 
  }
};

// --- 5. OCR ---
export const extractTextFromImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result.split(",")[1];
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent([
          "Extract text clearly. No comments.",
          { inlineData: { data: base64Data, mimeType: file.type } },
        ]);
        resolve(result.response.text().trim());
      } catch (e) { reject(e); }
    };
    reader.readAsDataURL(file);
  });
};
