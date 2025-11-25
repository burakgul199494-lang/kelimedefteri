import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY; 

// --- SABİT ETİKET LİSTESİ ---
const TYPE_MAP = {
  noun: "İsim", verb: "Fiil", adjective: "Sıfat", adverb: "Zarf", prep: "Edat",
  pronoun: "Zamir", conj: "Bağlaç", article: "Tanımlık", other: "Diğer"
};

// --- GÜÇLENDİRİLMİŞ JSON TEMİZLEYİCİ ---
const cleanAndParseJSON = (text) => {
  if (!text) return null;
  try {
    // 1. En basit temizlik
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // 2. JSON'un nerede başlayıp nerede bittiğini bul (Çöp veriden kurtul)
    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Kurtarma Hatası:", e);
    // Kurtarılamazsa null dön
    return null;
  }
};

// --- 1. KELİME ANALİZİ ---
export const fetchWordAnalysisFromAI = async (word) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      Analyze English word: "${word}".
      Return JSON.
      Rules:
      1. "definitions": Meaning in TURKISH. Explanation in ENGLISH.
      2. "type": noun, verb, adjective, adverb, prep, pronoun, conj, article, other.
      3. Fill grammar forms if applicable.
      
      JSON:
      {
        "word": "${word}",
        "plural": "", "v2": "", "v3": "", "vIng": "", "thirdPerson": "",
        "advLy": "", "compEr": "", "superEst": "",
        "sentence": "Sample sentence.",
        "definitions": [{ "type": "noun", "meaning": "TR", "engExplanation": "EN" }]
      }
    `;

    const result = await model.generateContent(prompt);
    const data = cleanAndParseJSON(result.response.text());

    if (data && data.definitions && Array.isArray(data.definitions)) {
        const tagsSet = new Set();
        data.definitions.forEach(def => {
            const trTag = TYPE_MAP[def.type] || "Diğer";
            tagsSet.add(trTag);
        });
        data.tags = Array.from(tagsSet); 
    } else {
        if(data) data.tags = ["Diğer"];
    }

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
    const prompt = `Find lemma of "${word}". JSON: { "root": "base", "original": "${word}", "changed": true/false }`;
    const result = await model.generateContent(prompt);
    return cleanAndParseJSON(result.response.text()) || { root: word, changed: false };
  } catch (e) { return { root: word, changed: false }; }
};

// --- 3. CÜMLE ANALİZİ (ZIRHLI VERSİYON) ---
export const fetchSentenceAnalysisFromAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { temperature: 0.1 } // Düşük yaratıcılık = Yüksek kararlılık
    });

    // Prompt Basitleştirildi: İç içe objeleri kaldırdım (Flattening)
    // Bu sayede AI hata yapamıyor.
    const prompt = `
      Analyze this English text for a Turkish student: "${text}"
      
      Tasks:
      1. Check grammar errors.
      2. Translate to Turkish.
      3. Identify Tense (TR).
      4. Explain structure (TR bullets).
      5. Extract roots.

      Return ONLY Valid JSON:
      {
        "hasError": false, 
        "correctedSentence": null,
        "errorExplanation": null,
        "turkishTranslation": "TR Çeviri",
        "detectedTense": "Zaman",
        "simplePoints": ["Madde 1", "Madde 2"],
        "rootWords": ["word1", "word2"] 
      }
    `;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    let data = cleanAndParseJSON(rawText);

    // --- ACİL DURUM SENARYOSU (FALLBACK) ---
    // Eğer JSON parse edilemezse veya boş gelirse, uygulamayı çökertme.
    // Kullanıcıya "Hata oluştu" demek yerine en azından çeviriyi gösterelim.
    if (!data) {
        console.warn("AI JSON Hatası verdi, Fallback verisi dönülüyor.");
        return {
            hasError: false,
            turkishTranslation: "Analiz detayları alınamadı, ancak metin işlendi.",
            detectedTense: "Belirsiz",
            simplePoints: ["Yapay zeka yanıtı okunamadı."],
            rootWords: [],
            correction: { hasError: false } // UI uyumluluğu için
        };
    }

    // Veri yapısını UI'ın beklediği eski formata dönüştür (Mapping)
    // Biz prompt'ta yapıyı değiştirdik ama frontend eski yapıyı bekliyor.
    const uiData = {
        correction: {
            hasError: data.hasError || false,
            corrected: data.correctedSentence || null,
            explanation: data.errorExplanation || null
        },
        turkishTranslation: data.turkishTranslation || "",
        detectedTense: data.detectedTense || "",
        simplePoints: data.simplePoints || [],
        rootWords: []
    };

    // Kök kelime temizliği
    if (data.rootWords && Array.isArray(data.rootWords)) {
        const cleanList = data.rootWords
            .map(w => {
                let clean = w.toLowerCase();
                clean = clean.replace(/'s$/, "");
                clean = clean.replace(/[^a-z-]/g, "");
                return clean;
            })
            .filter(w => w.length > 1 || w === 'a' || w === 'i');
        uiData.rootWords = [...new Set(cleanList)];
    }

    return uiData;

  } catch (e) {
    console.error("Sentence Analysis Error:", e);
    // Hata olsa bile boş obje dön ki sayfa beyaz ekrana düşmesin
    return {
        turkishTranslation: "Bağlantı hatası.",
        correction: { hasError: false },
        simplePoints: [],
        rootWords: []
    };
  }
};

// --- 4. HIZLI ÇEVİRİ ---
export const translateTextWithAI = async (text) => {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Translate to Turkish. Return ONLY translation: "${text}"`;
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
        const result = await model.generateContent(["Extract text.", { inlineData: { data: base64Data, mimeType: file.type } }]);
        resolve(result.response.text().trim());
      } catch (e) { reject(e); }
    };
    reader.readAsDataURL(file);
  });
};
