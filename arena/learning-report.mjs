const fixed=(x,n=3)=>x===null||x===undefined?'not observed':x.toFixed(n);
const effect=e=>!e||e.n<2?`insufficient (n=${e?.n??0})`:`${fixed(e.mean)} [${fixed(e.lo)}, ${fixed(e.hi)}], n=${e.n}`;
const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const verdict=e=>!e||e.n<2?'insufficient':e.lo>0?'positive descriptive contrast':e.hi<0?'negative descriptive contrast':'null-compatible';
export function learningMarkdown(report) {
  const s=report.summary;
  const lines=['# D16/D17 learning audit','',report.status,'',
    `Bouts: ${report.rows.length}; duration: ${report.config.durationSec}s; repeated-learning seeds: ${report.config.seeds}; adaptation held-out seeds: ${report.config.adaptationSeeds}; cognition cap(s): ${report.config.budgets.join(', ')}.`,
    `Source SHA-256: ${report.sourceFingerprint.before}; unchanged: ${report.sourceFingerprint.before===report.sourceFingerprint.after}.`,'',
    '## Interpretation','',
    'These are synthetic-proxy measurements, not human playtests. The four competence stages are a hypothesis. No stage labels are assigned automatically. A convincing stage transition would require success to improve, calibrated failure awareness to precede improvement, and Type2 share/compute/latency to fall while held-out success holds. The report exposes the measurements even when this pattern is absent.',
    'Confidence intervals are descriptive seed-cluster bootstrap intervals. Overlapping/null-compatible intervals do not establish equivalence. Latency below is the implementation’s modeled delay, not a measured timing advantage.','',
    '## D17 within-bout adaptation','',
    '| Proxy | Budget | Hit-rate difference in differences [95% CI] | Hits/min difference in differences [95% CI] | Reopen after midpoint |',
    '| --- | ---: | --- | --- | --- |'];
  for(const row of s.adaptation)lines.push(`| ${row.switching?'switching':'fixed'} | ${row.budget} | ${effect(row.metrics.hitRate.differenceInDifferences)} (${verdict(row.metrics.hitRate.differenceInDifferences)}) | ${effect(row.metrics.hitsPerMinute.differenceInDifferences)} | ${effect(row.posteriorReopen)} |`);
  lines.push('', 'Difference in differences = (learning-on last third minus first third) minus (adaptation-off last third minus first third). Hit rate uses resolved throw cohorts; end-of-bout open throws remain censored. Full JSON retains all three windows, shot counts, point scores, posterior trajectories, and missing estimates.',
    'Reopen counts include natural movement reversals; the fixed proxy is the midpoint control. A reopen alone is not proof of successful adaptation.','',
    '## D16 full-model first/last training episode, by situation','',
    '| Situation | Budget | Episode | Success [95% CI] | Type2 share | Work/cycle | Modeled latency (s) | Predicted failure / actual failure | Failure Brier | Outcomes |',
    '| --- | ---: | ---: | --- | --- | --- | --- | --- | --- | ---: |');
  for(const row of s.curves.filter(r=>r.variant==='full'&&r.phase==='training'&&[1,report.config.episodes].includes(r.episode))) {
    const m=row.metrics;
    lines.push(`| ${row.situation} | ${row.budget} | ${row.episode} | ${effect(m.successRate)} | ${effect(m.type2Share)} | ${effect(m.computePerDecision)} | ${effect(m.modeledLatencySec)} | ${fixed(m.predictedFailureOnOutcomes.mean)} / ${fixed(m.actualFailure.mean)} | ${effect(m.failureBrier)} | ${row.outcomes} |`);
  }
  lines.push('', 'Per-situation curves for every training episode and ablation are in the HTML report and JSON. Held-out rows start from a final training snapshot, with fresh seeds and no memory carryover between held-out bouts. Sparse attack credit is not the same quantity as hit rate or bout win. Situation visitation changes under policy changes; missing outcome estimates remain null.','',
    '## Held-out bout results','', '| Variant | Budget | Episode | Win (ties 0.5) [95% CI] | Score margin [95% CI] |', '| --- | ---: | ---: | --- | --- |');
  for(const r of s.boutResults.filter(r=>r.protocol==='learning'&&r.phase==='heldout'))lines.push(`| ${r.variant} | ${r.budget} | ${r.episode} | ${effect(r.win)} | ${effect(r.scoreMargin)} |`);
  lines.push('', '## Definitions', '', ...Object.entries(report.definitions).map(([k,v])=>`- **${k}:** ${v}`),'','## Limitations','',...report.limitations.map(v=>`- ${v}`),'','## Reproduce','', '```sh',report.command,'```','');
  return lines.join('\n');
}
const palette=['#70c5ff','#ffbc66','#bca0ff','#f3819c'];
const colorFor=variant=>palette[['full','noMetacog','noAutomatization','noLearning'].indexOf(variant)]??'#dddddd';
function chart(rows,metric,title) {
  const xs=rows.filter(r=>r.metrics[metric].mean!==null);
  if(!xs.length)return `<section class="plot"><h4>${escape(title)}</h4><p>No resolved observations</p></section>`;
  const maxX=Math.max(...rows.map(r=>r.episode)),minX=Math.min(...rows.map(r=>r.episode));
  let minY=Math.min(0,...xs.map(r=>r.metrics[metric].lo)),maxY=Math.max(...xs.map(r=>r.metrics[metric].hi));
  if(maxY===minY)maxY=minY+1;
  const px=x=>42+(x-minX)/(maxX-minX||1)*280,py=y=>140-(y-minY)/(maxY-minY)*104;
  const variants=[...new Set(rows.map(r=>r.variant))];
  let svg=`<svg viewBox="0 0 340 172" role="img" aria-label="${escape(title)}"><path d="M42 30V140H326" stroke="#667" fill="none"/><text x="3" y="40">${fixed(maxY,2)}</text><text x="3" y="141">${fixed(minY,2)}</text><text x="42" y="160">${minX}</text><text x="270" y="160">bout ${maxX}</text>`;
  variants.forEach((variant,i)=>{
    const selected=xs.filter(r=>r.variant===variant).sort((a,b)=>a.episode-b.episode),color=colorFor(variant);
    svg+=`<polyline fill="none" stroke="${color}" stroke-width="2" points="${selected.map(r=>`${px(r.episode)},${py(r.metrics[metric].mean)}`).join(' ')}"/>`;
    for(const row of selected){const m=row.metrics[metric],x=px(row.episode);svg+=`<path d="M${x} ${py(m.lo)}V${py(m.hi)}" stroke="${color}" opacity=".35"/><circle cx="${x}" cy="${py(m.mean)}" r="2.8" fill="${color}"><title>${escape(variant)} bout ${row.episode}: ${escape(effect(m))}</title></circle>`;}
  });
  return `<section class="plot"><h4>${escape(title)}</h4>${svg}</svg></section>`;
}
export function learningHtml(report) {
  let content=`<h1>D16/D17 learning audit</h1><p class="status">${escape(report.status)}</p><p>${report.rows.length} full/probe bouts × ${report.config.durationSec}s. ${report.config.seeds} repeated-learning seed clusters; ${report.config.adaptationSeeds} held-out adaptation seeds.</p><p>Four competence stages are a hypothesis, not labels imposed on these curves. This is a functional mechanism test with synthetic bots, not evidence about subjective experience.</p><p>Sensory latency is fixed across tiers. Measured act() runtime is separate and sensitive to concurrent host load, JIT and garbage collection. Sparse attack-credit success differs from geometric hit rate and bout win. Whiskers show descriptive 95% seed-cluster bootstrap intervals; missing outcomes stay missing.</p>`;
  content+='<h2>D17: First vs last third</h2><table><tr><th>Proxy</th><th>Cap</th><th>Hit-rate interaction</th><th>Hits/min interaction</th><th>Posterior reopened after midpoint</th></tr>';
  for(const row of report.summary.adaptation)content+=`<tr><td>${row.switching?'Switching':'Fixed'}</td><td>${row.budget}</td><td>${escape(effect(row.metrics.hitRate.differenceInDifferences))}<br>${verdict(row.metrics.hitRate.differenceInDifferences)}</td><td>${escape(effect(row.metrics.hitsPerMinute.differenceInDifferences))}</td><td>${escape(effect(row.posteriorReopen))}</td></tr>`;
  content+='</table><p>Interaction: (full last−first) − (adaptation-off last−first). Shot success is assigned to its launch-time third; unclosed shots remain explicitly censored. Reopening after midpoint can also happen on fixed proxies due to natural turns.</p><h2>D16: Per-situation repeated-learning curves</h2><p class="legend">';
  report.config.variants.forEach((v,i)=>content+=`<span style="color:${colorFor(v)}">${escape(v)}</span> `);content+='</p>';
  for(const budget of report.config.budgets)for(const situation of [...new Set(report.summary.curves.map(r=>r.situation))].sort()) {
    const rows=report.summary.curves.filter(r=>r.budget===budget&&r.situation===situation&&r.phase==='training');
    content+=`<details open><summary>${escape(situation)} · cap ${budget}</summary><div class="grid">`;
    for(const [metric,title] of [['successRate','Sparse attack-credit success'],['type2Share','Type2 share'],['computePerDecision','Work units / decision'],['modeledLatencySec','Fixed sensory latency (s)'],['decisionWallMeanMs','Measured act() mean (ms)'],['decisionWallP95Ms','Measured act() p95 (ms)'],['predictedFailureOnOutcomes','Predicted failure on resolved outcomes'],['actualFailure','Observed failure on resolved outcomes'],['failureBrier','Failure-prediction Brier score'],['automaticShare','Automatic decision share']])content+=chart(rows,metric,title);
    content+='</div></details>';
  }
  content+='<h2>Full methods, held-out outcomes and limitations</h2><pre>'+escape(learningMarkdown(report))+'</pre>';
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Tether learning audit</title><style>body{background:#101922;color:#e5edf6;font:16px system-ui;margin:2rem auto;max-width:1280px;padding:0 1rem}h1,h2{color:#a9d7ff}p{line-height:1.6}.status{padding:1rem;background:#223547}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:.8rem}.plot{background:#182635;border-radius:8px;padding:.6rem}.plot h4{margin:.4rem;font-size:14px}svg{width:100%}svg text{font:10px system-ui;fill:#ccd}details{margin:1.5rem 0}summary{font-weight:bold;padding:1rem;cursor:pointer}.legend span{margin-right:1.4rem}table{border-collapse:collapse;width:100%}th,td{padding:.7rem;text-align:left;border-bottom:1px solid #455}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.6 ui-monospace;color:#bbcbdc}</style>${content}</html>`;
}
