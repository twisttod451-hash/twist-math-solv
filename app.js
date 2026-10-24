const $ = id => document.getElementById(id);
const state = { history: JSON.parse(localStorage.getItem('twistMathHistory') || '[]'), calc: '0' };

function showView(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  $(view + 'View').classList.remove('hidden');
  document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  if (view === 'history') renderHistory();
}
document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
document.querySelectorAll('.chip').forEach(btn => btn.addEventListener('click', () => { $('problemInput').value = btn.dataset.example; $('problemInput').focus(); }));

function saveHistory(question, answer) {
  state.history.unshift({question, answer, time: new Date().toISOString()});
  state.history = state.history.slice(0, 50);
  localStorage.setItem('twistMathHistory', JSON.stringify(state.history));
  renderHistory();
}
function renderHistory() {
  const box = $('historyList');
  if (!state.history.length) { box.innerHTML = '<p class="muted">Your solved questions will appear here.</p>'; return; }
  box.innerHTML = state.history.map(item => `<div class="history-item"><div class="history-question">${escapeHtml(item.question)}</div><div class="history-answer">${escapeHtml(item.answer)}</div></div>`).join('');
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmt(n) { if (!Number.isFinite(n)) throw new Error('The result is not a finite number. Check the question.'); return Number(n.toPrecision(12)).toString(); }

function normalizeExpression(s) {
  if (!window.math) throw new Error('The maths engine could not load. Connect to the internet once and reload the app.');
  let x = s.trim().replace(/[×]/g,'*').replace(/[÷]/g,'/').replace(/π/g,'pi').replace(/√/g,'sqrt');
  x = x.replace(/\b(sin|cos|tan)\s*\(/gi, (_, fn) => `_${fn.toLowerCase()}(`);
  x = x.replace(/\b(log|ln)\s*\(/gi, (_, fn) => `${fn.toLowerCase()}(`);
  x = x.replace(/_(sin|cos|tan)\(/g, (_, fn) => `${fn}(`);
  // math.js uses radians; our calculator uses degrees.
  x = x.replace(/\b(sin|cos|tan)\(([^()]*)\)/g, (_, fn, arg) => `${fn}((${arg})*pi/180)`);
  x = x.replace(/\blog\(/g, 'log10(');
  return x;
}
function evalExpression(s) {
  const normalized = normalizeExpression(s);
  const result = math.evaluate(normalized);
  if (typeof result !== 'number') throw new Error('Please enter a numeric expression.');
  return fmt(result);
}

function parsePolynomialSide(side) {
  // Supports polynomial terms such as x^2, -5x, +6, and numeric multiples like 2*x.
  const cleaned = side.replace(/\s+/g,'').replace(/−/g,'-');
  const expanded = cleaned.replace(/-/g,'+-');
  const terms = expanded.split('+').filter(Boolean);
  const coeff = [0,0,0];
  for (let term of terms) {
    let power = 0, value;
    if (term.includes('x')) {
      const m = term.match(/^([+-]?(?:\d*\.?\d+)?)(?:\*?)x(?:\^([0-2]))?$/);
      if (!m) throw new Error('For equation solving, use a simple polynomial such as 2x+5=15 or x^2-5x+6=0.');
      value = m[1];
      if (value === '' || value === '+') value = 1;
      if (value === '-') value = -1;
      value = Number(value);
      power = m[2] ? Number(m[2]) : 1;
    } else {
      value = Number(term);
      if (!Number.isFinite(value)) throw new Error('Could not read the equation. Check its symbols.');
    }
    coeff[power] += value;
  }
  return coeff;
}
function solveEquation(input) {
  const sides = input.split('=');
  if (sides.length !== 2) throw new Error('Enter an equation with one equals sign, for example 2x+5=15.');
  const left = parsePolynomialSide(sides[0]), right = parsePolynomialSide(sides[1]);
  const c = left.map((v,i) => v - right[i]);
  const [constant, linear, quadratic] = c;
  if (Math.abs(quadratic) < 1e-12 && Math.abs(linear) < 1e-12) {
    if (Math.abs(constant) < 1e-12) return {answer:'Infinitely many solutions', steps:['Both sides are equivalent for every value of x.']};
    return {answer:'No solution', steps:['The variable terms cancel, leaving a false statement.']};
  }
  if (Math.abs(quadratic) < 1e-12) {
    const x = -constant / linear;
    return {answer:`x = ${fmt(x)}`, steps:[`Collect terms: ${fmt(linear)}x ${constant >= 0 ? '+' : '−'} ${fmt(Math.abs(constant))} = 0.`,`Move the constant and divide by the coefficient of x.`,`x = ${fmt(-constant)} ÷ ${fmt(linear)} = ${fmt(x)}.`,`Check: substitute x = ${fmt(x)} into the original equation.`]};
  }
  const d = linear*linear - 4*quadratic*constant;
  if (d < -1e-12) return {answer:'No real solutions', steps:[`Discriminant: b² − 4ac = ${fmt(d)}.`,`Because the discriminant is negative, there are no real roots.`]};
  if (Math.abs(d) < 1e-12) {
    const x = -linear/(2*quadratic);
    return {answer:`x = ${fmt(x)}`, steps:[`Discriminant: b² − 4ac = 0.`,`Use x = −b/(2a).`,`x = ${fmt(x)}.`]};
  }
  const x1 = (-linear + Math.sqrt(d))/(2*quadratic), x2 = (-linear - Math.sqrt(d))/(2*quadratic);
  return {answer:`x = ${fmt(x1)} or x = ${fmt(x2)}`, steps:[`Write the equation in the form ax² + bx + c = 0.`,`a = ${fmt(quadratic)}, b = ${fmt(linear)}, c = ${fmt(constant)}.`,`Discriminant: b² − 4ac = ${fmt(d)}.`,`Apply x = (−b ± √(b² − 4ac))/(2a).`,`The two roots are ${fmt(x1)} and ${fmt(x2)}.`]};
}
function solveQuestion(input) {
  const q = input.trim();
  if (!q) throw new Error('Type a mathematics question first.');
  if (q.includes('=')) return solveEquation(q);
  const answer = evalExpression(q);
  return {answer, steps:[`Expression: ${q}`,`Evaluate using the standard order of operations.`,`Result: ${answer}.`]};
}
$('solveBtn').addEventListener('click', () => {
  const q = $('problemInput').value;
  try {
    const result = solveQuestion(q);
    $('answerCard').classList.remove('hidden');
    $('answerTitle').textContent = 'Solved successfully';
    $('answerValue').textContent = result.answer;
    $('stepsBox').innerHTML = result.steps.map((s,i) => `<div><b>Step ${i+1}.</b> ${escapeHtml(s)}</div>`).join('');
    saveHistory(q, result.answer);
  } catch (err) {
    $('answerCard').classList.remove('hidden');
    $('answerTitle').textContent = 'Could not solve this yet';
    $('answerValue').textContent = 'Check the question';
    $('stepsBox').textContent = err.message || 'Please check the expression and try again.';
  }
});
$('copyBtn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('answerValue').textContent); $('copyBtn').textContent = 'Copied!'; setTimeout(() => $('copyBtn').textContent='Copy',1200); }
  catch { $('copyBtn').textContent = 'Select answer'; }
});
$('clearHistory').addEventListener('click', () => { state.history=[]; localStorage.removeItem('twistMathHistory'); renderHistory(); });
$('themeBtn').addEventListener('click', () => { document.body.classList.toggle('light'); localStorage.setItem('twistMathLight', document.body.classList.contains('light') ? '1' : '0'); });
if (localStorage.getItem('twistMathLight') === '1') document.body.classList.add('light');

function updateCalc() { $('calcDisplay').textContent = state.calc || '0'; }
document.querySelectorAll('[data-insert]').forEach(btn => btn.addEventListener('click', () => {
  const ins = btn.dataset.insert;
  state.calc = state.calc === '0' ? ins : state.calc + ins;
  updateCalc();
}));
$('clearCalc').addEventListener('click', () => { state.calc='0'; updateCalc(); });
$('backspaceCalc').addEventListener('click', () => { state.calc=state.calc.length>1 ? state.calc.slice(0,-1) : '0'; updateCalc(); });
$('equalsCalc').addEventListener('click', () => {
  try { const old=state.calc; const result=evalExpression(old); state.calc=result; updateCalc(); saveHistory(old,result); }
  catch(e) { $('calcDisplay').textContent='Error: '+e.message; state.calc='0'; }
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
