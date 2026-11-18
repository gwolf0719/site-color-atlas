"""驗證色卡 ID、角色、色值與預覽使用的文字配對。"""
import json
from pathlib import Path
import re

FORBIDDEN = set("""
274A60 526B79 884934 5B4C45 323538 82582F 304A38 626044 544459 675E6E
F4F5F7 FFFFFF EAECEF 20252D 515966 DFE1E5 733731 873E37
F0F2F5 E1E7EF 202A36 4D5A68 CDD5DE 293F59 784940
F1F1F2 E3E1E0 292524 56504D D4D2D2 503A32 805345
F2F3F4 E8E9EB 282C27 4E5750 D2D6D7 414C34 7B4236
F3F2F4 E8E6EB 2C2630 564E5D D6D1DB 4F3B50 743D51
""".split())
ROLES = set('canvas surface text muted primary onPrimary accent onAccent'.split())
PAIRS = [('text','canvas'),('muted','canvas'),('text','surface'),('muted','surface'),
         ('onPrimary','primary'),('onAccent','accent')]

def luminance(color):
    rgb = [int(color[i:i+2],16)/255 for i in (1,3,5)]
    linear = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    return sum(v*w for v,w in zip(linear,(.2126,.7152,.0722)))

root = Path(__file__).parent
rows = json.loads((root/'palettes.json').read_text())
assert rows and len(rows) == len({p['id'] for p in rows})
minimum = 21
for p in rows:
    colors = p['colors']
    assert set(colors) == ROLES and re.fullmatch('[a-z0-9-]+',p['id'])
    for color in colors.values():
        assert re.fullmatch('#[0-9A-F]{6}',color) and color[1:] not in FORBIDDEN, color
    for a,b in PAIRS:
        low,high = sorted(map(luminance,(colors[a],colors[b])))
        ratio = (high+.05)/(low+.05)
        assert ratio >= 4.5, (p['id'],a,b,ratio)
        minimum = min(ratio,minimum)
for name in ('index.html','style.css','app.js','mixer.css','mixer.js','ring.js','mixer-data.mjs','chromatic-scene.js','exhibition.css','desk.css','paper-interactions.mjs','commercial-color.mjs'):
    assert not FORBIDDEN.intersection(re.findall(r'#([0-9A-F]{6})\b',(root/name).read_text().upper()))
print(f'{len(rows)} 組色卡，{len(rows)*len(PAIRS)} 組文字配對，最低 {minimum:.2f}∶1。')

family_data = (root/'mixer-data.mjs').read_text()
assert not FORBIDDEN.intersection(re.findall(r'''["']([A-F0-9]{6})["']''',family_data))
