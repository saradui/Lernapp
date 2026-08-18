import fs from 'node:fs';

const required = ['OPENAI_API_KEY'];
for (const name of required) if (!process.env[name]) throw new Error(`GitHub Secret ${name} fehlt.`);

const root = process.cwd();
const seenPath = `${root}/data/seen.json`;
const briefPath = `${root}/data/weekly-brief.json`;
const indexPath = `${root}/index.html`;
const seen = JSON.parse(fs.readFileSync(seenPath, 'utf8'));
const known = seen.items.map(x => `${x.headline} | ${x.sourceUrl}`).join('\n').slice(-24000);
const today = new Date().toISOString().slice(0, 10);

const schema = {
  type: 'object', additionalProperties: false,
  required: ['items'],
  properties: {
    items: { type: 'array', minItems: 7, maxItems: 12, items: {
      type: 'object', additionalProperties: false,
      required: ['section','headline','summary','sourceName','sourceUrl','date'],
      properties: {
        section: { type: 'string', enum: ['USA','EU','China','Modellvergleich','Claude / Anthropic','Schweiz','Digitale Souveränität'] },
        headline: { type: 'string' }, summary: { type: 'string' }, sourceName: { type: 'string' },
        sourceUrl: { type: 'string' }, date: { type: 'string' }
      }
    }}
  }
};

const prompt = `Du bist Redakteur:in eines knappen wöchentlichen KI-Briefings auf Deutsch. Heute ist ${today}.
Nutze die Websuche. Recherchiere nur Meldungen aus den letzten 14 Tagen oder seit dem letzten Briefing.
Finde 7 bis 12 tatsächlich neue, relevante Meldungen. Mindestens eine Meldung für jede section: USA, EU, China, Modellvergleich, Claude / Anthropic, Schweiz und Digitale Souveränität.
Bevorzuge Primärquellen (Unternehmen, Behörden, Universitäten, Benchmark-Betreiber). Ergänze glaubwürdige Fachblogs, Substacks, YouTube oder X/Threads nur, wenn die Kernmeldung zusätzlich über eine Primärquelle bestätigt ist. Berücksichtige explizit deutsche und Schweizer Firmen, Start-ups oder Hochschulen.
Jede summary hat höchstens zwei sachliche deutsche Sätze und nennt Produkt, Regulierung, Use Case oder Benchmark-Ergebnis konkret. Jede sourceUrl muss direkt zu der belegenden Quelle führen.
Kein Marketing, keine Vermutungen, keine doppelten Meldungen. Lass ältere bereits verwendete Themen aus.

BEREITS VERWENDET (nicht erneut ausgeben):
${known || '(noch keine)'}
`;

const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: process.env.OPENAI_MODEL || 'gpt-5.4',
    tools: [{ type: 'web_search' }],
    input: prompt,
    text: { format: { type: 'json_schema', name: 'weekly_ai_brief', strict: true, schema } }
  })
});
if (!response.ok) throw new Error(`OpenAI API: ${response.status} ${await response.text()}`);
const payload = await response.json();
const result = JSON.parse(payload.output_text);
const items = result.items.filter(x => /^https:\/\//.test(x.sourceUrl));
if (items.length < 7) throw new Error('Zu wenige verifizierbare Meldungen erhalten; keine Veröffentlichung durchgeführt.');

const brief = { updatedAt: today, items };
fs.writeFileSync(briefPath, JSON.stringify(brief, null, 2) + '\n');
seen.items = [...seen.items, ...items].slice(-300);
fs.writeFileSync(seenPath, JSON.stringify(seen, null, 2) + '\n');

const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const sections = ['USA','EU','China','Modellvergleich','Claude / Anthropic','Schweiz','Digitale Souveränität'];
const details = sections.map((section, index) => {
  const entries = items.filter(item => item.section === section).map(item => `<li><a href="${escape(item.sourceUrl)}" target="_blank" rel="noopener">${escape(item.headline)}</a> <span>(${escape(item.sourceName)}, ${escape(item.date)})</span><br>${escape(item.summary)}</li>`).join('') || '<li>Diese Woche keine ausreichend neue, belegte Meldung.</li>';
  return `<details${index === 0 ? ' open' : ''}><summary>${section}</summary><ul>${entries}</ul></details>`;
}).join('\n');
const sectionHtml = `<section class="ai-brief" aria-labelledby="aiBriefTitle">
  <div class="brief-heading"><div><p class="eyebrow">EXTRA · KI-WOCHENBRIEFING</p><h2 id="aiBriefTitle">KI-Update · ${escape(today)}</h2></div><span class="brief-note">Automatisch recherchiert</span></div>
  <p class="brief-intro">Neue, belegte Meldungen der Woche. Primärquellen haben Vorrang; bereits verwendete Beiträge werden ausgeschlossen.</p>
  ${details}
  <div class="editorial-rule"><strong>Redaktionsregel:</strong> Quellenlink, Datum und belegbarer Neuigkeitswert sind Pflicht. Nicht bestätigte Social-Signale erscheinen nicht als Faktenmeldung.</div>
</section>`;
const html = fs.readFileSync(indexPath, 'utf8');
const updated = html.replace(/<section class="ai-brief" aria-labelledby="aiBriefTitle">[\s\S]*?<\/section>/, sectionHtml);
if (updated === html) throw new Error('AI-Briefing-Bereich in index.html nicht gefunden.');
fs.writeFileSync(indexPath, updated);
console.log(`Wochenbriefing vom ${today} mit ${items.length} Meldungen erstellt.`);
