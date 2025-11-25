import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// --- SABİT ETİKET LİSTESİ ---
const PREDEFINED_TAGS = [
  "Gündelik Yaşam", "İş Hayatı", "Eğitim", "Seyahat", "Yiyecek & İçecek",
  "Hayvanlar", "Doğa & Çevre", "Sağlık", "Teknoloji", "Duygular",
  "Spor", "Sanat & Eğlence", "Kıyafet & Moda", "Ev & Aile",
  "Zaman", "Ulaşım", "Sıfatlar", "Fiiller", "Diğer"
];

// --- GÜVENLİK AYARLARI (Maksimum İzin - Engeli Kaldırmak İçin) ---
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// --- MODEL LİSTESİ (Sırayla denenecekler) ---
// 2.0 Flash öncelikli, hata verirse 1.5 Flash, o da olmazsa 1.5 Pro
const MODEL_FALLBACKS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

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

// --- YENİ: SAĞLAM İSTEK ATMA FONKSİYONU ---
async function generateContentWithFallback(prompt, isJson = true, temperature = 0.7) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    for (const modelName of MODEL_FALLBACKS) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName, 
                safetySettings, // Güvenlik ayarlarını her modele uygula
                generationConfig: { temperature: temperature }
            });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            
            // BLOKAJ KONTROLÜ: Eğer güvenlik nedeniyle engellendiyse text() fonksiyonu hata fırlatır.
            // Biz bunu try-catch ile yakalayıp bir sonraki modele geçiş bileti yapacağız.
            const text = response.text(); 

            if (isJson) {
                const json = cleanAndParseJSON(text);
                if (!json) throw new Error("JSON parse failed or empty response");
                return json;
            }

            return text.trim();

        } catch (error) {
            console.warn(`⚠️ Model ${modelName} engellendi veya hata verdi. Yedek modele geçiliyor... (${error.message})`);
            // Bu catch bloğu sayesinde döngü kırılmaz, bir sonraki modele geçer.
        }
    }
    
    console.error("❌ Tüm yapay zeka modelleri başarısız oldu.");
    return null;
}

// --- 1. KELİME ANALİZİ ---
export const fetchWordAnalysisFromAI = async (word) => {
    const prompt = `
      Analyze the English word: "${word}".
      Return ONLY a valid JSON object.
      
      Rules:
      1. "definitions": Translate meaning to TURKISH. Explanation must be simple ENGLISH.
      2. "tags": Select max 3 relevant tags from this list: ${JSON.stringify(PREDEFINED_TAGS)}. If none fit, use "Diğer".
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
        "tags": ["Tag1"], 
        "sentence": "A simple example sentence (A2 level).",
        "definitions": [
          { "type": "noun/verb/adj", "meaning": "TURKISH MEANING", "engExplanation": "Simple definition in English" }
        ]
      }
    `;

    return await generateContentWithFallback(prompt, true);
};

// --- 2. KÖK BULMA ---
export const fetchRootFromAI = async (word) => {
    const prompt = `
      Task: Find the dictionary root (lemma) of the English word "${word}".
      Return ONLY JSON format: { "root": "base_form", "original": "${word}", "changed": true_or_false }
    `;
    
    const data = await generateContentWithFallback(prompt, true, 0); // Temperature 0 (Robot Modu)
    return data || { root: word, changed: false };
};

// --- 3. CÜMLE ANALİZİ ---
export const fetchSentenceAnalysisFromAI = async (text) => {
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

    return await generateContentWithFallback(prompt, true, 0.2);
};

// --- 4. HIZLI ÇEVİRİ ---
export const translateTextWithAI = async (text) => {
    const prompt = `Translate this English text to Turkish. Return ONLY the translation: "${text}"`;
    const res = await generateContentWithFallback(prompt, false);
    return res || "Çeviri yapılamadı.";
};

// --- 5. OCR ---
export const extractTextFromImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result.split(",")[1];
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // OCR için 1.5 Flash daha iyi çalışıyor, onu öncelikli tutuyoruz.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });
        
        const result = await model.generateContent([
          "Extract all text from image. No comments.",
          { inlineData: { data: base64Data, mimeType: file.type } },
        ]);
        resolve(result.response.text().trim());
      } catch (e) { 
          console.error("OCR Hatası:", e);
          resolve(""); 
      }
    };
    reader.readAsDataURL(file);
  });
};
