#!/usr/bin/env python3
"""Generates the looping animated SVG diagrams in public/anim/. Original artwork, MIT like the repo.
Run: python3 scripts/make-anims.py"""
import os
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "anim")
os.makedirs(OUT, exist_ok=True)
BG, PANEL, LINE, INK, MUTED = "#0d0b1a", "#17132b", "#2e2858", "#e8e6ff", "#8480b8"
PINK, CYAN, YEL, GREEN, RED = "#ff3fa4", "#6ff6ff", "#ffd84a", "#7ddeaf", "#ff8aa8"
W, H = 720, 320

def svg(name, title, body, css="", h=H):
    doc = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {h}" width="{W}" height="{h}" role="img" aria-label="{title}">
<title>{title}</title>
<style>
text{{font-family:ui-monospace,Menlo,Consolas,monospace;fill:{INK};font-size:14px}}
.t{{font-size:12px;fill:{MUTED}}} .h{{font-size:15px;font-weight:700;fill:{YEL};letter-spacing:1px}}
.box{{fill:{PANEL};stroke:{LINE};stroke-width:2}} .wire{{stroke:{LINE};stroke-width:3;fill:none;stroke-dasharray:6 6}}
.flow{{animation:dash 1s linear infinite}} @keyframes dash{{to{{stroke-dashoffset:-12}}}}
@keyframes blink{{0%,49%{{opacity:1}}50%,100%{{opacity:0}}}}
{css}
@media (prefers-reduced-motion: reduce){{*{{animation:none!important}}}}
</style>
<rect width="{W}" height="{h}" fill="{BG}"/>
<g opacity=".25">{''.join(f'<rect x="0" y="{y}" width="{W}" height="1" fill="{LINE}"/>' for y in range(0,h,4))}</g>
<text x="20" y="28" class="h">{title.upper()}</text>
{body}
</svg>'''
    with open(os.path.join(OUT, name + ".svg"), "w") as f:
        f.write(doc)

def box(x, y, w, h, label, sub="", color=LINE, cls="box"):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" class="{cls}" style="stroke:{color}"/>'
    s += f'<text x="{x+w/2}" y="{y+h/2+(0 if sub else 5)}" text-anchor="middle">{label}</text>'
    if sub: s += f'<text x="{x+w/2}" y="{y+h/2+18}" text-anchor="middle" class="t">{sub}</text>'
    return s

def mover(path, color, dur, begin="0s", r=7, shape="rect"):
    if begin != "0s" and not begin.startswith("-"): begin = "-" + begin
    el = f'<rect x="-{r}" y="-{r}" width="{2*r}" height="{2*r}" fill="{color}">' if shape == "rect" else f'<circle r="{r}" fill="{color}">'
    end = "</rect>" if shape == "rect" else "</circle>"
    return f'{el}<animateMotion dur="{dur}" begin="{begin}" repeatCount="indefinite" path="{path}"/>{end}'

# 1 transaction flow
svg("tx-flow", "Life of a NEAR transaction",
    box(20,110,110,70,"Wallet","signs tx",PINK)+box(170,110,110,70,"RPC node","forwards")+box(320,110,120,70,"Validators","chunk+block",CYAN)
    +box(480,110,100,70,"Receipt","on shard")+box(610,110,90,70,"Contract","executes",GREEN)
    +''.join(f'<path class="wire flow" d="M{a} 145 H{b}"/>' for a,b in [(130,170),(280,320),(440,480),(580,610)])
    +mover("M75 145 H655",YEL,"4s")
    +'<text x="20" y="230" class="t">1. Wallet signs with your access key  2. RPC forwards it  3. Validators add it to a chunk</text>'
    +'<text x="20" y="252" class="t">4. It becomes a receipt on the receiver shard  5. Contract runs, burns gas, returns</text>'
    +'<text x="20" y="290" fill="'+GREEN+'">~1-2 s finality</text>')

# 2 access keys
svg("access-keys", "Access keys on one account",
    box(260,60,200,60,"alice.testnet","account",YEL)
    +box(60,190,250,80,"Full access key","can do anything",PINK)+box(410,190,250,80,"Function-call key","only diploma.*::mint",CYAN)
    +'<path class="wire flow" d="M330 120 L185 190"/><path class="wire flow" d="M390 120 L535 190"/>'
    +f'<text x="535" y="300" text-anchor="middle" class="t">allowance 0.25 N, no deposits</text>'
    +f'<g style="animation:blink 1.6s steps(1) infinite"><text x="185" y="300" text-anchor="middle" fill="{RED}">keep offline!</text></g>')

# 3 cross-contract call
css = f".blk{{animation:pulse 6s infinite}} .b2{{animation-delay:2s}} .b3{{animation-delay:4s}} @keyframes pulse{{0%,30%{{fill:{PINK}33}}34%,100%{{fill:{PANEL}}}}}"
svg("cross-contract", "Cross-contract call with callback",
    f'<rect class="box blk" x="40" y="60" width="180" height="40" style="stroke:{PINK}"/><text x="130" y="85" text-anchor="middle">block N</text>'
    f'<rect class="box blk b2" x="270" y="60" width="180" height="40" style="stroke:{CYAN}"/><text x="360" y="85" text-anchor="middle">block N+1</text>'
    f'<rect class="box blk b3" x="500" y="60" width="180" height="40" style="stroke:{GREEN}"/><text x="590" y="85" text-anchor="middle">block N+2</text>'
    +box(60,150,180,80,"Contract A","ext_b::get()",PINK)+box(480,150,180,80,"Contract B","fn get()",CYAN)
    +'<path class="wire flow" d="M240 175 H480"/><path class="wire flow" d="M480 210 H240"/>'
    +mover("M240 175 H480",YEL,"6s")+mover("M480 210 H240 H240",GREEN,"6s","3s")
    +'<text x="360" y="168" text-anchor="middle" class="t">Promise (receipt)</text><text x="360" y="232" text-anchor="middle" class="t">.then(on_result) callback</text>'
    +f'<text x="20" y="285" class="t">A is NOT paused: its state changes in block N are already committed.</text>'
    +f'<text x="20" y="305" fill="{YEL}">Handle failure in the callback and roll back by hand.</text>', css)

# 4 storage staking
css = f".fill{{animation:grow 6s ease-in-out infinite}} @keyframes grow{{0%{{width:20px}}70%,100%{{width:440px}}}} .lock{{animation:grow2 6s ease-in-out infinite}} @keyframes grow2{{0%{{width:8px}}70%,100%{{width:176px}}}}"
svg("storage-staking", "Storage staking",
    '<text x="40" y="90">Bytes stored</text>'
    +f'<rect x="200" y="72" width="460" height="28" class="box"/><rect class="fill" x="210" y="78" height="16" fill="{CYAN}"/>'
    +'<text x="40" y="160">NEAR locked</text>'
    +f'<rect x="200" y="142" width="460" height="28" class="box"/><rect class="lock" x="210" y="148" height="16" fill="{PINK}"/>'
    +'<text x="40" y="230" class="t">1 NEAR locks 100 kB (1e19 yoctoNEAR per byte). Locked, not spent.</text>'
    +'<text x="40" y="252" class="t">Delete data and it unlocks. Charge users a deposit for storage.</text>'
    +f'<text x="40" y="292" fill="{GREEN}">env::storage_usage() before/after -> refund the difference</text>', css)

# 5 NFT mint
svg("nft-mint", "Minting a NEP-171 NFT",
    box(30,90,170,80,"mint_diploma()","attached 0.02 N",PINK)+box(275,90,170,80,"token_id","near:alice",YEL)+box(520,90,170,80,"owner","alice.testnet",GREEN)
    +'<path class="wire flow" d="M200 130 H275"/><path class="wire flow" d="M445 130 H520"/>'
    +mover("M115 130 H605",CYAN,"3.5s")
    +f'<rect x="30" y="200" width="660" height="60" class="box" style="stroke:{CYAN}"/>'
    +f'<text x="45" y="225" class="t">log:</text><text x="90" y="225" fill="{CYAN}" style="animation:blink 1.2s steps(1) infinite">EVENT_JSON:{{"standard":"nep171","event":"nft_mint",</text>'
    +f'<text x="90" y="245" fill="{CYAN}">"data":[{{"owner_id":"alice.testnet","token_ids":["near:alice"]}}]}}</text>'
    +'<text x="30" y="295" class="t">Indexers and wallets watch NEP-297 events to show the NFT instantly.</text>')

# 6 chain signatures
svg("chain-signatures", "Chain Signatures",
    box(30,120,160,70,"alice.near","sign(payload,path)",PINK)+box(280,120,160,70,"v1.signer","MPC network",YEL)
    +box(530,60,160,60,"Bitcoin","derived addr",CYAN)+box(530,190,160,60,"Ethereum","derived addr",GREEN)
    +'<path class="wire flow" d="M190 155 H280"/><path class="wire flow" d="M440 145 L530 90"/><path class="wire flow" d="M440 165 L530 220"/>'
    +mover("M110 155 H360 L610 90",YEL,"4s")+mover("M110 155 H360 L610 220",GREEN,"4s","2s")
    +'<text x="30" y="295" class="t">No bridge: MPC nodes jointly sign for an address derived from account+path.</text>')

# 7 intents
css = f".s{{animation:bid 3s infinite}} .s2{{animation-delay:1s}} .s3{{animation-delay:2s}} @keyframes bid{{0%,20%{{stroke:{YEL}}}30%,100%{{stroke:{LINE}}}}}"
svg("intents", "NEAR Intents",
    box(20,120,170,70,"User intent","swap 10 USDC->NEAR",PINK)
    +''.join(f'<rect class="box s s{i+1}" x="270" y="{55+i*80}" width="150" height="56"/><text x="345" y="{88+i*80}" text-anchor="middle">solver {i+1}</text>' for i in range(3))
    +box(510,120,190,70,"intents.near","verifies + settles",GREEN)
    +'<path class="wire flow" d="M190 155 L270 83 M190 155 L270 163 M190 155 L270 243"/><path class="wire flow" d="M420 163 H510"/>'
    +mover("M105 155 L345 163 H605",YEL,"3s")
    +'<text x="20" y="300" class="t">You state the outcome, solvers compete, the verifier settles it.</text>', css)

# 8 blocks chain
css = ".nb{animation:slide 4s ease-out infinite} @keyframes slide{0%{transform:translateX(120px);opacity:0}40%,100%{transform:none;opacity:1}}"
blocks = ''.join(box(30+i*170,110,130,80,f"block {i+101}",f"prev: {'a9c3 0b1d 77e2'.split()[i]}",CYAN)+(f'<path class="wire flow" d="M{160+i*170} 150 H{200+i*170}"/>' ) for i in range(3))
svg("blockchain", "Blocks link by hash",
    blocks+f'<g class="nb">{box(540,110,140,80,"block 104","prev: 4f60",PINK)}</g>'
    +'<text x="30" y="240" class="t">Each block stores the previous block hash. Edit an old block</text>'
    +'<text x="30" y="262" class="t">and every later hash breaks, so no one can quietly rewrite history.</text>', css)

# 9 view vs change
svg("view-vs-change", "View call vs change call",
    box(30,70,150,60,"dApp","view",CYAN)+box(290,70,150,60,"RPC","query",CYAN)+box(540,70,150,60,"state","read only",CYAN)
    +'<path class="wire flow" d="M180 100 H290 M440 100 H540"/>'+mover("M105 100 H615",CYAN,"2s")
    +box(30,190,150,60,"dApp","change",PINK)+box(290,190,150,60,"Wallet","signs + gas",PINK)+box(540,190,150,60,"state","writes",PINK)
    +'<path class="wire flow" d="M180 220 H290 M440 220 H540"/>'+mover("M105 220 H615",YEL,"4s")
    +f'<text x="700" y="105" text-anchor="end" class="t">free</text><text x="700" y="290" text-anchor="end" fill="{YEL}">costs gas, needs a signature</text>')

# 10 event loop
css = ""
svg("event-loop", "The JavaScript event loop",
    box(20,50,170,200,"","",PINK)+'<text x="105" y="72" text-anchor="middle" fill="#ff3fa4">Call stack</text>'
    +box(270,50,200,90,"","",CYAN)+'<text x="370" y="72" text-anchor="middle" fill="#6ff6ff">Web APIs</text><text x="370" y="110" text-anchor="middle" class="t">setTimeout, fetch</text>'
    +box(270,165,420,40,"","",GREEN)+'<text x="280" y="190" class="t">microtasks</text>'
    +box(270,225,420,40,"","",YEL)+'<text x="280" y="250" class="t">macrotasks</text>'
    +mover("M105 230 V100 H370 V100",CYAN,"6s",r=9)
    +f'<g><rect x="430" y="175" width="60" height="20" fill="{GREEN}"><animate attributeName="x" values="600;430;430;105;105" keyTimes="0;.3;.5;.7;1" dur="6s" repeatCount="indefinite"/><animate attributeName="y" values="175;175;175;175;120" keyTimes="0;.3;.5;.7;1" dur="6s" repeatCount="indefinite"/></rect></g>'
    +f'<rect x="600" y="235" width="60" height="20" fill="{YEL}"><animate attributeName="x" values="640;520;520;105" keyTimes="0;.4;.8;1" dur="6s" repeatCount="indefinite"/><animate attributeName="y" values="235;235;235;90" keyTimes="0;.4;.8;1" dur="6s" repeatCount="indefinite"/></rect>'
    +'<text x="20" y="300" class="t">Stack empty -> run ALL microtasks -> then ONE macrotask -> repeat.</text>')

# 11 box model
css = ".p{animation:breathe 3s ease-in-out infinite alternate} @keyframes breathe{to{stroke-width:14}}"
svg("box-model", "The CSS box model",
    f'<rect x="120" y="50" width="480" height="230" fill="{YEL}22" stroke="{YEL}" stroke-dasharray="6 4"/><text x="130" y="68" fill="{YEL}">margin</text>'
    f'<rect x="170" y="80" width="380" height="170" fill="none" stroke="{PINK}" stroke-width="6" class="p"/><text x="182" y="102" fill="{PINK}">border</text>'
    f'<rect x="200" y="110" width="320" height="110" fill="{CYAN}22" stroke="{CYAN}"/><text x="210" y="128" fill="{CYAN}">padding</text>'
    f'<rect x="270" y="140" width="180" height="50" fill="{GREEN}33" stroke="{GREEN}"/><text x="360" y="170" text-anchor="middle" fill="{GREEN}">content</text>'
    +'<text x="20" y="305" class="t">box-sizing: border-box -> width includes padding + border, never margin.</text>', css)

# 12 grid
css = ".gi{animation:span 6s ease-in-out infinite} @keyframes span{0%,30%{width:130px}45%,80%{width:280px}95%,100%{width:130px}} .gj{animation:mv 6s ease-in-out infinite} @keyframes mv{0%,30%{transform:none}45%,80%{transform:translate(-150px,90px)}95%,100%{transform:none}}"
cells = ''.join(f'<rect x="{60+c*150}" y="{50+r*90}" width="130" height="70" fill="none" stroke="{LINE}" stroke-dasharray="4 4"/>' for r in range(3) for c in range(4))
svg("css-grid", "CSS Grid tracks and spans",
    cells+f'<rect class="gi" x="60" y="50" height="70" fill="{PINK}aa"/><text x="70" y="90">grid-column: span 2</text>'
    +f'<rect x="360" y="50" width="130" height="70" fill="{CYAN}88"/><text x="370" y="90">item</text>'
    +f'<g class="gj"><rect x="510" y="50" width="130" height="70" fill="{YEL}88"/><text x="520" y="90" style="fill:{BG}">auto-placed</text></g>'
    +f'<rect x="60" y="140" width="130" height="160" fill="{GREEN}55"/><text x="70" y="180">row span 2</text>'
    +f'<text x="700" y="312" text-anchor="end" class="t">grid-template-columns: repeat(4, 1fr); gap: 20px</text>', css)

# 13 flexbox
css = ".fx{animation:jc 8s steps(1) infinite} " + "".join(f".f{i}{{animation:f{i} 8s ease-in-out infinite}} @keyframes f{i}{{0%,22%{{transform:translateX({i*100}px)}}25%,47%{{transform:translateX({200+i*100}px)}}50%,72%{{transform:translateX({i*230}px)}}75%,97%{{transform:translateX({40+i*200}px)}}100%{{transform:translateX({i*100}px)}}}}" for i in range(3))
svg("flexbox", "Flexbox: justify-content",
    f'<rect x="40" y="80" width="640" height="110" class="box"/>'
    +''.join(f'<g class="f{i}"><rect x="50" y="100" width="90" height="70" fill="{[PINK,CYAN,YEL][i]}"/><text x="95" y="140" text-anchor="middle" style="fill:{BG}">{i+1}</text></g>' for i in range(3))
    +f'<g style="font-size:13px"><text x="40" y="230" fill="{PINK}">flex-start</text><text x="190" y="230" fill="{CYAN}">flex-end</text><text x="330" y="230" fill="{YEL}">space-between</text><text x="510" y="230" fill="{GREEN}">space-around</text></g>'
    +'<text x="40" y="280" class="t">Main axis = row by default. align-items works on the cross axis.</text>', css)

# 14 DOM events
svg("dom-events", "Event capture, target, bubble",
    f'<rect x="200" y="45" width="320" height="240" class="box"/><text x="215" y="66">document</text>'
    f'<rect x="240" y="80" width="240" height="180" class="box"/><text x="255" y="100">ul#list</text>'
    f'<rect x="280" y="120" width="160" height="110" class="box"/><text x="295" y="140">li</text>'
    f'<rect x="310" y="160" width="100" height="45" class="box" style="stroke:{PINK}"/><text x="360" y="188" text-anchor="middle" fill="{PINK}">button</text>'
    +mover("M120 60 V182",CYAN,"4s",shape="circle")+mover("M600 182 V60",YEL,"4s","2s",shape="circle")
    +f'<text x="40" y="200" fill="{CYAN}">1 capture</text><text x="560" y="300" fill="{YEL}">3 bubble</text><text x="300" y="305" fill="{PINK}">2 target</text>'
    +'<text x="555" y="45" class="t">one listener on</text><text x="555" y="60" class="t">ul = delegation</text>')

# 15 async fetch timeline
css = f".bar{{animation:load 5s linear infinite}} @keyframes load{{0%{{width:0}}60%,100%{{width:360px}}}} .ok{{animation:show 5s steps(1) infinite}} @keyframes show{{0%,59%{{opacity:0}}60%,100%{{opacity:1}}}}"
svg("async-await", "await pauses the function, not the page",
    '<text x="30" y="85">const res = await fetch(url)</text>'
    +f'<rect x="300" y="68" width="370" height="24" class="box"/><rect class="bar" x="305" y="73" height="14" fill="{CYAN}"/>'
    +f'<text class="ok" x="300" y="120" fill="{GREEN}">Promise fulfilled -> Response</text>'
    +'<text x="30" y="170">UI thread meanwhile:</text>'
    +''.join(f'<rect x="{300+i*45}" y="155" width="35" height="20" fill="{PINK}" style="animation:blink {0.8+i*0.1:.1f}s steps(1) infinite"/>' for i in range(8))
    +'<text x="300" y="200" class="t">clicks, scrolling, animations keep running</text>'
    +'<text x="30" y="260" class="t">Always check res.ok - fetch only rejects on network errors, not HTTP 404/500.</text>', css)

# 16 closure
css = f".bp{{animation:bob 2s ease-in-out infinite alternate}} @keyframes bob{{to{{transform:translateY(-8px)}}}}"
svg("closure", "Closures keep their scope",
    box(40,70,280,170,"","",PINK)+'<text x="55" y="95" fill="#ff3fa4">makeCounter()</text><text x="55" y="125">let count = 0</text><text x="55" y="155">return () =&gt; ++count</text><text x="55" y="215" class="t">returns, frame is gone...</text>'
    +f'<g class="bp">{box(420,90,260,130,"","",YEL)}<text x="440" y="118" fill="{YEL}">inc (closure)</text><text x="440" y="150">[[scope]] -> count</text>'
    +f'<text x="440" y="185" fill="{GREEN}">inc() -> 1, 2, 3...</text></g>'
    +'<path class="wire flow" d="M320 155 H420"/>'
    +'<text x="40" y="295" class="t">...but the inner function still references count, so it lives on, private.</text>', css)

# 17 semantic landmarks
css = f".fc{{animation:focus 6s steps(1) infinite}} @keyframes focus{{0%{{transform:translate(0,0)}}20%{{transform:translate(0,50px)}}40%{{transform:translate(0,100px)}}60%{{transform:translate(380px,100px)}}80%{{transform:translate(0,210px)}}100%{{transform:translate(0,0)}}}}"
svg("landmarks", "Semantic landmarks",
    box(120,45,480,40,"&lt;header&gt;","",CYAN)+box(120,95,480,40,"&lt;nav&gt;","",CYAN)+box(120,145,370,100,"&lt;main&gt;","the content",GREEN)+box(500,145,100,100,"&lt;aside&gt;","",CYAN)+box(120,255,480,40,"&lt;footer&gt;","",CYAN)
    +f'<g class="fc"><rect x="116" y="41" width="110" height="48" fill="none" stroke="{YEL}" stroke-width="4"/></g>'
    +f'<text x="20" y="160" class="t">screen</text><text x="20" y="176" class="t">reader</text><text x="20" y="192" class="t">jumps</text>', css)

# 18 form validation
css = f".inp{{animation:st 6s steps(1) infinite}} @keyframes st{{0%{{stroke:{LINE}}}33%{{stroke:{RED}}}66%,100%{{stroke:{GREEN}}}}} .m1{{animation:m1 6s steps(1) infinite}} @keyframes m1{{0%,32%{{opacity:0}}33%,65%{{opacity:1}}66%,100%{{opacity:0}}}} .m2{{animation:m2 6s steps(1) infinite}} @keyframes m2{{0%,65%{{opacity:0}}66%,100%{{opacity:1}}}}"
svg("form-validation", "Native form validation",
    '<text x="60" y="90">Email</text>'
    +f'<rect class="inp" x="60" y="100" width="420" height="44" fill="{PANEL}" stroke-width="3"/>'
    +f'<text class="m1" x="75" y="128">alice@</text><text class="m1" x="60" y="170" fill="{RED}">:invalid  typeMismatch - "Please enter an email"</text>'
    +f'<text class="m2" x="75" y="128">alice@near.org</text><text class="m2" x="60" y="170" fill="{GREEN}">:valid  checkValidity() === true</text>'
    +f'<rect x="520" y="100" width="140" height="44" fill="{PINK}"/><text x="590" y="128" text-anchor="middle" style="fill:{BG}">Submit</text>'
    +'<text x="60" y="240" class="t">&lt;input type="email" required&gt; + :user-invalid. Validate on the server too.</text>', css)

# 19 container queries
css = ".cw{animation:cw 6s ease-in-out infinite alternate} @keyframes cw{from{width:250px}to{width:620px}} .wide{animation:wd 6s steps(1) infinite alternate} @keyframes wd{0%,49%{opacity:0}50%,100%{opacity:1}} .nar{animation:wd2 6s steps(1) infinite alternate} @keyframes wd2{0%,49%{opacity:1}50%,100%{opacity:0}}"
svg("container-queries", "Container queries",
    f'<rect class="cw box" x="50" y="60" height="200" style="stroke:{CYAN}"/>'
    +f'<g class="nar"><rect x="70" y="80" width="210" height="80" fill="{PINK}88"/><rect x="70" y="170" width="210" height="70" fill="{YEL}55"/><text x="80" y="125">image</text><text x="80" y="210">text</text></g>'
    +f'<g class="wide"><rect x="70" y="80" width="250" height="160" fill="{PINK}88"/><rect x="340" y="80" width="300" height="160" fill="{YEL}55"/><text x="80" y="165">image</text><text x="350" y="165">text side by side</text></g>'
    +'<text x="50" y="295" class="t">@container (min-width: 400px) - the card reacts to its slot, not the viewport.</text>', css)

# 20 transitions easing
css = "".join(f".e{i}{{animation:run 3s {e} infinite alternate}}" for i,e in enumerate(["linear","ease","ease-in","ease-out","cubic-bezier(.68,-0.55,.27,1.55)"])) + " @keyframes run{to{transform:translateX(440px)}}"
names=["linear","ease","ease-in","ease-out","back (bezier)"]
svg("easing", "Timing functions",
    ''.join(f'<text x="20" y="{75+i*48}" class="t">{n}</text><line x1="160" y1="{70+i*48}" x2="640" y2="{70+i*48}" stroke="{LINE}"/><rect class="e{i}" x="160" y="{58+i*48}" width="24" height="24" fill="{[PINK,CYAN,YEL,GREEN,RED][i]}"/>' for i,n in enumerate(names)), css)

# 21 wallet selector / near-api-js
svg("wallet-selector", "dApp, Wallet Selector and RPC",
    box(30,80,180,70,"Your dApp","near-api-js",PINK)+box(270,80,180,70,"Wallet Selector","modal",YEL)+box(510,40,180,55,"MyNearWallet","",CYAN)+box(510,130,180,55,"Meteor","",CYAN)
    +box(270,220,180,60,"RPC","view calls",GREEN)
    +'<path class="wire flow" d="M210 115 H270 M450 105 L510 67 M450 125 L510 157 M120 150 L360 220"/>'
    +mover("M120 115 H360 L600 67 L360 115 H120",YEL,"5s")
    +'<text x="480" y="260" class="t">signAndSendTransaction()</text><text x="480" y="280" class="t">-> wallet holds the key</text>')

# 22 testing pyramid
svg("contract-testing", "Testing a NEAR contract",
    f'<polygon points="360,50 560,280 160,280" fill="none" stroke="{LINE}" stroke-width="2"/>'
    f'<rect x="215" y="215" width="290" height="55" fill="{GREEN}44" style="animation:blink 3s steps(1) infinite"/><text x="360" y="248" text-anchor="middle">unit tests (cargo test)</text>'
    f'<rect x="265" y="150" width="190" height="55" fill="{CYAN}44" style="animation:blink 3s steps(1) .7s infinite"/><text x="360" y="183" text-anchor="middle">sandbox</text>'
    f'<rect x="315" y="95" width="90" height="45" fill="{PINK}44" style="animation:blink 3s steps(1) 1.4s infinite"/><text x="360" y="123" text-anchor="middle">testnet</text>'
    +'<text x="580" y="250" class="t">fast, many</text><text x="580" y="125" class="t">slow, few</text>')
print("ok", len(os.listdir(OUT)))
