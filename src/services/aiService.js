import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// --- SABİT ETİKET LİSTESİ ---
const PREDEFINED_TAGS = [
  "Gündelik Yaşam", "İş Hayatı", "Eğitim", "Seyahat", "Yiyecek & İçecek",
  "Hayvanlar", "Doğa & Çevre", "Sağlık", "Teknoloji", "Duygular",
  "Spor", "Sanat & Eğlence", "Kıyafet & Moda", "Ev & Aile",
  "Zaman", "Ulaşım", "Sıfatlar", "Fiiller", "Diğer"
];

// --- JSON TEMİZLEME VE PARSE ---
const cleanAndParseJSON = (text) => {
  try {
    if (!text) return null;
    // Markdown temizliği
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // En dıştaki süslü parantezleri bul
    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    // Bazı durumlarda AI tırnakları kaçırmayı unutursa diye basit düzeltme (Opsiyonel)
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Hatası:", e);
    console.log("Hatalı Gelen Metin:", text); // Konsola hatalı metni basar ki görelim
    return null; 
  }
};

// --- 1. KELİME ANALİZİ ---
export const fetchWordAnalysisFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" } // JSON ZORLAMASI
    });

    const prompt = `
      Analyze the English word: "${word}".
      
      Rules:
      1. "definitions": Meaning MUST be TURKISH. Explanation MUST be simple ENGLISH.
      2. "tags": Select max 3 tags from: ${JSON.stringify(PREDEFINED_TAGS)}.
      3. Fill grammar forms (v2, v3 etc).
      
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
    return JSON.parse(result.response.text()); // Direkt Parse (MimeType sayesinde)
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
    return JSON.parse(result.response.text());
  } catch (e) { return { root: word, changed: false }; }
};

// --- 3. CÜMLE ANALİZİ (GÜNCELLENDİ: UZUN CÜMLE FİKSİ) ---
export const fetchSentenceAnalysisFromAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        // BU AYAR ÇOK ÖNEMLİ: Yapay zekayı JSON formatında çıktı vermeye zorlar.
        generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.1 // Düşük sıcaklık = Daha kararlı yapı
        } 
    });

    const prompt = `
      Analyze this English text for a Turkish student: "${text}"
      
      Tasks:
      1. Check grammar errors strictly.
      2. Translate to Turkish.
      3. Identify Tense.
      4. Explain structure in Turkish (bullet points).
      5. Extract root words.

      JSON Structure:
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
    const rawText = result.response.text();
    const data = JSON.parse(rawText); // Temizlemeye gerek yok, direkt parse et.

    // Root Words Temizliği (Eski koddan korundu)
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
    const prompt = `Translate this English text to Turkish. Return ONLY the translation string: "${text}"`;
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
