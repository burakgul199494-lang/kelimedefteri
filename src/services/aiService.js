import { GoogleGenerativeAI } from "@google/generative-ai";

const GEN_AI_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// --- GÜVENLİK KİLİDİ (Lazy Loading) ---
// Modeli uygulama açılırken değil, lazım olduğunda çağırır.
// API key hatası olsa bile uygulamanın beyaz ekran vermesini engeller.
const getModel = () => {
  if (!GEN_AI_KEY) {
    console.error("API Key bulunamadı! .env dosyasını kontrol et.");
    throw new Error("API Key eksik. Lütfen yönetici ile iletişime geçin.");
  }
  const genAI = new GoogleGenerativeAI(GEN_AI_KEY);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

// 1. BASİT ÇEVİRİ
export const translateTextWithAI = async (text, targetLang = "Turkish") => {
  try {
    const model = getModel();
    const prompt = `Translate the following text to ${targetLang}: "${text}". Only provide the translation, no extra text.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("AI Translation Error:", error);
    return null;
  }
};

// 2. DETAYLI KELİME ANALİZİ (YENİ ÖZELLİK)
// Kelimenin V2, V3, Çoğul ve Kısa Örnek Cümlesini getirir.
export const fetchWordDetails = async (word) => {
  try {
    const model = getModel();
    const prompt = `
      Analyze the English word: "${word}".
      Provide the following details in valid JSON format:
      1. "meaning": Turkish translation (short).
      2. "type": noun, verb, adjective, etc.
      3. "v2": Past tense (if verb, else empty string).
      4. "v3": Past participle (if verb, else empty string).
      5. "plural": Plural form (if noun, else empty string).
      6. "exampleSentence": A short, simple English sentence using this word (max 10 words).

      Respond ONLY with the JSON object. No markdown.
      Example: { "meaning": "koşmak", "type": "verb", "v2": "ran", "v3": "run", "plural": "", "exampleSentence": "I run every day." }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    return JSON.parse(text);
  } catch (error) {
    console.error("Word Detail Error:", error);
    // Hata olursa sistem çökmesin, boş ama güvenli veri dönsün
    return { 
      meaning: "Çeviri hatası", 
      type: "unknown", 
      v2: "", v3: "", plural: "", 
      exampleSentence: `Example sentence for ${word}` 
    };
  }
};

// 3. CÜMLE ANALİZİ (ANA FONKSİYON)
export const fetchSentenceAnalysisFromAI = async (sentence) => {
  try {
    const model = getModel();
    const prompt = `
      Analyze the following English sentence: "${sentence}"
      
      1. Translate it to Turkish.
      2. Explain the grammar structure simply in Turkish.
      3. List the root forms of the important English words in the sentence (verbs, nouns, adjectives).

      Respond ONLY in valid JSON format:
      {
        "turkishTranslation": "...",
        "grammarAnalysis": "...",
        "rootWords": ["word1", "word2", "word3"]
      }
      Do not use markdown formatting.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    return JSON.parse(text);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw new Error("Analiz servisi yanıt vermedi: " + error.message);
  }
};

// 4. OCR (RESİMDEN YAZI ÇEKME)
export const extractTextFromImage = async (imageFile) => {
  try {
    const model = getModel();
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: imageFile.type,
      },
    };

    const prompt = "Extract all the English text from this image. Keep the formatting as close as possible. Only return the text.";
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("AI OCR Error:", error);
    throw new Error("Resim okunamadı.");
  }
};
