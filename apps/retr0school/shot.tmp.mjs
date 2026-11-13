import { chromium, devices } from "playwright";
const B=process.argv[2], A=process.argv[3]||"/tmp/";
const b=await chromium.launch();
const pg=await b.newPage({viewport:{width:1440,height:900}});
await pg.goto(B+"/",{waitUntil:"networkidle"}); await pg.screenshot({path:A+"40-hero-stacked.png"});
const ctx=await b.newContext({...devices["iPhone 13"]}); const m=await ctx.newPage();
await m.goto(B+"/",{waitUntil:"networkidle"}); await m.screenshot({path:A+"41-hero-stacked-mobile.png"});
console.log(await m.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await b.close();
