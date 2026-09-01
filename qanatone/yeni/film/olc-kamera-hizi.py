#!/usr/bin/env python
# OLC-KAMERA-HIZI (GECE TUR 5 hazirligi, 1-2 Eyl 2026).
# Amac: hikaye cumleleri "kendi duraginin DURAN aninda" gorunecek
# (talimat); duran an GOZLE degil OLCUMLE secilir (animasyon-referansi-
# kunyeden ilkesi). Olcut: ardisik karelerin gri, 160x90'a indirilmis
# hallerinin ortalama mutlak piksel farki — optik akisin ucuz vekili.
# Kamera ve sahne hareketi birlikte olculur; metin yerlesimi icin
# ayrim gerekmez (ikisi de okunabilirligi bozar).
# Cikti: olc-kamera-hizi.json — klip basina saniyelik hiz egrisi +
# en durgun 2 sn'lik pencere (bas_sn, ort_fark).
import json, subprocess, os, sys

D = os.path.join(os.path.dirname(__file__), '..', 'public', 'varlik', 'film')
W, H = 160, 90
FPS = 8          # 8 ornek/sn yeterli (24 fps kaynak; fark orani korunur)
PENCERE_SN = 2.0

son = []
for n in range(1, 40):
    yol = os.path.join(D, f'sahne{n}.mp4')
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', yol, '-vf',
                        f'fps={FPS},scale={W}:{H}', '-pix_fmt', 'gray',
                        '-f', 'rawvideo', '-'], capture_output=True)
    ham = p.stdout
    kare = len(ham) // (W * H)
    fark = []
    for i in range(1, kare):
        a = ham[(i - 1) * W * H:i * W * H]
        b = ham[i * W * H:(i + 1) * W * H]
        fark.append(sum(abs(x - y) for x, y in zip(a, b)) / (W * H))
    # saniyelik egri
    egri = [round(sum(fark[i:i + FPS]) / max(1, len(fark[i:i + FPS])), 2)
            for i in range(0, len(fark), FPS)]
    # en durgun PENCERE_SN'lik pencere
    pw = int(PENCERE_SN * FPS)
    en = None
    for i in range(0, max(1, len(fark) - pw)):
        o = sum(fark[i:i + pw]) / pw
        if en is None or o < en[1]:
            en = (i / FPS, o)
    son.append({'n': n, 'sn_egrisi': egri,
                'durgun': {'bas_sn': round(en[0], 2), 'ort_fark': round(en[1], 2)} if en else None,
                'ort': round(sum(fark) / max(1, len(fark)), 2)})
    print(f'sahne{n}: ort {son[-1]["ort"]} · en durgun @{son[-1]["durgun"]["bas_sn"]} sn ({son[-1]["durgun"]["ort_fark"]})')

with open(os.path.join(os.path.dirname(__file__), 'olc-kamera-hizi.json'), 'w', encoding='utf-8') as f:
    json.dump({'_': 'yeni/film/olc-kamera-hizi.py — klip ici hareket vekili: 160x90 gri ardisik kare ort. mutlak farki, 8 ornek/sn; durgun = en dusuk 2 sn pencere. TUR 5 metin yerlesimi bu olcumle secilir.',
               'klip': son}, f, ensure_ascii=False, indent=1)
print('yazildi: olc-kamera-hizi.json')
