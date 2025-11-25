import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// --- SABİT ETİKET LİSTESİ ---
const TYPE_MAP = {
  noun: "İsim", verb: "Fiil", adjective: "Sıfat", adverb: "Zarf", prep: "Edat",
  pronoun: "Zamir", conj: "Bağlaç", article: "Tanımlık", other: "Diğer"
};

// --- GÜVENLİK AYARLARI (Bloklamayı Önlemek İçin Şart) ---
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// --- JSON TEMİZLEME VE PARSE ---
const cleanAndParseJSON = (text) => {
  if (!text) return null;
  try {
    // Markdown temizliği (```json ... ```)
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // En dıştaki süslü parantezleri bul
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

// --- ORTAK MODEL ALICISI (Gemini 2.0 Flash) ---
const getGenAIModel = () => {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    return genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash", // SENİN İSTEDİĞİN MODEL
        safetySettings
    });
};

// --- 1. KELİME ANALİZİ ---
export const fetchWordAnalysisFromAI = async (word) => {
  try {
    const model = getGenAIModel();

    const prompt = `
      Analyze the English word: "${word}".
      Return a VALID JSON object (No markdown).
      
      Rules:
      1. "definitions": Meaning in TURKISH. Explanation in ENGLISH.
      2. "type": MUST be one of: noun, verb, adjective, adverb, prep, pronoun, conj, article, other.
      3. Fill ALL grammar forms (v2, v3, plural, etc.) if applicable.
      
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

// --- 2. KÖK BULMA ---
export const fetchRootFromAI = async (word) => {
  try {
    const model = getGenAIModel();
    const prompt = `Find lemma of "${word}". Return JSON: { "root": "base", "original": "${word}", "changed": true/false }`;
    const result = await model.generateContent(prompt);
    return cleanAndParseJSON(result.response.text()) || { root: word, changed: false };
  } catch (e) { return { root: word, changed: false }; }
};

// --- 3. CÜMLE ANALİZİ (Senin İstediğin Basit Mantık) ---
export const fetchSentenceAnalysisFromAI = async (text) => {
  try {
    const model = getGenAIModel();

    // Prompt Senin İstediğin Gibi Basitleştirildi
    const prompt = `
      Act as an English Teacher. Analyze this text: "${text}"
      
      Step 1: Translate the FULL text to Turkish naturally.
      Step 2: Detect any grammar errors. If found, correct them and explain in Turkish.
      Step 3: Identify the Tense (in Turkish).
      Step 4: Explain the structure in Turkish bullet points.
      Step 5: List root words.

      Return ONLY JSON:
      {
        "correction": {
            "hasError": boolean, 
            "corrected": "Corrected version or null",
            "explanation": "Error explanation in Turkish or null"
        },
        "turkishTranslation": "Full Turkish translation",
        "detectedTense": "Zaman Adı",
        "simplePoints": ["Açıklama 1", "Açıklama 2"],
        "rootWords": ["word1", "word2"] 
      }
    `;

    const result = await model.generateContent(prompt);
    const data = cleanAndParseJSON(result.response.text());

    // Hata Kontrolü (Fallback)
    if (!data) {
        return {
            hasError: false, turkishTranslation: "Analiz yapılamadı.", 
            correction: { hasError: false }, simplePoints: [], rootWords: []
        };
    }

    // UI Uyumluluğu (Mapper)
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

// --- 4. HIZLI ÇEVİRİ ---
export const translateTextWithAI = async (text) => {
  try {
    const model = getGenAIModel();
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
        const model = getGenAIModel();
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
