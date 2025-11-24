import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// --- ORTAK TEMİZLİK FONKSİYONU ---
const cleanAndParseJSON = (text) => {
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

// --- 1. KELİME ANALİZİ ---
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

// --- 2. KÖK BULMA ---
export const fetchRootFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Find the dictionary root form (lemma) of english word: "${word}".
      Return ONLY JSON:
      { "root": "base_form", "original": "${word}", "changed": true/false }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const data = cleanAndParseJSON(response.text());
    return data || { root: word, changed: false };
  } catch (e) {
    console.error("Root Error:", e);
    return { root: word, changed: false };
  }
};

// --- 3. CÜMLE ANALİZİ (GÜNCELLENDİ: FORMAT AYARI YAPILDI) ---
export const fetchSentenceAnalysisFromAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { temperature: 0.2 } 
    });

    // Prompt Güncellemesi: Kelimeleri İngilizce tutması için örnekli anlatım eklendi.
    const prompt = `
      Act as a helpful, friendly English tutor for Turkish students.
      Analyze this text: "${text}"
      
      Tasks:
      1. Translate to Turkish naturally.
      2. Identify the MAIN tense. Write the TURKISH name (e.g., "Geçmiş Zaman").
      3. Explain the sentence structure simply in bullet points.
         - CRITICAL RULE: When explaining a word, keep the English word in single quotes, then explain it in Turkish.
         - Do NOT translate the subject/verb words themselves when referring to them.
         - Example Pattern: 'I' cümlenin öznesidir (ben). 'am' yardımcı fiildir. 'pencil' kalem demektir.
         - Focus on "Who did what?" or grammar roles.

      4. Extract root words (lemmas) excluding common names and basic stopwords.

      Return ONLY JSON. No markdown.
      Structure:
      {
        "turkishTranslation": "Turkish translation here",
        "detectedTense": "Geniş Zaman / Şimdiki Zaman vb.",
        "simplePoints": [
            "'Word' -> Türkçe açıklaması...",
            "'OtherWord' -> Türkçe açıklaması..."
        ],
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
    const prompt = `Translate this English text to Turkish accurately and naturally. Return ONLY the translation, nothing else: "${text}"`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (e) {
    console.error("Translation Error:", e);
    return "Çeviri yapılamadı.";
  }
};

// --- 5. RESİMDEN METİN OKUMA (OCR) ---
export const extractTextFromImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result.split(",")[1];
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = "Extract all the text from this image clearly. Do not add any comments, just return the text found.";
        
        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType: file.type } },
        ]);
        const response = await result.response;
        resolve(response.text().trim());
      } catch (e) {
        console.error("OCR Error:", e);
        reject(e);
      }
    };
    reader.readAsDataURL(file);
  });
};
