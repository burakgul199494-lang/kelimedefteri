// src/services/aiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// API anahtarını güvenli bir şekilde .env dosyasından alıyoruz
const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

if (!apiKey) {
    console.error("KRİTİK HATA: REACT_APP_GEMINI_API_KEY bulunamadı! Lütfen .env dosyanızı kontrol edin.");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // En hızlı ve ucuz model

export const fetchMagicWordData = async (wordToSearch) => {
    try {
        const prompt = `Sen İngilizce-Türkçe sözlük verisi üreten bir asistansın.
        Görev: "${wordToSearch}" kelimesinin detaylarını analiz et ve SADECE GEÇERLİ BİR JSON nesnesi döndür.

        KURALLAR:
        1. Asla markdown kodu ( \`\`\`json vb.) kullanma. Doğrudan süslü parantez ile başla.
        2. Format aşağıdaki gibi olmalıdır. Anlamlara en az 1, en fazla 2 en yaygın tanım ekle.
        3. Örnek cümle (sentence) B2/C1 seviyesinde olsun ve içinde kelime geçsin.
        4. sentence_tr kısmı cümlenin doğal Türkçe çevirisi olsun.

        BEKLENEN JSON FORMATI:
        {
          "word": "${wordToSearch}",
          "phonetic": "/fonetik/",
          "tags": ["isim", "soyut", "akademik"],
          "plural": "çoğulu (varsa, yoksa boş)",
          "v2": "past hali (sadece fiilse, yoksa boş)",
          "v3": "past participle (sadece fiilse, yoksa boş)",
          "vIng": "ing hali (sadece fiilse, yoksa boş)",
          "thirdPerson": "he/she/it hali (sadece fiilse, yoksa boş)",
          "advLy": "zarf hali (sıfatsa, yoksa boş)",
          "compEr": "daha hali (sıfatsa, yoksa boş)",
          "superEst": "en hali (sıfatsa, yoksa boş)",
          "definitions": [
            { "type": "noun/verb/adjective vb.", "meaning": "Türkçe anlamı", "engExplanation": "Kısa İngilizce açıklama" }
          ],
          "sentence": "İngilizce örnek cümle.",
          "sentence_tr": "Cümlenin Türkçe çevirisi."
        }`;

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();
        
        // Gemini bazen JSON'ı markdown blokları içine alır, onları temizleyelim
        const cleanedText = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const jsonData = JSON.parse(cleanedText);
        return { success: true, data: jsonData };

    } catch (error) {
        console.error("Yapay Zeka Hatası:", error);
        return { success: false, message: error.message };
    }
};
