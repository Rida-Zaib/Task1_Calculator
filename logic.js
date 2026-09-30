'use strict';

/* =====================================================================
   Shared arithmetic engine — used by both Standard and Scientific modes.
   Supports + − × ÷ ^  with proper precedence (^ highest, then × ÷, then + −)
   and NO eval().
   ===================================================================== */

const MAX_DIGITS = 15;

function evaluate(tokens) {
  if (tokens.length === 0) return 0;

  // Pass 1: collapse all ^ (right associative)
  let pass1 = [tokens[0]];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i], n = tokens[i + 1];
    if (op === '^') {
      const base = parseFloat(pass1.pop());
      pass1.push(String(Math.pow(base, parseFloat(n))));
    } else {
      pass1.push(op, n);
    }
  }

  // Pass 2: collapse × ÷
  const values = [parseFloat(pass1[0])];
  const lowOps = [];
  for (let i = 1; i < pass1.length; i += 2) {
    const op = pass1[i], n = parseFloat(pass1[i + 1]);
    if (op === '×' || op === '÷') {
      const a = values.pop();
      if (op === '÷' && n === 0) throw new Error('DIV_BY_ZERO');
      values.push(op === '×' ? a * n : a / n);
    } else {
      lowOps.push(op);
      values.push(n);
    }
  }

  // Pass 3: + −
  let result = values[0];
  for (let j = 0; j < lowOps.length; j++) {
    result = lowOps[j] === '+' ? result + values[j + 1] : result - values[j + 1];
  }
  return result;
}

function formatResult(n) {
  if (!isFinite(n)) throw new Error('OVERFLOW');
  const rounded = Number(n.toPrecision(15));
  const abs = Math.abs(rounded);
  if (rounded !== 0 && (abs >= 1e15 || abs < 1e-9)) {
    return rounded.toExponential(8).replace(/\.?0+e/, 'e');
  }
  return String(rounded);
}

function clean(str) {
  let out = str;
  if (out.endsWith('.')) out = out.slice(0, -1);
  if (out === '-0' || out === '-' || out === '') out = '0';
  return out;
}

function digitCount(str) {
  return str.replace(/[^0-9]/g, '').length;
}

/**
 * Creates one calculator engine. `mode` is 'standard' or 'scientific' —
 * scientific additionally accepts '^' as an operator and exposes applyUnary()
 * for functions like sin/cos/ln/√ that act on the number on screen right away.
 */
