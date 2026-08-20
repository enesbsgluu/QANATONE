/* DENEME ADASI (React + motion) — ÖLÇÜM İÇİN, ürün değil.
   Görev belgesinin "React'e sadece gerçekten hak eden ada geçer (jest,
   sürükleme, yarıda kesilen hareket)" ölçütünü temsil eden en küçük
   örnek: sürüklenebilir kart, bırakınca yaylı dönüş, hareket yarıda
   kesilip mevcut hızdan devam eder — saf CSS'in yapamadığı üçlü.
   Bütçe rakamları /yeni/deneme-react raporunda; B kalemlerinden biri
   React'i hak ederse bu dosya silinir, gerçek ada kendi adıyla gelir. */
import { motion } from 'motion/react';

export default function DenemeAda() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 260,
      border: '1px dashed rgba(255,255,255,.16)', borderRadius: 18, touchAction: 'none' }}>
      <motion.div
        drag
        dragConstraints={{ left: -120, right: 120, top: -70, bottom: 70 }}
        dragElastic={0.18}
        dragTransition={{ bounceStiffness: 420, bounceDamping: 22 }}
        whileTap={{ scale: 0.96 }}
        whileDrag={{ scale: 1.04 }}
        style={{ width: 132, height: 132, borderRadius: 20, cursor: 'grab',
          background: 'linear-gradient(150deg,#ef233c,#7d0d1c)',
          boxShadow: '0 18px 50px -18px rgba(239,35,60,.55)',
          display: 'grid', placeItems: 'center',
          color: '#fff', fontWeight: 700, letterSpacing: '-.02em', userSelect: 'none' }}
      >
        sürükle
      </motion.div>
    </div>
  );
}
