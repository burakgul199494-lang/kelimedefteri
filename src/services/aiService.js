import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// --- SABİT ETİKET LİSTESİ ---
const PREDEFINED_TAGS = [
  "Gündelik Yaşam", "İş Hayatı", "Eğitim", "Seyahat", "Yiyecek & İçecek",
  "Hayvanlar", "Doğa & Çevre", "Sağlık", "Teknoloji", "Duygular",
  "Spor", "Sanat & Eğlence", "Kıyafet & Moda", "Ev & Aile",
  "Zaman", "Ulaşım", "Sıfatlar", "Fiiller", "Diğer"
];

// --- GÜVENLİ JSON PARSE ---
const cleanAndParseJSON = (text) => {
  try {
    if (!text) return null;
    // Markdown temizliği
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

// --- 1. KELİME ANALİZİ (V2-V3 ZORLAMASI EKLENDİ) ---
export const fetchWordAnalysisFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      Act as a comprehensive dictionary. Analyze the English word: "${word}".
      
      CRITICAL RULES:
      1. "definitions": Meaning MUST be TURKISH. Explanation MUST be simple ENGLISH.
      2. "tags": Select max 3 tags from: ${JSON.stringify(PREDEFINED_TAGS)}.
      3. GRAMMAR FORMS (Fill these carefully):
         - IF VERB: You MUST provide v2 (past), v3 (participle), vIng (gerund), thirdPerson.
         - IF NOUN: You MUST provide plural.
         - IF ADJECTIVE: You MUST provide advLy, compEr, superEst.
         - If a form does not exist, use empty string "".
      
      Return JSON Structure:
      {
        "word": "${word}",
        "plural": "", "v2": "", "v3": "", "vIng": "", "thirdPerson": "",
        "advLy": "", "compEr": "", "superEst": "",
        "tags": [], 
        "sentence": "Example sentence.",
        "definitions": [{ "type": "noun", "meaning": "TR", "engExplanation": "EN" }]
      }
    `;

    const result = await model.generateContent(prompt);
    return cleanAndParseJSON(result.response.text());
  } catch (e) {
    console.error("Word Analysis Error:", e);
    return null;
  }
};

// --- 2. KÖK BULMA ---
export const fetchRootFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Find the lemma of "${word}". Return JSON: { "root": "base", "original": "${word}", "changed": true/false }`;

    const result = await model.generateContent(prompt);
    return cleanAndParseJSON(result.response.text());
  } catch (e) { return { root: word, changed: false }; }
};

// --- 3. CÜMLE ANALİZİ (UZUN CÜMLE GARANTİSİ) ---
export const fetchSentenceAnalysisFromAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.1
        } 
    });

    const prompt = `
      Analyze this English text for a Turkish student: "${text}"
      
      Tasks:
      1. Check grammar errors.
      2. Translate to Turkish.
      3. Identify Tense.
      4. Explain structure in Turkish (bullet points).
      5. Extract root words.

      Return JSON Structure:
      {
        "correction": {
            "hasError": false, 
            "corrected": null,
            "explanation": null
        },
        "turkishTranslation": "string",
        "detectedTense": "string",
        "simplePoints": ["string", "string"],
        "rootWords": ["string", "string"] 
      }
    `;

    const result = await model.generateContent(prompt);
    const data = cleanAndParseJSON(result.response.text());

    // Veri boş geldiyse (Hata durumu)
    if (!data) throw new Error("AI returned empty data");

    if (data.rootWords && Array.isArray(data.rootWords)) {
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
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { temperature: 0 } 
    });
    
    const prompt = `
      Task: Translate the following English text to Turkish.
      Input: "${text}"
      Constraints: Return ONLY the Turkish translation string. No JSON, no notes.
    `;
    
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
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent([
          "Extract all text from image. No comments.",
          { inlineData: { data: base64Data, mimeType: file.type } },
        ]);
        resolve(result.response.text().trim());
      } catch (e) { reject(e); }
    };
    reader.readAsDataURL(file);
  });
};
