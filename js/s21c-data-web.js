/* Smart21Code — lesson data: HTML, CSS, JavaScript.
   All lesson text and examples are original Smart21Brain content.
   Lesson shape:  { i:id, g:group, t:title, x:explanation(html), e:[[caption, code], ...], q:[prompt, template-with-___, answer] } */
window.S21C = window.S21C || { langs: [], lessons: {}, refs: {} };
(function (S) {
  S.langs = [
    { id: 'html', name: 'HTML', color: '#E34F26', icon: 'fa-code', tag: 'Structure every web page', mode: 'htmlmixed', run: 'web' },
    { id: 'css', name: 'CSS', color: '#2965F1', icon: 'fa-brush', tag: 'Style, colour and layout', mode: 'htmlmixed', run: 'web' },
    { id: 'javascript', name: 'JavaScript', color: '#E8B334', icon: 'fa-js', tag: 'Make pages interactive', mode: 'javascript', run: 'web' },
    { id: 'python', name: 'Python', color: '#3776AB', icon: 'fa-python', tag: 'A friendly first language', mode: 'python', run: 'python' },
    { id: 'sql', name: 'SQL', color: '#7B61FF', icon: 'fa-database', tag: 'Ask questions of data', mode: 'text/x-sqlite', run: 'sql' }
  ];
  function add(lang, group, list) {
    S.lessons[lang] = S.lessons[lang] || [];
    list.forEach(function (l) { l.g = group; S.lessons[lang].push(l); });
  }

  /* ================================================================ HTML */
  add('html', 'Getting Started', [
    { i: 'html-intro', t: 'HTML Introduction',
      x: `<p><strong>HTML</strong> (HyperText Markup Language) is the language every web page is built with. It describes the <em>structure</em> of a page: which part is a heading, which is a paragraph, which is a picture, which is a link.</p>
<p>Browsers read HTML and turn it into the page you see. You write HTML in a plain text file that ends with <code>.html</code>.</p>
<ul><li>HTML is made of <strong>elements</strong>, written with tags like <code>&lt;p&gt;</code></li><li>It is not a programming language — it describes content</li><li>CSS styles it and JavaScript makes it interactive</li></ul>`,
      e: [['A tiny web page', `<!DOCTYPE html>
<html>
<head>
  <title>My First Page</title>
</head>
<body>
  <h1>Hello, Smart21Brain!</h1>
  <p>This is my very first web page.</p>
</body>
</html>`]],
      q: ['HTML stands for HyperText ___ Language.', 'HyperText ___ Language', 'Markup'] },
    { i: 'html-structure', t: 'HTML Page Structure',
      x: `<p>Every HTML page follows the same skeleton:</p>
<ul><li><code>&lt;!DOCTYPE html&gt;</code> tells the browser this is modern HTML</li><li><code>&lt;html&gt;</code> wraps the whole page</li><li><code>&lt;head&gt;</code> holds information about the page (title, character set) that is not shown on the page itself</li><li><code>&lt;body&gt;</code> holds everything the visitor sees</li></ul>
<p>Only the content inside <code>&lt;body&gt;</code> appears in the browser window. The <code>&lt;title&gt;</code> shows in the browser tab.</p>`,
      e: [['The skeleton with a visible body', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page Title (shows in the tab)</title>
</head>
<body>
  <h1>Only the body is visible</h1>
  <p>Look at the tab title of this preview.</p>
</body>
</html>`]],
      q: ['The visible content of a page goes inside the ___ element.', '<___>Hello</___>', 'body'] },
    { i: 'html-elements', t: 'HTML Elements',
      x: `<p>An HTML <strong>element</strong> is a start tag, some content, and an end tag:</p>
<p><code>&lt;p&gt;My paragraph&lt;/p&gt;</code></p>
<p>Elements can sit inside other elements — this is called <strong>nesting</strong>. Some elements are <em>empty</em> (they have no content and no end tag), such as <code>&lt;br&gt;</code> for a line break and <code>&lt;hr&gt;</code> for a horizontal line.</p>`,
      e: [['Nested and empty elements', `<div>
  <h2>Nested elements</h2>
  <p>This paragraph is <strong>inside</strong> a div.</p>
  <hr>
  <p>Line one<br>Line two after a break</p>
</div>`]],
      q: ['An element that has no content and no end tag is called an ___ element.', '___ element', 'empty'] },
    { i: 'html-attributes', t: 'HTML Attributes',
      x: `<p>Attributes give an element extra information. They always go in the <em>start tag</em> and usually look like <code>name="value"</code>.</p>
<ul><li><code>href</code> — where a link goes</li><li><code>src</code> and <code>alt</code> — the picture file and its text description</li><li><code>style</code> — quick inline styling</li><li><code>lang</code> — the language of the page</li><li><code>title</code> — a tooltip shown on hover</li></ul>`,
      e: [['Attributes in action', `<a href="https://smart21brain.com" title="Go to Smart21Brain">Visit our site</a>
<p style="color:#0B6E4F; font-size:22px;">Styled with the style attribute</p>
<p title="Hover over me!">Hover to see a tooltip</p>`]],
      q: ['The ___ attribute holds the address a link points to.', '<a ___="page.html">Go</a>', 'href'] }
  ]);
  add('html', 'Text', [
    { i: 'html-headings', t: 'HTML Headings',
      x: `<p>Headings run from <code>&lt;h1&gt;</code> (most important) to <code>&lt;h6&gt;</code> (least important). Use one <code>&lt;h1&gt;</code> per page for the main title, then smaller headings for sections. Search engines and screen readers use headings to understand your page, so choose them for meaning — not just for size.</p>`,
      e: [['Six heading levels', `<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
<h4>Heading 4</h4>
<h5>Heading 5</h5>
<h6>Heading 6</h6>`]],
      q: ['The most important heading is <___>.', '<___>Title</___>', 'h1'] },
    { i: 'html-paragraphs', t: 'Paragraphs & Line Breaks',
      x: `<p>The <code>&lt;p&gt;</code> element defines a paragraph. Browsers add space above and below it and collapse extra spaces and blank lines in your code into one space. Use <code>&lt;br&gt;</code> for a line break inside a paragraph, and <code>&lt;pre&gt;</code> when you need spacing preserved exactly (like poems or code).</p>`,
      e: [['Paragraphs, breaks and pre', `<p>This is a paragraph.   Extra    spaces  collapse.</p>
<p>A line break<br>splits this line.</p>
<pre>
Preformatted   text
  keeps its   spacing.
</pre>`]],
      q: ['Use the ___ element to start a new paragraph.', '<___>Text</___>', 'p'] },
    { i: 'html-formatting', t: 'Text Formatting',
      x: `<p>HTML has elements for giving text special meaning:</p>
<ul><li><code>&lt;strong&gt;</code> — important text (bold)</li><li><code>&lt;em&gt;</code> — emphasised text (italic)</li><li><code>&lt;mark&gt;</code> — highlighted text</li><li><code>&lt;small&gt;</code> — smaller text</li><li><code>&lt;del&gt;</code> and <code>&lt;ins&gt;</code> — deleted and inserted text</li><li><code>&lt;sub&gt;</code> and <code>&lt;sup&gt;</code> — subscript and superscript</li></ul>`,
      e: [['Formatting elements', `<p>This is <strong>important</strong> and this is <em>emphasised</em>.</p>
<p>Please <mark>remember</mark> this word.</p>
<p>Water is H<sub>2</sub>O and 5<sup>2</sup> = 25.</p>
<p>Price: <del>$20</del> <ins>$15</ins></p>`]],
      q: ['Use <___> to mark text as important.', '<___>Warning</___>', 'strong'] },
    { i: 'html-comments', t: 'HTML Comments',
      x: `<p>Comments are notes in your code that the browser ignores. They begin with <code>&lt;!--</code> and end with <code>--&gt;</code>. Use them to explain your code or to temporarily switch a piece of HTML off while testing.</p>`,
      e: [['Hidden comments', `<h2>Comments demo</h2>
<!-- This comment is not shown -->
<p>You can see this paragraph.</p>
<!-- <p>This paragraph is switched off.</p> -->`]],
      q: ['A comment starts with <!-- and ends with ___', '<!-- note ___', '-->'] }
  ]);
  add('html', 'Links, Images & Media', [
    { i: 'html-links', t: 'HTML Links',
      x: `<p>Links are made with the <code>&lt;a&gt;</code> (anchor) element and its <code>href</code> attribute. The text between the tags is what people click.</p>
<ul><li><code>target="_blank"</code> opens the link in a new tab</li><li>Link to a spot on the same page using an id: <code>href="#section2"</code></li><li>Use <code>mailto:</code> to open an email app</li></ul>`,
      e: [['Different kinds of links', `<p><a href="https://smart21brain.com" target="_blank">Open in a new tab</a></p>
<p><a href="#bottom">Jump to the bottom</a></p>
<p><a href="mailto:hello@example.com">Send an email</a></p>
<div style="height:200px"></div>
<h3 id="bottom">You jumped here!</h3>`]],
      q: ['The ___ attribute of <a> holds the link address.', '<a ___="https://example.com">Link</a>', 'href'] },
    { i: 'html-images', t: 'HTML Images',
      x: `<p>The <code>&lt;img&gt;</code> element shows a picture. It is an empty element with two required attributes: <code>src</code> (the file) and <code>alt</code> (a text description used by screen readers and shown if the image fails to load). Set <code>width</code> and <code>height</code> to stop the page jumping while images load.</p>`,
      e: [['An image with alt text', `<img src="https://placehold.co/300x160/0B6E4F/ffffff?text=Smart21Brain"
     alt="A green banner that says Smart21Brain"
     width="300" height="160">
<p>Try changing the width to 150.</p>`]],
      q: ['Every image should have an ___ attribute describing it.', '<img src="cat.jpg" ___="A sleeping cat">', 'alt'] },
    { i: 'html-media', t: 'Audio & Video',
      x: `<p>Modern browsers play media without plug-ins. Use <code>&lt;video&gt;</code> and <code>&lt;audio&gt;</code> with the <code>controls</code> attribute to show play/pause buttons. Give one or more <code>&lt;source&gt;</code> files so every browser finds a format it understands. Text between the tags appears if the element is not supported.</p>`,
      e: [['A video player (add your own file)', `<video width="320" height="180" controls>
  <source src="movie.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>
<audio controls>
  <source src="sound.mp3" type="audio/mpeg">
  Your browser does not support audio.
</audio>`]],
      q: ['Add the ___ attribute to show play and pause buttons.', '<video ___ src="a.mp4"></video>', 'controls'] },
    { i: 'html-iframes', t: 'HTML Iframes',
      x: `<p>An <code>&lt;iframe&gt;</code> shows another web page inside your page — handy for maps and embedded videos. Always give it a <code>title</code> so screen readers can describe it. Only embed sites you trust.</p>`,
      e: [['Embedding a page', `<iframe src="https://example.com" title="Example website"
        width="100%" height="200" style="border:2px solid #0B6E4F"></iframe>`]],
      q: ['An iframe should always have a ___ attribute for accessibility.', '<iframe src="a.html" ___="My frame"></iframe>', 'title'] }
  ]);
  add('html', 'Lists & Tables', [
    { i: 'html-lists', t: 'HTML Lists',
      x: `<p>There are three kinds of lists:</p>
<ul><li><code>&lt;ul&gt;</code> — unordered list (bullets)</li><li><code>&lt;ol&gt;</code> — ordered list (numbers)</li><li><code>&lt;dl&gt;</code> — description list (terms and meanings)</li></ul>
<p>Every item in <code>&lt;ul&gt;</code> and <code>&lt;ol&gt;</code> is wrapped in <code>&lt;li&gt;</code>.</p>`,
      e: [['Three kinds of lists', `<h3>Shopping</h3>
<ul><li>Books</li><li>Pens</li><li>Paper</li></ul>
<h3>Steps</h3>
<ol><li>Open the editor</li><li>Write code</li><li>Press Run</li></ol>
<dl><dt>HTML</dt><dd>Page structure</dd><dt>CSS</dt><dd>Page style</dd></dl>`]],
      q: ['An ordered (numbered) list uses the ___ element.', '<___><li>One</li></___>', 'ol'] },
    { i: 'html-tables', t: 'HTML Tables',
      x: `<p>Tables show data in rows and columns. A table uses <code>&lt;table&gt;</code>, rows with <code>&lt;tr&gt;</code>, header cells with <code>&lt;th&gt;</code> and data cells with <code>&lt;td&gt;</code>. Group rows with <code>&lt;thead&gt;</code>, <code>&lt;tbody&gt;</code> and <code>&lt;tfoot&gt;</code>. Use <code>colspan</code> and <code>rowspan</code> to merge cells.</p>`,
      e: [['A styled table', `<style>
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
  th { background: #0B6E4F; color: white; }
</style>
<table>
  <thead><tr><th>Name</th><th>Grade</th><th>Score</th></tr></thead>
  <tbody>
    <tr><td>Amina</td><td>A</td><td>91</td></tr>
    <tr><td>Juma</td><td>B</td><td>78</td></tr>
    <tr><td colspan="3">Class average: 84</td></tr>
  </tbody>
</table>`]],
      q: ['A table row is created with the ___ element.', '<table><___><td>1</td></___></table>', 'tr'] }
  ]);
  add('html', 'Forms', [
    { i: 'html-forms', t: 'HTML Forms',
      x: `<p>Forms collect information from visitors. The <code>&lt;form&gt;</code> element wraps the controls; each <code>&lt;input&gt;</code> should have a matching <code>&lt;label&gt;</code>. The <code>action</code> says where to send the data and <code>method</code> says how (<code>get</code> or <code>post</code>).</p>`,
      e: [['A simple sign-up form', `<form action="#" method="post">
  <label for="name">Your name</label><br>
  <input type="text" id="name" name="name" placeholder="Amina"><br><br>
  <label for="email">Email</label><br>
  <input type="email" id="email" name="email"><br><br>
  <button type="submit">Join</button>
</form>`]],
      q: ['Connect a label to an input using the label\'s ___ attribute.', '<label ___="email">Email</label>', 'for'] },
    { i: 'html-input-types', t: 'Input Types',
      x: `<p>The <code>type</code> attribute changes how an input behaves: <code>text</code>, <code>email</code>, <code>password</code>, <code>number</code>, <code>date</code>, <code>color</code>, <code>range</code>, <code>checkbox</code>, <code>radio</code> and <code>file</code> are the most common. Phones show the right keyboard for each type, and the browser checks some (like email) for you.</p>`,
      e: [['A tour of input types', `<p>Number: <input type="number" min="1" max="10" value="3"></p>
<p>Date: <input type="date"></p>
<p>Colour: <input type="color" value="#0B6E4F"></p>
<p>Range: <input type="range" min="0" max="100"></p>
<p><input type="checkbox" id="c1"> <label for="c1">I agree</label></p>
<p><input type="radio" name="r" checked> Yes <input type="radio" name="r"> No</p>
<p>Password: <input type="password" placeholder="secret"></p>`]],
      q: ['Use type="___" for a hidden-characters password box.', '<input type="___">', 'password'] },
    { i: 'html-select', t: 'Select, Textarea & Buttons',
      x: `<p>Use <code>&lt;select&gt;</code> with <code>&lt;option&gt;</code> for drop-down menus, <code>&lt;textarea&gt;</code> for long text, and <code>&lt;button&gt;</code> for clickable buttons. Add <code>required</code> to any control to make the browser insist on a value before the form is sent.</p>`,
      e: [['Dropdown, text area and button', `<form>
  <select name="course">
    <option>Choose a course</option>
    <option>HTML</option>
    <option>Python</option>
  </select>
  <br><br>
  <textarea rows="3" cols="30" placeholder="Tell us about you"></textarea>
  <br><br>
  <input type="text" required placeholder="Required field">
  <button type="submit">Send</button>
</form>`]],
      q: ['Add the ___ attribute to force a value before submitting.', '<input type="text" ___>', 'required'] }
  ]);
  add('html', 'Layout & Structure', [
    { i: 'html-semantic', t: 'Semantic Elements',
      x: `<p>Semantic elements have names that describe their purpose: <code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code>, <code>&lt;section&gt;</code>, <code>&lt;article&gt;</code>, <code>&lt;aside&gt;</code> and <code>&lt;footer&gt;</code>. They look the same as <code>&lt;div&gt;</code> until you style them, but they help search engines, screen readers and other developers understand the page.</p>`,
      e: [['A semantic page layout', `<header style="background:#0B6E4F;color:#fff;padding:10px"><h2>My Blog</h2></header>
<nav style="padding:8px"><a href="#">Home</a> | <a href="#">About</a></nav>
<main>
  <article><h3>First post</h3><p>Semantic tags describe the page.</p></article>
  <aside style="background:#eee;padding:8px">Related links</aside>
</main>
<footer style="text-align:center;color:#666">&copy; 2026</footer>`]],
      q: ['The ___ element holds the main navigation links.', '<___><a href="#">Home</a></___>', 'nav'] },
    { i: 'html-div-span', t: 'Div & Span',
      x: `<p><code>&lt;div&gt;</code> is a <strong>block</strong> element: it starts on a new line and stretches the full width — perfect for grouping sections. <code>&lt;span&gt;</code> is <strong>inline</strong>: it stays inside a line of text — perfect for styling a few words. Neither has any meaning by itself; they are containers you style with CSS.</p>`,
      e: [['Block versus inline', `<div style="background:#E4F3EC;padding:10px">A div fills the whole row.</div>
<p>My favourite colour is <span style="color:crimson;font-weight:bold">red</span> today.</p>`]],
      q: ['A ___ element is inline and does not start a new line.', '<___>word</___>', 'span'] },
    { i: 'html-classes', t: 'Classes & IDs',
      x: `<p>To style or find specific elements, give them a name. A <code>class</code> can be shared by many elements; an <code>id</code> must be unique on the page. In CSS, classes start with a dot (<code>.card</code>) and ids with a hash (<code>#title</code>).</p>`,
      e: [['Using class and id', `<style>
  .card { background:#E4F3EC; padding:10px; margin:6px 0; border-radius:8px; }
  #special { border:3px solid crimson; }
</style>
<div class="card">Card one</div>
<div class="card" id="special">Card two (special)</div>
<div class="card">Card three</div>`]],
      q: ['In CSS, a class selector starts with a ___.', '___card { color: red; }', '.'] },
    { i: 'html-head', t: 'Head & Meta Tags',
      x: `<p>The <code>&lt;head&gt;</code> holds page information. Useful things to include:</p>
<ul><li><code>&lt;meta charset="UTF-8"&gt;</code> so every character displays correctly</li><li><code>&lt;meta name="viewport" ...&gt;</code> so the page fits phone screens</li><li><code>&lt;meta name="description"&gt;</code> the summary shown in search results</li><li><code>&lt;link&gt;</code> to attach a stylesheet, and <code>&lt;style&gt;</code> for inline CSS</li></ul>`,
      e: [['A complete, mobile-friendly head', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Learning to code with Smart21Code">
  <title>Mobile Ready Page</title>
  <style>body{font-family:sans-serif;padding:16px}</style>
</head>
<body><h1>Ready for phones</h1></body>
</html>`]],
      q: ['The viewport meta tag makes a page fit ___ screens.', 'width=device-width — helps ___ screens', 'mobile'] },
    { i: 'html-entities', t: 'Entities & Symbols',
      x: `<p>Some characters have special meaning in HTML, such as <code>&lt;</code>. To show them as text use an <strong>entity</strong>: <code>&amp;lt;</code> for &lt;, <code>&amp;gt;</code> for &gt;, <code>&amp;amp;</code> for &amp;, <code>&amp;copy;</code> for &copy;. A non-breaking space is <code>&amp;nbsp;</code>. Emoji and symbols work too when your page uses UTF-8.</p>`,
      e: [['Showing special characters', `<p>5 &lt; 10 and 10 &gt; 5</p>
<p>Fish &amp; Chips</p>
<p>&copy; 2026 Smart21Brain &nbsp;&nbsp; &hearts; &check; &rarr;</p>
<p>Emoji work too: 🚀 📚 💡</p>`]],
      q: ['The entity for the less-than sign is &___;', '&___;', 'lt'] }
  ]);

  /* ================================================================= CSS */
  add('css', 'Getting Started', [
    { i: 'css-intro', t: 'CSS Introduction',
      x: `<p><strong>CSS</strong> (Cascading Style Sheets) controls how HTML looks: colours, fonts, spacing and layout. A CSS rule has a <em>selector</em> (what to style) and a <em>declaration block</em> of <code>property: value;</code> pairs.</p>
<p><code>p { color: green; font-size: 20px; }</code></p>`,
      e: [['Your first CSS rule', `<style>
  h1 { color: #0B6E4F; text-align: center; }
  p  { color: #444; font-size: 18px; }
</style>
<h1>Styled heading</h1>
<p>This paragraph was styled with CSS.</p>`]],
      q: ['CSS stands for Cascading ___ Sheets.', 'Cascading ___ Sheets', 'Style'] },
    { i: 'css-how', t: 'Adding CSS',
      x: `<p>There are three ways to add CSS:</p>
<ul><li><strong>Inline</strong> — the <code>style</code> attribute on one element</li><li><strong>Internal</strong> — a <code>&lt;style&gt;</code> block in the page head</li><li><strong>External</strong> — a separate <code>.css</code> file linked with <code>&lt;link rel="stylesheet" href="style.css"&gt;</code></li></ul>
<p>External files are best: one file can style your whole website.</p>`,
      e: [['Inline and internal together', `<style>
  p { color: navy; }
</style>
<p>Styled by the internal block.</p>
<p style="color:crimson">Inline style wins here.</p>`]],
      q: ['An external stylesheet is attached with the <___> element.', '<___ rel="stylesheet" href="a.css">', 'link'] },
    { i: 'css-selectors', t: 'CSS Selectors',
      x: `<p>Selectors pick which elements to style:</p>
<ul><li><code>p</code> — every paragraph (element)</li><li><code>.note</code> — elements with class="note"</li><li><code>#top</code> — the element with id="top"</li><li><code>div p</code> — paragraphs inside a div</li><li><code>a:hover</code> — links while hovered</li><li><code>h1, h2</code> — several selectors at once</li></ul>`,
      e: [['Element, class and id selectors', `<style>
  p { color: #333; }
  .note { background: #FFF6E0; padding: 8px; }
  #top { font-weight: bold; color: crimson; }
  li:hover { color: #0B6E4F; }
</style>
<p id="top">Selected by id</p>
<p class="note">Selected by class</p>
<ul><li>Hover over me</li><li>And me</li></ul>`]],
      q: ['To select all elements with class "box", write ___box.', '___box { color: red; }', '.'] }
  ]);
  add('css', 'Colours & Boxes', [
    { i: 'css-colors', t: 'CSS Colours',
      x: `<p>Colours can be written as names (<code>tomato</code>), hex codes (<code>#0B6E4F</code>), <code>rgb(11,110,79)</code>, or <code>hsl(160,82%,24%)</code>. Add transparency with <code>rgba()</code> or <code>hsla()</code>. Use <code>color</code> for text and <code>background-color</code> for backgrounds.</p>`,
      e: [['Ways to write a colour', `<div style="background:tomato;padding:8px">Name: tomato</div>
<div style="background:#0B6E4F;color:#fff;padding:8px">Hex: #0B6E4F</div>
<div style="background:rgb(58,134,255);color:#fff;padding:8px">RGB</div>
<div style="background:hsl(45,100%,70%);padding:8px">HSL</div>
<div style="background:rgba(239,71,111,.4);padding:8px">RGBA (transparent)</div>`]],
      q: ['The property that sets text colour is ___.', '___: red;', 'color'] },
    { i: 'css-backgrounds', t: 'Backgrounds',
      x: `<p>Backgrounds can be a colour, an image, or a smooth <strong>gradient</strong>. Useful properties: <code>background-color</code>, <code>background-image</code>, <code>background-size</code> (<code>cover</code> fills the box), <code>background-repeat</code> and <code>background-position</code>.</p>`,
      e: [['Gradient background', `<div style="height:140px;border-radius:12px;color:white;display:grid;place-items:center;
  background:linear-gradient(135deg,#0B6E4F,#3A86FF);">
  <h2>Gradient!</h2>
</div>`]],
      q: ['A gradient is created with linear-___().', 'background: linear-___(red, blue);', 'gradient'] },
    { i: 'css-borders', t: 'Borders & Rounded Corners',
      x: `<p><code>border</code> is shorthand for width, style and colour: <code>border: 2px solid green;</code>. Styles include <code>solid</code>, <code>dashed</code>, <code>dotted</code> and <code>double</code>. Round corners with <code>border-radius</code> — use <code>50%</code> for circles. <code>box-shadow</code> adds depth.</p>`,
      e: [['Borders, radius and shadow', `<div style="border:3px dashed #0B6E4F;padding:12px;margin:8px">Dashed border</div>
<div style="border:2px solid #3A86FF;border-radius:16px;padding:12px;margin:8px;box-shadow:0 6px 16px rgba(0,0,0,.2)">Rounded with a shadow</div>
<div style="width:80px;height:80px;background:#EF476F;border-radius:50%;margin:8px"></div>`]],
      q: ['Use border-___ to round the corners of a box.', 'border-___: 12px;', 'radius'] },
    { i: 'css-box-model', t: 'Margin, Padding & Box Model',
      x: `<p>Every element is a box made of four layers, from inside out: <strong>content</strong>, <strong>padding</strong> (space inside the border), <strong>border</strong>, and <strong>margin</strong> (space outside). Set <code>box-sizing: border-box</code> so <code>width</code> includes padding and border — it makes sizing far easier. Use <code>margin: 0 auto</code> to centre a block with a set width.</p>`,
      e: [['Padding, border and margin', `<style>
  * { box-sizing: border-box; }
  .box { width: 240px; padding: 20px; border: 6px solid #0B6E4F;
         margin: 20px auto; background: #E4F3EC; }
</style>
<div class="box">Centred box: 240px wide including padding and border.</div>`]],
      q: ['Space INSIDE the border is called ___.', '___: 20px;', 'padding'] }
  ]);
  add('css', 'Text & Fonts', [
    { i: 'css-text', t: 'Text Styling',
      x: `<p>Style text with <code>text-align</code>, <code>text-decoration</code> (underlines), <code>text-transform</code> (uppercase), <code>letter-spacing</code>, <code>line-height</code> (space between lines) and <code>text-shadow</code>.</p>`,
      e: [['Text properties', `<style>
  h2 { text-align:center; text-transform:uppercase; letter-spacing:3px; text-shadow:2px 2px 4px #aaa; }
  p  { line-height:1.8; }
  a  { text-decoration:none; border-bottom:2px solid #0B6E4F; }
</style>
<h2>Styled title</h2>
<p>Line height makes paragraphs easier to read. <a href="#">A link</a></p>`]],
      q: ['Use text-___: uppercase to make text capital letters.', 'text-___: uppercase;', 'transform'] },
    { i: 'css-fonts', t: 'Fonts',
      x: `<p><code>font-family</code> takes a list — the browser uses the first one available, so end with a generic family like <code>sans-serif</code>. Also use <code>font-size</code>, <code>font-weight</code> and <code>font-style</code>. You can load free web fonts (for example from Google Fonts) with a <code>&lt;link&gt;</code> tag.</p>`,
      e: [['Font families and sizes', `<p style="font-family:Georgia,serif;font-size:22px">Serif: Georgia</p>
<p style="font-family:'Courier New',monospace;font-size:20px">Monospace: Courier</p>
<p style="font-family:Arial,sans-serif;font-weight:bold">Bold sans-serif</p>
<p style="font-style:italic;font-size:1.4rem">Italic, 1.4rem</p>`]],
      q: ['The property that picks a typeface is font-___.', 'font-___: Arial, sans-serif;', 'family'] }
  ]);
  add('css', 'Layout', [
    { i: 'css-display', t: 'Display & Position',
      x: `<p><code>display</code> decides how an element behaves: <code>block</code>, <code>inline</code>, <code>inline-block</code>, <code>none</code> (hidden), <code>flex</code> or <code>grid</code>. <code>position</code> moves elements: <code>relative</code> (nudge from its normal place), <code>absolute</code> (place inside the nearest positioned parent), <code>fixed</code> (stay on screen) and <code>sticky</code> (stick while scrolling).</p>`,
      e: [['Absolute inside relative', `<style>
  .parent { position:relative; height:140px; background:#E4F3EC; border-radius:10px; }
  .badge  { position:absolute; top:10px; right:10px; background:#EF476F; color:#fff; padding:4px 10px; border-radius:999px; }
</style>
<div class="parent">Parent box <span class="badge">NEW</span></div>`]],
      q: ['To hide an element completely use display: ___;', 'display: ___;', 'none'] },
    { i: 'css-flexbox', t: 'Flexbox',
      x: `<p>Flexbox lays items out in a row or column and makes alignment easy. Put <code>display:flex</code> on the <em>container</em>. Then use <code>justify-content</code> (along the main axis), <code>align-items</code> (across), <code>gap</code> (spacing), <code>flex-wrap</code> and <code>flex-direction</code>.</p>`,
      e: [['A centred flex row', `<style>
  .row { display:flex; justify-content:space-between; align-items:center; gap:10px;
         background:#E4F3EC; padding:12px; border-radius:10px; }
  .item { background:#0B6E4F; color:#fff; padding:14px 22px; border-radius:8px; }
</style>
<div class="row"><div class="item">One</div><div class="item">Two</div><div class="item">Three</div></div>`]],
      q: ['Turn on Flexbox with display: ___;', 'display: ___;', 'flex'] },
    { i: 'css-grid', t: 'Grid',
      x: `<p>CSS Grid arranges items in rows <em>and</em> columns at once. Use <code>display:grid</code> and <code>grid-template-columns</code>. The <code>fr</code> unit shares free space; <code>repeat(auto-fit, minmax(140px, 1fr))</code> makes a card grid that adapts to any screen width with no media queries.</p>`,
      e: [['A responsive card grid', `<style>
  .grid { display:grid; gap:10px; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); }
  .grid div { background:#3A86FF; color:#fff; padding:24px 10px; text-align:center; border-radius:10px; }
</style>
<div class="grid"><div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div></div>
<p>Resize the result panel and watch the columns change.</p>`]],
      q: ['Turn on Grid with display: ___;', 'display: ___;', 'grid'] }
  ]);
  add('css', 'Effects & Responsive', [
    { i: 'css-transitions', t: 'Transitions & Transforms',
      x: `<p><code>transition</code> animates a property change smoothly (for example on hover). <code>transform</code> moves, rotates or scales an element with <code>translate()</code>, <code>rotate()</code> and <code>scale()</code> without disturbing the layout.</p>`,
      e: [['Hover me', `<style>
  .btn { display:inline-block; padding:14px 26px; background:#0B6E4F; color:#fff; border-radius:10px;
         transition:transform .25s, background .25s; cursor:pointer; }
  .btn:hover { transform:translateY(-4px) scale(1.08); background:#3A86FF; }
</style>
<div class="btn">Hover over this button</div>`]],
      q: ['Smooth changes between states use the ___ property.', '___: all 0.3s;', 'transition'] },
    { i: 'css-animations', t: 'Animations',
      x: `<p>Animations run on their own. First describe the steps with <code>@keyframes</code>, then attach it with <code>animation</code> (name, duration, timing, repeat count).</p>`,
      e: [['A bouncing ball', `<style>
  @keyframes bounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-80px); } }
  .ball { width:60px; height:60px; background:#EF476F; border-radius:50%; margin:90px auto 10px;
          animation:bounce 1s ease-in-out infinite; }
</style>
<div class="ball"></div>`]],
      q: ['Animation steps are defined with @___.', '@___ move { from{} to{} }', 'keyframes'] },
    { i: 'css-media', t: 'Media Queries & Responsive Design',
      x: `<p>Responsive design makes a page work on phones, tablets and desktops. Start with the viewport meta tag, use flexible units (<code>%</code>, <code>rem</code>, <code>fr</code>), and use <strong>media queries</strong> to change styles at certain widths: <code>@media (max-width: 600px) { ... }</code>. Design for small screens first, then add rules for bigger ones.</p>`,
      e: [['Changes colour on narrow screens', `<style>
  .box { padding:20px; background:#0B6E4F; color:#fff; text-align:center; border-radius:10px; }
  @media (max-width: 500px) { .box { background:#EF476F; } .box::after { content:" (narrow!)"; } }
</style>
<div class="box">Resize the result panel narrower than 500px.</div>`]],
      q: ['A media query begins with @___.', '@___ (max-width: 600px) { }', 'media'] },
    { i: 'css-variables', t: 'CSS Variables',
      x: `<p>Custom properties store values you reuse. Define them with two dashes on <code>:root</code> and read them with <code>var()</code>. Change one variable and the whole page updates — this is how light and dark themes are made.</p>`,
      e: [['A one-line theme change', `<style>
  :root { --brand:#0B6E4F; --radius:14px; }
  .card { background:var(--brand); color:#fff; padding:20px; border-radius:var(--radius); }
  .card.alt { --brand:#7B61FF; margin-top:10px; }
</style>
<div class="card">Uses the default brand colour</div>
<div class="card alt">Overrides the variable</div>`]],
      q: ['A CSS variable is read with the ___() function.', 'color: ___(--brand);', 'var'] }
  ]);

  /* ========================================================== JavaScript */
  add('javascript', 'Getting Started', [
    { i: 'js-intro', t: 'JavaScript Introduction',
      x: `<p><strong>JavaScript</strong> is the programming language of the web. It runs in the browser and lets a page react: validate forms, update content, animate, load data, and play games. Add it inside <code>&lt;script&gt;</code> tags or in an external <code>.js</code> file.</p>
<p>In the editor, plain JavaScript runs directly — use <code>console.log()</code> to see results in the Console below the page.</p>`,
      e: [['Your first program', `console.log("Hello, Smart21Code!");
console.log(2 + 3);`], ['JavaScript changing HTML', `<h2 id="demo">Click the button</h2>
<button onclick="document.getElementById('demo').textContent = 'Changed by JavaScript!'">Change it</button>`]],
      q: ['Show a message in the console with console.___("Hi").', 'console.___("Hi");', 'log'] },
    { i: 'js-output', t: 'JavaScript Output',
      x: `<p>JavaScript can show results in four ways: write into an HTML element with <code>innerHTML</code> or <code>textContent</code>, write into the page with <code>document.write()</code> (for tests only), show a pop-up with <code>alert()</code>, or print to the debug console with <code>console.log()</code>. Developers use <code>console.log()</code> the most.</p>`,
      e: [['Three ways to output', `console.log("Shown in the console");
document.write("<p>Written into the page</p>");
console.warn("A warning message");`]],
      q: ['To write into an element, set its ___.textContent.', 'element.___ = "Hi";', 'textContent'] },
    { i: 'js-syntax', t: 'Syntax & Comments',
      x: `<p>A program is a list of <em>statements</em>, usually one per line, ending with a semicolon. JavaScript is <strong>case-sensitive</strong> (<code>Name</code> and <code>name</code> are different). Comments are ignored by the computer: <code>// one line</code> and <code>/* many lines */</code>. Use camelCase for names: <code>firstName</code>.</p>`,
      e: [['Statements and comments', `// This is a comment
let firstName = "Amina";   // camelCase name
/* A comment
   over two lines */
console.log(firstName);`]],
      q: ['A one-line comment starts with ___.', '___ this is a comment', '//'] }
  ]);
  add('javascript', 'Variables & Data', [
    { i: 'js-variables', t: 'Variables',
      x: `<p>Variables store data. Use <code>let</code> for values that change and <code>const</code> for values that must not be reassigned. Avoid the old <code>var</code>. Names must start with a letter, <code>_</code> or <code>$</code> and cannot be reserved words.</p>`,
      e: [['let and const', `let score = 10;
score = score + 5;
const pi = 3.14159;
console.log("Score:", score);
console.log("Pi:", pi);
// pi = 3;  <- would cause an error`]],
      q: ['Declare a value that never changes with ___.', '___ pi = 3.14;', 'const'] },
    { i: 'js-datatypes', t: 'Data Types',
      x: `<p>Main data types: <strong>string</strong> (text), <strong>number</strong>, <strong>boolean</strong> (<code>true</code>/<code>false</code>), <strong>undefined</strong>, <strong>null</strong>, <strong>object</strong> (including arrays), and <strong>bigint</strong>. Use <code>typeof</code> to check a value's type. JavaScript is dynamically typed — the same variable can hold different types.</p>`,
      e: [['Checking types', `console.log(typeof "Hello");
console.log(typeof 42);
console.log(typeof true);
console.log(typeof undefined);
console.log(typeof [1, 2, 3]);
console.log(typeof { name: "Amina" });`]],
      q: ['Find out the type of a value with the ___ operator.', '___ 42', 'typeof'] },
    { i: 'js-operators', t: 'Operators',
      x: `<p>Arithmetic: <code>+ - * / % **</code>. Assignment: <code>= += -=</code>. Comparison: <code>== === != !== &gt; &lt; &gt;= &lt;=</code>. Logical: <code>&amp;&amp; || !</code>. Prefer <code>===</code> (strict equality): it checks value <em>and</em> type, so <code>5 === "5"</code> is false.</p>`,
      e: [['Common operators', `console.log(10 % 3);        // remainder: 1
console.log(2 ** 5);        // power: 32
console.log(5 == "5");      // true (loose)
console.log(5 === "5");     // false (strict)
console.log(true && false); // false
console.log(true || false); // true`]],
      q: ['The strict equality operator is ___.', '5 ___ "5"', '==='] },
    { i: 'js-strings', t: 'Strings',
      x: `<p>Strings are text in single quotes, double quotes or backticks. <strong>Template literals</strong> (backticks) let you insert values with <code>\${}</code>. Handy methods: <code>length</code>, <code>toUpperCase()</code>, <code>slice()</code>, <code>includes()</code>, <code>replace()</code>, <code>split()</code>, <code>trim()</code>.</p>`,
      e: [['String methods', `const name = "  Smart21Brain  ";
console.log(name.trim().toUpperCase());
console.log(name.trim().length);
console.log(name.includes("21"));
console.log("a,b,c".split(","));
console.log("Hello " + "World");`]],
      q: ['Get how many characters a string has with its ___ property.', '"hello".___', 'length'] },
    { i: 'js-numbers', t: 'Numbers & Math',
      x: `<p>All numbers are one type. <code>toFixed(2)</code> rounds for display. Convert text with <code>Number("42")</code> or <code>parseInt()</code>. The <code>Math</code> object gives <code>round</code>, <code>floor</code>, <code>ceil</code>, <code>max</code>, <code>min</code>, <code>sqrt</code> and <code>random</code>.</p>`,
      e: [['Math helpers', `console.log(Math.round(4.6));
console.log(Math.max(3, 9, 5));
console.log(Math.sqrt(64));
console.log((3.14159).toFixed(2));
// random whole number 1 to 6
console.log(Math.floor(Math.random() * 6) + 1);`]],
      q: ['Round a number to the nearest whole number with Math.___().', 'Math.___(4.6)', 'round'] }
  ]);
  add('javascript', 'Control Flow', [
    { i: 'js-conditionals', t: 'If / Else',
      x: `<p>Conditions run code only when something is true. Use <code>if</code>, <code>else if</code> and <code>else</code>. The short form <code>condition ? a : b</code> (ternary) picks between two values.</p>`,
      e: [['Grade checker', `let score = 72;
if (score >= 80) {
  console.log("Grade A");
} else if (score >= 60) {
  console.log("Grade B");
} else {
  console.log("Keep practising!");
}
console.log(score >= 50 ? "Pass" : "Fail");`]],
      q: ['Code that runs when the if condition is false goes in ___.', 'if (x) { } ___ { }', 'else'] },
    { i: 'js-switch', t: 'Switch',
      x: `<p><code>switch</code> compares one value against many cases. Each case ends with <code>break</code> or execution "falls through" to the next. <code>default</code> runs when nothing matches.</p>`,
      e: [['Day of the week', `let day = 3;
switch (day) {
  case 1: console.log("Monday"); break;
  case 2: console.log("Tuesday"); break;
  case 3: console.log("Wednesday"); break;
  default: console.log("Another day");
}`]],
      q: ['End each switch case with ___ to stop fall-through.', 'case 1: console.log("a"); ___;', 'break'] },
    { i: 'js-loops', t: 'Loops',
      x: `<p>Loops repeat code. <code>for</code> is best when you know the count, <code>while</code> repeats while a condition is true, and <code>for...of</code> walks through an array. Use <code>break</code> to leave early and <code>continue</code> to skip one turn.</p>`,
      e: [['Three loops', `for (let i = 1; i <= 5; i++) {
  console.log("Count " + i);
}
let n = 3;
while (n > 0) { console.log("n is " + n); n--; }
for (const fruit of ["mango", "banana", "kiwi"]) {
  console.log(fruit);
}`]],
      q: ['A loop that walks through every item of an array is for...___.', 'for (const x ___ list) { }', 'of'] }
  ]);
  add('javascript', 'Functions & Data Structures', [
    { i: 'js-functions', t: 'Functions',
      x: `<p>A function is a reusable block of code. It can take <strong>parameters</strong> and <code>return</code> a result. Call it with parentheses. <strong>Arrow functions</strong> are a shorter form: <code>(a, b) =&gt; a + b</code>.</p>`,
      e: [['Declaring and calling', `function greet(name) {
  return "Hello, " + name + "!";
}
const square = (n) => n * n;
console.log(greet("Amina"));
console.log(square(9));`]],
      q: ['A function sends a value back with the ___ keyword.', 'function f() { ___ 5; }', 'return'] },
    { i: 'js-arrays', t: 'Arrays',
      x: `<p>An array holds an ordered list. Index numbers start at <strong>0</strong>. Use <code>push</code>/<code>pop</code> (end), <code>unshift</code>/<code>shift</code> (start), <code>length</code>, <code>indexOf</code>, <code>slice</code>, <code>join</code>, and <code>sort</code>.</p>`,
      e: [['Working with an array', `const fruits = ["mango", "banana"];
fruits.push("kiwi");
console.log(fruits);
console.log(fruits[0]);
console.log(fruits.length);
console.log(fruits.join(" & "));
console.log(fruits.sort());`]],
      q: ['The first item of an array is at index ___.', 'list[___]', '0'] },
    { i: 'js-array-methods', t: 'Array Methods: map, filter, reduce',
      x: `<p>These methods process every item without writing a loop: <code>map</code> transforms each item into a new array, <code>filter</code> keeps items that pass a test, <code>reduce</code> combines all items into one value, and <code>find</code> returns the first match. They never change the original array.</p>`,
      e: [['map, filter and reduce', `const scores = [45, 78, 92, 60];
console.log(scores.map(s => s + 5));
console.log(scores.filter(s => s >= 60));
console.log(scores.reduce((sum, s) => sum + s, 0));
console.log(scores.find(s => s > 70));`]],
      q: ['Keep only items that pass a test using the ___ method.', 'list.___(x => x > 5)', 'filter'] },
    { i: 'js-objects', t: 'Objects',
      x: `<p>Objects group related data as <strong>key: value</strong> pairs. Read values with <code>obj.key</code> or <code>obj["key"]</code>. A function inside an object is a <em>method</em>, and <code>this</code> refers to the object. <code>Object.keys()</code> and <code>Object.entries()</code> list contents.</p>`,
      e: [['A student object', `const student = {
  name: "Amina",
  grade: "A",
  scores: [91, 88],
  intro() { return "I am " + this.name; }
};
console.log(student.name);
console.log(student.intro());
console.log(Object.keys(student));`]],
      q: ['Read the "name" property of user using user___name.', 'user___name', '.'] }
  ]);
  add('javascript', 'The Browser (DOM)', [
    { i: 'js-dom', t: 'DOM: Selecting & Changing',
      x: `<p>The <strong>DOM</strong> is the page as a tree of objects JavaScript can change. Find elements with <code>document.getElementById()</code> or <code>document.querySelector()</code> (any CSS selector), then change <code>textContent</code>, <code>style</code>, <code>classList</code> or attributes.</p>`,
      e: [['Change text and style', `<h2 id="title">Original title</h2>
<p class="note">A paragraph</p>
<script>
  const title = document.getElementById("title");
  title.textContent = "Changed with JavaScript";
  title.style.color = "#0B6E4F";
  document.querySelector(".note").classList.add("done");
</script>`]],
      q: ['Find the first element that matches a CSS selector with document.___().', 'document.___(".box")', 'querySelector'] },
    { i: 'js-events', t: 'Events',
      x: `<p>Events are things that happen on the page: clicks, key presses, typing, form submits. Attach a listener with <code>element.addEventListener("click", function)</code>. The function receives an <em>event object</em> (<code>e.target</code>, <code>e.key</code>...).</p>`,
      e: [['A click counter', `<button id="btn">Clicked 0 times</button>
<script>
  let count = 0;
  const btn = document.getElementById("btn");
  btn.addEventListener("click", () => {
    count++;
    btn.textContent = "Clicked " + count + " times";
  });
</script>`]],
      q: ['Attach a click handler with addEventListener("___", fn).', 'btn.addEventListener("___", fn)', 'click'] },
    { i: 'js-forms', t: 'Forms & Validation',
      x: `<p>JavaScript can read what a visitor typed with <code>input.value</code> and stop a form from sending with <code>e.preventDefault()</code>. Always check the data and show a friendly message. (Remember: checks in the browser help users, but a server must check again.)</p>`,
      e: [['A simple age check', `<input id="age" type="number" placeholder="Your age">
<button id="go">Check</button>
<p id="msg"></p>
<script>
  document.getElementById("go").addEventListener("click", () => {
    const age = Number(document.getElementById("age").value);
    document.getElementById("msg").textContent =
      age >= 18 ? "Adult" : age > 0 ? "Under 18" : "Please enter your age";
  });
</script>`]],
      q: ['Read text typed in an input with input.___.', 'input.___', 'value'] }
  ]);
  add('javascript', 'Modern JavaScript', [
    { i: 'js-json', t: 'JSON',
      x: `<p>JSON is a text format for sending data. <code>JSON.stringify(obj)</code> turns an object into text, and <code>JSON.parse(text)</code> turns text back into an object. It looks like a JavaScript object, but keys must use double quotes.</p>`,
      e: [['Converting to and from JSON', `const student = { name: "Amina", scores: [91, 88] };
const text = JSON.stringify(student);
console.log(text);
const back = JSON.parse(text);
console.log(back.name);`]],
      q: ['Turn JSON text into an object with JSON.___().', 'JSON.___(text)', 'parse'] },
    { i: 'js-dates', t: 'Dates',
      x: `<p>Create a date with <code>new Date()</code> (now) or <code>new Date("2026-05-20")</code>. Read parts with <code>getFullYear()</code>, <code>getMonth()</code> (0–11!), <code>getDate()</code>, <code>getDay()</code>. <code>toLocaleDateString()</code> formats a date for the visitor's country.</p>`,
      e: [['Working with dates', `const d = new Date("2026-05-20");
console.log(d.getFullYear());
console.log(d.getMonth() + 1);
console.log(d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }));`]],
      q: ['The current date and time is created with new ___().', 'new ___()', 'Date'] },
    { i: 'js-errors', t: 'Errors: try / catch',
      x: `<p>When something goes wrong JavaScript throws an error and stops. Wrap risky code in <code>try</code> and handle problems in <code>catch</code>; <code>finally</code> always runs. You can create your own with <code>throw new Error("message")</code>.</p>`,
      e: [['Catching a problem', `try {
  JSON.parse("{ broken json");
} catch (err) {
  console.log("Caught:", err.name);
} finally {
  console.log("Always runs");
}`]],
      q: ['Code that handles an error goes in the ___ block.', 'try { } ___ (e) { }', 'catch'] },
    { i: 'js-async', t: 'Promises, async & fetch',
      x: `<p>Some work takes time (loading data, timers). A <strong>Promise</strong> represents a result that will arrive later. With <code>async</code>/<code>await</code> you write that code like normal steps. <code>fetch(url)</code> loads data from the internet and returns a promise.</p>`,
      e: [['Waiting for a timer', `const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function run() {
  console.log("Start");
  await wait(1000);
  console.log("One second later");
}
run();`]],
      q: ['Pause inside an async function using the ___ keyword.', 'async function f() { ___ wait(); }', 'await'] },
    { i: 'js-classes', t: 'Classes',
      x: `<p>A class is a blueprint for making objects. The <code>constructor</code> sets up each new object, and methods share behaviour. Create instances with <code>new</code>. Use <code>extends</code> to build a class on top of another.</p>`,
      e: [['A Student class', `class Student {
  constructor(name) { this.name = name; this.points = 0; }
  addPoints(n) { this.points += n; return this; }
  describe() { return this.name + " has " + this.points + " points"; }
}
const s = new Student("Juma");
s.addPoints(10).addPoints(5);
console.log(s.describe());`]],
      q: ['Create an object from a class with the ___ keyword.', 'const s = ___ Student();', 'new'] }
  ]);
})(window.S21C);
