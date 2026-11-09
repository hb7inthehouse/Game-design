import numpy as np, json
from PIL import Image
from scipy import ndimage
SRC='/root/.claude/uploads/f768a269-d293-5ce3-82c6-144a31811b8a/d1858340-image.png'
OUT='/home/user/Game-design/lottery-simulator/assets/anim/'
rgb=np.array(Image.open(SRC).convert('RGB')).astype(int)
mx=rgb.max(2); mn=rgb.min(2)
def bgmask(strict=False):
    return (mx-mn<(12 if strict else 26))&(mn>(222 if strict else 196))
P={'A1':(12,12,762,205),'A2':(778,12,1530,205),'A3':(12,222,692,345),'A4':(708,222,1530,345),
 'A5':(12,362,762,462),'A6':(775,362,1530,462),'A7':(12,478,885,592),'A8':(900,478,1530,592),
 'A9':(12,605,455,818),'A10':(467,605,1530,718),'A11':(467,732,890,818),'A12':(903,732,1530,818),
 'A13':(12,832,782,1015),'A14':(797,832,1212,1015),'A15':(1225,832,1530,1015)}
# frames per row
ROWS={'A1':[8],'A2':[4,6],'A3':[4],'A4':[6],'A5':[4],'A6':[4],'A7':[8],'A8':[6],'A9':[6,4,9],
 'A10':[8],'A11':[4],'A12':[6],'A13':[8],'A14':[3,4,4,4],'A15':[2]}
NAMES={'A1':['lever'],'A2':['reel-spin','reel-stop'],'A3':['lights'],'A4':['fail'],'A5':['trombone'],'A6':['siren'],
 'A7':['coins'],'A8':['coin'],'A9':['banana','confetti-gold','confetti-color'],'A10':['rare-reveal'],'A11':['rare-idle'],
 'A12':['sparkle'],'A13':['wallet'],'A14':['neon','mini-slot','patron','chandelier'],'A15':['glow']}
STRICT={'A12','A6','A15','A3'}
def groups(proj,n,mingap=3):
    idx=np.where(proj)[0]
    runs=[]; s=p=idx[0]
    for x in idx[1:]:
        if x>p+1: runs.append([s,p+1]); s=x
        p=x
    runs.append([s,p+1])
    while len(runs)>n:   # merge across the smallest gap
        gaps=[runs[i+1][0]-runs[i][1] for i in range(len(runs)-1)]
        i=int(np.argmin(gaps)); runs[i]=[runs[i][0],runs[i+1][1]]; del runs[i+1]
    return runs
meta={}
LABEL=np.zeros(mx.shape,bool)
for (lx0,ly0,lx1,ly1) in P.values(): LABEL[ly0-4:ly0+40,lx0-4:lx0+76]=True
def unmat(rgbc,alpha,sel,bgv=246.0):
    c=rgbc.astype(float); a=np.clip((bgv-c[...,2])/130.0,0,1)
    a=np.where(sel,a,alpha/255.0)
    safe=np.maximum(a,1e-3)[...,None]
    out=np.where(sel[...,None],np.clip((c-bgv*(1-safe))/safe,0,255),c)
    return out,(a*255)*(alpha>0)
for k,(x0,y0,x1,y1) in P.items():
    bg=bgmask(k in STRICT)[y0:y1,x0:x1]
    fg=~bg
    fg[:38,:74]=False; fg[:4,:]=fg[-4:,:]=False; fg[:,:4]=fg[:,-4:]=False
    fg=ndimage.binary_opening(fg,iterations=1)
    rows=groups(fg.any(1),len(ROWS[k]))
    if k=='A14': rows=[[2,40],[40,90],[90,137],[137,181]]
    for ri,(ry0,ry1) in enumerate(rows):
        band=fg[ry0:ry1]
        cols=groups(band.any(0),ROWS[k][ri])
        n=ROWS[k][ri]
        if len(cols)<n:
            a,b=cols[0][0],cols[-1][1]; step=(b-a)/n
            cols=[[int(a+i*step),int(a+(i+1)*step)] for i in range(n)]
        cw=max(c[1]-c[0] for c in cols)+6
        ch=ry1-ry0+6
        frames=[]
        for (cx0,cx1) in cols:
            cx=(cx0+cx1)//2
            X0=x0+cx-cw//2; Y0=y0+ry0-3
            crop=rgb[Y0:Y0+ch,X0:X0+cw]
            b=bgmask(k in STRICT)[Y0:Y0+ch,X0:X0+cw].copy()
            # only background connected to the cell border is removed
            lab,n=ndimage.label(b)
            border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
            remove=np.isin(lab,list(border))
            # also clear anything that belongs to neighbouring frames
            keep=np.zeros_like(remove); lx0=cx0-(cx-cw//2); 
            keep[:, max(0,cx0-(cx-cw//2)-2):min(cw,cx1-(cx-cw//2)+2)]=True
            alpha=np.where(remove|~keep|LABEL[Y0:Y0+ch,X0:X0+cw],0,255)
            if k=='A12':
                crop,alpha=unmat(crop,alpha,np.ones(alpha.shape,bool))
            elif k=='A15':
                c=crop; sel=(c[...,0]>190)&(c[...,1]>160)&(c[...,2]>120)
                crop,alpha=unmat(crop,alpha,sel)
            frames.append(np.dstack([crop,alpha]).astype('uint8'))
        name=NAMES[k][ri]
        # sheet: frames side by side
        sheet=np.concatenate(frames,axis=1)
        Image.fromarray(sheet).save(OUT+name+'.webp','WEBP',lossless=True,method=6)
        meta[name]={'frames':len(frames),'w':int(cw),'h':int(ch)}
json.dump(meta,open(OUT+'frames.json','w'),indent=1)
print(meta)
