import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

// --------------------------------------------------
//  S A D E    T Ü R K Ç E    Ç E V İ R İ
// --------------------------------------------------
export const simpleTranslate = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { temperature: 0 },
    });

    const prompt = `
      Aşağıdaki İngilizce metni yalnızca TÜRKÇEYE ÇEVİR.
      Metin: "${text}"

      Kurallar:
      - Sadece Türkçe çeviriyi ver.
      - Ek açıklama, not, JSON, madde işareti, İngilizce tekrar E K L E M E.
      - Kod bloğu (\`\`\`) kullanma.
    `;

    const result = await model.generateContent(prompt);
    let output = result.response.text().trim();

    // Kod bloklarını sil
    output = output.replace(/```[\s\S]*?```/g, "").trim();

    // İlk anlamlı satırı al
    const first = output.split("\n").map((l) => l.trim()).filter(Boolean)[0];

    return first || output || "Çeviri yapılamadı.";
  } catch (e) {
    console.error("Çeviri Hatası:", e);
    return "Çeviri yapılamadı.";
  }
};

// --------------------------------------------------
//  C Ü M L E    A N A L İ Z İ
// --------------------------------------------------
export const fetchSentenceAnalysisFromAI = async (sentence) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { temperature: 0 },
    });

    const prompt = `
      Act as an expert English linguist.
      Analyze the sentence below and return a JSON structure:

      Sentence: "${sentence}"

      {
        "turkishTranslation": "...",
        "grammarAnalysis": "...",
        "rootWords": ["..."]
      }

      IMPORTANT:
      - Return ONLY JSON.
      - No markdown.
      - No explanation outside JSON.
    `;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    // JSON temizleme
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const json = raw.substring(start, end + 1);

    return JSON.parse(json);
  } catch (e) {
    console.error("Sentence Analysis Error:", e);
    return null;
  }
};

// --------------------------------------------------
//  K E L İ M E   A N A L İ Z İ  (definitions vb.)
// --------------------------------------------------
export const fetchWordAnalysisFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const prompt = `
      Analyze the English word: "${word}"

      Return ONLY JSON:
      {
        "word": "...",
        "category": "...",
        "definitions": [
          { "type": "...", "meaning": "Türkçe anlam", "engExplanation": "simple English explanation" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    return JSON.parse(raw.substring(start, end + 1));
  } catch (e) {
    console.error("Word Analysis Error:", e);
    return null;
  }
};

// --------------------------------------------------
//  K Ö K   A N A L İ Z İ
// --------------------------------------------------
export const fetchRootFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const prompt = `
      Return the ROOT form of the word "${word}".
      ONLY the root word. No explanation.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return word;
  }
};

// --------------------------------------------------
//  O C R — GÖRSELDEN METİN ALMA
// --------------------------------------------------
export const extractTextFromImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        const base64 = reader.result.split(",")[1];

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const result = await model.generateContent([
          "Extract text from this image.",
          { inlineData: { data: base64, mimeType: file.type } },
        ]);

        resolve(result.response.text().trim());
      } catch (e) {
        reject(e);
      }
    };

    reader.readAsDataURL(file);
  });
};
