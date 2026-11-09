import numpy as np
from PIL import Image
from scipy import ndimage
OUT='/home/user/Game-design/lottery-simulator/assets/'
def load(f): return Image.open(f).convert('RGBA')
def save(im,name,maxw=None,q=86):
    if maxw and im.width>maxw:
        im=im.resize((maxw,round(im.height*maxw/im.width)),Image.LANCZOS)
    im.save(OUT+name+'.webp','WEBP',quality=q,method=6)
    return im.size
def trim(im,thr=10):
    a=np.array(im)[...,3]; ys,xs=np.where(a>thr)
    return im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
def clean_main(im,thr=200):
    # keep only the largest solid component (removes fringe junk)
    arr=np.array(im); m=arr[...,3]>thr
    lab,n=ndimage.label(m); sizes=ndimage.sum(m,lab,range(1,n+1))
    keep=lab==(np.argmax(sizes)+1); keep=ndimage.binary_fill_holes(keep)
    arr[...,3]=np.where(keep,arr[...,3],0); return trim(Image.fromarray(arr))
sizes={}
# background
bg=load('3c01bc25-image.png'); flat=Image.new('RGBA',bg.size,(20,20,51,255)); flat.alpha_composite(bg)
flat.convert('RGB').save(OUT+'bg.webp','WEBP',quality=80,method=6); sizes['bg']=flat.size
# machine: knock out magenta screen, cut the lever into its own sprite
m=load('fc12734e-image.png'); a=np.array(m).astype(int)
r,g,b=a[...,0],a[...,1],a[...,2]
scr=np.zeros(r.shape,bool); scr[420:785,205:878]=True
mag=scr&(g<120)&(r>90)&(b>90)&(np.abs(r-b)<90)
a[...,3]=np.where(mag,0,a[...,3])
LX,LY0,LY1=976,392,716
lever=a[LY0:LY1,LX:].copy()
a[LY0:LY1,LX:,3]=0
sizes['machine']=save(Image.fromarray(a.astype('uint8')),'machine')
sizes['lever']=save(Image.fromarray(lever.astype('uint8')),'lever')
# title
sizes['title']=save(trim(load('3ef9cccd-image.png')),'title',1200)
# buttons
B=load('066c1198-image.png')
rows={'easy':(16,250),'normal':(254,487),'hard':(491,725),'real':(729,961)}
for k,(y0,y1) in rows.items():
    save(trim(B.crop((260,y0,533,y1))),f'btn-{k}',160); save(trim(B.crop((553,y0,827,y1))),f'btn-{k}-on',160)
for k,(y0,y1) in {'music':(973,1204),'sound':(1212,1442)}.items():
    for s,(x0,x1) in {'':(130,391),'-down':(413,673),'-off':(695,956)}.items():
        save(trim(B.crop((x0,y0,x1,y1))),f'btn-{k}{s}',120)
# text
T=load('d02c5a89-image.png')
for k,bx in {'fail':(110,10,1130,406),'jackpot':(30,420,1230,706),'rare':(5,708,1250,990),'broke':(100,995,1155,1254)}.items():
    sizes[k]=save(trim(T.crop(bx)),'txt-'+k,700)
# card frames
F=load('4ff984f2-image.png')
for k,bx in {'common':(23,38,525,682),'uncommon':(565,38,1065,682),'rare':(1107,5,1612,686),'locked':(1650,38,2150,686)}.items():
    im=trim(F.crop(bx)); sizes['card-'+k]=im.size
    # find the portrait window: biggest transparent hole inside the frame
    al=np.array(im)[...,3]<40
    lab,n=ndimage.label(al)
    best=None
    for i,sl in enumerate(ndimage.find_objects(lab)):
        if sl[0].start==0 or sl[1].start==0 or sl[0].stop==im.height or sl[1].stop==im.width: continue
        area=(sl[0].stop-sl[0].start)*(sl[1].stop-sl[1].start)
        if not best or area>best[0]: best=(area,sl)
    if best:
        sl=best[1]; print(k,'window %',[round(100*v,2) for v in (sl[1].start/im.width,sl[0].start/im.height,(sl[1].stop-sl[1].start)/im.width,(sl[0].stop-sl[0].start)/im.height)])
    save(im,'card-'+k,240)
# panels
P=load('caf94151-image.png')
sizes['plaque']=save(clean_main(P.crop((146,386,743,574))),'plaque',300)
sizes['plate']=save(clean_main(P.crop((31,835,1505,982))),'plate',800)
sizes['led']=save(clean_main(P.crop((774,58,1508,338))),'led',400)
# portraits
for k,f in {'finger':'fda48c20','pocket':'c14bcb5b','bignose':'060a354d','wildhair':'e67c8aa4','selfie':'9f62ecb4'}.items():
    save(load(f+'-image.png'),'monkey-'+k,420)
print(sizes)
