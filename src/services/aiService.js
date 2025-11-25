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

    const prompt = `
      Analyze the English word: "${word}".
      Return ONLY a valid JSON object.
      
      TAGGING RULES (CRITICAL):
      1. Select 1-3 tags from this EXACT list: ${JSON.stringify(ALLOWED_TAGS)}.
      2. IF the word is a VERB (action), you MUST include "Fiiller".
      3. IF the word is an ADJECTIVE (descriptive), you MUST include "Sıfatlar".
      4. IF it fits a category (like 'apple' -> 'Yiyecek & İçecek'), pick that category.
      5. Only use "Diğer" if absolutely NO other tag fits.
      
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

    // --- JAVASCRIPT İLE TEMİZLİK VE DÜZELTME ---
    if (data && data.tags && Array.isArray(data.tags)) {
        
        // 1. Eşleştirme: Gelen etiket bizim listemizde var mı?
        let validTags = data.tags.map(t => {
            // Tam eşleşme veya içerme kontrolü
            const match = ALLOWED_TAGS.find(allowed => 
                allowed.toLowerCase() === t.toLowerCase() || 
                allowed.toLowerCase().includes(t.toLowerCase())
            );
            return match ? match : "Diğer";
        });

        // 2. "Diğer" Temizliği:
        // Eğer listede "Diğer" dışında geçerli bir etiket varsa, "Diğer"i sil.
        // Örn: ["Yiyecek", "Diğer"] -> ["Yiyecek"]
        const realTags = validTags.filter(t => t !== "Diğer");
        
        if (realTags.length > 0) {
            data.tags = [...new Set(realTags)]; // Sadece geçerlileri al
        } else {
            data.tags = ["Diğer"]; // Hiçbiri uymadıysa mecbur "Diğer"
        }
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
      Act as a strict English grammar teacher for TURKISH students.
      Analyze this text: "${text}"
      
      Tasks:
      1. Check for ANY grammatical errors.
      2. Translate to Turkish naturally.
      3. Identify the MAIN tense (Write TURKISH name).
      4. Explain the sentence structure simply in bullet points.
         - CRITICAL: The explanation MUST be in TURKISH.
         - CRITICAL: Keep English words in single quotes.
      5. Extract root words.

      Return JSON ONLY:
      {
        "correction": {
            "hasError": boolean, 
            "corrected": "Corrected sentence or null",
            "explanation": "Error explanation in Turkish"
        },
        "turkishTranslation": "Turkish translation",
        "detectedTense": "Zaman Adı (Türkçe)",
        "simplePoints": ["Türkçe açıklama 1", "Türkçe açıklama 2"],
        "rootWords": ["word1", "word2"] 
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return cleanAndParseJSON(response.text());
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

