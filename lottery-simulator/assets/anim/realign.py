# Re-line-up the A-sheets: trim every frame, then anchor all frames of a sheet on the same point
# (centre, bottom-centre, or a coloured part such as the gold base), and drop frames that don't match.
import numpy as np, json
from PIL import Image
meta=json.load(open('frames.json'))
def frames(name):
    s=np.array(Image.open(name+'.webp').convert('RGBA')); w=meta[name]['w']
    return [s[:,i*w:(i+1)*w] for i in range(meta[name]['frames'])]
def gold(f): r,g,b,a=[f[...,i].astype(int) for i in range(4)]; return (r>200)&(g>130)&(b<90)&(a>200)
def brown(f): r,g,b,a=[f[...,i].astype(int) for i in range(4)]; return (r>90)&(r<210)&(g>35)&(g<120)&(b<75)&(r>g+30)&(a>200)
def bbox(m):
    ys,xs=np.where(m)
    return (xs.min(),ys.min(),xs.max()+1,ys.max()+1) if len(xs) else None
SPEC={ # name: (keep, anchor, anchor-mask)
 'reel-spin':(None,'center',None), 'reel-stop':([2,3,4,5],'center',None),
 'lights':(None,'center',None), 'trombone':(None,'leftbottom',gold), 'siren':(None,'bottom',gold),
 'coins':(None,'bottom',None), 'coin':(None,'center',None), 'banana':(None,'center',None),
 'confetti-gold':(None,'center',None), 'confetti-color':(None,'center',None), 'sparkle':(None,'center',None),
 'wallet':(None,'bottom',brown), 'neon':([0,1,2],'center',None), 'mini-slot':(None,'bottom',None),
 'patron':(None,'bottom',None), 'chandelier':(None,'center',None), 'glow':(None,'center',None)}
GROUP={'reel-spin':'reel','reel-stop':'reel'}
prepared={}
for name,(keep,anchor,amask) in SPEC.items():
    fs=frames(name)
    if keep: fs=[fs[i] for i in keep]
    items=[]
    for f in fs:
        a=f[...,3]>40
        if name=='neon':   # drop stray specks far from the sign
            a[:, int(f.shape[1]*0.6):]=False; f=f.copy(); f[...,3]=np.where(a,f[...,3],0)
        bb=bbox(a)
        ab=bbox(amask(f)) if amask else bb
        if ab is None: ab=bb
        if anchor=='center': ax,ay=(ab[0]+ab[2])/2,(ab[1]+ab[3])/2
        elif anchor=='bottom': ax,ay=(ab[0]+ab[2])/2,ab[3]
        else: ax,ay=ab[0],ab[3]
        items.append((f,bb,ax,ay))
    prepared[name]=items
def place(names):
    allit=[it for n in names for it in prepared[n]]
    L=max(ax-bb[0] for f,bb,ax,ay in allit); R=max(bb[2]-ax for f,bb,ax,ay in allit)
    T=max(ay-bb[1] for f,bb,ax,ay in allit); B=max(bb[3]-ay for f,bb,ax,ay in allit)
    W=int(np.ceil(L+R))+4; H=int(np.ceil(T+B))+4
    for n in names:
        out=[]
        for f,bb,ax,ay in prepared[n]:
            c=np.zeros((H,W,4),'uint8')
            x0=int(round(2+L-(ax-bb[0]))); y0=int(round(2+T-(ay-bb[1])))
            crop=f[bb[1]:bb[3],bb[0]:bb[2]]
            c[y0:y0+crop.shape[0],x0:x0+crop.shape[1]]=crop
            out.append(c)
        Image.fromarray(np.concatenate(out,1)).save(n+'.webp','WEBP',lossless=True,method=6)
        meta[n]={'frames':len(out),'w':W,'h':H}
done=set()
for n in SPEC:
    if n in done: continue
    g=[m for m in SPEC if GROUP.get(m) and GROUP.get(m)==GROUP.get(n)] or [n]
    place(g); done.update(g)
# sheets no longer used (replaced by the T2 lever, the T6 FAIL text and the real photos)
for n in ['lever','fail','rare-reveal','rare-idle']:
    meta.pop(n,None)
json.dump(meta,open('frames.json','w'),indent=1)
print(json.dumps({k:[v['frames'],v['w'],v['h']] for k,v in meta.items()}))
