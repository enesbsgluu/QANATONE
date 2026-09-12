const fs = require('fs');

// buyuk-dil-modelleri-nedir.json
let c = JSON.parse(fs.readFileSync('icerik/nedir/buyuk-dil-modelleri-nedir.json', 'utf8'));
c.lede.tr = 'LLM\'ler, milyarlarca parametreye sahip, internet ölçeğindeki metinle eğitilmiş olasılıksal modellerdir. Kelime tahmini oyunu oynarlar — ölçek bu yetenekleri kazandırır.';
fs.writeFileSync('icerik/nedir/buyuk-dil-modelleri-nedir.json', JSON.stringify(c, null, 2));
console.log('buyuk-dil-modelleri-nedir lede.tr:', c.lede.tr.length);

// rag-nedir.json
c = JSON.parse(fs.readFileSync('icerik/nedir/rag-nedir.json', 'utf8'));
c.lede.tr = 'RAG, LLM bilgi kesiti ve halüsinasyonunu çözer: vektör veritabanından ilgili belgeleri çekip bağlama enjekte eder. Model "elindeki belgeden" cevap verir.';
fs.writeFileSync('icerik/nedir/rag-nedir.json', JSON.stringify(c, null, 2));
console.log('rag-nedir lede.tr:', c.lede.tr.length);

// yapay-zeka-nedir.json - already 153, might be OK but let's check
c = JSON.parse(fs.readFileSync('icerik/nedir/yapay-zeka-nedir.json', 'utf8'));
console.log('yapay-zeka-nedir lede.tr:', c.lede.tr.length);