function createCalculator(mode) {
  const s = {
    tokens: [], current: '0', awaiting: false,
    justEvaluated: false, error: null, expression: '',
    angleUnit: 'deg' // 'deg' | 'rad' — only used in scientific mode
  };

  function clearAll() {
    s.tokens = []; s.current = '0'; s.awaiting = false;
    s.justEvaluated = false; s.error = null; s.expression = '';
  }

  function prepareForInput() {
    if (s.error) clearAll();
    if (s.justEvaluated) { s.tokens = []; s.current = '0'; s.justEvaluated = false; s.expression = ''; }
  }

  function digit(d) {
    prepareForInput();
    if (s.awaiting) { s.current = d; s.awaiting = false; return; }
    if (s.current === '0') s.current = d;
    else if (s.current === '-0') s.current = '-' + d;
    else if (digitCount(s.current) < MAX_DIGITS) s.current += d;
  }

  function decimal() {
    prepareForInput();
    if (s.awaiting) { s.current = '0.'; s.awaiting = false; return; }
    if (!s.current.includes('.')) s.current += '.';
  }

  function operator(op) {
    if (s.error) return;
    if (s.justEvaluated) {
      s.tokens = [s.current, op]; s.justEvaluated = false; s.expression = ''; s.awaiting = true; return;
    }
    if (s.awaiting) { s.tokens[s.tokens.length - 1] = op; return; }
    s.tokens.push(clean(s.current), op);
    s.awaiting = true;
  }

  function equals() {
    if (s.error || s.justEvaluated) return;
    if (s.tokens.length === 0) { s.current = clean(s.current); return; }
    const work = s.tokens.slice();
    if (s.awaiting) work.pop(); else work.push(clean(s.current));
    s.expression = work.join(' ') + ' =';
    s.tokens = []; s.awaiting = false;
    try {
      s.current = formatResult(evaluate(work));
      s.justEvaluated = true;
    } catch (err) {
      s.error = err.message === 'DIV_BY_ZERO' ? 'Cannot divide by zero' : 'Number too large';
      s.justEvaluated = false;
    }
  }

  function backspace() {
    if (s.error || s.justEvaluated) { clearAll(); return; }
    if (s.awaiting) { s.tokens.pop(); s.current = s.tokens.pop() || '0'; s.awaiting = false; return; }
    s.current = s.current.length > 1 ? s.current.slice(0, -1) : '0';
    if (s.current === '-') s.current = '0';
  }

  function toggleSign() {
    if (s.error) return;
    if (s.awaiting) { s.current = '-0'; s.awaiting = false; return; }
    s.current = s.current.startsWith('-') ? s.current.slice(1) : '-' + s.current;
  }

  // ---- Scientific-only: apply a unary function to the number on screen ----
  function applyUnary(name) {
    if (mode !== 'scientific' || s.error) return;
    prepareForInput();
    const x = parseFloat(s.current);
    const toRad = (v) => (s.angleUnit === 'deg' ? (v * Math.PI) / 180 : v);
    let out;
    try {
      switch (name) {
        case 'sin':  out = Math.sin(toRad(x)); break;
        case 'cos':  out = Math.cos(toRad(x)); break;
        case 'tan':  out = Math.tan(toRad(x)); break;
        case 'sqrt': if (x < 0) throw new Error('DOMAIN'); out = Math.sqrt(x); break;
        case 'ln':   if (x <= 0) throw new Error('DOMAIN'); out = Math.log(x); break;
        case 'log':  if (x <= 0) throw new Error('DOMAIN'); out = Math.log10(x); break;
        case 'sq':   out = x * x; break;
        case 'inv':  if (x === 0) throw new Error('DIV_BY_ZERO'); out = 1 / x; break;
        case 'pct':  out = x / 100; break;
        case 'fact': {
          if (x < 0 || !Number.isInteger(x)) throw new Error('DOMAIN');
          if (x > 170) throw new Error('OVERFLOW');
          out = 1; for (let i = 2; i <= x; i++) out *= i;
          break;
        }
        default: return;
      }
      s.current = formatResult(out);
      s.awaiting = false;
      s.justEvaluated = false; // stays editable, chains naturally with operators
    } catch (err) {
      if (err.message === 'DIV_BY_ZERO') s.error = 'Cannot divide by zero';
      else if (err.message === 'DOMAIN') s.error = 'Invalid input';
      else s.error = 'Number too large';
    }
  }

  function insertConstant(name) {
    prepareForInput();
    s.current = name === 'pi' ? formatResult(Math.PI) : formatResult(Math.E);
  }

  function getExpression() {
    if (s.error || s.justEvaluated) return s.expression;
    return s.tokens.join(' ');
  }

  return {
    state: s, digit, decimal, operator, equals, clear: clearAll,
    backspace, toggleSign, getExpression, applyUnary, insertConstant
  };
}

/* =====================================================================
   BMI
   ===================================================================== */
function computeBMI(weightKg, heightM) {
  if (!(weightKg > 0) || !(heightM > 0)) return null;
  const bmi = weightKg / (heightM * heightM);
  let category;
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal weight';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  return { bmi: Math.round(bmi * 10) / 10, category };
}
function lbToKg(lb) { return lb * 0.45359237; }
function inToM(inches) { return inches * 0.0254; }
function ftInToM(ft, inch) { return (ft * 12 + (inch || 0)) * 0.0254; }

/* =====================================================================
   Age calculator — years / months / days between two ISO dates ("YYYY-MM-DD")
   ===================================================================== */
