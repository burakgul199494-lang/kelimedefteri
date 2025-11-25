import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// --- ETİKET EŞLEŞTİRME ---
const TYPE_MAP = {
  noun: "İsim", verb: "Fiil", adjective: "Sıfat", adverb: "Zarf", prep: "Edat",
  pronoun: "Zamir", conj: "Bağlaç", article: "Tanımlık", other: "Diğer"
};

// --- PARSE YARDIMCISI ---
const cleanAndParseJSON = (text) => {
  if (!text) return null;
  try {
    // Önce temizlemeden direkt dene (JSON modunda temiz gelir)
    return JSON.parse(text);
  } catch (e) {
    // Olmazsa Markdown temizliği yap
    try {
        let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const firstBrace = cleanText.indexOf("{");
        const lastBrace = cleanText.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }
        return JSON.parse(cleanText);
    } catch (e2) {
        console.error("JSON Hatası:", e2);
        return null;
    }
  }
};

// --- 1. KELİME ANALİZİ (JSON MODU AÇIK) ---
export const fetchWordAnalysisFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" } // BU ÇOK ÖNEMLİ
    });

    const prompt = `
      Analyze English word: "${word}".
      
      Rules:
      1. "definitions": Meaning in TURKISH. Explanation in ENGLISH.
      2. "type": MUST be one of: noun, verb, adjective, adverb, prep, pronoun, conj, article, other.
      3. Fill ALL grammar forms (v2, v3, plural etc) if applicable.
      
      JSON Structure:
      {
        "word": "${word}",
        "plural": "", "v2": "", "v3": "", "vIng": "", "thirdPerson": "",
        "advLy": "", "compEr": "", "superEst": "",
        "sentence": "Simple sentence.",
        "definitions": [{ "type": "noun", "meaning": "TR", "engExplanation": "EN" }]
      }
    `;

    const result = await model.generateContent(prompt);
    const data = cleanAndParseJSON(result.response.text());

    // Otomatik Etiketleme (JS Tarafı)
    if (data && data.definitions && Array.isArray(data.definitions)) {
        const tagsSet = new Set();
        data.definitions.forEach(def => {
            const trTag = TYPE_MAP[def.type] || "Diğer";
            tagsSet.add(trTag);
        });
        data.tags = Array.from(tagsSet); 
    } else {
        if(data) data.tags = ["Diğer"];
    }

    return data;
  } catch (e) {
    console.error("Word Analysis Error:", e);
    return null;
  }
};

// --- 2. KÖK BULMA (JSON MODU AÇIK) ---
export const fetchRootFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
    });
    const prompt = `Find lemma of "${word}". JSON: { "root": "base", "original": "${word}", "changed": true/false }`;
    const result = await model.generateContent(prompt);
    return cleanAndParseJSON(result.response.text()) || { root: word, changed: false };
  } catch (e) { return { root: word, changed: false }; }
};

// --- 3. CÜMLE ANALİZİ (JSON MODU AÇIK) ---
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
      3. Identify Tense (TR).
      4. Explain structure (TR bullets).
      5. Extract roots.

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

    // UI Uyumluluğu (Fallback)
    if (!data) {
        return {
            hasError: false, turkishTranslation: "Hata oluştu.", 
            correction: { hasError: false }, simplePoints: [], rootWords: []
        };
    }

    const uiData = {
        correction: {
            hasError: data.correction?.hasError || false,
            corrected: data.correction?.corrected || null,
            explanation: data.correction?.explanation || null
        },
        turkishTranslation: data.turkishTranslation || "",
        detectedTense: data.detectedTense || "",
        simplePoints: data.simplePoints || [],
        rootWords: []
    };

    if (data.rootWords && Array.isArray(data.rootWords)) {
        const cleanList = data.rootWords
            .map(w => {
                let clean = w.toLowerCase();
                clean = clean.replace(/'s$/, "");
                clean = clean.replace(/[^a-z-]/g, "");
                return clean;
            })
            .filter(w => w.length > 1 || w === 'a' || w === 'i');
        uiData.rootWords = [...new Set(cleanList)];
    }
    return uiData;

  } catch (e) {
    console.error("Sentence Analysis Error:", e);
    throw e;
  }
};

// --- 4. HIZLI ÇEVİRİ (JSON MODU KAPALI - DÜZ METİN) ---
export const translateTextWithAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // BURADA JSON MODU YOK! Sadece düz yazı istiyoruz.
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `Translate to Turkish. Return ONLY the translation string: "${text}"`;
    
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) { return "Çeviri yapılamadı."; }
};

// --- 5. OCR (JSON MODU KAPALI) ---
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
