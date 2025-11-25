import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// --- SABİT ETİKET LİSTESİ (SENİN İSTEDİĞİN) ---
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

// --- JSON TEMİZLEME (GÜVENLİ) ---
const cleanAndParseJSON = (text) => {
  try {
    if (!text) return null;
    // Markdown (```json ... ```) temizliği
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

// --- 1. KELİME ANALİZİ (JSON Modu KAPALI, Prompt ZORLAMASI AÇIK) ---
export const fetchWordAnalysisFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // NOT: 'responseMimeType' kaldırıldı. Eski sağlam yöntem.
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Analyze the English word: "${word}".
      
      REQUIREMENTS:
      1. Return ONLY a valid JSON object. Do NOT write explanations.
      2. "definitions": Meaning MUST be TURKISH. Explanation MUST be simple ENGLISH.
      3. "type": MUST be one of: noun, verb, adjective, adverb, prep, pronoun, conj, article, other.
      4. GRAMMAR FORMS (Mandatory if applicable):
         - IF VERB: v2 (past), v3 (participle), vIng (gerund), thirdPerson are REQUIRED.
         - IF NOUN: plural is REQUIRED.
         - IF ADJECTIVE: advLy, compEr, superEst are REQUIRED.
      
      JSON Structure:
      {
        "word": "${word}",
        "plural": "", "v2": "", "v3": "", "vIng": "", "thirdPerson": "",
        "advLy": "", "compEr": "", "superEst": "",
        "sentence": "A simple example sentence (A2 level).",
        "definitions": [
          { "type": "noun", "meaning": "TR", "engExplanation": "EN" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const data = cleanAndParseJSON(result.response.text());

    // --- ETİKETLEME (JS TARAFI) ---
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

// --- 2. KÖK BULMA (JSON Modu KAPALI) ---
export const fetchRootFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Find the lemma (dictionary root) of the English word "${word}".
      Return ONLY JSON (No markdown): 
      { "root": "base_form", "original": "${word}", "changed": true/false }
    `;

    const result = await model.generateContent(prompt);
    return cleanAndParseJSON(result.response.text());
  } catch (e) { 
      return { root: word, changed: false }; 
  }
};

// --- 3. CÜMLE ANALİZİ (Zırhlı Versiyon - JSON Modu KAPALI) ---
export const fetchSentenceAnalysisFromAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Sıcaklığı düşük tutuyoruz ama JSON modunu kapattık.
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { temperature: 0.1 } 
    });

    // Prompt: Düz (Flattened) Yapı
    const prompt = `
      Analyze this English text for a Turkish student: "${text}"
      
      Tasks:
      1. Check grammar errors.
      2. Translate to Turkish.
      3. Identify Tense (TR).
      4. Explain structure (TR bullets).
      5. Extract roots.

      Return ONLY Valid JSON:
      {
        "hasError": false, 
        "correctedSentence": null,
        "errorExplanation": null,
        "turkishTranslation": "TR Çeviri",
        "detectedTense": "Zaman",
        "simplePoints": ["Madde 1", "Madde 2"],
        "rootWords": ["word1", "word2"] 
      }
    `;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    let data = cleanAndParseJSON(rawText);

    // --- FALLBACK VE DÖNÜŞÜM ---
    if (!data) {
        return {
            hasError: false,
            turkishTranslation: "Analiz alınamadı.",
            detectedTense: "",
            simplePoints: [],
            rootWords: [],
            correction: { hasError: false }
        };
    }

    // UI için format dönüşümü
    const uiData = {
        correction: {
            hasError: data.hasError || false,
            corrected: data.correctedSentence || null,
            explanation: data.errorExplanation || null
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

// --- 4. HIZLI ÇEVİRİ (JSON Yok - Düz Metin) ---
export const translateTextWithAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Translate to Turkish. Return ONLY the translation string: "${text}"`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) { return "Çeviri yapılamadı."; }
};

// --- 5. OCR (JSON Yok) ---
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
