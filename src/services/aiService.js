import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// --- BİZİM SABİT LİSTEMİZ ---
const ALLOWED_TAGS = [
  "Gündelik Yaşam", "İş Hayatı", "Eğitim", "Seyahat", "Yiyecek & İçecek",
  "Hayvanlar", "Doğa & Çevre", "Sağlık", "Teknoloji", "Duygular",
  "Spor", "Sanat & Eğlence", "Kıyafet & Moda", "Ev & Aile",
  "Zaman", "Ulaşım", "Sıfatlar", "Fiiller", "Diğer"
];

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

    // Prompt'u "Öneri" moduna çektik, "Zorlama" modundan çıkardık.
    const prompt = `
      Analyze the English word: "${word}".
      Return ONLY a valid JSON object.
      
      Rules:
      1. "definitions": Translate meaning to TURKISH. Explanation must be simple ENGLISH.
      2. "tags": Suggest 1-3 relevant categories in Turkish (e.g. Yiyecek, Teknoloji).
      3. Fill grammatical forms (v2, v3, plural etc.) if applicable. If not, leave empty string.
      
      JSON Structure:
      {
        "word": "${word}",
        "plural": "plural or empty",
        "v2": "past or empty",
        "v3": "participle or empty",
        "vIng": "gerund or empty",
        "thirdPerson": "he/she or empty",
        "advLy": "adverb or empty",
        "compEr": "comp or empty",
        "superEst": "super or empty",
        "tags": ["Tag1"], 
        "sentence": "Simple example.",
        "definitions": [
          { "type": "noun/verb/adj", "meaning": "TURKISH", "engExplanation": "ENGLISH" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const data = cleanAndParseJSON(response.text());

    // --- KOD TARAFI DÜZELTME (ETİKET FİLTRESİ) ---
    // AI ne gönderirse göndersin, biz burada filtreliyoruz.
    if (data && data.tags && Array.isArray(data.tags)) {
        const filteredTags = data.tags
            .map(t => {
                // AI bazen "Food" der, biz "Yiyecek & İçecek" ile eşleştirebiliriz veya direkt listeye bakarız.
                // Basit yöntem: Listede var mı bak, yoksa 'Diğer' yap.
                // Biraz esneklik için "includes" kullanıyoruz.
                const found = ALLOWED_TAGS.find(allowed => allowed.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(allowed.toLowerCase()));
                return found ? found : "Diğer";
            });
        
        // Tekrarları ve "Diğer" fazlalığını temizle
        data.tags = [...new Set(filteredTags)]; 
        
        // Eğer hepsi "Diğer" olduysa sadece bir tane bırak
        if (data.tags.every(t => t === "Diğer")) data.tags = ["Diğer"];
    }
    // ---------------------------------------------

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

// --- 3. CÜMLE ANALİZİ ---
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
