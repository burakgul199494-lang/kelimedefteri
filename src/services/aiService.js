import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// --- GRAMER TÜRÜ EŞLEŞTİRME HARİTASI ---
const TYPE_MAP = {
  noun: "İsim", verb: "Fiil", adjective: "Sıfat", adverb: "Zarf", prep: "Edat",
  pronoun: "Zamir", conj: "Bağlaç", article: "Tanımlık", other: "Diğer"
};

const cleanAndParseJSON = (text) => {
  try {
    if (!text) return null;
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
      Analyze the English word: "${word}".
      Return ONLY a valid JSON object.
      
      Rules:
      1. "definitions": Translate meaning to TURKISH. Explanation must be simple ENGLISH.
      2. "type": MUST be one of: noun, verb, adjective, adverb, prep, pronoun, conj, article, other.
      3. Fill grammatical forms (v2, v3, plural etc.) if applicable.
      
      JSON Structure:
      {
        "word": "${word}",
        "plural": "plural form or empty",
        "v2": "past form or empty",
        "v3": "past participle or empty",
        "vIng": "gerund or empty",
        "thirdPerson": "he/she form or empty",
        "advLy": "adverb form or empty",
        "compEr": "comparative or empty",
        "superEst": "superlative or empty",
        "sentence": "A simple example sentence (A2 level).",
        "definitions": [
          { "type": "noun", "meaning": "TURKISH MEANING", "engExplanation": "Simple definition in English" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const data = cleanAndParseJSON(response.text());

    if (data && data.definitions && Array.isArray(data.definitions)) {
        const tagsSet = new Set();
        data.definitions.forEach(def => {
            const trTag = TYPE_MAP[def.type] || "Diğer";
            tagsSet.add(trTag);
        });
        data.tags = Array.from(tagsSet); 
    } else {
        data.tags = ["Diğer"];
    }

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Find the lemma (dictionary root) of: "${word}". Return ONLY JSON: { "root": "base_form", "original": "${word}", "changed": true/false }`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const data = cleanAndParseJSON(response.text());
    return data || { root: word, changed: false };
  } catch (e) { return { root: word, changed: false }; }
};

// --- 3. CÜMLE ANALİZİ ---
export const fetchSentenceAnalysisFromAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { temperature: 0.2 } });
    const prompt = `Analyze English text for Turkish student: "${text}". Tasks: 1.Check grammar. 2.Translate. 3.Identify Tense. 4.Explain structure (TR). 5.Extract roots. Return JSON.`;
    const result = await model.generateContent(prompt);
    return cleanAndParseJSON(result.response.text());
  } catch (e) { throw e; }
};

// --- 4. HIZLI ÇEVİRİ (DÜZELTİLDİ) ---
export const translateTextWithAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // DÜZELTME: 'temperature: 0' yaparak yaratıcılığı öldürdük.
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { temperature: 0 } 
    });
    
    // DÜZELTME: Prompt çok daha sert ve net yazıldı.
    const prompt = `
      Task: Translate the following English text to Turkish.
      Input: "${text}"
      
      Constraints:
      1. Return ONLY the Turkish translation.
      2. Do NOT add explanations, notes, or bullet points.
      3. Do NOT start with "Translation:" or similar labels.
      4. Just give the raw translated text.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
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
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(["Extract text.", { inlineData: { data: base64Data, mimeType: file.type } }]);
        resolve(result.response.text().trim());
      } catch (e) { reject(e); }
    };
    reader.readAsDataURL(file);
  });
};
