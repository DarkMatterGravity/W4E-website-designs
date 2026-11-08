"""Download local copies of Lucide SVGs and the two original design fonts."""
from pathlib import Path
from urllib.request import Request, urlopen
import re
import json

root = Path(__file__).resolve().parents[1]
out = root / 'assets'
names = ['paint-bucket','flame','droplets','package','fuel','sprout','flask-conical','factory','truck','recycle','warehouse','trash','arrow-right','menu','x','arrow-up-right']
def get(url):
    return urlopen(Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=30).read()

base = 'https://raw.githubusercontent.com/lucide-icons/lucide/main/'
symbols = []
for name in names:
    svg = get(base+'icons/'+name+'.svg').decode()
    inner = re.search(r'<svg[^>]*>(.*?)</svg>', svg, re.S).group(1)
    symbols.append(f'<symbol id="{name}" viewBox="0 0 24 24">{inner}</symbol>')
(out/'icons.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg">'+''.join(symbols)+'</svg>', encoding='utf-8')
(out/'LUCIDE-LICENSE.txt').write_bytes(get(base+'LICENSE'))
css=[]
for family, weights, slug in [('Montserrat','400;500;600;700','montserrat'),('Libre Baskerville','400;700','libre-baskerville')]:
    url='https://fonts.googleapis.com/css2?family='+family.replace(' ','+')+':wght@'+weights+'&display=swap'
    source=get(url).decode()
    # Google may return full fonts or separate subsets depending on the client.
    blocks=re.findall(r'@font-face\s*\{[^}]+\}',source)
    if not blocks:
        raise RuntimeError('No font definitions returned for '+family)
    for i, block in enumerate(blocks):
        remote=re.search(r'url\((https:[^)]+)\)',block).group(1)
        suffix=remote.rsplit('.',1)[1]
        name=f'{slug}-{i}.{suffix}'
        (out/name).write_bytes(get(remote))
        css.append(block.replace(remote,name))
(out/'fonts.css').write_text('\n'.join(css),encoding='utf-8')
for directory, file in [('montserrat','MONTSERRAT-OFL.txt'),('librebaskerville','LIBRE-BASKERVILLE-OFL.txt')]:
    (out/file).write_bytes(get('https://raw.githubusercontent.com/google/fonts/main/ofl/'+directory+'/OFL.txt'))
