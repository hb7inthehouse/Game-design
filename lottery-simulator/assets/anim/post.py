# Post-processing for the A1-A15 frames cut by anim2.py
import numpy as np, json
from PIL import Image
meta=json.load(open('frames.json'))
def frames(name):
    s=np.array(Image.open(name+'.webp').convert('RGBA')); w=meta[name]['w']
    return [s[:,i*w:(i+1)*w] for i in range(meta[name]['frames'])]
def save(name,fs):
    Image.fromarray(np.concatenate(fs,1)).save(name+'.webp','WEBP',lossless=True,method=6)
    meta[name]['w']=fs[0].shape[1]; meta[name]['h']=fs[0].shape[0]
# A1: line every lever frame up on the centre of its gold base so it doesn't wobble
fs=frames('lever'); out=[]; PAD=20
for f in fs:
    r,g,b,a=[f[...,i].astype(int) for i in range(4)]
    gold=(r>200)&(g>130)&(b<90)&(a>200); gold[:85]=False; gold[:,60:]=False
    xs=np.where(gold.any(0))[0]; c=(xs.min()+xs.max()+1)/2
    canvas=np.zeros((f.shape[0],f.shape[1]+2*PAD,4),'uint8')
    dx=int(round(45.5-c))+PAD; canvas[:,dx:dx+f.shape[1]]=f; out.append(canvas)
save('lever',out)
# A12: the star outlines came out dark after removing the white sheet; make them bright gold-white
fs=frames('sparkle'); out=[]
for f in fs:
    f=f.copy(); lum=f[...,:3].astype(int).mean(2)
    dark=(lum<110)&(f[...,3]>60)
    f[dark,:3]=[255,246,196]; f[dark,3]=255; out.append(f)
save('sparkle',out)
json.dump(meta,open('frames.json','w'),indent=1)
print(meta['lever'],meta['sparkle'])
