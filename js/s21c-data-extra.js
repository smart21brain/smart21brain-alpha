/* Smart21Code — extra lessons for HTML, CSS, JavaScript, Python and SQL.
   All lesson text and examples are original Smart21Brain content.
   Lesson shape: { i:id, g:group, t:title, x:explanation(html), e:[[caption, code], ...], q:[prompt, template-with-___, answer] } */
window.S21C = window.S21C || { langs: [], lessons: {}, refs: {} };
(function (S) {
  function add(lang, group, list) {
    S.lessons[lang] = S.lessons[lang] || [];
    list.forEach(function (l) { l.g = group; S.lessons[lang].push(l); });
  }

  /* ================================================================ HTML */
  add('html', 'Graphics & Accessibility', [
    { i: 'html-responsive', t: 'Responsive Web Design',
      x: `<p>A <strong>responsive</strong> page looks good on phones, tablets and computers. Three habits make it work:</p>
<ul><li>Add the viewport meta tag: <code>&lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;</code></li><li>Let images shrink with <code>max-width: 100%; height: auto;</code></li><li>Use CSS media queries to change the layout on small screens</li></ul>
<p>Make the Result panel narrow and watch the boxes stack.</p>`,
      e: [['A layout that adapts', `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    .row { display: flex; gap: 10px; }
    .box { flex: 1; background: #0B6E4F; color: #fff; padding: 20px; text-align: center; }
    img { max-width: 100%; height: auto; }
    @media (max-width: 500px) {
      .row { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="row">
    <div class="box">One</div>
    <div class="box">Two</div>
    <div class="box">Three</div>
  </div>
  <p><img src="https://placehold.co/800x200/2965F1/ffffff?text=I+shrink+to+fit" alt="A wide banner"></p>
</body>
</html>`]],
      q: ['The viewport tag is a ___ element placed in the head.', '<___ name="viewport" content="width=device-width">', 'meta'] },
    { i: 'html-svg', t: 'SVG Graphics',
      x: `<p><strong>SVG</strong> (Scalable Vector Graphics) draws shapes using code. Because they are vectors, SVG pictures stay sharp at any size. Put shapes inside an <code>&lt;svg&gt;</code> element:</p>
<ul><li><code>&lt;rect&gt;</code> rectangle, <code>&lt;circle&gt;</code>, <code>&lt;ellipse&gt;</code>, <code>&lt;line&gt;</code></li><li><code>&lt;polygon&gt;</code> for many-sided shapes, <code>&lt;text&gt;</code> for words</li><li>Colour with <code>fill</code> and <code>stroke</code> attributes</li></ul>`,
      e: [['Shapes with SVG', `<svg width="320" height="180" style="border:1px solid #ccc">
  <rect x="10" y="10" width="120" height="70" fill="#0B6E4F" />
  <circle cx="200" cy="50" r="35" fill="#F0B90B" stroke="#333" stroke-width="3" />
  <polygon points="60,170 110,100 160,170" fill="#E34F26" />
  <line x1="190" y1="110" x2="300" y2="170" stroke="#2965F1" stroke-width="4" />
  <text x="190" y="100" font-size="16" fill="#333">Hello SVG</text>
</svg>`]],
      q: ['A circle in SVG is drawn with the ___ element.', '<svg><___ cx="50" cy="50" r="30" /></svg>', 'circle'] },
    { i: 'html-canvas', t: 'Canvas',
      x: `<p>The <code>&lt;canvas&gt;</code> element is a blank area you draw on with JavaScript. First get the canvas, then ask for its <code>"2d"</code> drawing context, then call drawing methods:</p>
<ul><li><code>fillStyle</code> sets the colour, <code>fillRect(x, y, w, h)</code> draws a rectangle</li><li><code>beginPath()</code>, <code>arc()</code>, <code>fill()</code> draw circles</li><li><code>fillText("Hi", x, y)</code> writes text</li></ul>
<p>The top-left corner is the point (0, 0).</p>`,
      e: [['Draw on a canvas', `<canvas id="c" width="320" height="180" style="border:1px solid #ccc"></canvas>
<script>
  var ctx = document.getElementById("c").getContext("2d");
  ctx.fillStyle = "#0B6E4F";
  ctx.fillRect(20, 20, 120, 70);
  ctx.fillStyle = "#F0B90B";
  ctx.beginPath();
  ctx.arc(230, 60, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#333";
  ctx.font = "20px sans-serif";
  ctx.fillText("Hello Canvas", 80, 150);
</script>`]],
      q: ['Get the drawing tools of a canvas with getContext("___").', 'canvas.getContext("___")', '2d'] },
    { i: 'html-details-progress', t: 'Details, Progress & Meter',
      x: `<p>HTML has handy built-in widgets that need no JavaScript:</p>
<ul><li><code>&lt;details&gt;</code> with <code>&lt;summary&gt;</code> — a click-to-open box</li><li><code>&lt;progress value="70" max="100"&gt;</code> — how far a task has got</li><li><code>&lt;meter&gt;</code> — a measurement inside a known range, such as a score or disk space</li><li><code>&lt;dialog&gt;</code> — a pop-up box</li></ul>`,
      e: [['Built-in widgets', `<details>
  <summary>What is HTML?</summary>
  <p>The language that gives web pages their structure.</p>
</details>
<p>Download: <progress value="70" max="100">70%</progress></p>
<p>Score: <meter min="0" max="100" low="40" high="80" optimum="100" value="85">85</meter></p>`]],
      q: ['The clickable heading inside a details box is the ___ element.', '<details><___>Title</___></details>', 'summary'] },
    { i: 'html-accessibility', t: 'Accessibility',
      x: `<p><strong>Accessibility</strong> means everyone can use your page, including people who use screen readers, keyboards or magnifiers. Good habits:</p>
<ul><li>Describe every image with <code>alt</code> text</li><li>Give every form field a <code>&lt;label&gt;</code></li><li>Set the page language: <code>&lt;html lang="en"&gt;</code></li><li>Use real headings, lists, buttons and links — not clickable <code>&lt;div&gt;</code>s</li><li>Keep good colour contrast between text and background</li></ul>`,
      e: [['Accessible building blocks', `<!DOCTYPE html>
<html lang="en">
<head><title>Accessible page</title></head>
<body>
  <main>
    <h1>Join our club</h1>
    <img src="https://placehold.co/160x80/0B6E4F/ffffff?text=Club" alt="Green Smart21 club badge">
    <form>
      <label for="nm">Your name</label>
      <input id="nm" type="text">
      <button type="submit">Join</button>
    </form>
    <a href="#top">Back to the top of the page</a>
  </main>
</body>
</html>`]],
      q: ['Text that describes an image for screen readers goes in the ___ attribute.', '<img src="a.png" ___="A red apple">', 'alt'] }
  ]);

  /* ================================================================== CSS */
  add('css', 'Going Further', [
    { i: 'css-units', t: 'Units: px, %, em, rem, vw',
      x: `<p>CSS has two kinds of length units:</p>
<ul><li><strong>Absolute</strong>: <code>px</code> — a fixed size</li><li><strong>Relative</strong>: <code>%</code> (of the parent), <code>em</code> (of the parent font size), <code>rem</code> (of the page's root font size), <code>vw</code> / <code>vh</code> (1% of the screen width / height)</li></ul>
<p>Relative units make pages easier to scale on different screens. <code>rem</code> is a popular choice for font sizes and spacing.</p>`,
      e: [['Comparing units', `<style>
  html { font-size: 16px; }
  .a { width: 200px; background: #D0EBFF; padding: 4px; }
  .b { width: 50%; background: #D3F9D8; padding: 4px; }
  .c { font-size: 2rem; }
  .d { width: 60vw; background: #FFE3E3; padding: 4px; }
</style>
<div class="a">200px wide</div>
<div class="b">50% of the parent</div>
<div class="c">2rem text</div>
<div class="d">60vw wide</div>`]],
      q: ['A unit equal to 1% of the screen width is ___.', 'width: 50___;', 'vw'] },
    { i: 'css-pseudo', t: 'Pseudo-classes & Pseudo-elements',
      x: `<p>A <strong>pseudo-class</strong> picks an element in a special state, written with one colon: <code>:hover</code>, <code>:focus</code>, <code>:first-child</code>, <code>:nth-child(2n)</code>.</p>
<p>A <strong>pseudo-element</strong> styles a part of an element, written with two colons: <code>::before</code> and <code>::after</code> (insert content), <code>::first-letter</code>, <code>::first-line</code>, <code>::selection</code>.</p>`,
      e: [['States and parts', `<style>
  a { color: #0B6E4F; }
  a:hover { color: #E34F26; text-decoration: none; }
  li:nth-child(even) { background: #F1F3F5; }
  li:first-child { font-weight: bold; }
  p::first-letter { font-size: 2.2em; color: #2965F1; }
  .tag::before { content: "★ "; color: #F0B90B; }
</style>
<p>Hover over the link: <a href="#">Smart21Code</a></p>
<ul><li>First</li><li>Second</li><li>Third</li><li>Fourth</li></ul>
<p>The first letter of this paragraph is big.</p>
<p class="tag">A star is added before this text.</p>`]],
      q: ['Style an element while the mouse is over it with :___.', 'a:___ { color: red; }', 'hover'] },
    { i: 'css-gradients', t: 'Gradients',
      x: `<p>A <strong>gradient</strong> is a smooth blend between colours, used as a background image:</p>
<ul><li><code>linear-gradient(direction, colour1, colour2)</code> — blends along a line, e.g. <code>to right</code> or <code>45deg</code></li><li><code>radial-gradient(circle, colour1, colour2)</code> — blends outward from the centre</li><li>Add more colours for stripes and rainbows</li></ul>`,
      e: [['Linear and radial gradients', `<style>
  div { height: 70px; margin-bottom: 10px; color: #fff; padding: 10px; font-family: sans-serif; }
  .l { background: linear-gradient(to right, #0B6E4F, #2965F1); }
  .d { background: linear-gradient(45deg, #E34F26, #F0B90B); }
  .r { background: radial-gradient(circle, #F0B90B, #E34F26); }
  .s { background: linear-gradient(red, orange, yellow, green, blue, purple); }
</style>
<div class="l">Left to right</div>
<div class="d">45 degrees</div>
<div class="r">Radial</div>
<div class="s">Rainbow</div>`]],
      q: ['A colour blend along a line uses ___-gradient().', 'background: ___-gradient(red, blue);', 'linear'] },
    { i: 'css-shadows', t: 'Shadows & Filters',
      x: `<p><code>box-shadow: x y blur colour</code> adds a shadow around a box; <code>text-shadow</code> does the same for text. A soft, low-opacity shadow makes cards look like they float.</p>
<p>The <code>filter</code> property changes how an element is drawn: <code>blur(3px)</code>, <code>grayscale(100%)</code>, <code>brightness(1.4)</code>, <code>contrast()</code>, <code>hue-rotate(90deg)</code>.</p>`,
      e: [['Shadows and filters', `<style>
  .card { width: 180px; padding: 16px; border-radius: 10px; background: #fff; box-shadow: 0 6px 16px rgba(0,0,0,.25); font-family: sans-serif; margin: 10px; }
  h2 { text-shadow: 2px 2px 4px #aaa; font-family: sans-serif; }
  img { margin: 6px; }
  .g { filter: grayscale(100%); }
  .b { filter: blur(3px); }
  .h { filter: hue-rotate(120deg); }
</style>
<h2>Shadow text</h2>
<div class="card">A floating card</div>
<img class="g" src="https://placehold.co/90x60/E34F26/ffffff?text=Gray">
<img class="b" src="https://placehold.co/90x60/2965F1/ffffff?text=Blur">
<img class="h" src="https://placehold.co/90x60/E34F26/ffffff?text=Hue">`]],
      q: ['Add a shadow around a box with the ___-shadow property.', '___-shadow: 0 4px 8px gray;', 'box'] },
    { i: 'css-position', t: 'Position & z-index',
      x: `<p>The <code>position</code> property controls how an element is placed:</p>
<ul><li><code>static</code> — normal flow (the default)</li><li><code>relative</code> — normal flow, but can be nudged with <code>top</code> / <code>left</code></li><li><code>absolute</code> — placed relative to the nearest positioned parent</li><li><code>fixed</code> — stays in place on the screen while scrolling</li><li><code>sticky</code> — scrolls normally, then sticks at a set edge</li></ul>
<p>When elements overlap, <code>z-index</code> decides which is on top — a bigger number is in front.</p>`,
      e: [['Absolute inside relative', `<style>
  .parent { position: relative; height: 140px; background: #E7F5FF; border: 2px solid #2965F1; }
  .badge { position: absolute; top: 10px; right: 10px; background: #E34F26; color: #fff; padding: 4px 10px; border-radius: 12px; }
  .one, .two { position: absolute; width: 90px; height: 70px; color: #fff; padding: 6px; }
  .one { left: 20px; top: 40px; background: #0B6E4F; z-index: 1; }
  .two { left: 60px; top: 70px; background: #F0B90B; color: #000; z-index: 2; }
</style>
<div class="parent">
  <span class="badge">NEW</span>
  <div class="one">z-index 1</div>
  <div class="two">z-index 2</div>
</div>`]],
      q: ['An element that stays fixed on screen while scrolling has position: ___.', 'position: ___;', 'fixed'] },
    { i: 'css-navbar', t: 'Project: A Navigation Bar',
      x: `<p>Let's use what you know to build a horizontal menu. The steps:</p>
<ol><li>Write the links as a list inside a <code>&lt;nav&gt;</code></li><li>Remove the bullets with <code>list-style: none</code></li><li>Put the items in a row with <code>display: flex</code></li><li>Style the links and add a <code>:hover</code> effect</li></ol>
<p>Challenge: add a dropdown, or make the menu stack on small screens with a media query.</p>`,
      e: [['A horizontal menu', `<style>
  nav ul { list-style: none; margin: 0; padding: 0; display: flex; background: #0B6E4F; }
  nav a { display: block; color: #fff; padding: 14px 20px; text-decoration: none; font-family: sans-serif; }
  nav a:hover { background: #0A5A40; }
  nav a.active { background: #F0B90B; color: #000; }
  nav li:last-child { margin-left: auto; }
</style>
<nav>
  <ul>
    <li><a class="active" href="#">Home</a></li>
    <li><a href="#">Courses</a></li>
    <li><a href="#">Games</a></li>
    <li><a href="#">Login</a></li>
  </ul>
</nav>`]],
      q: ['Remove the bullets from a list with list-style: ___.', 'ul { list-style: ___; }', 'none'] }
  ]);

  /* ========================================================== JAVASCRIPT */
  add('javascript', 'Modern Essentials', [
    { i: 'js-arrow', t: 'Arrow Functions',
      x: `<p>Arrow functions are a shorter way to write functions. <code>(a, b) =&gt; a + b</code> means "take a and b, return their sum".</p>
<ul><li>One expression after the arrow is returned automatically</li><li>With one parameter the brackets are optional: <code>x =&gt; x * 2</code></li><li>For several statements, use curly braces and <code>return</code></li></ul>
<p>They are perfect for short callbacks like the ones used with <code>map</code> and <code>filter</code>.</p>`,
      e: [['Short functions', `const add = (a, b) => a + b;
const double = x => x * 2;
const greet = (name) => {
  const msg = "Hello, " + name + "!";
  return msg;
};

console.log(add(3, 4));
console.log(double(21));
console.log(greet("Amina"));
console.log([1, 2, 3].map(n => n * 10));`]],
      q: ['An arrow function is written with the ___ symbol.', 'const f = (x) ___ x * 2;', '=>'] },
    { i: 'js-template', t: 'Template Literals',
      x: `<p>Template literals use <strong>backticks</strong> instead of quotes. They let you put values straight into text with <code>\${ }</code> and they can span several lines — much neater than joining strings with <code>+</code>. Any expression works inside <code>\${ }</code>.</p>`,
      e: [['Text with values inside', `const name = "Juma";
const score = 87;
console.log(\`\${name} scored \${score} points.\`);
console.log(\`Next year he will be \${12 + 1}.\`);

const card = \`Name: \${name}
Grade: \${score >= 80 ? "A" : "B"}\`;
console.log(card);`]],
      q: ['Template literals use ___ instead of normal quotes.', 'const s = ___Hello ${name}___;', 'backticks'] },
    { i: 'js-scope', t: 'Scope & Hoisting',
      x: `<p><strong>Scope</strong> decides where a variable can be used.</p>
<ul><li><code>let</code> and <code>const</code> are <em>block-scoped</em>: they exist only inside the <code>{ }</code> where you made them</li><li><code>var</code> is <em>function-scoped</em> and leaks out of blocks — avoid it in new code</li><li>A variable made outside any function is <em>global</em> — try to use few of those</li></ul>
<p>Function declarations are <strong>hoisted</strong>: you can call them before the line where they are written. <code>let</code> and <code>const</code> cannot be used before their line.</p>`,
      e: [['Block scope', `let outside = "I am global";

function test() {
  let inside = "I live in the function";
  if (true) {
    let block = "I live in this block";
    var leaky = "var leaks out of the block";
    console.log(block);
  }
  console.log(leaky);
  console.log(typeof block);   // not visible here
}

console.log(hello());          // works: function declarations are hoisted
function hello() { return "Hello from a hoisted function"; }
test();`]],
      q: ['A variable made with ___ or const only exists inside its block.', '___ x = 5; // block scope', 'let'] },
    { i: 'js-destructuring', t: 'Destructuring, Spread & Rest',
      x: `<p><strong>Destructuring</strong> unpacks values from arrays and objects into variables in one line.</p>
<ul><li>Arrays by position: <code>const [a, b] = list</code></li><li>Objects by name: <code>const { name, age } = person</code></li></ul>
<p>The three dots <code>...</code> do two jobs. <strong>Spread</strong> copies items out of an array or object; <strong>rest</strong> gathers the remaining items into one.</p>`,
      e: [['Unpack and copy', `const colours = ["red", "green", "blue"];
const [first, second] = colours;
console.log(first, second);

const student = { name: "Zawadi", grade: "A", city: "Dodoma" };
const { name, city } = student;
console.log(name + " lives in " + city);

const more = [...colours, "purple"];       // spread into a new array
const updated = { ...student, grade: "A+" }; // copy an object and change a field
console.log(more);
console.log(updated);

function total(...nums) {                  // rest: gather all arguments
  return nums.reduce((a, b) => a + b, 0);
}
console.log(total(1, 2, 3, 4));`]],
      q: ['Copy the items of an array into a new one with the ___ operator (...).', 'const b = [...a, 4]; // the ... is called ___', 'spread'] },
    { i: 'js-timers', t: 'Timers',
      x: `<p>Timers run code later.</p>
<ul><li><code>setTimeout(fn, ms)</code> — run once after a delay</li><li><code>setInterval(fn, ms)</code> — run again and again</li><li><code>clearTimeout(id)</code> / <code>clearInterval(id)</code> — cancel a timer using the id it returned</li></ul>
<p>Delays are in milliseconds (1000 ms = 1 second). JavaScript does not stop and wait — other code keeps running while the timer counts down.</p>`,
      e: [['A countdown', `let n = 5;
console.log("Countdown starts...");
const id = setInterval(() => {
  console.log(n);
  n--;
  if (n < 0) {
    clearInterval(id);
    console.log("Lift off!");
  }
}, 700);

setTimeout(() => console.log("(I run after 1.5 seconds)"), 1500);
console.log("This prints first!");`]],
      q: ['Run code once after a delay with set___().', '___(() => {}, 1000);', 'Timeout'] },
    { i: 'js-sets-maps', t: 'Sets & Maps',
      x: `<p>Two handy collections built into JavaScript:</p>
<ul><li>A <strong>Set</strong> stores <em>unique</em> values — duplicates are ignored. Methods: <code>add</code>, <code>has</code>, <code>delete</code>, <code>size</code></li><li>A <strong>Map</strong> stores key–value pairs like an object, but any type can be a key and it remembers insertion order. Methods: <code>set</code>, <code>get</code>, <code>has</code>, <code>delete</code>, <code>size</code></li></ul>
<p>Turn a Set back into an array with <code>[...set]</code> — a neat trick to remove duplicates.</p>`,
      e: [['Unique values and key-value pairs', `const nums = [1, 2, 2, 3, 3, 3, 4];
const unique = [...new Set(nums)];
console.log(unique);

const seen = new Set();
seen.add("a"); seen.add("b"); seen.add("a");
console.log(seen.size, seen.has("b"));

const ages = new Map();
ages.set("Amina", 12);
ages.set("Juma", 11);
console.log(ages.get("Amina"), ages.size);
for (const [name, age] of ages) {
  console.log(name + " is " + age);
}`]],
      q: ['A collection that keeps only unique values is a ___.', 'const s = new ___([1, 1, 2]);', 'Set'] },
    { i: 'js-regex', t: 'Regular Expressions',
      x: `<p>A <strong>regular expression</strong> (regex) describes a text pattern. Write it between slashes: <code>/cat/</code>. Add flags after it: <code>i</code> ignore case, <code>g</code> find all.</p>
<ul><li><code>\\d</code> a digit, <code>\\w</code> a letter/digit/underscore, <code>\\s</code> a space</li><li><code>+</code> one or more, <code>*</code> zero or more, <code>?</code> optional</li><li><code>^</code> start of text, <code>$</code> end of text</li><li><code>[abc]</code> one of these characters</li></ul>
<p>Use <code>regex.test(text)</code> to check a match, <code>text.match(regex)</code> to get matches and <code>text.replace(regex, new)</code> to change them.</p>`,
      e: [['Test, match and replace', `const phone = /^\\d{10}$/;
console.log(phone.test("0712345678"));
console.log(phone.test("07123"));

const text = "I have 2 cats and 15 fish";
console.log(text.match(/\\d+/g));
console.log(text.replace(/cats/i, "dogs"));

const email = /^[\\w.]+@[\\w.]+\\.[a-z]{2,}$/i;
console.log(email.test("amina@example.com"));
console.log(email.test("not-an-email"));`]],
      q: ['In a regex, ___ matches any single digit.', '/\\___/.test("7")', 'd'] }
  ]);

  /* ============================================================== PYTHON */
  add('python', 'More Python', [
    { i: 'py-args', t: 'Arguments: default, *args, **kwargs',
      x: `<p>Functions can accept arguments in flexible ways:</p>
<ul><li><strong>Default values</strong>: <code>def greet(name="friend")</code> — used when no value is given</li><li><strong>Keyword arguments</strong>: call with <code>greet(name="Amina")</code> so order does not matter</li><li><strong><code>*args</code></strong> collects extra positional values into a tuple</li><li><strong><code>**kwargs</code></strong> collects extra keyword values into a dictionary</li></ul>`,
      e: [['Flexible arguments', `def greet(name="friend", greeting="Hello"):
    print(greeting + ", " + name + "!")

greet()
greet("Amina")
greet(greeting="Habari", name="Juma")

def total(*args):
    return sum(args)

print(total(1, 2, 3, 4))

def profile(**kwargs):
    for key, value in kwargs.items():
        print(key, "=", value)

profile(name="Zawadi", grade="A", age=12)`]],
      q: ['A parameter that collects extra positional values is written with one ___ (*args).', 'def f(___args): pass', '*'] },
    { i: 'py-scope', t: 'Scope',
      x: `<p><strong>Scope</strong> is where a variable can be seen. A variable made inside a function is <em>local</em> — it disappears when the function ends. A variable made outside any function is <em>global</em>, and functions can read it.</p>
<p>To <em>change</em> a global variable from inside a function you must declare it with the <code>global</code> keyword. Most of the time it is cleaner to pass values in as arguments and <code>return</code> results.</p>`,
      e: [['Local and global', `score = 10          # global

def show():
    print("Inside, score is", score)   # reading a global is fine

def add_points():
    global score
    score = score + 5                  # needs 'global' to change it

def local_demo():
    secret = "only here"
    print(secret)

show()
add_points()
print("After:", score)
local_demo()
try:
    print(secret)
except NameError:
    print("secret does not exist out here")`]],
      q: ['To change a global variable inside a function, first declare it with ___.', '___ score', 'global'] },
    { i: 'py-enumerate-zip', t: 'enumerate() and zip()',
      x: `<p>Two helpers make loops tidier:</p>
<ul><li><code>enumerate(items)</code> gives you the <strong>position and the item</strong> together — no need for a manual counter</li><li><code>zip(a, b)</code> walks through <strong>two lists side by side</strong>, pairing items</li></ul>
<p>You can also start counting from 1 with <code>enumerate(items, start=1)</code>.</p>`,
      e: [['Loop with position, loop in pairs', `names = ["Amina", "Juma", "Zawadi"]
scores = [91, 78, 96]

for i, name in enumerate(names, start=1):
    print(i, name)

print("---")
for name, score in zip(names, scores):
    print(name, "scored", score)

print(dict(zip(names, scores)))`]],
      q: ['Loop over two lists side by side with ___(a, b).', 'for x, y in ___(a, b):', 'zip'] },
    { i: 'py-generators', t: 'Generators',
      x: `<p>A <strong>generator</strong> produces values one at a time, only when asked, instead of building a whole list in memory. Write one like a function but use <code>yield</code> instead of <code>return</code>. Each time the loop asks for the next value, the function resumes where it stopped.</p>
<p>Generators are great for long or endless sequences. A <em>generator expression</em> looks like a list comprehension but uses round brackets.</p>`,
      e: [['yield one value at a time', `def countdown(n):
    while n > 0:
        yield n
        n = n - 1

for x in countdown(5):
    print(x)

def evens():
    n = 0
    while True:          # endless!
        yield n
        n += 2

gen = evens()
print([next(gen) for _ in range(6)])

squares = (n * n for n in range(1, 6))   # generator expression
print(sum(squares))`]],
      q: ['A generator hands back a value with the ___ keyword.', 'def g():\n    ___ 1', 'yield'] },
    { i: 'py-datetime', t: 'Dates & Times',
      x: `<p>The built-in <code>datetime</code> module works with dates and times.</p>
<ul><li><code>date(2026, 12, 25)</code> makes a date; <code>datetime.now()</code> gives the current moment</li><li><code>.strftime("%d %B %Y")</code> turns a date into text. Codes: <code>%Y</code> year, <code>%m</code> month number, <code>%B</code> month name, <code>%d</code> day, <code>%A</code> weekday name, <code>%H:%M</code> time</li><li>Subtract dates to get a <code>timedelta</code>; add one with <code>timedelta(days=7)</code></li></ul>`,
      e: [['Working with dates', `from datetime import date, datetime, timedelta

birthday = date(2014, 5, 20)
print(birthday)
print(birthday.strftime("%A, %d %B %Y"))

party = date(2026, 12, 25)
new_year = date(2027, 1, 1)
print("Days between:", (new_year - party).days)
print("A week later:", party + timedelta(days=7))

now = datetime.now()
print("The year right now is", now.year)`]],
      q: ['Turn a date into formatted text with .___().', 'today.___("%Y-%m-%d")', 'strftime'] },
    { i: 'py-random-math', t: 'The random and math Modules',
      x: `<p><code>random</code> makes unpredictable choices: <code>random.randint(1, 6)</code> (a whole number, both ends included), <code>random.choice(list)</code>, <code>random.shuffle(list)</code>, <code>random.random()</code> (0 to 1).</p>
<p><code>math</code> gives maths tools: <code>math.sqrt()</code>, <code>math.pi</code>, <code>math.ceil()</code>, <code>math.floor()</code>, <code>math.factorial()</code>. Setting <code>random.seed(n)</code> makes the "random" results repeat — useful for testing.</p>`,
      e: [['Dice, cards and circles', `import random
import math

random.seed(7)           # same results every run
print("Dice roll:", random.randint(1, 6))
fruits = ["apple", "mango", "banana", "orange"]
print("Picked:", random.choice(fruits))
random.shuffle(fruits)
print("Shuffled:", fruits)

r = 5
print("Circle area:", round(math.pi * r ** 2, 2))
print(math.sqrt(144), math.ceil(4.1), math.floor(4.9), math.factorial(5))`]],
      q: ['Pick one item from a list with random.___(list).', 'random.___(["a", "b"])', 'choice'] },
    { i: 'py-regex', t: 'Regular Expressions',
      x: `<p>The <code>re</code> module finds patterns in text. Write patterns as raw strings (<code>r"..."</code>) so backslashes work. Useful pieces: <code>\\d</code> digit, <code>\\w</code> word character, <code>\\s</code> space, <code>+</code> one or more, <code>*</code> zero or more, <code>[a-z]</code> a range.</p>
<ul><li><code>re.search(p, text)</code> — first match anywhere (or <code>None</code>)</li><li><code>re.findall(p, text)</code> — list of all matches</li><li><code>re.sub(p, new, text)</code> — replace matches</li></ul>`,
      e: [['Find and replace patterns', `import re

text = "Call 0712 345 678 or 0755 111 222 today"
print(re.findall(r"0\\d{3} \\d{3} \\d{3}", text))

m = re.search(r"(\\w+)@(\\w+)\\.com", "Write to amina@school.com now")
if m:
    print("User:", m.group(1), "Domain:", m.group(2))

print(re.sub(r"\\d", "#", "Room 204 has 3 desks"))`]],
      q: ['Find every match of a pattern with re.___().', 're.___(r"\\d+", text)', 'findall'] }
  ]);

  /* ================================================================== SQL */
  add('sql', 'Advanced Queries', [
    { i: 'sql-distinct', t: 'SELECT DISTINCT',
      x: `<p>A column often repeats the same value many times. <code>SELECT DISTINCT</code> removes the duplicates so each value shows once. With several columns, it keeps each unique <em>combination</em>.</p><p>Use <code>COUNT(DISTINCT column)</code> to count how many different values there are.</p>`,
      e: [['Unique values', `SELECT DISTINCT city FROM students ORDER BY city;

-- How many different cities are there?
SELECT COUNT(DISTINCT city) AS cities FROM students;

-- Each unique grade and city pair
SELECT DISTINCT grade, city FROM students ORDER BY grade;`]],
      q: ['Remove duplicate rows from the results with SELECT ___.', 'SELECT ___ city FROM students;', 'DISTINCT'] },
    { i: 'sql-null', t: 'NULL Values',
      x: `<p><code>NULL</code> means "no value / unknown". It is <strong>not</strong> zero and not an empty text. You cannot test it with <code>=</code> — use <code>IS NULL</code> or <code>IS NOT NULL</code>.</p><p><code>COALESCE(a, b)</code> returns the first value that is not NULL, so you can show a friendly default. <code>COUNT(column)</code> skips NULLs, while <code>COUNT(*)</code> counts every row.</p>`,
      e: [['Missing values', `DROP TABLE IF EXISTS pets;
CREATE TABLE pets (name TEXT, age INTEGER, owner TEXT);
INSERT INTO pets VALUES ('Simba', 3, 'Amina'), ('Kiki', NULL, 'Juma'), ('Rex', 5, NULL);

SELECT * FROM pets WHERE owner IS NULL;
SELECT name, COALESCE(age, 0) AS age_or_zero FROM pets;
SELECT COUNT(*) AS all_rows, COUNT(age) AS with_age FROM pets;`]],
      q: ['Find rows where a value is missing with IS ___.', 'WHERE owner IS ___', 'NULL'] },
    { i: 'sql-case', t: 'CASE Expressions',
      x: `<p><code>CASE</code> is SQL's if/else. It checks conditions in order and gives back the first matching result:</p><p><code>CASE WHEN condition THEN result ... ELSE other END</code></p><p>Use it to turn numbers into labels or to group rows in a custom way. Always finish with <code>END</code> and give the new column a name with <code>AS</code>.</p>`,
      e: [['Turn scores into labels', `SELECT name, score,
  CASE
    WHEN score >= 90 THEN 'Excellent'
    WHEN score >= 70 THEN 'Good'
    WHEN score >= 50 THEN 'Pass'
    ELSE 'Needs help'
  END AS result
FROM students
ORDER BY score DESC;`]],
      q: ['A CASE expression must finish with the word ___.', 'CASE WHEN a > 1 THEN 1 ELSE 0 ___', 'END'] },
    { i: 'sql-left-join', t: 'LEFT JOIN',
      x: `<p>A normal <code>JOIN</code> keeps only rows that match on both sides. A <strong>LEFT JOIN</strong> keeps <em>every</em> row from the left table, and fills in <code>NULL</code> for the right-hand columns when there is no match.</p><p>It is perfect for questions like "which courses have no students?" — combine it with <code>IS NULL</code>.</p>`,
      e: [['Keep courses even with no students', `SELECT c.title, COUNT(s.id) AS students
FROM courses c
LEFT JOIN students s ON s.course_id = c.id
GROUP BY c.title
ORDER BY students DESC;

-- Only the courses nobody has joined
SELECT c.title
FROM courses c
LEFT JOIN students s ON s.course_id = c.id
WHERE s.id IS NULL;`]],
      q: ['To keep every row of the left table use a ___ JOIN.', 'FROM a ___ JOIN b ON a.id = b.a_id', 'LEFT'] },
    { i: 'sql-union', t: 'UNION',
      x: `<p><code>UNION</code> stacks the results of two <code>SELECT</code> queries into one list. Both queries must return the <em>same number of columns</em> with compatible types. <code>UNION</code> removes duplicates; <code>UNION ALL</code> keeps them and is faster.</p>`,
      e: [['Combine two lists', `SELECT name, 'student' AS role FROM students WHERE score >= 90
UNION
SELECT teacher, 'teacher' FROM courses
ORDER BY role, name;`]],
      q: ['Stack the results of two queries with ___.', 'SELECT a FROM x ___ SELECT a FROM y', 'UNION'] },
    { i: 'sql-alter', t: 'ALTER TABLE & DROP',
      x: `<p><code>ALTER TABLE</code> changes a table that already exists: <code>ADD COLUMN</code> adds a column, <code>RENAME TO</code> renames the table, <code>RENAME COLUMN a TO b</code> renames a column. <code>DROP TABLE</code> deletes a whole table <strong>and everything in it</strong> — be careful! Use <code>DROP TABLE IF EXISTS</code> so nothing breaks if it is missing. (Press "Restore DB" if you ever want the sample data back.)</p>`,
      e: [['Change and delete a table', `DROP TABLE IF EXISTS clubs;
CREATE TABLE clubs (id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO clubs (name) VALUES ('Chess'), ('Robotics');

ALTER TABLE clubs ADD COLUMN room TEXT DEFAULT 'Hall';
UPDATE clubs SET room = 'Lab 2' WHERE name = 'Robotics';
SELECT * FROM clubs;`]],
      q: ['Add a new column to an existing table with ALTER TABLE ... ___ COLUMN.', 'ALTER TABLE t ___ COLUMN age INTEGER;', 'ADD'] },
    { i: 'sql-view', t: 'Views',
      x: `<p>A <strong>view</strong> is a saved query that behaves like a table. Create it with <code>CREATE VIEW name AS SELECT ...</code> and then <code>SELECT</code> from it whenever you like. Views keep long queries tidy and hide details. A view stores no data of its own — it always shows the current data. Remove one with <code>DROP VIEW</code>.</p>`,
      e: [['Save a query as a view', `DROP VIEW IF EXISTS top_students;
CREATE VIEW top_students AS
  SELECT name, city, score FROM students WHERE score >= 85;

SELECT * FROM top_students ORDER BY score DESC;
SELECT city, COUNT(*) AS stars FROM top_students GROUP BY city;`]],
      q: ['Save a query under a name with CREATE ___.', 'CREATE ___ v AS SELECT 1;', 'VIEW'] },
    { i: 'sql-window', t: 'Window Functions',
      x: `<p>A <strong>window function</strong> calculates something across related rows <em>without</em> collapsing them into one row like <code>GROUP BY</code> does. The <code>OVER (...)</code> part defines the window:</p><ul><li><code>ROW_NUMBER() OVER (ORDER BY score DESC)</code> — 1, 2, 3 ...</li><li><code>RANK()</code> — same rank for ties</li><li><code>PARTITION BY city</code> — restart inside each group</li><li><code>AVG(score) OVER (PARTITION BY city)</code> — a group average shown on every row</li></ul>`,
      e: [['Rank students', `SELECT name, city, score,
  RANK() OVER (ORDER BY score DESC) AS overall_rank,
  RANK() OVER (PARTITION BY city ORDER BY score DESC) AS city_rank,
  ROUND(AVG(score) OVER (PARTITION BY city), 1) AS city_avg
FROM students
ORDER BY overall_rank;`]],
      q: ['Window functions use the ___ (...) clause.', 'RANK() ___ (ORDER BY score)', 'OVER'] }
  ]);

  /* ============================================================ EXTRA REFS */
  var more = {
    html: [['<svg>', 'Vector graphics drawn with code'], ['<details>', 'A box the reader can open and close'],
      ['<summary>', 'The visible heading of a details box'], ['<progress>', 'Progress of a task (value, max)'], ['<meter>', 'A measurement in a known range'], ['<dialog>', 'A pop-up dialog box'],
      ['<picture>', 'Choose between several image files'], ['<figure>', 'Self-contained picture or diagram'], ['<figcaption>', 'Caption for a figure'], ['<time>', 'A date or time readable by machines'],
      ['<template>', 'HTML that is not shown until JavaScript uses it']],
    css: [['rem', 'Length relative to the root font size'], ['vw / vh', '1% of the screen width / height'], [':hover', 'While the mouse is over an element'], [':focus', 'While an element has the keyboard focus'],
      [':nth-child(n)', 'The nth child of its parent'], ['::before / ::after', 'Insert generated content before / after an element'], ['linear-gradient()', 'A colour blend along a line'],
      ['radial-gradient()', 'A colour blend from the centre outward'], ['box-shadow', 'Shadow around a box'], ['text-shadow', 'Shadow behind text'], ['filter', 'Blur, grayscale, brightness and more'],
      ['position', 'static, relative, absolute, fixed or sticky'], ['z-index', 'Stacking order of overlapping elements'], ['list-style', 'Bullet or number style of a list']],
    javascript: [['() => {}', 'Arrow function'], ['`text ${x}`', 'Template literal with a value inside'], ['const { a, b } = obj', 'Object destructuring'], ['const [x, y] = arr', 'Array destructuring'],
      ['[...arr]', 'Spread an array into a new one'], ['...args', 'Rest: gather the remaining arguments'], ['setTimeout(fn, ms)', 'Run once after a delay'], ['setInterval(fn, ms)', 'Run repeatedly'],
      ['clearInterval(id)', 'Stop an interval'], ['new Set(arr)', 'A collection of unique values'], ['new Map()', 'A collection of key-value pairs'], ['regex.test(text)', 'Does the pattern match?'],
      ['text.match(regex)', 'Get the matches'], ['text.replace(regex, new)', 'Replace matches']],
    python: [['def f(a, b=1)', 'Default argument value'], ['*args', 'Collect extra positional arguments'], ['**kwargs', 'Collect extra keyword arguments'], ['global x', 'Change a global variable in a function'],
      ['enumerate(list)', 'Position and item together'], ['zip(a, b)', 'Walk two lists side by side'], ['yield', 'Hand back one value from a generator'], ['date(y, m, d)', 'Create a date'],
      ['datetime.now()', 'The current date and time'], ['date.strftime(format)', 'Format a date as text'], ['timedelta(days=n)', 'A length of time'], ['random.randint(a, b)', 'Random whole number, both ends included'],
      ['random.choice(list)', 'Random item from a list'], ['math.sqrt(x)', 'Square root'], ['re.findall(p, s)', 'All matches of a pattern'], ['re.sub(p, new, s)', 'Replace matches of a pattern']],
    sql: [['SELECT DISTINCT', 'Remove duplicate rows'], ['IS NULL / IS NOT NULL', 'Test for missing values'], ['COALESCE(a, b)', 'First value that is not NULL'], ['CASE WHEN ... END', 'If/else inside a query'],
      ['LEFT JOIN', 'Keep all rows from the left table'], ['UNION / UNION ALL', 'Stack the results of two queries'], ['ALTER TABLE', 'Change an existing table'], ['DROP TABLE', 'Delete a table'],
      ['CREATE VIEW', 'Save a query as a virtual table'], ['OVER (...)', 'Defines the window for a window function'], ['ROW_NUMBER()', 'Number rows 1, 2, 3 ...'], ['RANK()', 'Rank rows, ties share a rank'],
      ['PARTITION BY', 'Restart a window calculation for each group']]
  };
  Object.keys(more).forEach(function (k) {
    S.refs[k] = (S.refs[k] || []).concat(more[k]);
  });
})(window.S21C);
