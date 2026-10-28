/* TheDirtCalc — shared calculator engine.
   All math runs locally in the browser. The pure functions at the top are
   also exported for Node-based verification (see README). */
(function () {
  'use strict';

  var CUFT_PER_CUYD = 27;
  var LB_PER_TON = 2000;
  var WASTE_FACTOR = 1.10; // 10% extra for settling, spills and uneven ground
  var BAG_SIZES = [0.75, 1.5]; // cubic feet per bag

  /* ---------- Pure math (no DOM) ---------- */

  function shapeAreaSqFt(shape, lengthFt, widthFt) {
    if (shape === 'circle') {
      var r = lengthFt / 2; // length field carries the diameter
      return Math.PI * r * r;
    }
    if (shape === 'triangle') {
      return (lengthFt * widthFt) / 2; // length = base, width = height
    }
    return lengthFt * widthFt; // rectangle
  }

  // areas: [{ sqFt:Number, depthFt:Number }], densityLbPerCuFt: Number
  function computeTotals(areas, densityLbPerCuFt) {
    var sqFt = 0, cuFt = 0;
    for (var i = 0; i < areas.length; i++) {
      sqFt += areas[i].sqFt;
      cuFt += areas[i].sqFt * areas[i].depthFt;
    }
    var pounds = cuFt * densityLbPerCuFt;
    var wasteCuFt = cuFt * WASTE_FACTOR;
    return {
      sqFt: sqFt,
      cuFt: cuFt,
      cuYd: cuFt / CUFT_PER_CUYD,
      pounds: pounds,
      tons: pounds / LB_PER_TON,
      bags: BAG_SIZES.map(function (s) { return Math.ceil(cuFt / s); }),
      recommended: {
        cuFt: wasteCuFt,
        cuYd: wasteCuFt / CUFT_PER_CUYD,
        tons: (wasteCuFt * densityLbPerCuFt) / LB_PER_TON,
        bags: BAG_SIZES.map(function (s) { return Math.ceil(wasteCuFt / s); })
      }
    };
  }

  function tonsPerCuYdFromLbPerCuFt(lb) { return (lb * CUFT_PER_CUYD) / LB_PER_TON; }
  function lbPerCuFtFromTonsPerCuYd(t) { return (t * LB_PER_TON) / CUFT_PER_CUYD; }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      shapeAreaSqFt: shapeAreaSqFt,
      computeTotals: computeTotals,
      tonsPerCuYdFromLbPerCuFt: tonsPerCuYdFromLbPerCuFt,
      lbPerCuFtFromTonsPerCuYd: lbPerCuFtFromTonsPerCuYd,
      WASTE_FACTOR: WASTE_FACTOR
    };
  }

  /* ---------- Formatting ---------- */

  function fmt(n, decimals) {
    return n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
  function fmt2(n) { return fmt(n, 2); }
  function fmt0(n) { return fmt(n, 0); }
  function round2(n) { return Math.round(n * 100) / 100; }

  /* ---------- DOM wiring ---------- */

  function qs(root, sel) { return root.querySelector(sel); }
  function qsa(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  function initCalculator(root) {
    var mode = root.getAttribute('data-mode') || 'material';
    var materialName = root.getAttribute('data-material-name') || 'Material';
    var system = 'imperial';
    var hasCalculated = false;

    var areas = qsa(root, '[data-area]');
    var addAreaToggle = qs(root, '.add-area');
    var errorBox = qs(root, '.calc-error');
    var resultsBox = qs(root, '.results');

    /* --- unit toggle --- */
    qsa(root, '.unit-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-system');
        if (target === system) return;
        convertAllInputs(system, target);
        system = target;
        qsa(root, '.unit-btn').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-system') === system);
        });
        updateUnitLabels();
        recalc(false);
      });
    });

    function convertValue(v, kind, from, to) {
      if (isNaN(v)) return v;
      if (kind === 'len') {
        return from === 'imperial' ? v * 0.3048 : v / 0.3048; // ft <-> m
      }
      return from === 'imperial' ? v * 2.54 : v / 2.54; // in <-> cm
    }

    function convertAllInputs(from, to) {
      qsa(root, '.a-length, .a-width').forEach(function (inp) {
        var v = parseFloat(inp.value);
        if (!isNaN(v)) inp.value = round2(convertValue(v, 'len', from, to));
      });
      qsa(root, '.a-depth').forEach(function (inp) {
        var v = parseFloat(inp.value);
        if (!isNaN(v)) inp.value = round2(convertValue(v, 'depth', from, to));
      });
    }

    function updateUnitLabels() {
      qsa(root, '.u-len').forEach(function (el) { el.textContent = system === 'imperial' ? 'ft' : 'm'; });
      qsa(root, '.u-depth').forEach(function (el) { el.textContent = system === 'imperial' ? 'in' : 'cm'; });
    }

    /* --- shapes --- */
    areas.forEach(function (block) {
      var shapeSel = qs(block, '.a-shape');
      shapeSel.addEventListener('change', function () { applyShape(block); recalc(false); });
      applyShape(block);
    });

    function applyShape(block) {
      var shape = qs(block, '.a-shape').value;
      var widthWrap = qs(block, '.a-width-wrap');
      var widthInput = qs(block, '.a-width');
      var lenLabel = qs(block, '.a-length-label-text');
      var widLabel = qs(block, '.a-width-label-text');
      if (shape === 'circle') {
        lenLabel.textContent = 'Diameter';
        widthWrap.classList.add('disabled-field');
        widthInput.disabled = true;
      } else {
        widthWrap.classList.remove('disabled-field');
        widthInput.disabled = false;
        lenLabel.textContent = shape === 'triangle' ? 'Base' : 'Length';
        widLabel.textContent = shape === 'triangle' ? 'Height' : 'Width';
      }
    }

    /* --- second area toggle --- */
    if (addAreaToggle && areas.length > 1) {
      addAreaToggle.addEventListener('change', function () {
        areas[1].hidden = !addAreaToggle.checked;
        recalc(false);
      });
    }

    /* --- presets (e.g. raised-bed sizes, stored in feet) --- */
    qsa(root, '.presets button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lFt = parseFloat(btn.getAttribute('data-l-ft'));
        var wFt = parseFloat(btn.getAttribute('data-w-ft'));
        var first = areas[0];
        var lInp = qs(first, '.a-length'), wInp = qs(first, '.a-width');
        if (system === 'imperial') { lInp.value = lFt; wInp.value = wFt; }
        else { lInp.value = round2(lFt * 0.3048); wInp.value = round2(wFt * 0.3048); }
        qs(first, '.a-shape').value = 'rectangle';
        applyShape(first);
        recalc(true);
      });
    });

    /* --- density sync (material mode) --- */
    var lbInput = qs(root, '.d-lb');
    var tonsInput = qs(root, '.d-tons');
    if (lbInput && tonsInput) {
      lbInput.addEventListener('input', function () {
        var lb = parseFloat(lbInput.value);
        if (!isNaN(lb) && lb > 0) tonsInput.value = fmt(tonsPerCuYdFromLbPerCuFt(lb), 3).replace(/,/g, '');
      });
      tonsInput.addEventListener('input', function () {
        var t = parseFloat(tonsInput.value);
        if (!isNaN(t) && t > 0) lbInput.value = fmt(lbPerCuFtFromTonsPerCuYd(t), 1).replace(/,/g, '');
      });
    }
    var stoneSel = qs(root, '.stone-type');
    if (stoneSel && lbInput && tonsInput) {
      stoneSel.addEventListener('change', function () {
        var opt = stoneSel.options[stoneSel.selectedIndex];
        var lb = parseFloat(opt.getAttribute('data-density'));
        if (!isNaN(lb)) {
          lbInput.value = lb;
          tonsInput.value = fmt(tonsPerCuYdFromLbPerCuFt(lb), 3).replace(/,/g, '');
        }
        recalc(false);
      });
    }

    /* --- reading inputs --- */

    function toFeet(value, kind) {
      if (system === 'imperial') return kind === 'depth' ? value / 12 : value;
      return kind === 'depth' ? value / 30.48 : value / 0.3048;
    }

    function readAreas(errors) {
      var out = [];
      areas.forEach(function (block, idx) {
        if (block.hidden) return;
        var label = 'Area ' + (idx + 1);
        var shape = qs(block, '.a-shape').value;
        var l = parseFloat(qs(block, '.a-length').value);
        var w = parseFloat(qs(block, '.a-width').value);
        var d = parseFloat(qs(block, '.a-depth').value);
        if (isNaN(l) || l <= 0) errors.push(label + ' length');
        if (shape !== 'circle' && (isNaN(w) || w <= 0)) errors.push(label + ' width');
        if (isNaN(d) || d <= 0) errors.push(label + ' depth');
        if (errors.length) return;
        out.push({
          shape: shape,
          sqFt: shapeAreaSqFt(shape, toFeet(l, 'len'), shape === 'circle' ? 0 : toFeet(w, 'len')),
          depthFt: toFeet(d, 'depth'),
          raw: {
            l: l, w: w, d: d,
            lenUnit: system === 'imperial' ? 'ft' : 'm',
            depthUnit: system === 'imperial' ? 'in' : 'cm'
          }
        });
      });
      return out;
    }

    function describeArea(a) {
      var r = a.raw;
      if (a.shape === 'circle') return fmt2(r.l) + ' ' + r.lenUnit + ' diameter circle, ' + fmt2(r.d) + ' ' + r.depthUnit + ' deep';
      if (a.shape === 'triangle') return fmt2(r.l) + ' × ' + fmt2(r.w) + ' ' + r.lenUnit + ' triangle, ' + fmt2(r.d) + ' ' + r.depthUnit + ' deep';
      return fmt2(r.l) + ' × ' + fmt2(r.w) + ' ' + r.lenUnit + ', ' + fmt2(r.d) + ' ' + r.depthUnit + ' deep';
    }

    /* --- calculation --- */

    function recalc(fromButton) {
      var errors = [];
      var parsed = readAreas(errors);

      var density = null;
      if (mode === 'material') {
        density = lbInput ? parseFloat(lbInput.value) : NaN;
        if (isNaN(density) || density <= 0) errors.push('material density');
      }

      if (errors.length) {
        if (fromButton || hasCalculated) {
          errorBox.textContent = 'Please check: ' + errors.join(', ') +
            ' — each needs to be a number greater than 0.';
          errorBox.classList.add('show');
        }
        if (hasCalculated) resultsBox.classList.remove('show');
        return;
      }
      errorBox.classList.remove('show');

      if (mode === 'material') {
        renderMaterial(parsed, density);
      } else {
        renderBulk(parsed, errors);
        if (errors.length) { // price errors in bulk mode
          errorBox.textContent = 'Please check: ' + errors.join(', ') +
            ' — each needs to be a number (prices can be 0 only if that option is truly free).';
          errorBox.classList.add('show');
          resultsBox.classList.remove('show');
          return;
        }
      }
      hasCalculated = true;
      resultsBox.classList.add('show');
    }

    function renderMaterial(parsed, density) {
      var t = computeTotals(parsed, density);
      setText('.r-area', fmt2(t.sqFt));
      setText('.r-cuft', fmt2(t.cuFt));
      setText('.r-cuyd', fmt2(t.cuYd));
      setText('.r-tons', fmt2(t.tons));
      setText('.r-bags075', fmt0(t.bags[0]));
      setText('.r-bags15', fmt0(t.bags[1]));
      setText('.r-rec-cuyd', fmt2(t.recommended.cuYd));
      setText('.r-rec-tons', fmt2(t.recommended.tons));
      setText('.r-rec-bags075', fmt0(t.recommended.bags[0]));
      setText('.r-rec-bags15', fmt0(t.recommended.bags[1]));

      var lines = [];
      lines.push(materialName + ' — shopping list (TheDirtCalc)');
      parsed.forEach(function (a, i) { lines.push('Area ' + (i + 1) + ': ' + describeArea(a)); });
      lines.push('Total coverage: ' + fmt2(t.sqFt) + ' sq ft');
      lines.push('Volume needed: ' + fmt2(t.cuFt) + ' cu ft = ' + fmt2(t.cuYd) + ' cu yd');
      lines.push('Weight: about ' + fmt2(t.tons) + ' tons (at ' + fmt(parseFloat(lbInput.value), 1) + ' lb per cu ft)');
      lines.push('Bags: ' + fmt0(t.bags[0]) + ' × 0.75 cu ft bags, or ' + fmt0(t.bags[1]) + ' × 1.5 cu ft bags');
      lines.push('Recommended order (adds 10% for settling, spills and uneven ground):');
      lines.push('  ' + fmt2(t.recommended.cuYd) + ' cu yd in bulk, or about ' + fmt2(t.recommended.tons) + ' tons');
      lines.push('  or ' + fmt0(t.recommended.bags[0]) + ' × 0.75 cu ft bags / ' + fmt0(t.recommended.bags[1]) + ' × 1.5 cu ft bags');
      setShopList(lines.join('\n'));
    }

    function renderBulk(parsed, errors) {
      var bulkPrice = parseFloat(qs(root, '.p-bulk').value);
      var bagPrice = parseFloat(qs(root, '.p-bag').value);
      var bagSize = parseFloat(qs(root, '.p-bagsize').value);
      if (isNaN(bulkPrice) || bulkPrice < 0) errors.push('bulk price');
      if (isNaN(bagPrice) || bagPrice < 0) errors.push('bag price');
      if (errors.length) return;

      var t = computeTotals(parsed, 1); // density irrelevant here; use waste-adjusted volume
      var recCuFt = t.recommended.cuFt;
      var recCuYd = t.recommended.cuYd;
      var bagsNeeded = Math.ceil(recCuFt / bagSize);
      var bulkCost = recCuYd * bulkPrice;
      var bagCost = bagsNeeded * bagPrice;

      setText('.r-area', fmt2(t.sqFt));
      setText('.r-cuft', fmt2(t.cuFt));
      setText('.r-cuyd', fmt2(t.cuYd));
      setText('.r-rec-cuyd', fmt2(recCuYd));
      setText('.r-bulk-qty', fmt2(recCuYd));
      setText('.r-bulk-cost', '$' + fmt2(bulkCost));
      setText('.r-bag-qty', fmt0(bagsNeeded) + ' × ' + bagSize + ' cu ft');
      setText('.r-bag-cost', '$' + fmt2(bagCost));

      var verdict, diff = Math.abs(bulkCost - bagCost);
      if (bulkCost < bagCost) verdict = 'Bulk is cheaper by $' + fmt2(diff) + '.';
      else if (bagCost < bulkCost) verdict = 'Bags are cheaper by $' + fmt2(diff) + '.';
      else verdict = 'Both options cost the same.';
      setText('.r-verdict', verdict);

      var lines = [];
      lines.push(materialName + ' — bulk vs. bagged comparison (TheDirtCalc)');
      parsed.forEach(function (a, i) { lines.push('Area ' + (i + 1) + ': ' + describeArea(a)); });
      lines.push('Volume needed: ' + fmt2(t.cuFt) + ' cu ft = ' + fmt2(t.cuYd) + ' cu yd');
      lines.push('With 10% extra: ' + fmt2(recCuYd) + ' cu yd');
      lines.push('Bulk: ' + fmt2(recCuYd) + ' cu yd × $' + fmt2(bulkPrice) + '/cu yd = $' + fmt2(bulkCost));
      lines.push('Bagged: ' + fmt0(bagsNeeded) + ' bags (' + bagSize + ' cu ft each) × $' + fmt2(bagPrice) + ' = $' + fmt2(bagCost));
      lines.push('Verdict: ' + verdict);
      setShopList(lines.join('\n'));
    }

    function setText(sel, txt) {
      var el = qs(root, sel);
      if (el) el.textContent = txt;
    }
    function setShopList(txt) {
      var ta = qs(root, '.shop-list');
      if (ta) ta.value = txt;
    }

    /* --- copy button --- */
    var copyBtn = qs(root, '.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var ta = qs(root, '.shop-list');
        var note = qs(root, '.copy-note');
        function done() { if (note) { note.textContent = 'Copied.'; setTimeout(function () { note.textContent = ''; }, 2000); } }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); document.execCommand('copy'); done(); });
        } else {
          ta.select(); document.execCommand('copy'); done();
        }
      });
    }

    /* --- events --- */
    var calcBtn = qs(root, '.calc-btn');
    if (calcBtn) calcBtn.addEventListener('click', function () { recalc(true); });
    root.addEventListener('input', function () { recalc(false); });
    root.addEventListener('change', function () { recalc(false); });

    updateUnitLabels();
    recalc(false); // show results immediately when the page ships with sensible defaults
  }

  document.addEventListener('DOMContentLoaded', function () {
    qsa(document, '.calc-root').forEach(initCalculator);
  });
})();
