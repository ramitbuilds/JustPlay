"""Original JustPlay pixel assets. No external images or generation service."""
from pathlib import Path
import random,struct,zlib
P=Path(__file__).resolve().parents[1]/'public/assets';P.mkdir(exist_ok=True)
pal={'o':'#b85e35','r':'#f3934e','l':'#ffd29b','w':'#fff4ce','k':'#253331','g':'#77b762','d':'#315840','c':'#b5edc0','b':'#6589aa','p':'#d1a3ec','a':'#493e6f','y':'#f6ce70','t':'#4b626d','s':'#9eb4ad','n':'#7cdecc','h':'#34434e'}
patterns={
'fox':['................','...oo......oo...','...orro..orro...','...orrrrorrrro..','..orrrrrrrrrro..','..orwkwrrwkwro..','..orwwwrrwwwro..','...orwwkkwwro...','....orrwwrro....','.....orrrro.....','..o..orrrro.....','.orooorrrrro....','.olrorrwrrro....','..olloowwoo.....','.....oo..oo.....','................'],
'robot':['................','......nn........','......tt........','....tttttttt....','...tsssssssst...','...tsnkkknnst...','...tsnkkknnst...','...tsssssssst...','....tttttttt....','...tssnnssst....','..ttssnnssstt...','..ntssssssstn...','....tsssst......','....tt..tt......','....nn..nn......','................'],
'knight':['................','.....yyyy.......','....tsssst......','...tsssssst.....','...tsskkkkt.....','...tsskkkkt.....','...tsssssst.....','....tsssst......','...aaassaaa.....','..aspaaaaas.....','..asaaaaaas.....','..asaaaaaas.....','...aaaayaa......','....tt..tt......','....ss..ss......','................'],
'slime':['................','................','................','................','................','................','.....gggggg.....','...ggccccggg....','..ggccccccggg...','..gckgckgccgg...','.ggckgckgccggg..','.ggccccccccggg..','.ggggggggggggg..','..ddddddddddd...','................','................'],
'bat':['................','................','................','................','.a............a.','.aa...aa.....aa.','.apa.aaaa.aapaa.','.appaaaaaaappaa.','..apapppppppaa..','...aapkpkppaa...','....aapppaaa....','.....aappaa.....','......aaaa......','................','................','................'],
'crystal':['................','.......c........','......cnc.......','.....cnnwc......','....cnnnnwc.....','....cnnnnwc.....','....cnnnnwc.....','....cnnnnwc.....','....cnnnnwc.....','....cnnnnwc.....','.....cnnnc......','......cnc.......','.......c........','................','................','................'],
}
for name,rows in patterns.items():
 frames=[]; pixels=bytearray(64*16*4)
 for f in range(4):
  for y,row in enumerate(rows):
   for x,c in enumerate(row):
    if c=='.':continue
    yy=y
    if f%2 and (y>12 or name in ['bat','slime']):yy=y-1
    color=bytes.fromhex(pal[c][1:])+bytes([255]);i=(yy*64+f*16+x)*4;pixels[i:i+4]=color
    frames.append(f'<rect x="{f*16+x}" y="{yy}" width="1" height="1" fill="{pal[c]}"/>')
 svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="16" viewBox="0 0 64 16">'+''.join(frames)+'</svg>'
 def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
 raw=b''.join(bytes([0])+pixels[y*256:(y+1)*256] for y in range(16))
 (P/(name+'.png')).write_bytes(bytes([137,80,78,71,13,10,26,10])+chunk(b'IHDR',struct.pack('>IIBBBBB',64,16,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))

# Static layered artwork; uses only authored pixels and deterministic composition.
for theme in ['forest','neon','dungeon']:
 rng=random.Random(84);shapes=[]
 def rect(x,y,w,h,c):shapes.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/>')
 if theme=='forest':
  rect(0,0,640,360,'#173e3c');rect(0,150,640,210,'#215249')
  for x in range(-40,700,70):
   rect(x,55,18,250,'#28584b');rect(x-30,36,80,50,'#2c6050');rect(x-15,20,62,35,'#2c6050')
  for x in range(-20,700,95):
   y=rng.randrange(70,140);rect(x,y,23,230,'#1b4038');rect(x-30,y,85,45,'#3c7351');rect(x-45,y+30,115,45,'#376b4a');rect(x-20,y-20,65,35,'#488256');rect(x+4,y+50,4,130,'#285344')
  for _ in range(100):
   x=rng.randrange(640);y=rng.randrange(360);rect(x,y,2,2,rng.choice(['#61986a','#598363','#325b4b']))
  for x in range(0,640,36):
   y=rng.randrange(285,330);rect(x,y,38,34,'#2a654b');rect(x+7,y-8,22,20,'#3e7b52')
 elif theme=='neon':
  rect(0,0,640,360,'#161b37');rect(0,150,640,210,'#242340');rect(490,40,40,40,'#f1a68f');rect(484,49,52,24,'#f1a68f')
  for layer in range(2):
   for x in range(-20,680,40 if layer==0 else 72):
    w=rng.randrange(28,55);y=rng.randrange(80 if layer==0 else 140,220);rect(x,y,w,360-y,'#242946' if layer==0 else '#303049');rect(x+8,y-9,3,9,'#4c4761')
    for yy in range(y+10,310,15):
     for xx in range(x+5,x+w-4,10):
      if rng.random()>.35:rect(xx,yy,3,5,rng.choice(['#b77892','#6897a1','#787493']))
    if layer==1:rect(x+3,y+25,w-6,3,'#f58b96');rect(x+4,y+28,3,20,'#f58b96')
  for _ in range(65):rect(rng.randrange(640),rng.randrange(270),1,3,'#718592')
 else:
  rect(0,0,640,360,'#252637')
  for y in range(0,360,32):
   for x in range(-32,640,48):
    xx=x+(24 if y%64 else 0);rect(xx+1,y+1,46,30,rng.choice(['#303142','#343547','#38394a']));rect(xx+4,y+3,40,2,'#414155')
  for x in [32,160,464,592]:
   rect(x,10,22,310,'#242736');rect(x-4,10,30,12,'#555365');rect(x+3,24,4,274,'#454459');rect(x-4,306,30,12,'#555365')
  for x in [76,536]:
   rect(x,123,12,33,'#665254');rect(x+2,115,8,18,'#ed996b');rect(x+4,110,4,18,'#ffda93')
  rect(230,0,180,6,'#575168');rect(230,354,180,6,'#575168')
 svg='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" shape-rendering="crispEdges">'+''.join(shapes)+'</svg>'
 (P/(theme+'.svg')).write_text(svg)