function computeAge(birthISO, asOfISO) {
  const birth = new Date(birthISO + 'T00:00:00');
  const asOf = new Date((asOfISO || new Date().toISOString().slice(0, 10)) + 'T00:00:00');
  if (isNaN(birth) || isNaN(asOf)) return null;
  if (birth > asOf) return { error: 'Birth date is after the target date' };

  let years = asOf.getFullYear() - birth.getFullYear();
  let months = asOf.getMonth() - birth.getMonth();
  let days = asOf.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const daysInPrevMonth = new Date(asOf.getFullYear(), asOf.getMonth(), 0).getDate();
    days += daysInPrevMonth;
  }
  if (months < 0) { years -= 1; months += 12; }

  const totalDays = Math.round((asOf - birth) / 86400000);
  return { years, months, days, totalDays };
}

/* =====================================================================
   CGPA — weighted average of {credits, points} rows
   ===================================================================== */
const DEFAULT_GRADE_POINTS = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'F': 0.0
};

/**
 * rows: [{credits, grade}], scale: { gradeLabel: points } — pass a custom
 * scale so each university's own grading criteria can be used instead of
 * DEFAULT_GRADE_POINTS.
 */
function computeCGPA(rows, scale) {
  const table = scale || DEFAULT_GRADE_POINTS;
  let creditSum = 0, pointSum = 0;
  for (const row of rows) {
    const credits = parseFloat(row.credits);
    const points = table[row.grade];
    if (!(credits > 0) || points === undefined || points === null || isNaN(points)) continue;
    creditSum += credits;
    pointSum += credits * points;
  }
  if (creditSum === 0) return null;
  return Math.round((pointSum / creditSum) * 100) / 100;
}

/**
 * Combines a previous cumulative CGPA (over prevCredits credit hours) with
 * this semester's GPA (over semCredits credit hours) into a new cumulative
 * CGPA — the same method universities use: treat "previous CGPA × previous
 * credit hours" as the grade points already earned.
 */
function computeCumulativeCGPA(prevCgpa, prevCredits, semGpa, semCredits) {
  const pc = parseFloat(prevCredits) > 0 ? parseFloat(prevCredits) : 0;
  const pg = parseFloat(prevCgpa) || 0;
  const sc = parseFloat(semCredits) > 0 ? parseFloat(semCredits) : 0;
  const sg = parseFloat(semGpa) || 0;

  const totalCredits = pc + sc;
  if (totalCredits === 0) return null;
  const totalPoints = pg * pc + sg * sc;
  return Math.round((totalPoints / totalCredits) * 100) / 100;
}

/* =====================================================================
   Height converter
   ===================================================================== */
function cmToFeetIn(cm) {
  const totalIn = cm / 2.54;
  let feet = Math.floor(totalIn / 12);
  let inches = Math.round((totalIn - feet * 12) * 10) / 10;
  if (inches === 12) { feet += 1; inches = 0; }
  return { feet, inches };
}
function feetInToCm(feet, inches) {
  return Math.round(((feet * 12) + (inches || 0)) * 2.54 * 100) / 100;
}

/* =====================================================================
   Distance / length converter — base unit: meters
   ===================================================================== */
const DISTANCE_TO_M = {
  km: 1000, m: 1, cm: 0.01, mile: 1609.344, yard: 0.9144, feet: 0.3048
};
function convertDistance(value, from, to) {
  if (!(value >= 0) && value !== 0) return null;
  if (!(from in DISTANCE_TO_M) || !(to in DISTANCE_TO_M)) return null;
  const meters = value * DISTANCE_TO_M[from];
  const result = meters / DISTANCE_TO_M[to];
  return Math.round(result * 1e6) / 1e6;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createCalculator, evaluate, formatResult,
    computeBMI, lbToKg, inToM, ftInToM,
    computeAge,
    GRADE_POINTS: DEFAULT_GRADE_POINTS, DEFAULT_GRADE_POINTS, computeCGPA, computeCumulativeCGPA,
    cmToFeetIn, feetInToCm,
    DISTANCE_TO_M, convertDistance
  };
}
