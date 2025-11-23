import { GoogleGenerativeAI } from "@google/generative-ai";

const GEN_AI_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// YARDIMCI: Modeli her seferinde güvenli bir şekilde çağırır
const getModel = () => {
  if (!GEN_AI_KEY) {
    console.error("API Key bulunamadı! .env dosyasını kontrol et.");
    throw new Error("API Key eksik. Lütfen yönetici ile iletişime geçin.");
  }
  const genAI = new GoogleGenerativeAI(GEN_AI_KEY);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

// 1. TEK KELİME ÇEVİRİSİ
export const translateTextWithAI = async (text, targetLang = "Turkish") => {
  try {
    const model = getModel(); // Modeli burada çağırıyoruz (Daha güvenli)
    const prompt = `Translate the following text to ${targetLang}: "${text}". Only provide the translation, no extra text.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("AI Translation Error:", error);
    return null;
  }
};

// 2. TOPLU ÇEVİRİ (HIZLI & GÜVENLİ)
export const translateBulkWordsWithAI = async (wordList) => {
  try {
    const model = getModel();
    const wordsString = wordList.join(", ");
    const prompt = `
      You are a translator. Translate the following English words to Turkish.
      Words: "${wordsString}"
      
      Strictly respond with a valid JSON object where keys are the English words and values are the Turkish translations.
      Do not add any markdown formatting (like \`\`\`json). Just the raw JSON string.
      Example format: { "apple": "elma", "run": "koşmak" }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Bulk Translation Error:", error);
    return null; // Hata olursa null döner, uygulama çökmez
  }
};

// 3. CÜMLE ANALİZİ
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

// 4. OCR (RESİMDEN YAZI)
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
