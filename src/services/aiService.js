// Google Kütüphanesini kullanmıyoruz, direkt fetch atıyoruz.
// import { GoogleGenerativeAI } ... SİLİNDİ

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const TYPE_MAP = {
  noun: "İsim", verb: "Fiil", adjective: "Sıfat", adverb: "Zarf", prep: "Edat",
  pronoun: "Zamir", conj: "Bağlaç", article: "Tanımlık", other: "Diğer",
};

// JSON Temizleme
const cleanAndParseJSON = (text) => {
  if (!text) return null;
  try {
    let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      clean = clean.substring(start, end + 1);
    }
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error:", e, text);
    return null;
  }
};

// --- YARDIMCI: API İSTEK FONKSİYONU ---
const callGeminiAPI = async (promptText) => {
  try {
    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: promptText }]
        }]
      })
    });

    if (!response.ok) {
        const errData = await response.json();
        console.error("API Hatası:", errData);
        throw new Error(`API Hatası: ${response.status}`);
    }

    const data = await response.json();
    // Gelen cevap yapısı: candidates[0].content.parts[0].text
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;

  } catch (error) {
    console.error("Gemini Fetch Error:", error);
    return null;
  }
};

// --- 1. KELİME ANALİZİ ---
export const fetchWordAnalysisFromAI = async (word) => {
    const prompt = `
      Analyze the English word: "${word}".
      Return ONLY a valid JSON object. Do not use Markdown code blocks.

      Rules:
      1. "definitions": 
         - "meaning": Meaning in TURKISH. 
         - "engExplanation": Definition in ENGLISH.
         - "trExplanation": TURKISH translation of the "engExplanation".
      2. "type": MUST be one of: noun, verb, adjective, adverb, prep, pronoun, conj, article, other.
      3. Fill ALL grammar forms (v2, v3, plural etc.) if applicable.
      4. "sentence": A simple English example sentence using the word.
      5. "sentence_tr": The TURKISH translation of that example sentence.

      JSON Structure:
      {
        "word": "${word}",
        "plural": "", "v2": "", "v3": "", "vIng": "", "thirdPerson": "",
        "advLy": "", "compEr": "", "superEst": "",
        "sentence": "Simple sentence example.",
        "sentence_tr": "Basit cümle örneğinin Türkçesi.",
        "definitions": [
          { "type": "noun", "meaning": "TR", "engExplanation": "EN Def", "trExplanation": "TR Translation of EN Def" }
        ]
      }
    `;

    const rawText = await callGeminiAPI(prompt);
    const data = cleanAndParseJSON(rawText);

    if (data && data.definitions && Array.isArray(data.definitions)) {
      const tagsSet = new Set();
      data.definitions.forEach((def) => {
        const trTag = TYPE_MAP[def.type] || "Diğer";
        tagsSet.add(trTag);
      });
      data.tags = Array.from(tagsSet); 
    } else {
      if (data) data.tags = ["Diğer"];
    }

    return data;
};

// --- 2. KÖK BULMA ---
export const fetchRootFromAI = async (word) => {
    const prompt = `Find lemma of "${word}". Return JSON: { "root": "base", "original": "${word}", "changed": true/false }`;
    const rawText = await callGeminiAPI(prompt);
    return cleanAndParseJSON(rawText) || { root: word, original: word, changed: false };
};

// --- 3. CÜMLE ANALİZİ ---
// (Bu fonksiyonu artık kullanmasak da hata vermesin diye tutuyoruz)
export const fetchSentenceAnalysisFromAI = async (text) => {
    return { turkishTranslation: "Devre dışı", correction: {}, structure: {}, rootWords: [] };
};

// --- 4. HIZLI ÇEVİRİ ---
export const translateTextWithAI = async (text) => {
    const prompt = `Translate to Turkish. Return ONLY translation string: "${text}"`;
    const rawText = await callGeminiAPI(prompt);
    return rawText ? rawText.trim() : "Çeviri yapılamadı.";
};

// --- 5. OCR (Kaldırıldı ama hata vermemesi için boş dönüyor) ---
export const extractTextFromImage = async (file) => {
  return "OCR Devre Dışı";
};
