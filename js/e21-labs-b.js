/* Electron21 — labs B: 8-bit CPU Emulator, Signal Scope */
(function () {
  'use strict';
  var E = window.E21; if (!E) return;
  var $ = E.$, $$ = E.$$, esc = E.esc;

  /* =====================================================================
     8-BIT CPU EMULATOR — a real stored-program (von Neumann) machine.
     The assembler turns source into machine-code BYTES, loads them into a
     256-byte memory that holds program, data and stack together, and the CPU
     runs the real fetch -> decode -> execute cycle on those bytes:
       fetch  the opcode byte at PC (and its operand byte)
       decode the opcode through a 256-entry table
       execute and update registers, flags, memory, stack and PC.
     ===================================================================== */
  var REGS = ['A', 'B', 'C', 'D'];
  var SP_TOP = 255, MAX_CODE = 224;       // stack starts at 0xFF and grows down
  /* [base opcode, mnemonic, operand form]. Forms with a register keep it in the low 2 bits of the opcode. */
  var OPS = [
    [0x00, 'NOP', ''], [0x01, 'HLT', ''], [0x02, 'RET', ''],
    [0x10, 'MOV', 'ri'], [0x14, 'MOV', 'rr'], [0x18, 'LOAD', 'rm'], [0x1C, 'LOAD', 'rn'], [0x20, 'STORE', 'mr'], [0x24, 'STORE', 'nr'],
    [0x30, 'ADD', 'ri'], [0x34, 'SUB', 'ri'], [0x38, 'AND', 'ri'], [0x3C, 'OR', 'ri'], [0x40, 'XOR', 'ri'], [0x44, 'CMP', 'ri'],
    [0x50, 'ADD', 'rr'], [0x54, 'SUB', 'rr'], [0x58, 'AND', 'rr'], [0x5C, 'OR', 'rr'], [0x60, 'XOR', 'rr'], [0x64, 'CMP', 'rr'],
    [0x70, 'INC', 'r'], [0x74, 'DEC', 'r'], [0x78, 'SHL', 'r'], [0x7C, 'SHR', 'r'], [0x80, 'PUSH', 'r'], [0x84, 'POP', 'r'], [0x88, 'OUT', 'r'],
    [0x8C, 'OUT', 'i'],
    [0x90, 'JMP', 'a'], [0x91, 'JZ', 'a'], [0x92, 'JNZ', 'a'], [0x93, 'JC', 'a'], [0x94, 'JNC', 'a'], [0x95, 'JN', 'a'], [0x96, 'CALL', 'a']
  ];
  var REGFORM = { ri: 1, rr: 1, rm: 1, rn: 1, mr: 1, nr: 1, r: 1 };
  var LEN = { '': 1, r: 1, ri: 2, rr: 2, rm: 2, rn: 2, mr: 2, nr: 2, i: 2, a: 2 };
  var FORMDESC = { '': 'no operands', ri: 'register, immediate value', rr: 'register, register', rm: 'register, memory address', rn: 'register, [register]', mr: 'memory address, register', nr: '[register], register', r: 'one register', i: 'immediate value', a: 'jump target address' };
  var DEC = [], BASE = {}, k0;
  for (k0 = 0; k0 < 256; k0++) DEC[k0] = null;
  OPS.forEach(function (o) {
    BASE[o[1] + '/' + o[2]] = o[0];
    if (REGFORM[o[2]]) { for (var r = 0; r < 4; r++) DEC[o[0] | r] = { mn: o[1], form: o[2], r: r }; }
    else DEC[o[0]] = { mn: o[1], form: o[2], r: -1 };
  });
  var ARITY = { MOV: 2, LOAD: 2, STORE: 2, ADD: 2, SUB: 2, AND: 2, OR: 2, XOR: 2, CMP: 2, INC: 1, DEC: 1, SHL: 1, SHR: 1, PUSH: 1, POP: 1, JMP: 1, JZ: 1, JNZ: 1, JC: 1, JNC: 1, JN: 1, CALL: 1, OUT: 1, HLT: 0, NOP: 0, RET: 0 };
  function hx(v) { return '0x' + ('0' + (v & 255).toString(16)).slice(-2).toUpperCase(); }

  var SAMPLES = {
    count: ['; Count from 1 to 10 and print each number', '        MOV A, 1', 'loop:   OUT A', '        INC A', '        CMP A, 11', '        JNZ loop', '        HLT'].join('\n'),
    fib: ['; First 10 Fibonacci numbers', '        MOV A, 0', '        MOV B, 1', '        MOV D, 10', 'next:   OUT A', '        MOV C, A', '        ADD C, B', '        MOV A, B', '        MOV B, C', '        DEC D', '        JNZ next', '        HLT'].join('\n'),
    mul: ['; 6 x 7 by repeated addition (a CPU with no multiply instruction)', '        MOV A, 6', '        MOV B, 7', '        MOV C, 0', 'mul:    ADD C, A', '        DEC B', '        JNZ mul', '        OUT C', '        STORE [128], C   ; keep the answer in memory', '        HLT'].join('\n'),
    squares: ['; Store the squares 1,4,9,...,64 into memory 128..135', '        MOV A, 1        ; i', '        MOV D, 128      ; memory pointer', 'fill:   MOV B, A', '        MOV C, 0', 'sq:     ADD C, A        ; C = i x i', '        DEC B', '        JNZ sq', '        STORE [D], C', '        INC D', '        INC A', '        CMP A, 9', '        JNZ fill', '        HLT'].join('\n'),
    sub: ['; CALL / RET and the stack: a subroutine that doubles A', '        MOV A, 5', '        CALL double', '        OUT A           ; 10', '        CALL double', '        OUT A           ; 20', '        HLT', 'double: PUSH B          ; save B on the stack', '        MOV B, A', '        ADD A, B', '        POP B           ; restore B', '        RET'].join('\n'),
    table: ['; Sum a table of numbers. DB puts raw data bytes in the same memory as the code.', '        MOV A, 0', '        MOV B, 0        ; index', '        MOV D, table    ; address of the table', 'sum:    LOAD C, [D]', '        ADD A, C', '        INC D', '        INC B', '        CMP B, 5', '        JNZ sum', '        OUT A           ; 10+20+30+40+50 = 150', '        HLT', 'table:  DB 10, 20, 30, 40, 50'].join('\n'),
    leds: ['; Knight-Rider: a light sweeping left and right on the 8 LEDs', '        MOV A, 1', 'left:   OUT A', '        SHL A', '        CMP A, 128', '        JNZ left', 'right:  OUT A', '        SHR A', '        CMP A, 1', '        JNZ right', '        JMP left'].join('\n'),
    hello: ['; Print text: OUT shows the ASCII character', "        MOV A, 'H'", '        OUT A', "        MOV A, 'I'", '        OUT A', "        MOV A, '!'", '        OUT A', '        HLT'].join('\n')
  };
  var REF = [
    ['MOV r, x', 'copy a number or register into r'], ['LOAD r, [x]', 'read memory (address or [register]) into r'], ['STORE [x], r', 'write r to memory'],
    ['ADD / SUB r, x', 'arithmetic (sets Z C N)'], ['AND / OR / XOR r, x', 'bitwise logic'], ['INC / DEC r', 'add / subtract 1'],
    ['SHL / SHR r', 'shift bits left / right'], ['CMP r, x', 'compare (sets flags, no result)'], ['JMP / JZ / JNZ / JC / JNC / JN lbl', 'jump (conditional on flags)'],
    ['PUSH r / POP r', 'save / restore r on the stack (SP starts at 0xFF)'], ['CALL lbl / RET', 'call a subroutine / return from it'],
    ['OUT x', 'print a register or number and show it on the LEDs'], ['DB n, n, …', 'put raw data bytes in memory (numbers, \'c\' or "text")'], ['HLT / NOP', 'stop / do nothing']
  ];

  E.labs.cpu = function (p) {
    var cpu = null, timer = null, image = [], rows = [], labels = {};
    p.innerHTML = E.head('8-bit CPU Emulator', 'A real stored-program computer: your assembly becomes machine-code bytes in memory, and the CPU fetches, decodes and executes those bytes one instruction at a time. Program, data and stack all share the same 256 bytes.',
      '<div class="e21-field" style="min-width:200px"><label for="cp-s">Example program</label><select class="e21-sel" id="cp-s"><option value="count">Count to 10</option><option value="fib">Fibonacci</option><option value="mul">Multiply (6 × 7)</option><option value="squares">Squares into memory</option><option value="sub">Subroutine (CALL / RET)</option><option value="table">Sum a table (DB)</option><option value="leds">LED sweeper</option><option value="hello">Print text</option></select></div>') +
      '<div class="e21-cpu"><div><div class="e21-card"><h4>Assembly</h4><textarea class="e21-ta e21-code" id="cp-src" spellcheck="false" aria-label="Assembly source"></textarea>' +
      '<div class="e21-row mt-3" style="align-items:center"><button class="e21-btn sm lime" id="cp-asm" type="button"><i class="fa-solid fa-hammer"></i> Assemble</button><button class="e21-btn sm" id="cp-run" type="button"><i class="fa-solid fa-play"></i> Run</button><button class="e21-btn sm amber" id="cp-step" type="button"><i class="fa-solid fa-forward-step"></i> Step</button><button class="e21-btn sm ghost" id="cp-rst" type="button"><i class="fa-solid fa-rotate-left"></i> Reset</button></div>' +
      '<div class="e21-field mt-3"><label for="cp-spd">Speed: <span id="cp-spdv">10</span> instr/s</label><input class="e21-range" type="range" id="cp-spd" min="1" max="100" value="10"></div>' +
      '<div id="cp-msg" class="e21-note" style="margin-top:.8rem">Press <b>Assemble</b>, then <b>Step</b> or <b>Run</b>.</div></div>' +
      '<div class="e21-card mt-3"><h4>Machine code (address · bytes · source)</h4><div class="e21-listing" id="cp-list"><div><span>—</span><span></span><span>assemble to see the machine code</span></div></div></div></div>' +
      '<div><div class="e21-card"><h4>Registers &amp; flags</h4><div class="e21-regs" id="cp-regs"></div><div class="e21-flags" id="cp-flags"></div><div class="e21-kv mt-3" id="cp-pc"></div></div>' +
      '<div class="e21-card mt-3"><h4>Last instruction: fetch → decode → execute</h4><div class="e21-trace" id="cp-trace" aria-live="polite"></div></div>' +
      '<div class="e21-card mt-3"><h4>Output</h4><div class="e21-console" id="cp-con" aria-live="polite"></div><div class="e21-ledrow" id="cp-leds" aria-label="8 output LEDs"></div></div>' +
      '<div class="e21-card mt-3"><h4>Memory (256 bytes: program + data + stack)</h4><div class="e21-mem" id="cp-mem"></div>' +
      '<div class="e21-legend"><span><i class="cd"></i>program</span><span><i class="pcb"></i>next instruction</span><span><i class="wr"></i>just written</span><span><i class="stk"></i>stack</span><span><i class="nz"></i>data</span></div></div>' +
      '<details class="e21-card mt-3"><summary style="cursor:pointer;font:700 .85rem var(--font-body);color:var(--e-soft)">Instruction reference</summary><table class="e21-table left mt-2">' + REF.map(function (r) { return '<tr><td><code>' + esc(r[0]) + '</code></td><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table></details>' +
      '<details class="e21-card mt-3"><summary style="cursor:pointer;font:700 .85rem var(--font-body);color:var(--e-soft)">Opcode map (the real machine code)</summary><p class="e21-note" style="margin-top:.6rem">Register forms keep the register in the low 2 bits of the opcode: A=0, B=1, C=2, D=3. Every instruction is 1 or 2 bytes: the opcode, then one operand byte.</p><table class="e21-table left mt-2">' +
      OPS.map(function (o) { var f = o[2], reg = REGFORM[f]; return '<tr><td><code>' + o[1] + '</code> <small>' + FORMDESC[f] + '</small></td><td><code>' + (reg ? hx(o[0]) + '–' + hx(o[0] + 3) : hx(o[0])) + '</code></td><td>' + LEN[f] + ' B</td></tr>'; }).join('') + '</table></details></div></div>';

    var src = $('#cp-src', p), msg = $('#cp-msg', p), con = $('#cp-con', p);
    src.value = SAMPLES.count;
    $('#cp-leds', p).innerHTML = '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>';
    var leds = $$('#cp-leds i', p);

    function say(t, err) { msg.innerHTML = t; msg.style.borderColor = err ? 'var(--e-red)' : 'var(--s21-secondary)'; }
    function newCpu() {
      var c = { R: [0, 0, 0, 0], pc: 0, sp: SP_TOP, Z: 0, C: 0, N: 0, mem: new Uint8Array(256), steps: 0, halted: false, lastW: -1, changed: -1, ir: -1, trace: null, codeEnd: image.length };
      c.mem.set(image); return c;
    }

    /* ---------- assembler: source -> machine-code bytes ---------- */
    function stripComment(s) {
      var q = '';
      for (var i = 0; i < s.length; i++) {
        var ch = s[i];
        if (q) { if (ch === q) q = ''; }
        else if (ch === "'" || ch === '"') q = ch;
        else if (ch === ';') return s.slice(0, i);
      }
      return s;
    }
    function splitArgs(s) {
      var out = [], cur = '', q = '', depth = 0;
      for (var i = 0; i < s.length; i++) {
        var ch = s[i];
        if (q) { cur += ch; if (ch === q) q = ''; continue; }
        if (ch === "'" || ch === '"') { q = ch; cur += ch; continue; }
        if (ch === '[') depth++; if (ch === ']') depth--;
        if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
        cur += ch;
      }
      if (cur.trim() || out.length) out.push(cur.trim());
      return out.filter(function (x) { return x !== ''; });
    }
    function parseNum(s) {
      s = s.trim(); var m;
      if ((m = s.match(/^'(.)'$/))) return m[1].charCodeAt(0);
      if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16);
      if (/^0b[01]+$/i.test(s)) return parseInt(s.slice(2), 2);
      if (/^-?\d+$/.test(s)) return parseInt(s, 10);
      return NaN;
    }
    function operand(s, ln) {
      s = s.trim(); var m;
      if (/^[ABCD]$/i.test(s)) return { k: 'r', v: REGS.indexOf(s.toUpperCase()) };
      if ((m = s.match(/^\[(.+)\]$/))) {
        var i = m[1].trim();
        if (/^[ABCD]$/i.test(i)) return { k: 'mr', v: REGS.indexOf(i.toUpperCase()) };
        var n = parseNum(i);
        if (!isNaN(n)) { if (n < 0 || n > 255) throw new Error('Line ' + ln + ': memory address ' + n + ' is outside 0..255'); return { k: 'm', v: n }; }
        if (/^[A-Za-z_]\w*$/.test(i)) return { k: 'm', label: i };
        throw new Error('Line ' + ln + ': bad memory address ' + s);
      }
      var v = parseNum(s);
      if (!isNaN(v)) { if (v < -128 || v > 255) throw new Error('Line ' + ln + ': number ' + v + ' does not fit in 8 bits'); return { k: 'i', v: v & 255 }; }
      if (/^[A-Za-z_]\w*$/.test(s)) return { k: 'i', label: s };
      throw new Error('Line ' + ln + ': cannot understand "' + s + '"');
    }
    function pickForm(op, a, b, ln) {
      var A = a && a.k, B = b && b.k, f = null;
      switch (op) {
        case 'MOV': case 'ADD': case 'SUB': case 'AND': case 'OR': case 'XOR': case 'CMP':
          if (A === 'r' && B === 'r') f = 'rr'; else if (A === 'r' && B === 'i') f = 'ri'; break;
        case 'LOAD': if (A === 'r' && B === 'm') f = 'rm'; else if (A === 'r' && B === 'mr') f = 'rn'; break;
        case 'STORE': if (A === 'm' && B === 'r') f = 'mr'; else if (A === 'mr' && B === 'r') f = 'nr'; break;
        case 'INC': case 'DEC': case 'SHL': case 'SHR': case 'PUSH': case 'POP': if (A === 'r') f = 'r'; break;
        case 'OUT': if (A === 'r') f = 'r'; else if (A === 'i') f = 'i'; break;
        case 'JMP': case 'JZ': case 'JNZ': case 'JC': case 'JNC': case 'JN': case 'CALL': if (A === 'i') f = 'a'; break;
        default: f = '';
      }
      if (f === null) throw new Error('Line ' + ln + ': ' + op + ' cannot use those operands (see the instruction reference)');
      return f;
    }
    function assemble(text) {
      var lines = text.split('\n'), bytes = [], lab = {}, fix = [], outRows = [];
      lines.forEach(function (raw, idx) {
        var ln = idx + 1, line = stripComment(raw).trim(), m;
        if (!line) return;
        var full = line;
        while ((m = line.match(/^([A-Za-z_]\w*)\s*:\s*(.*)$/))) {
          if (lab[m[1]] !== undefined) throw new Error('Line ' + ln + ': label "' + m[1] + '" defined twice');
          if (/^[ABCD]$/i.test(m[1])) throw new Error('Line ' + ln + ': "' + m[1] + '" is a register name, pick another label');
          lab[m[1]] = bytes.length; line = m[2].trim();
        }
        if (!line) return;
        var sp = line.match(/^(\w+)\s*(.*)$/); if (!sp) throw new Error('Line ' + ln + ': cannot understand "' + line + '"');
        var op = sp[1].toUpperCase(), start = bytes.length, args = splitArgs(sp[2] || '');
        if (op === 'DB') {
          if (!args.length) throw new Error('Line ' + ln + ': DB needs at least one value');
          args.forEach(function (a) {
            var q;
            if ((q = a.match(/^"(.*)"$/))) { for (var i = 0; i < q[1].length; i++) bytes.push(q[1].charCodeAt(i) & 255); return; }
            var o = operand(a, ln);
            if (o.k !== 'i') throw new Error('Line ' + ln + ': DB needs numbers, characters or "text"');
            if (o.label) { fix.push({ pos: bytes.length, label: o.label, ln: ln }); bytes.push(0); } else bytes.push(o.v);
          });
          outRows.push({ addr: start, len: bytes.length - start, text: full }); return;
        }
        if (!(op in ARITY)) throw new Error('Line ' + ln + ': unknown instruction "' + sp[1] + '"');
        if (args.length !== ARITY[op]) throw new Error('Line ' + ln + ': ' + op + ' needs ' + ARITY[op] + ' operand(s)');
        var a = args[0] ? operand(args[0], ln) : null, b = args[1] ? operand(args[1], ln) : null;
        var f = pickForm(op, a, b, ln), regIdx = 0, argOp = null;
        if (f === 'mr' || f === 'nr') { regIdx = b.v; argOp = a; }
        else if (f === 'ri' || f === 'rr' || f === 'rm' || f === 'rn') { regIdx = a.v; argOp = b; }
        else if (f === 'r') regIdx = a.v;
        else if (f === 'i' || f === 'a') argOp = a;
        bytes.push(BASE[op + '/' + f] | (REGFORM[f] ? regIdx : 0));
        if (argOp) { if (argOp.label) { fix.push({ pos: bytes.length, label: argOp.label, ln: ln }); bytes.push(0); } else bytes.push(argOp.v & 255); }
        outRows.push({ addr: start, len: bytes.length - start, text: full });
      });
      if (!bytes.length) throw new Error('The program is empty.');
      fix.forEach(function (f) { if (lab[f.label] === undefined) throw new Error('Line ' + f.ln + ': unknown label "' + f.label + '"'); bytes[f.pos] = lab[f.label]; });
      if (bytes.length > MAX_CODE) throw new Error('Program too big: ' + bytes.length + ' bytes. Memory is 256 bytes shared with data and the stack (max ' + MAX_CODE + ' for code).');
      return { bytes: bytes, rows: outRows, labels: lab };
    }

    /* ---------- the CPU: fetch, decode, execute ---------- */
    function setNZ(v) { cpu.Z = (v & 255) === 0 ? 1 : 0; cpu.N = (v & 128) ? 1 : 0; }
    function dis(d, arg) {
      var rn = REGS[d.r];
      switch (d.form) {
        case '': return d.mn;
        case 'ri': return d.mn + ' ' + rn + ', ' + arg;
        case 'rr': return d.mn + ' ' + rn + ', ' + REGS[arg & 3];
        case 'rm': return 'LOAD ' + rn + ', [' + arg + ']';
        case 'rn': return 'LOAD ' + rn + ', [' + REGS[arg & 3] + ']';
        case 'mr': return 'STORE [' + arg + '], ' + rn;
        case 'nr': return 'STORE [' + REGS[arg & 3] + '], ' + rn;
        case 'r': return d.mn + ' ' + rn;
        case 'i': return d.mn + ' ' + arg;
        default: return d.mn + ' ' + hx(arg);
      }
    }
    function step() {
      if (!cpu || cpu.halted) return false;
      var m = cpu.mem, pc = cpu.pc, R = cpu.R;
      if (pc >= cpu.codeEnd) { cpu.halted = true; say('The program counter ran past the end of the program (address ' + hx(pc) + ') without reaching a <code>HLT</code>. Stopped.', true); return false; }
      /* FETCH */
      var op = m[pc], d = DEC[op];
      if (!d) { cpu.halted = true; say('Illegal opcode <code>' + hx(op) + '</code> at address ' + hx(pc) + ': the CPU does not know that instruction.', true); return false; }
      var len = LEN[d.form], arg = len > 1 ? m[(pc + 1) & 255] : 0, next = (pc + len) & 255;
      var r = d.r, a, b, res, ad, ex = '', rv = function () { return d.form === 'ri' ? arg : R[arg & 3]; };
      cpu.changed = -1; cpu.lastW = -1; cpu.ir = op;
      /* DECODE + EXECUTE */
      switch (d.mn) {
        case 'MOV': R[r] = rv(); cpu.changed = r; ex = REGS[r] + ' ← ' + R[r]; break;
        case 'LOAD': ad = d.form === 'rm' ? arg : R[arg & 3]; R[r] = m[ad]; cpu.changed = r; ex = REGS[r] + ' ← memory[' + ad + '] = ' + R[r]; break;
        case 'STORE': ad = d.form === 'mr' ? arg : R[arg & 3]; m[ad] = R[r]; cpu.lastW = ad; ex = 'memory[' + ad + '] ← ' + R[r]; break;
        case 'ADD': a = R[r]; b = rv(); res = a + b; cpu.C = res > 255 ? 1 : 0; R[r] = res & 255; setNZ(res); cpu.changed = r; ex = REGS[r] + ' ← ' + a + ' + ' + b + ' = ' + R[r] + (cpu.C ? ' (carry)' : ''); break;
        case 'SUB': a = R[r]; b = rv(); res = a - b; cpu.C = a < b ? 1 : 0; R[r] = res & 255; setNZ(res); cpu.changed = r; ex = REGS[r] + ' ← ' + a + ' − ' + b + ' = ' + R[r] + (cpu.C ? ' (borrow)' : ''); break;
        case 'CMP': a = R[r]; b = rv(); res = a - b; cpu.C = a < b ? 1 : 0; setNZ(res); ex = 'compare ' + a + ' with ' + b + ' → Z=' + cpu.Z + ' C=' + cpu.C + ' N=' + cpu.N; break;
        case 'AND': res = R[r] & rv(); R[r] = res; cpu.C = 0; setNZ(res); cpu.changed = r; ex = REGS[r] + ' ← ' + res; break;
        case 'OR': res = R[r] | rv(); R[r] = res; cpu.C = 0; setNZ(res); cpu.changed = r; ex = REGS[r] + ' ← ' + res; break;
        case 'XOR': res = R[r] ^ rv(); R[r] = res; cpu.C = 0; setNZ(res); cpu.changed = r; ex = REGS[r] + ' ← ' + res; break;
        case 'INC': res = (R[r] + 1) & 255; R[r] = res; setNZ(res); cpu.changed = r; ex = REGS[r] + ' ← ' + res; break;
        case 'DEC': res = (R[r] - 1) & 255; R[r] = res; setNZ(res); cpu.changed = r; ex = REGS[r] + ' ← ' + res; break;
        case 'SHL': a = R[r]; cpu.C = (a & 128) ? 1 : 0; res = (a << 1) & 255; R[r] = res; setNZ(res); cpu.changed = r; ex = REGS[r] + ' ← ' + res; break;
        case 'SHR': a = R[r]; cpu.C = a & 1; res = a >> 1; R[r] = res; setNZ(res); cpu.changed = r; ex = REGS[r] + ' ← ' + res; break;
        case 'PUSH': m[cpu.sp] = R[r]; cpu.lastW = cpu.sp; ex = 'memory[' + cpu.sp + '] ← ' + R[r] + ', SP ← ' + ((cpu.sp - 1) & 255); cpu.sp = (cpu.sp - 1) & 255; break;
        case 'POP': cpu.sp = (cpu.sp + 1) & 255; R[r] = m[cpu.sp]; cpu.changed = r; ex = 'SP ← ' + cpu.sp + ', ' + REGS[r] + ' ← memory[' + cpu.sp + '] = ' + R[r]; break;
        case 'OUT': res = d.form === 'r' ? R[r] : arg; out(res); ex = 'send ' + res + ' to the output'; break;
        case 'JMP': next = arg; ex = 'PC ← ' + hx(arg); break;
        case 'JZ': if (cpu.Z) next = arg; ex = (cpu.Z ? 'Z=1, jump taken: PC ← ' + hx(arg) : 'Z=0, no jump'); break;
        case 'JNZ': if (!cpu.Z) next = arg; ex = (!cpu.Z ? 'Z=0, jump taken: PC ← ' + hx(arg) : 'Z=1, no jump'); break;
        case 'JC': if (cpu.C) next = arg; ex = (cpu.C ? 'C=1, jump taken: PC ← ' + hx(arg) : 'C=0, no jump'); break;
        case 'JNC': if (!cpu.C) next = arg; ex = (!cpu.C ? 'C=0, jump taken: PC ← ' + hx(arg) : 'C=1, no jump'); break;
        case 'JN': if (cpu.N) next = arg; ex = (cpu.N ? 'N=1, jump taken: PC ← ' + hx(arg) : 'N=0, no jump'); break;
        case 'CALL': m[cpu.sp] = next; cpu.lastW = cpu.sp; ex = 'push return address ' + hx(next) + ', PC ← ' + hx(arg); cpu.sp = (cpu.sp - 1) & 255; next = arg; break;
        case 'RET': cpu.sp = (cpu.sp + 1) & 255; next = m[cpu.sp]; ex = 'pop return address: PC ← ' + hx(next); break;
        case 'HLT': cpu.halted = true; ex = 'stop the clock'; say('Halted after <b>' + (cpu.steps + 1) + '</b> instructions. 🎉'); break;
        case 'NOP': ex = 'nothing'; break;
      }
      cpu.trace = { pc: pc, bytes: len > 1 ? [op, arg] : [op], text: dis(d, arg), form: FORMDESC[d.form], op: op, ex: ex, next: next };
      cpu.steps++; if (!cpu.halted) cpu.pc = next;
      return !cpu.halted;
    }
    function out(v) {
      var ch = v >= 32 && v < 127 ? " '" + String.fromCharCode(v) + "'" : '';
      con.innerHTML += esc(v + '  (0x' + ('0' + v.toString(16)).slice(-2).toUpperCase() + ', 0b' + ('00000000' + v.toString(2)).slice(-8) + ')' + ch) + '\n';
      con.scrollTop = con.scrollHeight;
      leds.forEach(function (l, i) { l.classList.toggle('on', !!(v & (128 >> i))); });
    }

    /* ---------- drawing ---------- */
    function paint() {
      var h = '';
      REGS.forEach(function (r, ri) {
        var v = cpu.R[ri];
        h += '<div class="e21-reg ' + (cpu.changed === ri ? 'ch' : '') + '"><small>' + r + '</small><b>' + v + '</b><i>' + hx(v) + ' · ' + ('00000000' + v.toString(2)).slice(-8) + '</i></div>';
      });
      $('#cp-regs', p).innerHTML = h;
      $('#cp-flags', p).innerHTML = [['Z', cpu.Z, 'zero'], ['C', cpu.C, 'carry'], ['N', cpu.N, 'negative']].map(function (f) { return '<div class="e21-flag ' + (f[1] ? 'on' : '') + '" title="' + f[2] + '">' + f[0] + ' = ' + f[1] + '</div>'; }).join('');
      var irTxt = cpu.ir < 0 ? '—' : hx(cpu.ir);
      $('#cp-pc', p).innerHTML = '<div><small>PC</small><b>' + hx(cpu.pc) + '</b></div><div><small>SP</small><b>' + hx(cpu.sp) + '</b></div><div><small>IR (opcode)</small><b>' + irTxt + '</b></div><div><small>Instructions run</small><b>' + cpu.steps + '</b></div><div><small>Status</small><b>' + (cpu.halted ? 'halted' : image.length ? 'ready' : 'no program') + '</b></div>';
      var t = cpu.trace;
      $('#cp-trace', p).innerHTML = t
        ? '<div class="f"><b>Fetch</b><span>read ' + t.bytes.map(hx).join(' ') + ' from address ' + hx(t.pc) + '</span></div>' +
          '<div class="d"><b>Decode</b><span>' + hx(t.op) + ' = <code>' + esc(t.text) + '</code> · ' + t.form + '</span></div>' +
          '<div class="x"><b>Execute</b><span>' + esc(t.ex) + '</span></div>'
        : '<div class="f"><b>Fetch</b><span>' + (image.length ? 'Press Step: the CPU will read the byte at ' + hx(cpu.pc) + '.' : 'Assemble a program first.') + '</span></div>';
      var m = '', top = cpu.sp;
      for (var i = 0; i < 256; i++) {
        var c = '';
        if (i === cpu.pc && !cpu.halted && image.length) c = 'pcb';
        else if (i === cpu.lastW) c = 'wr';
        else if (i > top) c = 'stk';
        else if (i < cpu.codeEnd) c = 'cd';
        else if (cpu.mem[i]) c = 'nz';
        m += '<span class="' + c + '" title="[' + i + '] ' + hx(i) + ' = ' + cpu.mem[i] + '">' + ('0' + cpu.mem[i].toString(16)).slice(-2) + '</span>';
      }
      $('#cp-mem', p).innerHTML = m;
      $$('#cp-list div', p).forEach(function (dv) { dv.classList.toggle('pc', dv.getAttribute('data-a') !== null && +dv.getAttribute('data-a') === cpu.pc && !cpu.halted); });
      var cur = $('#cp-list .pc', p); if (cur) { var box = $('#cp-list', p); if (cur.offsetTop < box.scrollTop || cur.offsetTop > box.scrollTop + box.clientHeight - 24) box.scrollTop = cur.offsetTop - 60; }
    }
    function listing() {
      $('#cp-list', p).innerHTML = rows.map(function (rw) {
        var bs = image.slice(rw.addr, rw.addr + rw.len), shown = bs.slice(0, 3).map(function (x) { return ('0' + x.toString(16)).slice(-2).toUpperCase(); }).join(' ') + (bs.length > 3 ? ' …' : '');
        return '<div data-a="' + rw.addr + '"><span>' + hx(rw.addr).slice(2) + '</span><span>' + shown + '</span><span>' + esc(rw.text) + '</span></div>';
      }).join('');
    }

    /* ---------- controls ---------- */
    function stop() { if (timer) { clearInterval(timer); timer = null; } $('#cp-run', p).innerHTML = '<i class="fa-solid fa-play"></i> Run'; }
    function reset(keepProg) {
      stop(); cpu = newCpu(); con.textContent = ''; leds.forEach(function (l) { l.classList.remove('on'); }); paint();
      if (keepProg) say('Reset. Memory reloaded with the program, PC back to 0x00.');
    }
    function doAssemble() {
      stop();
      try {
        var r = assemble(src.value); image = r.bytes; rows = r.rows; labels = r.labels; listing(); reset(false);
        say('Assembled into <b>' + image.length + '</b> bytes of machine code (' + rows.length + ' lines, ' + Object.keys(labels).length + ' label(s)). Press Step or Run.'); return true;
      } catch (e) { image = []; rows = []; listing(); cpu = newCpu(); paint(); say(esc(e.message), true); return false; }
    }
    function safeStep() { try { return step(); } catch (e) { stop(); cpu.halted = true; say(esc(e.message), true); return false; } }
    $('#cp-asm', p).addEventListener('click', doAssemble);
    $('#cp-step', p).addEventListener('click', function () { if (!image.length && !doAssemble()) return; if (cpu.halted) { say('Program has halted. Press Reset to run again.', true); return; } safeStep(); paint(); });
    $('#cp-rst', p).addEventListener('click', function () { if (!image.length) { doAssemble(); } else reset(true); });
    $('#cp-run', p).addEventListener('click', function () {
      if (timer) { stop(); say('Paused.'); return; }
      if (!image.length && !doAssemble()) return;
      if (cpu.halted) reset(false);
      $('#cp-run', p).innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
      timer = setInterval(function () {
        if (!document.body.contains(src)) { stop(); return; }
        var n = Math.max(1, Math.round(+$('#cp-spd', p).value / 20)), k;
        for (k = 0; k < n; k++) { if (!safeStep()) { stop(); break; } }
        if (cpu.steps > 20000) { stop(); say('Stopped after 20 000 instructions (is this an infinite loop? Press Reset).', true); }
        paint();
      }, 50);
    });
    $('#cp-spd', p).addEventListener('input', function () { $('#cp-spdv', p).textContent = this.value; });
    $('#cp-s', p).addEventListener('change', function () { src.value = SAMPLES[this.value]; doAssemble(); });
    src.addEventListener('keydown', function (e) { if (e.key === 'Tab') { e.preventDefault(); var s = src.selectionStart; src.value = src.value.slice(0, s) + '    ' + src.value.slice(src.selectionEnd); src.selectionStart = src.selectionEnd = s + 4; } });
    document.addEventListener('e21:lab', function (e) { if (e.detail !== 'cpu') stop(); });
    doAssemble();
  };

  /* =====================================================================
     SIGNAL SCOPE
     ===================================================================== */
  E.labs.scope = function (p) {
    var st = { wave: 'sine', f: 50, amp: 2, off: 0, noise: 0, tdiv: 5, filt: 'none', fc: 50, fft: true }, run = true, last = 0, raf = 0;
    p.innerHTML = E.head('Signal Scope', 'A virtual signal generator and oscilloscope. Shape a waveform, add noise, then pass it through an RC filter and watch channel 2 respond. The spectrum shows which frequencies the signal contains.',
      '<div class="e21-row" style="flex:none"><button class="e21-btn sm" type="button" id="sc-run"><i class="fa-solid fa-pause"></i> Freeze</button></div>') +
      '<div class="e21-two" style="grid-template-columns:1.5fr 1fr"><div><div class="e21-card" style="padding:.6rem"><canvas id="sc-cv" class="e21-chart" width="720" height="400"></canvas></div><div class="e21-card mt-3" style="padding:.6rem"><h4 style="margin:.2rem .4rem .5rem">Spectrum (CH1)</h4><canvas id="sc-fft" class="e21-chart" width="720" height="150"></canvas></div></div>' +
      '<div class="e21-card"><h4>Generator</h4>' + E.seg('sc-wave', [['sine', 'Sine'], ['square', 'Square'], ['tri', 'Triangle'], ['saw', 'Saw']], 'sine') +
      '<div class="e21-field mt-3"><label for="sc-f">Frequency: <b id="sc-fv" style="color:var(--e-cyan)">50 Hz</b></label><input class="e21-range" type="range" id="sc-f" min="0" max="100" value="65"></div>' +
      '<div class="e21-field mt-2"><label for="sc-a">Amplitude: <b id="sc-av" style="color:var(--e-cyan)">2.0 V</b></label><input class="e21-range" type="range" id="sc-a" min="1" max="50" value="20"></div>' +
      '<div class="e21-field mt-2"><label for="sc-o">DC offset: <b id="sc-ov" style="color:var(--e-cyan)">0.0 V</b></label><input class="e21-range" type="range" id="sc-o" min="-20" max="20" value="0"></div>' +
      '<div class="e21-field mt-2"><label for="sc-n">Noise: <b id="sc-nv" style="color:var(--e-cyan)">0.0 V</b></label><input class="e21-range" type="range" id="sc-n" min="0" max="20" value="0"></div>' +
      '<h4 class="mt-4">RC filter → CH2</h4>' + E.seg('sc-filt', [['none', 'Off'], ['lp', 'Low-pass'], ['hp', 'High-pass']], 'none') +
      '<div class="e21-field mt-3"><label for="sc-c">Cutoff: <b id="sc-cv2" style="color:var(--e-pink)">50 Hz</b></label><input class="e21-range" type="range" id="sc-c" min="0" max="100" value="50"></div>' +
      '<div class="e21-field mt-2"><label for="sc-t">Time / div</label><select class="e21-sel" id="sc-t"><option value="1">1 ms</option><option value="2">2 ms</option><option value="5" selected>5 ms</option><option value="10">10 ms</option><option value="20">20 ms</option><option value="50">50 ms</option></select></div>' +
      '<div class="e21-kv mt-3" id="sc-meas"></div><p class="e21-note" id="sc-note"></p></div></div>';

    var cv = $('#sc-cv', p), cx = cv.getContext('2d'), fv = $('#sc-fft', p), fx = fv.getContext('2d'), FS = 20000;
    function logMap(v, lo, hi) { return lo * Math.pow(hi / lo, v / 100); }
    function gen(t) {
      var ph = st.f * t, u = ph - Math.floor(ph), y;
      switch (st.wave) { case 'square': y = u < .5 ? 1 : -1; break; case 'tri': y = u < .5 ? 4 * u - 1 : 3 - 4 * u; break; case 'saw': y = 2 * u - 1; break; default: y = Math.sin(2 * Math.PI * ph); }
      return st.amp * y + st.off;
    }
    function compute() {
      var tdiv = st.tdiv / 1000, view = tdiv * 10, n = Math.round(view * FS), warm = Math.round(Math.min(.5, Math.max(.05, 8 / st.fc)) * FS), i;
      // trigger: align to a rising crossing of the signal mean so the trace stands still
      var t0 = 0, a = [], c1 = new Float32Array(n), c2 = new Float32Array(n), y = 0, x1 = gen(-warm / FS);
      var dt = 1 / FS, rc = 1 / (2 * Math.PI * st.fc), al = dt / (rc + dt), ah = rc / (rc + dt);
      var prevx = x1; y = st.filt === 'hp' ? 0 : x1;
      var T0 = 1 / st.f; // start at a whole number of periods so the picture is stable
      for (i = -warm; i < n; i++) {
        var t = T0 * 20 + i * dt, x = gen(t);
        if (st.filt === 'lp') y = y + al * (x - y); else if (st.filt === 'hp') y = ah * (y + x - prevx); else y = x;
        prevx = x;
        if (i >= 0) { var nz = st.noise ? (Math.random() * 2 - 1) * st.noise : 0; c1[i] = x + nz; c2[i] = y + nz * (st.filt === 'lp' ? .3 : 1); }
      }
      return { c1: c1, c2: c2, n: n, view: view };
    }
    function vpp(a) { var mn = 1e9, mx = -1e9; for (var i = 0; i < a.length; i++) { if (a[i] < mn) mn = a[i]; if (a[i] > mx) mx = a[i]; } return mx - mn; }
    function rms(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / a.length); }
    function drawScope() {
      var W = cv.width, H = cv.height, d = compute(), vdiv = st.amp + Math.abs(st.off) > 3.4 ? 2 : 1, i;
      cx.fillStyle = '#02060d'; cx.fillRect(0, 0, W, H);
      cx.strokeStyle = 'rgba(34,211,238,.13)'; cx.lineWidth = 1; cx.beginPath();
      for (i = 0; i <= 10; i++) { cx.moveTo(i * W / 10, 0); cx.lineTo(i * W / 10, H); }
      for (i = 0; i <= 8; i++) { cx.moveTo(0, i * H / 8); cx.lineTo(W, i * H / 8); }
      cx.stroke(); cx.strokeStyle = 'rgba(34,211,238,.38)'; cx.beginPath(); cx.moveTo(0, H / 2); cx.lineTo(W, H / 2); cx.moveTo(W / 2, 0); cx.lineTo(W / 2, H); cx.stroke();
      var px = H / 8 / vdiv;
      function trace(arr, col) {
        cx.strokeStyle = col; cx.lineWidth = 2.4; cx.shadowColor = col; cx.shadowBlur = 8; cx.beginPath();
        var step = Math.max(1, Math.floor(d.n / W));
        for (var k = 0, xx = 0; k < d.n; k += step, xx++) { var X = k / d.n * W, Y = H / 2 - Math.max(-H, Math.min(H, arr[k] * px)); xx ? cx.lineTo(X, Y) : cx.moveTo(X, Y); }
        cx.stroke(); cx.shadowBlur = 0;
      }
      trace(d.c1, '#22d3ee'); if (st.filt !== 'none') trace(d.c2, '#f472b6');
      cx.font = '600 13px JetBrains Mono, monospace'; cx.fillStyle = '#22d3ee'; cx.fillText('CH1  ' + vdiv + ' V/div', 12, 22);
      if (st.filt !== 'none') { cx.fillStyle = '#f472b6'; cx.fillText('CH2  ' + (st.filt === 'lp' ? 'low-pass' : 'high-pass') + ' fc=' + Math.round(st.fc) + ' Hz', 12, 42); }
      cx.fillStyle = '#a3e635'; cx.fillText(st.tdiv + ' ms/div', W - 100, 22);
      var v1 = vpp(d.c1), v2 = vpp(d.c2), gain = v1 > 0 ? v2 / v1 : 0;
      $('#sc-meas', p).innerHTML = '<div><small>Frequency</small><b>' + E.eng(st.f, 'Hz') + '</b></div><div><small>Period</small><b>' + E.eng(1 / st.f, 's') + '</b></div><div><small>CH1 Vpp</small><b>' + v1.toFixed(2) + ' V</b></div><div><small>CH1 RMS</small><b>' + rms(d.c1).toFixed(2) + ' V</b></div>' +
        (st.filt !== 'none' ? '<div><small>CH2 Vpp</small><b>' + v2.toFixed(2) + ' V</b></div><div><small>Gain</small><b>' + (gain > 0 ? (20 * Math.log10(gain)).toFixed(1) : '−∞') + ' dB</b></div>' : '');
      var ratio = st.f / st.fc;
      $('#sc-note', p).textContent = st.filt === 'none' ? 'Turn on the RC filter and set the cutoff near the signal frequency to see attenuation and phase shift on CH2.' :
        (st.filt === 'lp' ? (ratio > 1.5 ? 'The signal is above the cutoff, so a low-pass filter attenuates it.' : ratio < .67 ? 'The signal is below the cutoff, so it passes almost unchanged.' : 'Near the cutoff the amplitude falls to about 70.7% (−3 dB) and the phase lags 45°.') :
          (ratio < .67 ? 'The signal is below the cutoff, so a high-pass filter attenuates it.' : ratio > 1.5 ? 'The signal is above the cutoff, so it passes almost unchanged.' : 'Near the cutoff the amplitude is about 70.7% (−3 dB) and the phase leads by 45°.'));
    }
    function drawFft() {
      var N = 512, fs = 2000, i, k, W = fv.width, H = fv.height, K = 120, mags = [], mx = 1e-6, buf = new Float32Array(N);
      for (i = 0; i < N; i++) buf[i] = gen(i / fs) + (st.noise ? (Math.random() * 2 - 1) * st.noise : 0);
      for (k = 1; k < K; k++) { var re = 0, im = 0; for (i = 0; i < N; i++) { var w = .5 - .5 * Math.cos(2 * Math.PI * i / (N - 1)), ang = 2 * Math.PI * k * i / N; re += buf[i] * w * Math.cos(ang); im -= buf[i] * w * Math.sin(ang); } var m = Math.sqrt(re * re + im * im) / N * 4; mags.push(m); if (m > mx) mx = m; }
      fx.fillStyle = '#02060d'; fx.fillRect(0, 0, W, H);
      var bw = (W - 40) / mags.length;
      mags.forEach(function (m, j) { var h = Math.min(1, m / Math.max(mx, st.amp * .5)) * (H - 34); fx.fillStyle = 'rgba(163,230,53,.85)'; fx.fillRect(30 + j * bw, H - 22 - h, Math.max(1, bw - 1), h); });
      fx.fillStyle = '#93a4bf'; fx.font = '11px JetBrains Mono, monospace';
      [0, 100, 200, 300, 400, 468].forEach(function (f) { var x = 30 + (f / (fs / N)) * bw; if (x < W) fx.fillText(f + ' Hz', x, H - 6); });
      fx.fillText('amplitude', 2, 12);
    }
    function redraw() { drawScope(); drawFft(); }
    function ui() {
      var map = [['sc-f', function (v) { st.f = Math.round(logMap(+v, 1, 400) * 10) / 10; if (st.f > 20) st.f = Math.round(st.f); $('#sc-fv', p).textContent = E.eng(st.f, 'Hz'); }],
        ['sc-a', function (v) { st.amp = v / 10; $('#sc-av', p).textContent = st.amp.toFixed(1) + ' V'; }],
        ['sc-o', function (v) { st.off = v / 10; $('#sc-ov', p).textContent = st.off.toFixed(1) + ' V'; }],
        ['sc-n', function (v) { st.noise = v / 20 * 1.5; $('#sc-nv', p).textContent = st.noise.toFixed(1) + ' V'; }],
        ['sc-c', function (v) { st.fc = Math.round(logMap(+v, 5, 500)); $('#sc-cv2', p).textContent = st.fc + ' Hz'; }]];
      map.forEach(function (m) { var el = $('#' + m[0], p); el.addEventListener('input', function () { m[1](el.value); redraw(); }); m[1](el.value); });
    }
    E.bindSeg($('#sc-wave', p), function (v) { st.wave = v; redraw(); });
    E.bindSeg($('#sc-filt', p), function (v) { st.filt = v; redraw(); });
    $('#sc-t', p).addEventListener('change', function () { st.tdiv = +this.value; redraw(); });
    $('#sc-run', p).addEventListener('click', function () { run = !run; this.innerHTML = run ? '<i class="fa-solid fa-pause"></i> Freeze' : '<i class="fa-solid fa-play"></i> Run'; });
    ui(); redraw();
    // noise makes the trace shimmer like a real scope
    (function loop(t) {
      if (!document.body.contains(cv)) return;
      if (run && st.noise > 0 && !p.hidden && t - last > 90 && !E.reduce) { last = t; drawScope(); }
      raf = requestAnimationFrame(loop);
    })(0);
  };
})();
