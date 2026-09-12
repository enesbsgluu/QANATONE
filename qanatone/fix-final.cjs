const fs = require('fs');

// buyuk-dil-modelleri-nedir.json - desc 168 -> ~155
let c = JSON.parse(fs.readFileSync('icerik/nedir/buyuk-dil-modelleri-nedir.json', 'utf8'));
c.lede.tr = "LLM'ler, milyarlarca parametreye sahip, internet ölçeğindeki metinle eğitilmiş olasılıksal modellerdir. Kelime tahmini oyunu — ölçek bu yetenekleri kazandırır.";
fs.writeFileSync('icerik/nedir/buyuk-dil-modelleri-nedir.json', JSON.stringify(c, null, 2));
console.log('buyuk-dil-modelleri-nedir lede.tr:', c.lede.tr.length);

// rag-nedir.json - title.en already 33, check desc
c = JSON.parse(fs.readFileSync('icerik/nedir/rag-nedir.json', 'utf8'));
console.log('rag-nedir lede.en:', c.lede.en.length);
console.log('rag-nedir title.en:', c.title.en.length);