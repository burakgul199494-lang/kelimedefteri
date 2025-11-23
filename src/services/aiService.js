import { GoogleGenerativeAI } from "@google/generative-ai";

// API KEY (GitHub'da güvenli olması için .env dosyası önerilir ama şimdilik böyle kalsın)
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// JSON Temizleme Yardımcısı
export const cleanAndParseJSON = (text) => {
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

// 1. Kelime Analizi
export const fetchWordAnalysisFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are a dictionary app helper. Analyze the English word: "${word}".
      IMPORTANT: 
      1. In the "definitions" array, the "meaning" field MUST be the TURKISH translation.
      2. The "engExplanation" field MUST be a simple English explanation.
      Return ONLY JSON. No markdown.
      Structure:
      {
        "word": "${word}",
        "plural": "", "v2": "", "v3": "", "vIng": "", "thirdPerson": "",
        "advLy": "", "compEr": "", "superEst": "",
        "sentence": "Simple A2 level sentence.",
        "definitions": [
          { "type": "noun/verb/etc", "meaning": "TURKISH TRANSLATION", "engExplanation": "Simple English explanation" }
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

// 2. Kök Bulma
export const fetchRootFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Find the dictionary root form (lemma) of english word: "${word}". Return ONLY JSON: { "root": "base_form", "original": "${word}", "changed": true/false }`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const data = cleanAndParseJSON(response.text());
    return data || { root: word, changed: false };
  } catch (e) {
    return { root: word, changed: false };
  }
};

// 3. Cümle Analizi
export const fetchSentenceAnalysisFromAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { temperature: 0 } });
    const prompt = `
      Act as an expert English teacher. Analyze this text: "${text}"
      Tasks:
      1. Translate the text to Turkish naturally.
      2. Analyze the grammar structure in detail in Turkish.
      3. Extract EVERY single word used in the sentence to a list (root forms).
      Return ONLY JSON structure: { "turkishTranslation": "...", "grammarAnalysis": "...", "rootWords": ["..."] }
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const data = cleanAndParseJSON(response.text());
    
    // JS Temizliği
    if (data && data.rootWords && Array.isArray(data.rootWords)) {
        const cleanList = data.rootWords.map(w => w.toLowerCase().replace(/'s$/, "").replace(/[^a-z-]/g, "")).filter(w => w.length > 1 || w === 'a' || w === 'i');
        data.rootWords = [...new Set(cleanList)];
    }
    return data;
  } catch (e) {
    throw e;
  }
};

// 4. Çeviri
export const translateTextWithAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Translate this English text to Turkish accurately and naturally. Return ONLY the translation: "${text}"`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (e) {
    return "Çeviri yapılamadı.";
  }
};

// 5. Resimden Metin (OCR)
export const extractTextFromImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result.split(",")[1];
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent([
          "Extract all text from this image clearly.",
          { inlineData: { data: base64Data, mimeType: file.type } },
        ]);
        const response = await result.response;
        resolve(response.text().trim());
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsDataURL(file);
  });
};
