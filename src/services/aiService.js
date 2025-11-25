import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// --- SABİT ETİKET LİSTESİ ---
const PREDEFINED_TAGS = [
  "Gündelik Yaşam", "İş Hayatı", "Eğitim", "Seyahat", "Yiyecek & İçecek",
  "Hayvanlar", "Doğa & Çevre", "Sağlık", "Teknoloji", "Duygular",
  "Spor", "Sanat & Eğlence", "Kıyafet & Moda", "Ev & Aile",
  "Zaman", "Ulaşım", "Sıfatlar", "Fiiller", "Diğer"
];

const cleanAndParseJSON = (text) => {
  try {
    // Markdown temizliği (```json ... ```)
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Hatası:", e);
    console.log("Gelen Hatalı Veri:", text); // Hata ayıklama için
    return null; 
  }
};

// --- 1. KELİME ANALİZİ (Fiil Çekimleri ve Kök Sorunu Çözüldü) ---
export const fetchWordAnalysisFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Analyze the English word: "${word}".
      Return ONLY a valid JSON object. Do not write any introductory text.
      
      Rules:
      1. "definitions": Translate meaning to TURKISH. Explanation must be simple ENGLISH.
      2. "tags": Select max 3 relevant tags from this list: ${JSON.stringify(PREDEFINED_TAGS)}.
      3. Fill grammatical forms (v2, v3, plural etc.) if applicable. If not, leave empty string.
      
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
        "tags": ["Tag1", "Tag2"], 
        "sentence": "A simple example sentence (A2 level).",
        "definitions": [
          { "type": "noun/verb/adj", "meaning": "TURKISH MEANING", "engExplanation": "Simple definition in English" }
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
      Find the lemma (dictionary root) of: "${word}".
      Return JSON ONLY: { "root": "base_form", "original": "${word}", "changed": true/false }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const data = cleanAndParseJSON(response.text());
    return data || { root: word, changed: false };
  } catch (e) { return { root: word, changed: false }; }
};

// --- 3. CÜMLE ANALİZİ (Gramer Kontrollü) ---
export const fetchSentenceAnalysisFromAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { temperature: 0.2 } 
    });

    const prompt = `
      Analyze this English text for a Turkish student: "${text}"
      
      Tasks:
      1. Check grammar errors.
      2. Translate to Turkish.
      3. Identify Tense (In Turkish).
      4. Explain structure simply in Turkish (bullet points). Keep English words in single quotes.
      5. Extract root words.

      Return JSON ONLY:
      {
        "correction": {
            "hasError": boolean, 
            "corrected": "Corrected sentence or null",
            "explanation": "Error explanation in Turkish"
        },
        "turkishTranslation": "Turkish translation",
        "detectedTense": "Tense Name (TR)",
        "simplePoints": ["Explanation 1", "Explanation 2"],
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
    const prompt = `Translate this English text to Turkish. Return ONLY the translation: "${text}"`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (e) { return "Çeviri yapılamadı."; }
};

// --- 5. OCR (Resimden Yazı) ---
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
