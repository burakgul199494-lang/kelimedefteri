import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

if (!apiKey) {
    console.error("KRİTİK HATA: REACT_APP_GEMINI_API_KEY bulunamadı!");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- 1. SİHİRLİ EKLEME FONKSİYONU ---
export const fetchMagicWordData = async (wordToSearch) => {
    try {
        const prompt = `Sen İngilizce-Türkçe sözlük verisi üreten bir asistansın.
        Görev: "${wordToSearch}" kelimesini analiz et ve SADECE GEÇERLİ BİR JSON DİZİSİ (ARRAY) döndür.

        KURALLAR:
        1. Asla markdown kodu kullanma. Doğrudan köşeli parantez [ ile başla ve ] ile bitir.
        2. ÇOKLU ANLAMLAR: Eğer kelimenin birbirinden tamamen farklı, yaygın anlamları varsa (örneğin "bank": banka, nehir kıyısı, para yatırmak gibi), her bir farklı anlam için diziye YENİ BİR KELİME OBJESİ ekle.
        3. Her objenin içindeki "definitions" dizisinde SADECE O KELİMEYE AİT 1 TANE anlam olsun.
        4. İNGİLİZCE VE TÜRKÇE AÇIKLAMA: "engExplanation" kısmına kelimenin İngilizce sözlük anlamını yaz. "trExplanation" kısmına ise bu İngilizce açıklamanın birebir Türkçe çevirisini yaz.
        5. ETİKETLER: "tags" dizisine SADECE kelimenin CEFR seviyesini (A1, A2, B1, B2, C1, C2) ekle. Kelime türünü etiket yapma.
        6. ÖRNEK CÜMLE: Her anlam için o anlama uygun, maksimum 5-8 kelimelik, günlük hayattan KISA bir örnek cümle (sentence) kur.

        BEKLENEN JSON FORMATI (Örnek olarak bank kelimesi için dizi içinde ayrı objeler):
        [
          {
            "word": "${wordToSearch}",
            "phonetic": "/bæŋk/",
            "tags": ["A2"],
            "plural": "banks",
            "v2": "", "v3": "", "vIng": "", "thirdPerson": "",
            "advLy": "", "compEr": "", "superEst": "",
            "definitions": [ 
              { 
                "type": "noun", 
                "meaning": "Banka (finansal)", 
                "engExplanation": "A financial institution",
                "trExplanation": "Finansal bir kurum"
              } 
            ],
            "sentence": "I left my money in the bank.",
            "sentence_tr": "Paramı bankada bıraktım."
          }
        ]`;

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

// --- 2. HIZLI ÇEVİRİ FONKSİYONU (YENİ) ---
export const translateWord = async (turkishWord) => {
    try {
        const prompt = `Lütfen sadece "${turkishWord}" ifadesinin en yaygın ve temel İngilizce karşılığını yaz.
        KURALLAR:
        1. Sadece tek bir kelime veya en fazla 2-3 kelimelik kısa bir tamlama döndür.
        2. Asla nokta, tırnak işareti veya ek açıklama kullanma.
        3. Tamamen küçük harf kullan.
        Örnek: kapı -> door`;

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text().trim().toLowerCase().replace(/['".]/g, '');
        
        return { success: true, word: textResponse };
    } catch (error) {
        console.error("Çeviri Hatası:", error);
        return { success: false, message: error.message };
    }
};
