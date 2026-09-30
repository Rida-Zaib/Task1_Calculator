'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* =====================================================================
     Tabs
     ===================================================================== */
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.querySelector('.panel[data-panel="' + tab.dataset.tab + '"]').classList.add('active');
      document.body.setAttribute('data-calc-theme', tab.dataset.tab);
    });
  });
  document.body.setAttribute('data-calc-theme', 'standard');

  /* =====================================================================
     Shared helpers for the Standard + Scientific keypads
     ===================================================================== */
  function withCommas(str) {
    if (/e/i.test(str)) return str;
    const negative = str.startsWith('-');
    const parts = (negative ? str.slice(1) : str).split('.');
    const whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (negative ? '-' : '') + whole + (parts.length > 1 ? '.' + parts[1] : '');
  }

  function buildEngine(mode) {
    const calc = createCalculator(mode);
    const displayEl = document.getElementById('display-' + mode);
    const expressionEl = document.getElementById('expr-' + mode);
    const valueEl = document.getElementById('value-' + mode);
    const panel = document.querySelector('.panel[data-panel="' + mode + '"]');
    const buttons = panel.querySelectorAll('.key');

    function fitFontSize(text) {
      const len = text.length;
      let size = mode === 'scientific' ? '2.4rem' : '2.7rem';
      if (len > 16) size = '1.3rem';
      else if (len > 12) size = '1.7rem';
      else if (len > 9) size = '2.1rem';
      valueEl.style.fontSize = calc.state.error ? '1.3rem' : size;
    }

    function render() {
      const s = calc.state;
      let expr = calc.getExpression();
      if (expr.length > 34) expr = '…' + expr.slice(-33);
      expressionEl.textContent = expr || '\u00A0';

      const text = s.error ? s.error : withCommas(s.current);
      valueEl.textContent = text;
      fitFontSize(text);
      displayEl.classList.toggle('error', Boolean(s.error));

      buttons.forEach(function (btn) {
        const isPendingOp =
          btn.dataset.action === 'operator' &&
          s.awaiting &&
          s.tokens[s.tokens.length - 1] === btn.dataset.value;
        btn.classList.toggle('active', isPendingOp);
      });

      if (mode === 'scientific') {
        panel.querySelectorAll('.pill').forEach(function (p) {
          p.classList.toggle('active', p.dataset.angle === s.angleUnit);
        });
      }
    }

    function playAnimation(className) {
      displayEl.classList.remove(className);
      void displayEl.offsetWidth;
      displayEl.classList.add(className);
      setTimeout(function () { displayEl.classList.remove(className); }, 450);
    }

    function dispatch(action, value) {
      switch (action) {
        case 'digit':     calc.digit(value); break;
        case 'decimal':   calc.decimal(); break;
        case 'operator':  calc.operator(value); break;
        case 'equals':    calc.equals(); break;
        case 'clear':     calc.clear(); break;
        case 'backspace': calc.backspace(); break;
        case 'sign':      calc.toggleSign(); break;
      }
      render();
      if (action === 'equals') {
        if (calc.state.error) playAnimation('shake');
        else if (calc.state.justEvaluated) playAnimation('pop');
      }
    }

    function addRipple(btn, event) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const fromKeyboard = !event || event.detail === 0;
      const x = (fromKeyboard ? rect.width / 2 : event.clientX - rect.left) - size / 2;
      const y = (fromKeyboard ? rect.height / 2 : event.clientY - rect.top) - size / 2;
      const dot = document.createElement('span');
      dot.className = 'ripple';
      dot.style.width = dot.style.height = size + 'px';
      dot.style.left = x + 'px';
      dot.style.top = y + 'px';
      dot.addEventListener('animationend', function () { dot.remove(); });
      btn.appendChild(dot);
    }

    buttons.forEach(function (btn) {
      if (!btn.dataset.action) return; // fn2/const buttons handled separately below
      btn.addEventListener('click', function (event) {
        addRipple(btn, event);
        dispatch(btn.dataset.action, btn.dataset.value);
      });
    });

    // Scientific-only: unary functions and constants
    if (mode === 'scientific') {
      panel.querySelectorAll('[data-fn]').forEach(function (btn) {
        btn.addEventListener('click', function (event) {
          addRipple(btn, event);
          calc.applyUnary(btn.dataset.fn);
          render();
          if (calc.state.error) playAnimation('shake');
        });
      });
      panel.querySelectorAll('[data-const]').forEach(function (btn) {
        btn.addEventListener('click', function (event) {
          addRipple(btn, event);
          calc.insertConstant(btn.dataset.const);
          render();
        });
      });
      panel.querySelectorAll('.pill').forEach(function (btn) {
        btn.addEventListener('click', function () {
          calc.state.angleUnit = btn.dataset.angle;
          render();
        });
      });
    }

    render();
    return { calc, dispatch, panel };
  }

  const standardEngine = buildEngine('standard');
  const scientificEngine = buildEngine('scientific');

  // ---------- Keyboard support (only acts on the currently visible engine) ----------
  const operatorKeys = { '+': '+', '-': '−', '*': '×', 'x': '×', 'X': '×', '/': '÷', '^': '^' };

  function activeEngine() {
    return document.querySelector('.panel[data-panel="scientific"]').classList.contains('active')
      ? scientificEngine
      : (document.querySelector('.panel[data-panel="standard"]').classList.contains('active') ? standardEngine : null);
  }

  document.addEventListener('keydown', function (event) {
    const engine = activeEngine();
    if (!engine) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key;

    if (/^[0-9]$/.test(key)) engine.dispatch('digit', key);
    else if (key === '.' || key === ',') engine.dispatch('decimal');
    else if (operatorKeys[key] && (key !== '^' || engine === scientificEngine)) {
      event.preventDefault();
      engine.dispatch('operator', operatorKeys[key]);
    } else if (key === 'Enter' || key === '=') { event.preventDefault(); engine.dispatch('equals'); }
    else if (key === 'Backspace') engine.dispatch('backspace');
    else if (key === 'Escape' || key === 'Delete') engine.dispatch('clear');
  });

  /* =====================================================================
     BMI
     ===================================================================== */
  const bmiHeightUnit = document.getElementById('bmiHeightUnit');
  const bmiFtInRow = document.getElementById('bmiFtInRow');
  const bmiHeightInput = document.getElementById('bmiHeight');

  bmiHeightUnit.addEventListener('change', function () {
    const isFtIn = bmiHeightUnit.value === 'ftin';
    bmiFtInRow.hidden = !isFtIn;
    bmiHeightInput.closest('.field').hidden = isFtIn;
  });

  document.getElementById('bmiCalcBtn').addEventListener('click', function () {
    const weightRaw = parseFloat(document.getElementById('bmiWeight').value);
    const weightUnit = document.getElementById('bmiWeightUnit').value;
    const heightUnit = bmiHeightUnit.value;

    if (!(weightRaw > 0)) return showBmiError('Enter a valid weight.');

    const weightKg = weightUnit === 'lb' ? lbToKg(weightRaw) : weightRaw;

    let heightM;
    if (heightUnit === 'cm') {
      const cm = parseFloat(bmiHeightInput.value);
      if (!(cm > 0)) return showBmiError('Enter a valid height.');
      heightM = cm / 100;
    } else {
      const ft = parseFloat(document.getElementById('bmiFeet').value) || 0;
      const inch = parseFloat(document.getElementById('bmiInches').value) || 0;
      if (ft <= 0 && inch <= 0) return showBmiError('Enter a valid height.');
      heightM = ftInToM(ft, inch);
    }

    const out = computeBMI(weightKg, heightM);
    const card = document.getElementById('bmiResult');
    card.hidden = false;
    document.getElementById('bmiValue').textContent = out.bmi.toFixed(1);
    document.getElementById('bmiCategory').textContent = out.category;
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  });

  function showBmiError(msg) {
    const card = document.getElementById('bmiResult');
    card.hidden = false;
    document.getElementById('bmiValue').textContent = '–';
    document.getElementById('bmiCategory').textContent = msg;
  }

  /* =====================================================================
     Age
     ===================================================================== */
  const ageAsOfInput = document.getElementById('ageAsOf');
  ageAsOfInput.value = new Date().toISOString().slice(0, 10);

  document.getElementById('ageCalcBtn').addEventListener('click', function () {
    const birth = document.getElementById('ageBirth').value;
    const asOf = ageAsOfInput.value || new Date().toISOString().slice(0, 10);
    const card = document.getElementById('ageResult');

    if (!birth) {
      card.hidden = false;
      document.getElementById('ageValue').textContent = '–';
      document.getElementById('ageDays').textContent = 'Pick a date of birth first.';
      return;
    }

    const out = computeAge(birth, asOf);
    card.hidden = false;
    if (out.error) {
      document.getElementById('ageValue').textContent = '–';
      document.getElementById('ageDays').textContent = out.error;
      return;
    }
    document.getElementById('ageValue').textContent =
      out.years + 'y ' + out.months + 'm ' + out.days + 'd';
    document.getElementById('ageDays').textContent =
      out.totalDays.toLocaleString() + ' days in total';
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  });

  /* =====================================================================
     CGPA — editable grading scale + optional reference image + previous CGPA
     ===================================================================== */

  // ---- Grading scale (starts from the default 4.0 scale, fully editable) ----
  let gradeScale = DEFAULT_GRADE_POINTS.slice
    ? DEFAULT_GRADE_POINTS.slice()
    : Object.keys(DEFAULT_GRADE_POINTS).map(function (g) { return { grade: g, points: DEFAULT_GRADE_POINTS[g] }; });

  const scaleRows = document.getElementById('scaleRows');

  function currentScaleMap() {
    const map = {};
    scaleRows.querySelectorAll('.scale-row').forEach(function (row) {
      const label = row.querySelector('.scale-grade').value.trim();
      const pts = parseFloat(row.querySelector('.scale-points').value);
      if (label && !isNaN(pts)) map[label] = pts;
    });
    return map;
  }

  function renderScaleRows(scale) {
    scaleRows.innerHTML = '';
    scale.forEach(function (g) { addScaleRow(g.grade, g.points); });
    refreshGradeDropdowns();
  }

  function addScaleRow(label, points) {
    const row = document.createElement('div');
    row.className = 'scale-row';
    row.innerHTML =
      '<input type="text" class="scale-grade" value="' + (label || '') + '" placeholder="e.g. A">' +
      '<input type="number" class="scale-points" value="' + (points !== undefined ? points : '') + '" step="0.1" min="0" placeholder="4.0">' +
      '<button type="button" class="row-remove" aria-label="Remove grade">✕</button>';
    row.querySelector('.row-remove').addEventListener('click', function () {
      row.remove();
      refreshGradeDropdowns();
    });
    row.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('input', refreshGradeDropdowns);
    });
    scaleRows.appendChild(row);
  }

  document.getElementById('scaleAddRow').addEventListener('click', function () {
    addScaleRow('', '');
  });
  document.getElementById('scaleResetBtn').addEventListener('click', function () {
    renderScaleRows(gradeScale);
  });

  // ---- Optional reference image of the university's grading table ----
  // (Kept as a visual reference only — a static page can't reliably OCR an
  // arbitrary table image, so it isn't used in the actual calculation.)
  const uploadBox = document.getElementById('uploadBox');
  const scaleImageInput = document.getElementById('scaleImageInput');
  const scaleImagePreview = document.getElementById('scaleImagePreview');
  const scaleImageEl = document.getElementById('scaleImageEl');

  scaleImageInput.addEventListener('change', function () {
    const file = scaleImageInput.files && scaleImageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      scaleImageEl.src = e.target.result;
      scaleImagePreview.hidden = false;
      uploadBox.hidden = true;
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('scaleImageRemove').addEventListener('click', function () {
    scaleImageInput.value = '';
    scaleImageEl.src = '';
    scaleImagePreview.hidden = true;
    uploadBox.hidden = false;
  });

  // ---- This semester's course rows ----
  const cgpaRows = document.getElementById('cgpaRows');

  function refreshGradeDropdowns() {
    const scale = currentScaleMap();
    const labels = Object.keys(scale);
    cgpaRows.querySelectorAll('.cgpa-grade').forEach(function (select) {
      const prev = select.value;
      select.innerHTML = labels.map(function (g) {
        return '<option value="' + g + '">' + g + '</option>';
      }).join('');
      select.value = labels.includes(prev) ? prev : (labels.includes('A') ? 'A' : labels[0]);
    });
  }

  function addCgpaRow() {
    const scale = currentScaleMap();
    const labels = Object.keys(scale);
    const row = document.createElement('div');
    row.className = 'cgpa-row';
    row.innerHTML =
      '<input type="text" placeholder="e.g. Data Structures" class="cgpa-name">' +
      '<input type="number" placeholder="3" min="0" step="0.5" class="cgpa-credits">' +
      '<select class="cgpa-grade">' +
        labels.map(function (g) {
          return '<option value="' + g + '"' + (g === 'A' ? ' selected' : '') + '>' + g + '</option>';
        }).join('') +
      '</select>' +
      '<button type="button" class="row-remove" aria-label="Remove course">✕</button>';
    row.querySelector('.row-remove').addEventListener('click', function () { row.remove(); });
    cgpaRows.appendChild(row);
  }

  document.getElementById('cgpaAddRow').addEventListener('click', function () { addCgpaRow(); });

  renderScaleRows(gradeScale); // builds the scale rows AND the first grade dropdowns
  addCgpaRow(); addCgpaRow(); addCgpaRow(); // start with 3 course rows

  // ---- Calculate: this semester's GPA, then combine with previous CGPA ----
  document.getElementById('cgpaCalcBtn').addEventListener('click', function () {
    const scale = currentScaleMap();
    const rows = Array.prototype.map.call(cgpaRows.querySelectorAll('.cgpa-row'), function (row) {
      return {
        credits: row.querySelector('.cgpa-credits').value,
        grade: row.querySelector('.cgpa-grade').value
      };
    });

    const semGpa = computeCGPA(rows, scale);
    const prevCgpaVal = document.getElementById('prevCgpa').value;
    const prevCreditsVal = document.getElementById('prevCredits').value;
    const hasPrev = prevCgpaVal !== '' && prevCreditsVal !== '' && parseFloat(prevCreditsVal) > 0;

    const cumulative = computeCumulativeCGPA(prevCgpaVal, prevCreditsVal, semGpa, rows.reduce(function (sum, r) {
      const c = parseFloat(r.credits);
      return sum + (c > 0 && scale[r.grade] !== undefined ? c : 0);
    }, 0));

    const card = document.getElementById('cgpaResultCard');
    card.hidden = false;
    const valueEl = document.getElementById('cgpaValue');
    const semTag = document.getElementById('cgpaSemTag');
    const cumTag = document.getElementById('cgpaCumTag');

    if (semGpa === null && !hasPrev) {
      valueEl.textContent = '–';
      semTag.textContent = 'Add at least one course with credit hours.';
      cumTag.textContent = '';
    } else {
      valueEl.textContent = (cumulative !== null ? cumulative : semGpa).toFixed(2);
      semTag.textContent = semGpa !== null ? 'This semester: ' + semGpa.toFixed(2) : 'This semester: –';
      cumTag.textContent = hasPrev
        ? 'New cumulative CGPA (incl. previous ' + parseFloat(prevCgpaVal).toFixed(2) + ' over ' + prevCreditsVal + ' credit hrs)'
        : 'out of ' + (Math.max.apply(null, Object.values(scale).length ? Object.values(scale) : [4]) || 4).toFixed(1);
    }
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  });

  /* =====================================================================
     Height converter (live, two-way)
     ===================================================================== */
  const heightCm = document.getElementById('heightCm');
  const heightFt = document.getElementById('heightFt');
  const heightIn = document.getElementById('heightIn');
  let heightSyncing = false;

  heightCm.addEventListener('input', function () {
    if (heightSyncing) return;
    const cm = parseFloat(heightCm.value);
    if (!(cm >= 0)) { heightFt.value = ''; heightIn.value = ''; return; }
    const out = cmToFeetIn(cm);
    heightSyncing = true;
    heightFt.value = out.feet;
    heightIn.value = out.inches;
    heightSyncing = false;
  });

  function syncFromFtIn() {
    if (heightSyncing) return;
    const ft = parseFloat(heightFt.value) || 0;
    const inch = parseFloat(heightIn.value) || 0;
    if (ft === 0 && inch === 0 && heightFt.value === '' && heightIn.value === '') { heightCm.value = ''; return; }
    heightSyncing = true;
    heightCm.value = feetInToCm(ft, inch);
    heightSyncing = false;
  }
  heightFt.addEventListener('input', syncFromFtIn);
  heightIn.addEventListener('input', syncFromFtIn);

  /* =====================================================================
     Distance converter (live)
     ===================================================================== */
  const distValue = document.getElementById('distValue');
  const distFrom = document.getElementById('distFrom');
  const distTo = document.getElementById('distTo');
  const distOut = document.getElementById('distValueOut');

  function renderDistance() {
    const v = parseFloat(distValue.value);
    if (!(v >= 0)) { distOut.textContent = '0'; return; }
    const result = convertDistance(v, distFrom.value, distTo.value);
    distOut.textContent = result === null ? '–' : result.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
  [distValue, distFrom, distTo].forEach(function (el) { el.addEventListener('input', renderDistance); });
  renderDistance();

});
