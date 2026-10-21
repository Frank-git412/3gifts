// Targeted journey regressions, including G3-NLP-001 exception exclusions.
const assert = require('node:assert/strict');
const { createRuntime } = require('./published-runtime.cjs');

let assertions = 0;
const check = (condition, label) => { assert.ok(condition, label); assertions += 1; };
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture(api, id, price, type = 'product', tags = ['culture', 'books']) {
  return api.normalizeProduct({
    id, name: `Fixture ${id}`, price, type, tags, store: 'Test',
    directUrl: `https://shop.example/products/${id}`,
    constraints: { bulky: false, sizes: false },
  });
}

async function main() {
  const r = createRuntime();
  const { a, R } = r;

  // 1. Negations stay local; a following positive clause is never swallowed.
  const pairs = [
    ['vino', 'wine', 'libri', 'books'],
    ['tecnologia', 'tech', 'musica', 'music'],
    ['profumi', 'perfume', 'fotografia', 'photo'],
    ['sport', 'sport', 'viaggi', 'travel'],
    ['cucina', 'food', 'giardinaggio', 'garden'],
  ];
  const templates = [
    (negative, positive) => `non ama ${negative}, ama ${positive}`,
    (negative, positive) => `non ama ${negative}, gli piacciono ${positive}`,
    (negative, positive) => `non ama ${negative} e gli piacciono ${positive}`,
    (negative, positive) => `non ama ${negative} e ${positive} gli piacciono`,
    (negative, positive) => `no ${negative}, sì ${positive}`,
    (negative, positive) => `senza ${negative} e con ${positive}`,
    (negative, positive) => `evita ${negative}; preferisce ${positive}`,
    (negative, positive) => `odia ${negative}, ma adora ${positive}`,
  ];
  for (const [negative, negativeTag, positive, positiveTag] of pairs) {
    for (const makeNote of templates) {
      const note = makeNote(negative, positive);
      const analysis = a.analyseNote(note);
      check(analysis.exclusions.includes(negativeTag), `negative retained: ${note}`);
      check(!analysis.signals.includes(negativeTag), `negative never boosted: ${note}`);
      check(analysis.signals.includes(positiveTag), `positive retained: ${note}`);
      check(!analysis.exclusions.includes(positiveTag), `positive never excluded: ${note}`);
      check(!analysis.needsClarification, `clear sentence needs no clarification: ${note}`);
    }
  }
  const negativeList = a.analyseNote('no tech, libri e vino');
  check(['tech', 'books', 'wine'].every(tag => negativeList.exclusions.includes(tag)), 'negative list remains a list');
  const secondNegation = a.analyseNote('non ama il vino e non vuole libri');
  check(['wine', 'books'].every(tag => secondNegation.exclusions.includes(tag)), 'second explicit negation remains negative');
  const merged = R.mergeAnalysis(a.analyseNote('non ama il vino, gli piacciono i libri'), { signals: ['wine'], exclusions: [], source: 'ai' });
  check(merged.exclusions.includes('wine') && !merged.signals.includes('wine') && merged.signals.includes('books'), 'enrichment cannot reverse local polarity');

  // 2. Every free-text constraint has an explicit state.
  const applied = a.analyseNote('non ama il vino');
  check(applied.constraintReport.applied.includes('wine') && !applied.needsClarification, 'recognized exclusion is applied');
  const unclear = a.analyseNote('niente materiali ruvidi e ama i libri');
  check(unclear.constraintReport.unclear.length === 1 && unclear.needsClarification, 'unknown restriction is classified as unclear');
  const mixedUnclear = a.analyseNote('niente materiali ruvidi e libri');
  check(mixedUnclear.constraintReport.unclear.length === 1 && mixedUnclear.exclusions.includes('books'), 'unknown and known restrictions are both retained');
  const safety = a.analyseNote('allergica alle noci');
  check(safety.constraintReport.unsatisfied.includes('dati_sicurezza_non_disponibili') && safety.needsClarification, 'unsupported safety restriction is classified');
  const base = { mode: 'recipient', journey: 'direct', relation: 'friend', occasion: 'birthday', ageRange: 'adult', interests: ['culture'], subinterests: [], tone: 'neutral', avoid: [], budget: 50, timing: 'none', deadline: R.dateAfter(3650), note: '', allowUnverified: true };

  // G3-NLP-001: expected polarity is specified here, not inferred by the parser.
  const exceptionTemplates = [
    (it, en) => `tutto tranne ${it}`,
    (it, en) => `anything except ${en}`,
    (it, en) => `qualsiasi cosa eccetto ${it}`,
    (it, en) => `escludendo i ${it}`,
    (it, en) => `anything but ${en}`,
    (it, en) => `detests ${en}`,
  ];
  const exceptionCategories = [
    ['libri', 'books', 'books'], ['profumi', 'perfumes', 'perfume'],
    ['vinili', 'records', 'music'], ['viaggi', 'travel', 'travel'],
    ['computer', 'computer', 'tech'],
  ];
  for (const [it, en, tag] of exceptionCategories) {
    for (const makeNote of exceptionTemplates) {
      const note = makeNote(it, en), analysis = a.analyseNote(note);
      check(analysis.exclusions.includes(tag), `G3-NLP-001 exclusion: ${note}`);
      check(!analysis.signals.includes(tag), `G3-NLP-001 never positive: ${note}`);
      check(!analysis.needsClarification, `G3-NLP-001 clear exclusion: ${note}`);
    }
  }
  const bookNotes = exceptionTemplates.map(makeNote => makeNote('libri', 'books'));
  for (const language of ['it', 'en']) {
    const nr = createRuntime(language);
    nr.seed(); nr.set('interest', ['culture']); nr.set('budgetChoice', '100');
    const reportedBook=nr.products.find(p=>Number(p.id)===254);
    check(!nr.R.productLink(reportedBook.directUrl)&&!nr.a.rankProducts(nr.products, { ...base, budget: 100 }, nr.a.analyseNote('')).some(p => Number(p.id) === 254), `${language}: generic Amazon search is never recommended`);
    for (const note of bookNotes) {
      const analysis = nr.a.analyseNote(note);
      const profile = { ...base, budget: 100, note };
      const selected = nr.a.rankProducts(nr.products, profile, analysis);
      // The current culture-only catalog contains books and book accessories.
      check(selected.length === 0, `${language}: no incompatible culture fallback for ${note}`);
      const enriched = nr.R.mergeAnalysis(analysis, { signals: ['books'], exclusions: [], source: 'ai' });
      check(enriched.exclusions.includes('books') && !enriched.signals.includes('books'), `${language}: enrichment preserves ${note}`);
      nr.set('interest', ['culture']); nr.set('note', note); await nr.a.showResults();
      check(nr.el('#resultGrid').innerHTML === '' && !nr.el('#zeroRecovery').hidden, `${language}: original profile renders recovery for ${note}`);
      // A second selected interest supplies valid alternatives: no blanket block.
      const alternatives = nr.a.rankProducts(nr.products, { ...profile, interests: ['culture', 'techGaming'] }, analysis);
      check(alternatives.length === 3 && alternatives.every(p => !p.tags.includes('books')), `${language}: compatible alternatives for ${note}`);
      nr.set('interest', ['culture', 'techGaming']); await nr.a.showResults();
      const names = Array.from(nr.eval('activeCatalogProducts.filter(wasShown).map(p=>p.name)'));
      check((nr.el('#resultGrid').innerHTML.match(/class="gift-card"/g) || []).length === 3, `${language}: rendered alternatives for ${note}`);
      check(names.length === 3 && names.every(name => !nr.products.some(p => p.name === name && p.tags.includes('books'))), `${language}: displayed selection excludes books for ${note}`);
      check(!nr.products.filter(p => [62, 72, 254].includes(Number(p.id))).some(p => names.includes(p.name)), `${language}: original failing products absent for ${note}`);
    }
  }
  for (const note of ['tutto tranne libri e profumi', 'anything except books, perfumes', 'anything but books and perfumes']) {
    const analysis = a.analyseNote(note);
    check(['books', 'perfume'].every(tag => analysis.exclusions.includes(tag)) && !analysis.needsClarification, `exception list: ${note}`);
  }
  for (const note of ['everything but books', 'except for books', 'excluding books', 'detest books']) {
    const analysis = a.analyseNote(note);
    check(analysis.exclusions.includes('books') && !analysis.signals.includes('books') && !analysis.needsClarification, `English exception variant: ${note}`);
  }
  for (const note of ['tutto tranne libri, ama musica', 'anything except books but likes music', 'no books but likes music']) {
    const analysis = a.analyseNote(note);
    check(analysis.exclusions.includes('books') && analysis.signals.includes('music') && !analysis.exclusions.includes('music') && !analysis.needsClarification, `exception scope and adversative: ${note}`);
  }
  for (const note of ['non solo libri ma anche musica', 'not only books but also music', 'likes books but prefers music']) {
    const analysis = a.analyseNote(note);
    check(['books', 'music'].every(tag => analysis.signals.includes(tag)) && analysis.exclusions.length === 0 && !analysis.needsClarification, `positive control: ${note}`);
  }
  for (const note of ['tutto tranne materiali ruvidi', 'anything except rough materials', 'niente tranne libri', 'nothing except books', 'no vino eccetto libri']) {
    const analysis = a.analyseNote(note);
    check(analysis.needsClarification && a.rankProducts(r.products, base, analysis).length === 0, `unsupported exception fails closed: ${note}`);
  }

  check(a.rankProducts(r.products, base, unclear).length === 0, 'unclear constraint fails closed');
  r.seed(); r.set('note', 'niente materiali ruvidi e ama i libri');
  await a.showResults(true);
  check(!r.el('#zeroRecovery').hidden && r.el('#resultGrid').innerHTML === '', 'unclear constraint renders recovery, not cards');
  check(r.el('#zeroRecoveryText').textContent.includes('non è interpretabile'), 'unclear constraint is explained to the visitor');

  // 3. A low budget is never silently widened; the exact smallest recovery is offered.
  const budgetFixtures = [
    fixture(a, 'budget-15', 15), fixture(a, 'budget-20-a', 20),
    fixture(a, 'budget-20-b', 20), fixture(a, 'budget-20-c', 20),
  ];
  r.c.budgetFixtures = budgetFixtures;
  r.eval('activeCatalogProducts=globalThis.budgetFixtures');
  const budgetProfile = { ...base, budget: 15 };
  const empty = a.analyseNote('');
  check(a.rankProducts(budgetFixtures, budgetProfile, empty).length === 1, '15 euro remains 15 euro');
  check(a.rankProducts(budgetFixtures, { ...budgetProfile, budget: 20 }, empty).length === 3, '20 euro unlocks three coherent fixtures');
  check(a.suggestedBudget(15, budgetProfile, empty) === 20, 'smallest valid recovery budget is 20 euro');
  a.showZeroRecovery(budgetProfile, 1, empty);
  check(!r.el('#increaseBudgetRecovery').hidden && r.el('#increaseBudgetRecovery').dataset.budget === '20', 'budget recovery is an explicit choice');
  check(r.el('#zeroRecoveryText').textContent.includes('Con 15 €') && r.el('#zeroRecoveryText').textContent.includes('20 €'), 'recovery explains current and proposed budgets');
  check(budgetProfile.budget === 15, 'recovery display does not mutate the selected budget');

  // 4. Experience is a binding type until the visitor explicitly broadens it.
  const typeFixtures = [
    fixture(a, 'experience-1', 40, 'experience', ['culture', 'experience']),
    fixture(a, 'service-1', 45, 'service', ['culture', 'experience']),
    fixture(a, 'object-1', 20), fixture(a, 'object-2', 25), fixture(a, 'object-3', 30),
  ];
  const typeAnalysis = { ...empty, signals: ['culture', 'experience'], requiredTypes: ['experience', 'service'] };
  const strictTypes = a.rankProducts(typeFixtures, { ...base, budget: 100 }, typeAnalysis);
  check(strictTypes.length === 2 && strictTypes.every(item => ['experience', 'service'].includes(item.type)), 'objects never fill a strict experience request');
  const broadenedTypes = a.rankProducts(typeFixtures, { ...base, budget: 100, allowTypeBroadening: true }, typeAnalysis);
  check(broadenedTypes.length === 3 && broadenedTypes.some(item => item.type === 'product'), 'objects appear only after explicit broadening');

  const noteRuntime = createRuntime(); noteRuntime.seed(); noteRuntime.set('note', 'Voglio un’esperienza');
  await noteRuntime.a.showResults(true);
  check(!noteRuntime.el('#zeroRecovery').hidden && !noteRuntime.el('#broadenTypeRecovery').hidden, 'explicit note request offers type broadening instead of objects');
  check((noteRuntime.el('#resultGrid').innerHTML.match(/class="gift-card"/g) || []).length === 0, 'strict experience note renders no physical cards');
  noteRuntime.el('#broadenTypeRecovery').click(); await tick();
  check((noteRuntime.el('#resultGrid').innerHTML.match(/class="gift-card"/g) || []).length === 3, 'explicit type-broadening action restores three coherent ideas');

  const refineRuntime = createRuntime(); refineRuntime.seed(); await refineRuntime.a.showResults(true);
  refineRuntime.set('refineReason', 'owned').dispatchEvent({ type: 'change' });
  refineRuntime.set('refineDirection', 'experience'); refineRuntime.set('refineSurprise', 'balanced');
  refineRuntime.el('#refinementForm').dispatchEvent({ type: 'submit' });
  check(refineRuntime.el('#refinementError').textContent.includes('Non abbiamo esperienze nuove'), 'refinement reports no new matching experiences');
  check(!refineRuntime.el('#broadenExperience').hidden, 'refinement requires an explicit broadening action');
  check(refineRuntime.events.filter(event => event.name === 'recommendations_refined').length === 0, 'failed strict refinement is not counted');
  refineRuntime.el('#broadenExperience').click(); await tick();
  check((refineRuntime.el('#resultGrid').innerHTML.match(/class="gift-card"/g) || []).length === 3, 'approved broadening renders three alternatives');
  check(refineRuntime.el('#recommendationStatus').textContent.includes('Hai scelto di includere anche oggetti coerenti'), 'broadening remains visible in the result status');

  console.log(JSON.stringify({ assertions, defectsCovered: 5, generatedNegationCases: pairs.length * templates.length, exceptionPolarityCases: exceptionTemplates.length * exceptionCategories.length, exceptionRenderedJourneys: bookNotes.length * 4, errors: 0 }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
