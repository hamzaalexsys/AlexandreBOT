import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
await mkdir(".sites-runtime", { recursive: true });
await build({
  stdin: {
    contents: `import assert from 'node:assert/strict';import {bounceAt,pendulumAngle} from './lib/physics';import {applyBoardReply,drawingIntent,normalizeBoardAction,requestedSimulationType,requestsBoardVisual} from './lib/notebook';import {parentFocusFor} from './lib/parent-focus';import {replySchema,sceneSchema} from './lib/contracts';
const g=9.81,h=3,e=.75,drop=Math.sqrt(2*h/g);
assert.equal(bounceAt(0,{height:h}).height,h);assert.ok(Math.abs(bounceAt(drop,{height:h}).height)<1e-9);
const peak=drop+Math.sqrt(2*g*h)*e/g;assert.ok(Math.abs(bounceAt(peak,{height:h,elasticity:e}).height-h*e*e)<1e-7);
assert.ok(bounceAt(.5,{gravity:1.62}).height>bounceAt(.5,{gravity:9.81}).height);
for(let t=0;t<20;t+=.02){const p=bounceAt(t,{height:h});assert.ok(p.height>=0&&p.height<=h+1e-7);}
assert.ok(pendulumAngle(.2,2)>pendulumAngle(.2,.5));
const shape={id:'sun',kind:'circle',x:100,y:100,r:30,fill:'#ffcc66'};const scene={id:'a',title:'A',subtitle:'',shapes:[shape]};
const book={pages:[{scene,strokes:[{points:'1,1 2,2',color:'#123456'}],createdAt:1}],index:0};
assert.equal(applyBoardReply(book,{scene:null,boardAction:'keep',removeShapeIds:[]}),book);
const blank={id:'blank-entry',title:'Ready',subtitle:'',shapes:[],simulation:null};const shown={...scene,id:'equation',title:'Equation'};const wrongKeep={message:'Look',scene:shown,boardAction:'keep',removeShapeIds:[],quiz:null,suggestions:[]};const normalized=normalizeBoardAction(wrongKeep,blank);assert.equal(normalized.boardAction,'update');const filled=applyBoardReply({pages:[{scene:blank,strokes:[],createdAt:1}],index:0},wrongKeep);assert.equal(filled.pages[0].scene.shapes.length,1);assert.equal(filled.pages[0].scene.title,'Equation');
assert.equal(requestsBoardVisual('montre moi dans le tableau'),true);assert.equal(requestsBoardVisual('Dessine une fleur'),true);assert.equal(requestsBoardVisual('أرني ثلاثة أمثلة على اللوحة.'),true);assert.equal(requestsBoardVisual('Garde le tableau et explique-moi simplement'),false);
assert.equal(drawingIntent('jai dessiner quoi ?'),'inspect');assert.equal(drawingIntent('Qu’est-ce que j’ai dessiné ?'),'inspect');assert.equal(drawingIntent('Résous maintenant'),'solve');assert.equal(drawingIntent('explique-moi cette équation'),'solve');assert.equal(drawingIntent('raconte-moi une histoire'),'none');assert.equal(requestsBoardVisual('jai dessiner quoi ?'),false);
assert.equal(requestedSimulationType('Montre la trajectoire d’un ballon qui rebondit'),'bounce');assert.equal(requestedSimulationType('Fais une expérience avec le cycle de l’eau'),'water');assert.equal(requestedSimulationType('Dessine une fleur'),null);assert.equal(requestedSimulationType('Explique ce qui est déjà au tableau'),null);
assert.equal(parentFocusFor('Compare ses résultats en français'),'results');assert.equal(parentFocusFor('A-t-il une absence justifiée ?'),'attendance');assert.equal(parentFocusFor('Présente son parcours scolaire'),'journey');assert.equal(parentFocusFor('Comment puis-je l’aider à la maison ?'),'support');assert.equal(parentFocusFor('Y a-t-il des messages ou devoirs ?'),'records');assert.equal(parentFocusFor('Comment va mon enfant ?'),'summary');
const updated=applyBoardReply(book,{scene:{...scene,shapes:[{...shape,x:200}]},boardAction:'update',removeShapeIds:[]});assert.equal(updated.pages[0].scene.shapes[0].x,200);assert.equal(updated.pages[0].strokes.length,1);assert.equal(book.pages[0].scene.shapes[0].x,100);
const newBook=applyBoardReply(updated,{scene:{...scene,id:'b'},boardAction:'new',removeShapeIds:[]});assert.equal(newBook.pages.length,2);assert.equal(newBook.pages[0].strokes.length,1);assert.equal(newBook.index,1);
assert.equal(replySchema.safeParse({message:'Parent',scene:null,boardAction:'keep',removeShapeIds:[],quiz:null,suggestions:['x'.repeat(180)]}).success,true);assert.equal(replySchema.safeParse({message:'Parent',scene:null,boardAction:'keep',removeShapeIds:[],quiz:null,suggestions:['x'.repeat(221)]}).success,false);
assert.equal(sceneSchema.safeParse({...scene,shapes:[{...shape,kind:'script'}]}).success,false);
assert.equal(sceneSchema.safeParse({...scene,shapes:[{...shape,kind:'path',path:'javascript:alert(1)'}]}).success,false);
const physical={pages:[{...book.pages[0],scene:{...scene,simulation:{type:'bounce'}}}],index:0};
const noPhysics=applyBoardReply(physical,{scene:{...scene,simulation:null},boardAction:'update',removeShapeIds:[]});assert.equal(noPhysics.pages[0].scene.simulation,null);assert.equal(noPhysics.pages[0].strokes.length,1);
let longBook=book;for(let n=0;n<45;n++)longBook=applyBoardReply(longBook,{scene:{...scene,id:'page-'+n},boardAction:'new',removeShapeIds:[]});assert.equal(longBook.pages.length,46);assert.equal(longBook.pages[0].scene.id,'a');
const {parseModelJson}=await import('./server/agents/parse-response');const fence=String.fromCharCode(96).repeat(3);assert.deepEqual(parseModelJson(fence+'json\\n{"ok":true}\\n'+fence),{ok:true});assert.throws(()=>parseModelJson('prefix {"ok":true}'));
const {parentGroundingIssues,sanitizeParentAnswer}=await import('./server/agents/parent-grounding');const groundedFacts=[{tool:'read_child_overview',data:{child:'AAMAR',className:'CE 5 – C',schoolYear:'2026/2027'}},{tool:'read_school_journey',data:{items:[{schoolYear:'2023/2024',className:'CE 2 – B'},{schoolYear:'2024/2025',className:'CE 3 – B'},{schoolYear:'2025/2026',className:'CE 4 – C'}]}},{tool:'read_year_results',data:{items:[{schoolYear:'2023/2024',average20:16.23},{schoolYear:'2024/2025',average20:13.8}]}},{tool:'read_subject_results',data:{items:[]}},{tool:'read_term_results',data:{items:[]}},{tool:'read_attendance',data:{items:[]}}];assert.deepEqual(parentGroundingIssues('Compare 2023/2024 et 2024/2025','2023/2024 (CE 2 – B) : 16,23/20. 2024/2025 (CE 3 – B) : 13,8/20.',groundedFacts),[]);const groundingProblems=parentGroundingIssues('Compare 2023/2024 et 2024/2025','2023/2024 (CE 2 – B) : 16,23/20. 2024/2025 (CE 4 – C). Aucun résultat en 2026/2027.',groundedFacts);assert.ok(groundingProblems.some(issue=>issue.includes('13.8')));assert.ok(groundingProblems.some(issue=>issue.includes('do not pair')));assert.ok(groundingProblems.some(issue=>issue.includes('outside the result-query coverage')));
assert.deepEqual(parentGroundingIssues('Présente le dossier','Les résultats consultés couvrent 2023/2024 et 2024/2025. Nous n’avons pas interrogé 2026/2027, donc je ne peux pas affirmer qu’il n’y a pas de résultats.',groundedFacts),[]);
assert.equal(sanitizeParentAnswer('Données (OBSERVED AT) : absence le 2026-09-14 en FRANCAIS, motif NOT RECORDED.'),'Données: absence le 14 septembre 2026 en français, motif non renseigné.');
const {availableTools,executeTool}=await import('./server/agents/tools');const student={role:'student',mode:'demo'};const parent={role:'parent',mode:'demo'};const parentToolNames=availableTools({role:'parent',mode:'pilot',subject:'pilot-parent',enrollmentId:1}).map(t=>t.function.name);for(const name of ['read_school_journey','read_year_results','read_subject_results','read_term_results'])assert.ok(parentToolNames.includes(name));
await assert.rejects(()=>executeTool('read_learning','{}',student,'fr'));
await assert.rejects(()=>executeTool('read_learning','{"parentId":999}',parent,'fr'));
await assert.rejects(()=>executeTool('execute_sql','{}',parent,'fr'));
await assert.rejects(()=>executeTool('create_interactive_simulation','{"type":"bounce","height":300}',student,'fr'));
const experiment=await executeTool('create_interactive_simulation','{"type":"bounce","height":3,"gravity":1.62}',student,'ar');assert.equal(experiment.simulation.gravity,1.62);
console.log('PASS physics, gravity comparison, pendulum, notebook continuity and SVG validation');`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".sites-runtime/check-core.mjs",
  plugins: [
    {
      name: "cloudflare-test-env",
      setup(context) {
        context.onResolve({ filter: /^cloudflare:workers$/ }, () => ({
          path: "cloudflare-test-env",
          namespace: "alexandrebot-test",
        }));
        context.onLoad(
          { filter: /.*/, namespace: "alexandrebot-test" },
          () => ({ contents: "export const env = {};", loader: "js" }),
        );
      },
    },
  ],
});
await import(pathToFileURL(resolve(".sites-runtime/check-core.mjs")).href);
