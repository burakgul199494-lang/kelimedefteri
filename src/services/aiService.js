// src/services/aiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

if (!apiKey) {
    console.error("KRİTİK HATA: REACT_APP_GEMINI_API_KEY bulunamadı!");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const fetchMagicWordData = async (wordToSearch) => {
    try {
        const prompt = `Sen İngilizce-Türkçe sözlük verisi üreten bir asistansın.
        Görev: "${wordToSearch}" kelimesinin detaylarını analiz et ve SADECE GEÇERLİ BİR JSON nesnesi döndür.

        KURALLAR:
        1. Asla markdown kodu ( \`\`\`json vb.) kullanma. Doğrudan süslü parantez ile başla.
        2. ETİKETLER (tags): "tags" dizisine SADECE kelimenin CEFR seviyesini (A1, A2, B1, B2, C1, C2) ekle. Kelime türünü (isim, fiil vs.) etiket olarak EKLEME.
        3. ÇOKLU ANLAMLAR (definitions): Eğer kelimenin birbirinden tamamen farklı, yaygın anlamları varsa (örneğin "bank": banka, nehir kıyısı ve uçak dönüşü gibi), "definitions" dizisine her bir anlamı AYRI bir obje olarak ekle.
        4. ÖRNEK CÜMLE (sentence): Örnek cümle ÇOK KISA VE ÖZ olsun. Maksimum 5-8 kelimelik, günlük hayattan, kolay anlaşılır bir cümle kur. Uzun ve karmaşık akademik cümlelerden kaçın.
        5. "sentence_tr" kısmı cümlenin doğal Türkçe çevirisi olsun.

        BEKLENEN JSON FORMATI:
        {
          "word": "${wordToSearch}",
          "phonetic": "/fonetik/",
          "tags": ["B1"],
          "plural": "çoğulu (varsa, yoksa boş)",
          "v2": "past hali (sadece fiilse, yoksa boş)",
          "v3": "past participle (sadece fiilse, yoksa boş)",
          "vIng": "ing hali (sadece fiilse, yoksa boş)",
          "thirdPerson": "he/she/it hali (sadece fiilse, yoksa boş)",
          "advLy": "zarf hali (sıfatsa, yoksa boş)",
          "compEr": "daha hali (sıfatsa, yoksa boş)",
          "superEst": "en hali (sıfatsa, yoksa boş)",
          "definitions": [
            { "type": "noun", "meaning": "Banka (finansal)", "engExplanation": "A financial institution" },
            { "type": "noun", "meaning": "Nehir kıyısı", "engExplanation": "The land alongside a river" },
            { "type": "verb", "meaning": "Para yatırmak", "engExplanation": "To deposit money" }
          ],
          "sentence": "I sat on the river bank.",
          "sentence_tr": "Nehir kıyısında oturdum."
        }`;

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();
        
        const cleanedText = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const jsonData = JSON.parse(cleanedText);
        return { success: true, data: jsonData };

    } catch (error) {
        console.error("Yapay Zeka Hatası:", error);
        return { success: false, message: error.message };
    }
};
