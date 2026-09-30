/* Smart21Code — lesson data: Bootstrap, jQuery and React (all run live in the editor).
   All lesson text and examples are original Smart21Brain content.
   Lesson shape: { i:id, g:group, t:title, x:explanation(html), e:[[caption, code], ...], q:[prompt, template-with-___, answer] } */
window.S21C = window.S21C || { langs: [], lessons: {}, refs: {} };
(function (S) {
  var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
  var BS_CSS = CDN + 'twitter-bootstrap/5.3.3/css/bootstrap.min.css';
  var BS_JS = CDN + 'twitter-bootstrap/5.3.3/js/bootstrap.bundle.min.js';
  var JQ = CDN + 'jquery/3.7.1/jquery.min.js';
  var RX = CDN + 'react/18.2.0/umd/react.development.js';
  var RXDOM = CDN + 'react-dom/18.2.0/umd/react-dom.development.js';
  var BABEL = CDN + 'babel-standalone/7.23.9/babel.min.js';

  S.langs.push(
    { id: 'bootstrap', name: 'Bootstrap', color: '#7952B3', icon: 'fa-bootstrap', tag: 'Build responsive pages fast', mode: 'htmlmixed', run: 'web' },
    { id: 'jquery', name: 'jQuery', color: '#0769AD', icon: 'fa-bolt', tag: 'Write less, do more', mode: 'htmlmixed', run: 'web' },
    { id: 'react', name: 'React', color: '#149ECA', icon: 'fa-react', tag: 'Build interfaces from components', mode: 'htmlmixed', run: 'web' }
  );

  function add(lang, group, list) {
    S.lessons[lang] = S.lessons[lang] || [];
    list.forEach(function (l) { l.g = group; S.lessons[lang].push(l); });
  }

  /* Complete pages, so every example is ready to run */
  function bs(body, js, head) {
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <link href="' + BS_CSS + '" rel="stylesheet">\n' + (head ? head + '\n' : '') + '</head>\n<body>\n' + body + '\n' + (js ? '<script src="' + BS_JS + '"></script>\n' : '') + '</body>\n</html>';
  }
  function jq(body, script, head) {
    return '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <script src="' + JQ + '"></script>\n' + (head ? head + '\n' : '') + '</head>\n<body>\n' + body + '\n\n<script>\n' + script + '\n</script>\n</body>\n</html>';
  }
  function rx(jsx, head) {
    return '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <script src="' + RX + '"></script>\n  <script src="' + RXDOM + '"></script>\n  <script src="' + BABEL + '"></script>\n' + (head ? head + '\n' : '') + '</head>\n<body>\n<div id="root"></div>\n\n<script type="text/babel">\n' + jsx + '\n</script>\n</body>\n</html>';
  }

  /* ============================================================ BOOTSTRAP */
  add('bootstrap', 'Getting Started', [
    { i: 'bs-intro', t: 'Bootstrap Introduction',
      x: '<p><strong>Bootstrap</strong> is a free collection of ready-made CSS (and a little JavaScript) that helps you build good-looking, mobile-friendly pages quickly. Instead of writing all the CSS yourself, you add <em>class names</em> to your HTML.</p><p>To use it, link the Bootstrap stylesheet in the <code>&lt;head&gt;</code> of your page. Also add the <code>viewport</code> meta tag so the page scales properly on phones.</p><ul><li>Works with plain HTML — no install needed when you use a CDN link</li><li>Mobile-first: designed for small screens, then grows to big ones</li><li>Includes buttons, forms, cards, menus, alerts and much more</li></ul>',
      e: [['Your first Bootstrap page', bs('<div class="container mt-4">\n  <h1 class="text-primary">Hello, Bootstrap!</h1>\n  <p>This page is styled by adding classes.</p>\n  <button class="btn btn-success">A green button</button>\n</div>')]],
      q: ['Bootstrap styles are applied by adding ___ names to HTML elements.', '<button ___="btn btn-primary">', 'class'] },
    { i: 'bs-containers', t: 'Containers',
      x: '<p>A <strong>container</strong> holds your page content and centres it with some side padding. Bootstrap has two main kinds:</p><ul><li><code>.container</code> — fixed width that changes at each screen size</li><li><code>.container-fluid</code> — always 100% wide</li></ul><p>Almost every Bootstrap layout starts with a container.</p>',
      e: [['Fixed and full-width containers', bs('<div class="container bg-light border p-3 mb-3">\n  .container — fixed width, centred\n</div>\n<div class="container-fluid bg-warning-subtle border p-3">\n  .container-fluid — full width\n</div>')]],
      q: ['A container that is always 100% wide is called container-___.', '<div class="container-___">', 'fluid'] }
  ]);
  add('bootstrap', 'Layout', [
    { i: 'bs-grid', t: 'The Grid System',
      x: '<p>Bootstrap\'s layout uses a <strong>12-column grid</strong>. Put a <code>.row</code> inside a container, then put <code>.col</code> elements inside the row.</p><ul><li><code>.col</code> — equal-width columns that share the row</li><li><code>.col-4</code> — a column that takes 4 of the 12 parts</li><li>Columns in one row that add up to more than 12 wrap onto a new line</li></ul>',
      e: [['Equal and fixed-width columns', bs('<div class="container mt-3">\n  <div class="row mb-3 text-center">\n    <div class="col bg-primary text-white p-3">col</div>\n    <div class="col bg-primary text-white p-3">col</div>\n    <div class="col bg-primary text-white p-3">col</div>\n  </div>\n  <div class="row text-center">\n    <div class="col-8 bg-success text-white p-3">col-8</div>\n    <div class="col-4 bg-danger text-white p-3">col-4</div>\n  </div>\n</div>')]],
      q: ['The Bootstrap grid has ___ columns in total.', 'The grid has ___ columns', '12'] },
    { i: 'bs-responsive', t: 'Responsive Columns',
      x: '<p>Add a <strong>breakpoint</strong> to the class name to change the layout at different screen widths:</p><ul><li><code>col-sm-</code> from 576px wide</li><li><code>col-md-</code> from 768px</li><li><code>col-lg-</code> from 992px</li><li><code>col-xl-</code> from 1200px</li></ul><p>A column with no breakpoint applies at every size. Below the breakpoint, columns stack on top of each other. Drag the divider in the editor to watch it change.</p>',
      e: [['Stacked on phones, three across on laptops', bs('<div class="container mt-3">\n  <div class="row text-center">\n    <div class="col-12 col-md-6 col-lg-4 p-3 bg-info-subtle border">One</div>\n    <div class="col-12 col-md-6 col-lg-4 p-3 bg-info-subtle border">Two</div>\n    <div class="col-12 col-md-12 col-lg-4 p-3 bg-info-subtle border">Three</div>\n  </div>\n</div>')]],
      q: ['Columns that start side by side at 768px use the ___ breakpoint.', 'col-___-6', 'md'] },
    { i: 'bs-spacing', t: 'Spacing',
      x: '<p>Spacing classes add margin or padding without writing CSS. The pattern is <code>{property}{side}-{size}</code>:</p><ul><li>property: <code>m</code> = margin, <code>p</code> = padding</li><li>side: <code>t</code> top, <code>b</code> bottom, <code>s</code> start (left), <code>e</code> end (right), <code>x</code> left and right, <code>y</code> top and bottom — leave it out for all sides</li><li>size: <code>0</code> to <code>5</code> (bigger number = more space), or <code>auto</code></li></ul>',
      e: [['Margin and padding helpers', bs('<div class="container">\n  <div class="bg-light border p-4 mt-3">p-4 and mt-3</div>\n  <div class="bg-light border px-5 py-1 mt-3">px-5 and py-1</div>\n  <div class="bg-light border p-2 mt-5 mb-5">mt-5 and mb-5</div>\n  <div class="bg-light border w-50 mx-auto p-2 text-center">mx-auto centres a block</div>\n</div>')]],
      q: ['Padding on the top and bottom only is written p___-3.', 'class="p___-3"', 'y'] },
    { i: 'bs-flex', t: 'Flex Utilities',
      x: '<p>Turn any element into a flexible row with <code>.d-flex</code>. Then position the children:</p><ul><li><code>justify-content-between</code> / <code>center</code> / <code>end</code> — along the main axis</li><li><code>align-items-center</code> — up and down</li><li><code>flex-column</code> — stack vertically</li><li><code>gap-3</code> — space between items</li></ul>',
      e: [['Centre and spread items', bs('<div class="container mt-3">\n  <div class="d-flex justify-content-between align-items-center bg-light border p-3 mb-3">\n    <strong>Logo</strong>\n    <button class="btn btn-primary btn-sm">Sign in</button>\n  </div>\n  <div class="d-flex justify-content-center gap-3 bg-light border p-3">\n    <span class="badge bg-secondary">One</span>\n    <span class="badge bg-secondary">Two</span>\n    <span class="badge bg-secondary">Three</span>\n  </div>\n</div>')]],
      q: ['Make an element a flex container with d-___.', 'class="d-___"', 'flex'] }
  ]);
  add('bootstrap', 'Content & Style', [
    { i: 'bs-typography', t: 'Typography',
      x: '<p>Bootstrap gives all text a clean default look. Useful helpers:</p><ul><li><code>.display-1</code> to <code>.display-6</code> — extra-large headings</li><li><code>.lead</code> — a larger intro paragraph</li><li><code>.fw-bold</code>, <code>.fst-italic</code>, <code>.text-uppercase</code></li><li><code>.text-center</code>, <code>.text-end</code> — alignment</li></ul>',
      e: [['Headings and text helpers', bs('<div class="container mt-3">\n  <h1 class="display-4">Display heading</h1>\n  <p class="lead">A lead paragraph stands out from the rest.</p>\n  <p class="fw-bold">Bold text</p>\n  <p class="fst-italic">Italic text</p>\n  <p class="text-uppercase">uppercase text</p>\n  <p class="text-center">Centred text</p>\n</div>')]],
      q: ['Centre text with the text-___ class.', 'class="text-___"', 'center'] },
    { i: 'bs-colors', t: 'Colours',
      x: '<p>Bootstrap has a set of meaningful colours: <code>primary</code>, <code>secondary</code>, <code>success</code>, <code>danger</code>, <code>warning</code>, <code>info</code>, <code>light</code> and <code>dark</code>.</p><ul><li><code>text-danger</code> colours the text</li><li><code>bg-success</code> colours the background</li><li><code>border-primary</code> colours a border (with <code>.border</code>)</li></ul>',
      e: [['Text and background colours', bs('<div class="container mt-3">\n  <p class="text-primary">text-primary</p>\n  <p class="text-danger">text-danger</p>\n  <p class="bg-success text-white p-2">bg-success with white text</p>\n  <p class="bg-warning p-2">bg-warning</p>\n  <p class="bg-dark text-white p-2">bg-dark</p>\n  <p class="border border-primary border-3 p-2">border-primary</p>\n</div>')]],
      q: ['A green background uses the class bg-___.', 'class="bg-___"', 'success'] },
    { i: 'bs-buttons', t: 'Buttons',
      x: '<p>Start with <code>.btn</code>, then add a colour class like <code>.btn-primary</code>. Use <code>.btn-outline-*</code> for an outlined look, <code>.btn-lg</code> or <code>.btn-sm</code> for size, and <code>.w-100</code> for a full-width button. Button classes work on <code>&lt;button&gt;</code>, <code>&lt;a&gt;</code> and <code>&lt;input&gt;</code>.</p>',
      e: [['Button styles and sizes', bs('<div class="container mt-3">\n  <button class="btn btn-primary">Primary</button>\n  <button class="btn btn-success">Success</button>\n  <button class="btn btn-danger">Danger</button>\n  <button class="btn btn-outline-dark">Outline</button>\n  <a href="#" class="btn btn-link">Link style</a>\n  <div class="mt-3">\n    <button class="btn btn-primary btn-lg">Large</button>\n    <button class="btn btn-primary btn-sm">Small</button>\n  </div>\n  <button class="btn btn-warning w-100 mt-3">Full width</button>\n</div>')]],
      q: ['Every Bootstrap button starts with the ___ class.', 'class="___ btn-primary"', 'btn'] },
    { i: 'bs-tables', t: 'Tables',
      x: '<p>Add <code>.table</code> to a table for clean spacing. Extras: <code>.table-striped</code> (zebra rows), <code>.table-hover</code> (highlight on hover), <code>.table-bordered</code> and <code>.table-dark</code>. Wrap wide tables in <code>.table-responsive</code> so they scroll on small screens instead of breaking the page.</p>',
      e: [['A striped, hoverable table', bs('<div class="container mt-3">\n  <div class="table-responsive">\n    <table class="table table-striped table-hover">\n      <thead class="table-dark">\n        <tr><th>#</th><th>Name</th><th>Score</th></tr>\n      </thead>\n      <tbody>\n        <tr><td>1</td><td>Amina</td><td>91</td></tr>\n        <tr><td>2</td><td>Juma</td><td>78</td></tr>\n        <tr><td>3</td><td>Zawadi</td><td>96</td></tr>\n      </tbody>\n    </table>\n  </div>\n</div>')]],
      q: ['Zebra-striped rows come from table-___.', 'class="table table-___"', 'striped'] },
    { i: 'bs-forms', t: 'Forms',
      x: '<p>Give inputs the <code>.form-control</code> class and pair each with a <code>.form-label</code>. Use <code>.form-select</code> for dropdowns, <code>.form-check</code> for checkboxes and radios, and <code>.mb-3</code> to space the fields apart. Use <code>.form-control-lg</code> for bigger fields.</p>',
      e: [['A sign-up form', bs('<div class="container mt-3" style="max-width:420px">\n  <form>\n    <div class="mb-3">\n      <label class="form-label" for="em">Email</label>\n      <input type="email" class="form-control" id="em" placeholder="you@example.com">\n    </div>\n    <div class="mb-3">\n      <label class="form-label" for="gr">Grade</label>\n      <select class="form-select" id="gr">\n        <option>Grade 4</option>\n        <option>Grade 5</option>\n        <option>Grade 6</option>\n      </select>\n    </div>\n    <div class="form-check mb-3">\n      <input class="form-check-input" type="checkbox" id="ok">\n      <label class="form-check-label" for="ok">I agree</label>\n    </div>\n    <button type="submit" class="btn btn-primary">Sign up</button>\n  </form>\n</div>')]],
      q: ['Style a text box with the form-___ class.', 'class="form-___"', 'control'] }
  ]);
  add('bootstrap', 'Components', [
    { i: 'bs-alerts', t: 'Alerts & Badges',
      x: '<p><strong>Alerts</strong> show a coloured message box: <code>.alert .alert-success</code>. Add <code>role="alert"</code> for screen readers. Add <code>.alert-dismissible</code> with a close button to let users remove it (this needs the Bootstrap JavaScript file).</p><p><strong>Badges</strong> are small labels: <code>&lt;span class="badge bg-primary"&gt;</code>. Use <code>.rounded-pill</code> for a pill shape.</p>',
      e: [['Alerts and badges', bs('<div class="container mt-3">\n  <div class="alert alert-success" role="alert">Saved! Your work is safe.</div>\n  <div class="alert alert-danger" role="alert">Oops, something went wrong.</div>\n  <div class="alert alert-warning alert-dismissible fade show" role="alert">\n    Click the X to dismiss me.\n    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>\n  </div>\n  <h4>Messages <span class="badge bg-danger rounded-pill">4</span></h4>\n</div>', true)]],
      q: ['A red error message box is alert-___.', 'class="alert alert-___"', 'danger'] },
    { i: 'bs-cards', t: 'Cards',
      x: '<p>A <strong>card</strong> is a flexible box for grouped content. Build it from <code>.card</code> with parts inside: <code>.card-img-top</code>, <code>.card-body</code>, <code>.card-title</code>, <code>.card-text</code>. Put cards in grid columns to make a responsive gallery.</p>',
      e: [['A row of cards', bs('<div class="container mt-3">\n  <div class="row g-3">\n    <div class="col-12 col-md-4">\n      <div class="card h-100">\n        <img src="https://placehold.co/400x200/0B6E4F/ffffff?text=Maths" class="card-img-top" alt="Maths">\n        <div class="card-body">\n          <h5 class="card-title">Maths</h5>\n          <p class="card-text">Numbers, shapes and puzzles.</p>\n          <a href="#" class="btn btn-primary">Start</a>\n        </div>\n      </div>\n    </div>\n    <div class="col-12 col-md-4">\n      <div class="card h-100">\n        <img src="https://placehold.co/400x200/2965F1/ffffff?text=Coding" class="card-img-top" alt="Coding">\n        <div class="card-body">\n          <h5 class="card-title">Coding</h5>\n          <p class="card-text">Make websites and games.</p>\n          <a href="#" class="btn btn-primary">Start</a>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>')]],
      q: ['The main content area of a card uses card-___.', '<div class="card-___">', 'body'] },
    { i: 'bs-navbar', t: 'Navbar',
      x: '<p>A <strong>navbar</strong> is the top menu of a site. Use <code>.navbar</code>, choose when it expands with <code>.navbar-expand-lg</code>, and colour it with <code>.bg-dark</code> plus <code>data-bs-theme="dark"</code>. On small screens the links hide behind a toggle button — that needs the Bootstrap JavaScript file.</p>',
      e: [['A responsive navbar', bs('<nav class="navbar navbar-expand-lg bg-dark" data-bs-theme="dark">\n  <div class="container-fluid">\n    <a class="navbar-brand" href="#">Smart21</a>\n    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu" aria-label="Toggle menu">\n      <span class="navbar-toggler-icon"></span>\n    </button>\n    <div class="collapse navbar-collapse" id="menu">\n      <ul class="navbar-nav me-auto">\n        <li class="nav-item"><a class="nav-link active" href="#">Home</a></li>\n        <li class="nav-item"><a class="nav-link" href="#">Courses</a></li>\n        <li class="nav-item"><a class="nav-link" href="#">Contact</a></li>\n      </ul>\n    </div>\n  </div>\n</nav>\n<div class="container mt-3"><p>Make the preview narrow to see the menu button.</p></div>', true)]],
      q: ['The brand or logo link in a navbar uses navbar-___.', 'class="navbar-___"', 'brand'] },
    { i: 'bs-collapse', t: 'Collapse & Accordion',
      x: '<p>Collapse shows and hides content. A button with <code>data-bs-toggle="collapse"</code> and <code>data-bs-target="#id"</code> controls the element with that id and the class <code>.collapse</code>.</p><p>An <strong>accordion</strong> groups several collapsible panels so only one is open at a time. Both need the Bootstrap JavaScript file.</p>',
      e: [['A toggle and an accordion', bs('<div class="container mt-3">\n  <button class="btn btn-primary" data-bs-toggle="collapse" data-bs-target="#more">Show / hide</button>\n  <div class="collapse mt-2" id="more">\n    <div class="card card-body">Now you can see this hidden content.</div>\n  </div>\n\n  <div class="accordion mt-4" id="faq">\n    <div class="accordion-item">\n      <h2 class="accordion-header">\n        <button class="accordion-button" data-bs-toggle="collapse" data-bs-target="#a1">What is Bootstrap?</button>\n      </h2>\n      <div id="a1" class="accordion-collapse collapse show" data-bs-parent="#faq">\n        <div class="accordion-body">A toolkit of ready-made CSS and JavaScript.</div>\n      </div>\n    </div>\n    <div class="accordion-item">\n      <h2 class="accordion-header">\n        <button class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#a2">Is it free?</button>\n      </h2>\n      <div id="a2" class="accordion-collapse collapse" data-bs-parent="#faq">\n        <div class="accordion-body">Yes, it is free and open source.</div>\n      </div>\n    </div>\n  </div>\n</div>', true)]],
      q: ['A button toggles a panel with data-bs-toggle="___".', 'data-bs-toggle="___"', 'collapse'] },
    { i: 'bs-modal', t: 'Modal',
      x: '<p>A <strong>modal</strong> is a pop-up dialog that appears on top of the page. A button with <code>data-bs-toggle="modal"</code> and <code>data-bs-target="#id"</code> opens the <code>.modal</code> with that id. Inside, use <code>.modal-header</code>, <code>.modal-body</code> and <code>.modal-footer</code>. A button with <code>data-bs-dismiss="modal"</code> closes it.</p>',
      e: [['Open a pop-up', bs('<div class="container mt-3">\n  <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#hello">Open modal</button>\n</div>\n\n<div class="modal fade" id="hello" tabindex="-1">\n  <div class="modal-dialog modal-dialog-centered">\n    <div class="modal-content">\n      <div class="modal-header">\n        <h5 class="modal-title">Welcome</h5>\n        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>\n      </div>\n      <div class="modal-body">Hello from a Bootstrap modal!</div>\n      <div class="modal-footer">\n        <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>\n      </div>\n    </div>\n  </div>\n</div>', true)]],
      q: ['A button closes a modal with data-bs-dismiss="___".', 'data-bs-dismiss="___"', 'modal'] }
  ]);

  /* ============================================================== JQUERY */
  add('jquery', 'Getting Started', [
    { i: 'jq-intro', t: 'jQuery Introduction',
      x: '<p><strong>jQuery</strong> is a small JavaScript library that makes common page tasks shorter: finding elements, reacting to clicks, changing content and adding effects. Its motto is <em>write less, do more</em>.</p><p>Load it with a <code>&lt;script&gt;</code> tag, then use the <code>$</code> function. The basic pattern is:</p><p><code>$(selector).action()</code></p><p>Wrap your code in <code>$(document).ready(...)</code> (or the short form <code>$(function(){ ... })</code>) so it runs after the page has loaded.</p>',
      e: [['Your first jQuery code', jq('<h2 id="title">Hello!</h2>\n<p>Watch the heading change.</p>', '$(function () {\n  $("#title").text("Hello from jQuery!").css("color", "#0769AD");\n});')]],
      q: ['jQuery is used through the ___ function.', '___("p").hide();', '$'] },
    { i: 'jq-selectors', t: 'Selectors',
      x: '<p>jQuery selects elements with the same selectors as CSS:</p><ul><li><code>$("p")</code> — all paragraphs</li><li><code>$("#menu")</code> — the element with id "menu"</li><li><code>$(".note")</code> — every element with class "note"</li><li><code>$("ul li:first")</code> — the first list item</li><li><code>$("a[target]")</code> — links that have a target attribute</li></ul>',
      e: [['Select by tag, id and class', jq('<p>A plain paragraph.</p>\n<p class="note">A note paragraph.</p>\n<p id="special">The special one.</p>\n<ul><li>One</li><li>Two</li><li>Three</li></ul>', '$("p").css("font-family", "sans-serif");\n$(".note").css("background", "#FFF3BF");\n$("#special").css("font-weight", "bold");\n$("li:first").css("color", "crimson");')]],
      q: ['Select the element with id "box" using $("___box").', '$("___box")', '#'] },
    { i: 'jq-events', t: 'Events',
      x: '<p>Events are things that happen on the page: clicks, key presses, mouse moves. Use a method like <code>.click()</code>, <code>.dblclick()</code>, <code>.hover()</code> or the general <code>.on("event", function)</code> to react.</p><p>Inside the handler, <code>$(this)</code> means the element that received the event.</p>',
      e: [['Click and hover', jq('<button id="btn">Click me</button>\n<button id="cnt">Clicked 0 times</button>\n<p id="hv" style="padding:12px;background:#E4F3EC">Hover over me</p>', 'var n = 0;\n$("#btn").click(function () {\n  alert("You clicked the button!");\n});\n$("#cnt").on("click", function () {\n  n++;\n  $(this).text("Clicked " + n + " times");\n});\n$("#hv").hover(\n  function () { $(this).css("background", "#FFE08A"); },\n  function () { $(this).css("background", "#E4F3EC"); }\n);')]],
      q: ['Attach any event with the .___() method.', '$("button").___("click", fn);', 'on'] }
  ]);
  add('jquery', 'Effects', [
    { i: 'jq-hide-show', t: 'Hide, Show & Toggle',
      x: '<p><code>.hide()</code>, <code>.show()</code> and <code>.toggle()</code> control visibility. Pass a speed — <code>"slow"</code>, <code>"fast"</code> or milliseconds like <code>800</code> — to animate the change.</p>',
      e: [['Hide, show and toggle', jq('<button id="h">Hide</button> <button id="s">Show</button> <button id="t">Toggle</button>\n<p id="msg" style="padding:16px;background:#D3F9D8">Now you see me!</p>', '$("#h").click(function () { $("#msg").hide(600); });\n$("#s").click(function () { $("#msg").show(600); });\n$("#t").click(function () { $("#msg").toggle(400); });')]],
      q: ['Flip between hidden and visible with .___().', '$("p").___();', 'toggle'] },
    { i: 'jq-fade-slide', t: 'Fade & Slide',
      x: '<p>jQuery has built-in effects. <strong>Fade</strong>: <code>.fadeIn()</code>, <code>.fadeOut()</code>, <code>.fadeToggle()</code>, <code>.fadeTo(speed, opacity)</code>. <strong>Slide</strong>: <code>.slideDown()</code>, <code>.slideUp()</code>, <code>.slideToggle()</code>. Each accepts a speed and an optional callback function that runs when the effect finishes.</p>',
      e: [['Fade and slide panels', jq('<button id="f">Fade</button> <button id="sl">Slide</button>\n<div id="p1" style="padding:16px;background:#D0EBFF;margin-top:10px">I fade!</div>\n<div id="p2" style="padding:16px;background:#FFE3E3;margin-top:10px">I slide!</div>', '$("#f").click(function () { $("#p1").fadeToggle(700); });\n$("#sl").click(function () {\n  $("#p2").slideToggle(500, function () { console.log("Slide finished"); });\n});')]],
      q: ['Make an element slowly disappear with .___Out().', '$("div").___Out();', 'fade'] },
    { i: 'jq-animate', t: 'Animate',
      x: '<p><code>.animate({properties}, speed)</code> smoothly changes numeric CSS properties such as <code>left</code>, <code>width</code>, <code>height</code>, <code>opacity</code> and <code>fontSize</code>. To move an element with <code>left</code>, it needs <code>position: relative</code> or <code>absolute</code>. Several <code>.animate()</code> calls in a row run one after another.</p>',
      e: [['A box that moves and grows', jq('<button id="go">Animate</button>\n<div id="box" style="position:relative;width:60px;height:60px;background:#0B6E4F;margin-top:12px"></div>', '$("#go").click(function () {\n  $("#box")\n    .animate({ left: "200px", width: "120px" }, 800)\n    .animate({ left: "0px", width: "60px" }, 800);\n});')]],
      q: ['Animate CSS properties with .___({width: "200px"}).', '$("div").___({ width: "200px" });', 'animate'] }
  ]);
  add('jquery', 'Content & Styles', [
    { i: 'jq-content', t: 'Get & Set Content',
      x: '<p>Three methods read or change content. With no argument they <em>get</em>; with an argument they <em>set</em>.</p><ul><li><code>.text()</code> — plain text</li><li><code>.html()</code> — HTML inside the element</li><li><code>.val()</code> — the value of a form field</li><li><code>.attr("name", value)</code> — an attribute such as <code>href</code> or <code>src</code></li></ul>',
      e: [['Read and write content', jq('<p id="p">Some <b>bold</b> text</p>\n<input id="name" value="Amina">\n<button id="b">Go</button>\n<p><a id="lnk" href="#">A link</a></p>\n<div id="out" style="margin-top:8px;color:#555"></div>', '$("#b").click(function () {\n  var t = $("#p").text();\n  var h = $("#p").html();\n  $("#out").text("text: " + t + "  |  html: " + h + "  |  name: " + $("#name").val());\n  $("#name").val("Juma");\n  $("#lnk").attr("href", "https://smart21brain.com").text("Smart21Brain");\n});')]],
      q: ['Read the value typed into an input using .___().', '$("#name").___()', 'val'] },
    { i: 'jq-css-classes', t: 'CSS & Classes',
      x: '<p>Change how things look with <code>.css()</code> for single styles or by switching classes:</p><ul><li><code>.addClass("name")</code> — add a class</li><li><code>.removeClass("name")</code> — remove it</li><li><code>.toggleClass("name")</code> — add if missing, remove if present</li><li><code>.hasClass("name")</code> — true or false</li></ul><p>Using classes keeps your styles in CSS, where they belong.</p>',
      e: [['Toggle a highlight class', jq('<button id="b">Toggle highlight</button>\n<p class="card">Click the button to add or remove the highlight class.</p>', '$("#b").click(function () {\n  $(".card").toggleClass("hl");\n});', '  <style>\n    .card { padding: 14px; border: 2px solid #ccc; margin-top: 10px; }\n    .hl { background: #FFF3BF; border-color: #F59F00; }\n  </style>')]],
      q: ['Switch a class on or off with .___Class("hl").', '$("p").___Class("hl");', 'toggle'] }
  ]);
  add('jquery', 'Working with the DOM', [
    { i: 'jq-add-remove', t: 'Add & Remove Elements',
      x: '<p>Create new content and put it on the page:</p><ul><li><code>.append()</code> / <code>.prepend()</code> — add inside the start or end of an element</li><li><code>.after()</code> / <code>.before()</code> — add next to an element</li><li><code>.remove()</code> — delete an element</li><li><code>.empty()</code> — delete everything inside it</li></ul>',
      e: [['A growing list', jq('<button id="add">Add item</button> <button id="clr">Clear</button>\n<ul id="list"><li>First item</li></ul>', 'var n = 1;\n$("#add").click(function () {\n  n++;\n  $("#list").append("<li>Item number " + n + "</li>");\n});\n$("#clr").click(function () {\n  $("#list").empty();\n  n = 0;\n});')]],
      q: ['Add content to the end of an element with .___().', '$("ul").___("<li>New</li>");', 'append'] },
    { i: 'jq-traversing', t: 'Traversing the DOM',
      x: '<p>Start from one element and move around the page tree:</p><ul><li><code>.parent()</code>, <code>.children()</code>, <code>.find("selector")</code></li><li><code>.next()</code>, <code>.prev()</code>, <code>.siblings()</code></li><li><code>.closest("selector")</code> — the nearest ancestor that matches</li><li><code>.first()</code>, <code>.last()</code>, <code>.eq(n)</code>, <code>.filter()</code></li></ul>',
      e: [['Moving around', jq('<ul id="menu">\n  <li>Home</li>\n  <li id="mid">Courses</li>\n  <li>Contact</li>\n</ul>', '$("#mid").css("color", "crimson");            // the element itself\n$("#mid").next().css("font-weight", "bold");   // the next sibling\n$("#mid").prev().css("font-style", "italic");  // the previous sibling\n$("#mid").parent().css("border", "2px solid #999"); // the ul')]],
      q: ['Find descendants inside an element with .___("p").', '$("div").___("p")', 'find'] },
    { i: 'jq-each', t: 'Loops with each()',
      x: '<p><code>.each()</code> runs a function for every element in a selection. Inside it, <code>this</code> is the current element and the first argument is its position (starting at 0). You can also use <code>$.each(array, function(index, value){})</code> to loop over a plain array.</p>',
      e: [['Number the list items', jq('<ol id="l"><li>Apple</li><li>Banana</li><li>Mango</li></ol>\n<div id="out"></div>', '$("#l li").each(function (i) {\n  $(this).append(" (item " + (i + 1) + ")");\n});\n\nvar fruits = ["red", "green", "blue"];\n$.each(fruits, function (i, c) {\n  $("#out").append("<span style=\\"color:" + c + "\\">" + c + " </span>");\n});')]],
      q: ['Run a function on every matched element with .___().', '$("li").___(function(){ });', 'each'] }
  ]);

  /* =============================================================== REACT */
  add('react', 'Getting Started', [
    { i: 'rx-intro', t: 'React Introduction',
      x: '<p><strong>React</strong> is a JavaScript library for building user interfaces out of small, reusable pieces called <strong>components</strong>. You describe what the screen should look like, and React updates the page when your data changes.</p><p>In these lessons React loads from a CDN, and <strong>Babel</strong> turns the JSX you write into normal JavaScript inside the browser. That is perfect for learning; big projects use a build tool such as Vite.</p><ul><li><code>ReactDOM.createRoot(...)</code> picks where the app lives on the page</li><li><code>.render(...)</code> draws a component there</li></ul>',
      e: [['Hello, React', rx('function App() {\n  return <h1>Hello, React!</h1>;\n}\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);')]],
      q: ['React builds interfaces out of small pieces called ___.', 'React is made of ___', 'components'] },
    { i: 'rx-jsx', t: 'JSX',
      x: '<p><strong>JSX</strong> lets you write HTML-like code inside JavaScript. A few rules:</p><ul><li>Return <em>one</em> parent element (wrap extras in a <code>&lt;div&gt;</code> or <code>&lt;&gt;...&lt;/&gt;</code>)</li><li>Use <code>className</code> instead of <code>class</code></li><li>Put JavaScript inside curly braces: <code>{2 + 3}</code></li><li>Close every tag, including <code>&lt;img /&gt;</code> and <code>&lt;br /&gt;</code></li></ul>',
      e: [['JavaScript inside JSX', rx('function App() {\n  const name = "Amina";\n  const year = 2026;\n  return (\n    <div className="box">\n      <h1>Welcome, {name}!</h1>\n      <p>Next year is {year + 1}.</p>\n      <p>{name.toUpperCase()} has {name.length} letters.</p>\n    </div>\n  );\n}\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);', '  <style>.box { font-family: sans-serif; padding: 12px; border: 2px solid #149ECA; border-radius: 8px; }</style>')]],
      q: ['In JSX you put JavaScript inside curly ___.', 'Curly ___ like { 2 + 3 }', 'braces'] }
  ]);
  add('react', 'Components', [
    { i: 'rx-components', t: 'Components',
      x: '<p>A component is a JavaScript function that returns JSX. Its name <strong>must start with a capital letter</strong>. Use it like an HTML tag: <code>&lt;Greeting /&gt;</code>. Components can contain other components, so you can build a whole page from small parts and reuse each part as often as you like.</p>',
      e: [['Reusing a component', rx('function Badge() {\n  return <span className="badge">Smart21</span>;\n}\n\nfunction App() {\n  return (\n    <div>\n      <h2>Our team</h2>\n      <Badge /> <Badge /> <Badge />\n    </div>\n  );\n}\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);', '  <style>.badge { background: #149ECA; color: #fff; padding: 4px 10px; border-radius: 12px; font-family: sans-serif; }</style>')]],
      q: ['A component name must start with a ___ letter.', 'function ___() // name rule', 'capital'] },
    { i: 'rx-props', t: 'Props',
      x: '<p><strong>Props</strong> (short for properties) pass information into a component, like attributes on an HTML tag. The component receives them as one object. Use destructuring to pull out what you need: <code>function Card({ title, score })</code>. Props are <em>read-only</em> — a component must never change its own props.</p>',
      e: [['Passing data with props', rx('function Student({ name, grade, score }) {\n  return (\n    <div className="card">\n      <h3>{name}</h3>\n      <p>Grade {grade} — {score} points</p>\n    </div>\n  );\n}\n\nfunction App() {\n  return (\n    <div>\n      <Student name="Amina" grade="A" score={91} />\n      <Student name="Juma" grade="B" score={78} />\n    </div>\n  );\n}\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);', '  <style>.card { font-family: sans-serif; border: 1px solid #ccc; border-radius: 8px; padding: 6px 14px; margin: 8px 0; max-width: 260px; }</style>')]],
      q: ['Data passed into a component is called ___.', 'function Card({ title }) // title is a ___', 'props'] }
  ]);
  add('react', 'Interactivity', [
    { i: 'rx-state', t: 'State with useState',
      x: '<p><strong>State</strong> is data that can change while the app runs. The <code>useState</code> hook gives you two things: the current value and a function to change it.</p><p><code>const [count, setCount] = useState(0);</code></p><p>When you call <code>setCount(...)</code>, React re-draws the component with the new value. Never change a state variable directly — always use the setter function.</p>',
      e: [['A counter', rx('const { useState } = React;\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <div style={{ fontFamily: "sans-serif" }}>\n      <h2>Count: {count}</h2>\n      <button onClick={() => setCount(count + 1)}>Add 1</button>{" "}\n      <button onClick={() => setCount(0)}>Reset</button>\n    </div>\n  );\n}\n\nReactDOM.createRoot(document.getElementById("root")).render(<Counter />);')]],
      q: ['The ___ hook adds changeable data to a component.', 'const [n, setN] = ___(0);', 'useState'] },
    { i: 'rx-events', t: 'Handling Events',
      x: '<p>React events are written in camelCase and receive a <em>function</em>: <code>onClick</code>, <code>onChange</code>, <code>onSubmit</code>, <code>onMouseEnter</code>. Pass the function itself — <code>onClick={handleClick}</code> — not a call to it. To pass arguments, wrap it: <code>onClick={() =&gt; remove(id)}</code>. The handler gets an event object, e.g. <code>e.target.value</code>.</p>',
      e: [['Click and mouse events', rx('const { useState } = React;\n\nfunction App() {\n  const [msg, setMsg] = useState("Do something!");\n  function handleClick() {\n    setMsg("You clicked the button");\n  }\n  return (\n    <div style={{ fontFamily: "sans-serif" }}>\n      <p>{msg}</p>\n      <button onClick={handleClick}>Click me</button>\n      <p\n        onMouseEnter={() => setMsg("Mouse is over the text")}\n        onMouseLeave={() => setMsg("Mouse left")}\n        style={{ background: "#E7F5FF", padding: 10 }}\n      >Hover here</p>\n    </div>\n  );\n}\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);')]],
      q: ['React\'s click event handler is named ___.', '<button ___={go}>', 'onClick'] },
    { i: 'rx-forms', t: 'Forms & Inputs',
      x: '<p>In React the usual way to handle a form is a <strong>controlled input</strong>: the input\'s <code>value</code> comes from state, and <code>onChange</code> updates the state on every key press. React is then the single source of truth for what is typed. Use <code>e.preventDefault()</code> in <code>onSubmit</code> to stop the page reloading.</p>',
      e: [['A controlled input', rx('const { useState } = React;\n\nfunction App() {\n  const [name, setName] = useState("");\n  const [saved, setSaved] = useState("");\n  function submit(e) {\n    e.preventDefault();\n    setSaved(name);\n    setName("");\n  }\n  return (\n    <form onSubmit={submit} style={{ fontFamily: "sans-serif" }}>\n      <input\n        value={name}\n        onChange={(e) => setName(e.target.value)}\n        placeholder="Your name"\n      />{" "}\n      <button>Save</button>\n      <p>Typing: {name}</p>\n      <p>Saved: {saved}</p>\n    </form>\n  );\n}\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);')]],
      q: ['An input controlled by state needs an ___ handler to update it.', '<input value={v} ___={update}>', 'onChange'] }
  ]);
  add('react', 'Rendering', [
    { i: 'rx-lists', t: 'Lists & Keys',
      x: '<p>Turn an array into elements with <code>.map()</code>. Each item needs a unique <code>key</code> prop so React can track which one is which — use an id from your data when you have one. Avoid using the array index as a key if the list can be re-ordered or items removed.</p>',
      e: [['Rendering an array', rx('const subjects = [\n  { id: 1, name: "Maths", lessons: 12 },\n  { id: 2, name: "Science", lessons: 9 },\n  { id: 3, name: "English", lessons: 15 }\n];\n\nfunction App() {\n  return (\n    <ul style={{ fontFamily: "sans-serif" }}>\n      {subjects.map((s) => (\n        <li key={s.id}>{s.name} — {s.lessons} lessons</li>\n      ))}\n    </ul>\n  );\n}\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);')]],
      q: ['Each item in a rendered list needs a unique ___ prop.', '<li ___={item.id}>', 'key'] },
    { i: 'rx-conditional', t: 'Conditional Rendering',
      x: '<p>Show different things depending on state. Three common ways, all inside JSX:</p><ul><li>Ternary: <code>{loggedIn ? &lt;Welcome /&gt; : &lt;Login /&gt;}</code></li><li>And: <code>{hasNew &amp;&amp; &lt;Badge /&gt;}</code> — shows the badge only when true</li><li>An early <code>if (...) return ...</code> before the main return</li></ul>',
      e: [['Switch what is shown', rx('const { useState } = React;\n\nfunction App() {\n  const [loggedIn, setLoggedIn] = useState(false);\n  return (\n    <div style={{ fontFamily: "sans-serif" }}>\n      {loggedIn ? <h2>Welcome back!</h2> : <h2>Please log in</h2>}\n      <button onClick={() => setLoggedIn(!loggedIn)}>\n        {loggedIn ? "Log out" : "Log in"}\n      </button>\n      {loggedIn && <p>Here is your secret dashboard.</p>}\n    </div>\n  );\n}\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);')]],
      q: ['A short if/else inside JSX uses the ___ operator (a ? b : c).', '{ ok ? "Yes" : "No" } // the ___ operator', 'ternary'] },
    { i: 'rx-effect', t: 'Effects with useEffect',
      x: '<p><code>useEffect</code> runs code <em>after</em> React draws the screen. Use it for things outside React: timers, fetching data, changing the page title. The second argument is a <strong>dependency array</strong>:</p><ul><li><code>[]</code> — run once, when the component first appears</li><li><code>[count]</code> — run again whenever <code>count</code> changes</li><li>no array — run after every render</li></ul><p>Return a function to clean up (for example <code>clearInterval</code>).</p>',
      e: [['A ticking clock', rx('const { useState, useEffect } = React;\n\nfunction Timer() {\n  const [seconds, setSeconds] = useState(0);\n\n  useEffect(() => {\n    const id = setInterval(() => setSeconds((s) => s + 1), 1000);\n    return () => clearInterval(id); // clean up\n  }, []);\n\n  return <h2 style={{ fontFamily: "sans-serif" }}>Seconds: {seconds}</h2>;\n}\n\nReactDOM.createRoot(document.getElementById("root")).render(<Timer />);')]],
      q: ['Run side effects after rendering with the ___ hook.', 'import { ___ } from "react"', 'useEffect'] }
  ]);
  add('react', 'Mini Project', [
    { i: 'rx-todo', t: 'Project: To-Do List',
      x: '<p>Put everything together: state, events, a controlled input, lists and keys. The list of tasks lives in state as an array. To <em>add</em>, create a new array with the spread operator <code>[...tasks, newTask]</code>. To <em>remove</em>, use <code>.filter()</code>. To <em>toggle</em>, use <code>.map()</code>. Never change the old array directly.</p><p>Challenge: add a counter that shows how many tasks are still not done.</p>',
      e: [['A working to-do app', rx('const { useState } = React;\n\nfunction App() {\n  const [tasks, setTasks] = useState([\n    { id: 1, text: "Learn React", done: true },\n    { id: 2, text: "Build a to-do app", done: false }\n  ]);\n  const [text, setText] = useState("");\n\n  function addTask(e) {\n    e.preventDefault();\n    if (!text.trim()) return;\n    setTasks([...tasks, { id: Date.now(), text: text, done: false }]);\n    setText("");\n  }\n  function toggle(id) {\n    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));\n  }\n  function remove(id) {\n    setTasks(tasks.filter((t) => t.id !== id));\n  }\n\n  return (\n    <div className="app">\n      <h2>My tasks</h2>\n      <form onSubmit={addTask}>\n        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="New task" />\n        <button>Add</button>\n      </form>\n      <ul>\n        {tasks.map((t) => (\n          <li key={t.id}>\n            <span className={t.done ? "done" : ""} onClick={() => toggle(t.id)}>{t.text}</span>\n            <button onClick={() => remove(t.id)}>x</button>\n          </li>\n        ))}\n      </ul>\n    </div>\n  );\n}\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);', '  <style>\n    .app { font-family: sans-serif; max-width: 320px; }\n    li { margin: 6px 0; display: flex; justify-content: space-between; }\n    span { cursor: pointer; }\n    .done { text-decoration: line-through; color: #888; }\n  </style>')]],
      q: ['Remove an item from a state array using .___().', 'tasks.___(t => t.id !== id)', 'filter'] }
  ]);

  /* ========================================================= REFERENCES */
  S.refs.bootstrap = [
    ['.container', 'Centred, fixed-width page wrapper'], ['.container-fluid', 'Full-width wrapper'], ['.row', 'A horizontal group of columns'],
    ['.col / .col-6', 'Equal-width column / a column taking 6 of 12 parts'], ['.col-md-4', 'Column that is 4 wide from the medium breakpoint (768px)'],
    ['.g-3', 'Gap between grid columns and rows'], ['.m-3 / .p-3', 'Margin / padding on all sides (0 to 5)'], ['.mt-3 .mb-3 .ms-3 .me-3', 'Margin top, bottom, start, end'],
    ['.mx-auto', 'Centre a block with automatic side margins'], ['.d-flex', 'Make a flex container'], ['.justify-content-between', 'Push flex items apart'],
    ['.align-items-center', 'Centre flex items up and down'], ['.flex-column', 'Stack flex items vertically'], ['.d-none .d-md-block', 'Hide an element, then show it from the medium size up'],
    ['.text-center / .text-end', 'Align text'], ['.fw-bold / .fst-italic', 'Bold / italic text'], ['.display-1 … .display-6', 'Extra large headings'],
    ['.lead', 'A larger intro paragraph'], ['.text-primary', 'Text in a theme colour (also success, danger, warning, info)'], ['.bg-success', 'Background in a theme colour'],
    ['.border .rounded', 'Add a border / rounded corners'], ['.shadow', 'Add a drop shadow'], ['.w-50 .w-100', 'Width as a percentage of the parent'],
    ['.btn .btn-primary', 'A styled button'], ['.btn-outline-primary', 'An outlined button'], ['.btn-lg / .btn-sm', 'Large / small button'],
    ['.table', 'Base table styling'], ['.table-striped', 'Zebra rows'], ['.table-hover', 'Highlight a row on hover'], ['.table-responsive', 'Scroll wide tables on small screens'],
    ['.form-control', 'Styled text input or textarea'], ['.form-label', 'Label above an input'], ['.form-select', 'Styled dropdown'], ['.form-check', 'Checkbox or radio wrapper'],
    ['.alert .alert-info', 'A coloured message box'], ['.badge', 'A small label'], ['.card', 'A content box'], ['.card-body', 'Padded content area inside a card'],
    ['.navbar', 'The top menu bar'], ['.navbar-expand-lg', 'Show full menu from the large size up'], ['.nav-link', 'A link inside a nav'],
    ['.collapse', 'Content that can be shown or hidden'], ['.modal', 'A pop-up dialog'], ['.list-group', 'A styled list'], ['.img-fluid', 'Make an image scale down to fit'],
    ['.ratio .ratio-16x9', 'Keep an embedded video at a fixed shape'], ['.sticky-top', 'Stick an element to the top while scrolling'], ['.visually-hidden', 'Hide from view but keep for screen readers']
  ];
  S.refs.jquery = [
    ['$(selector)', 'Select elements with CSS selectors'], ['$(document).ready(fn)', 'Run code when the page has loaded'], ['$(this)', 'The element that triggered the event'],
    ['.hide() / .show()', 'Hide or show elements'], ['.toggle()', 'Switch between hidden and visible'], ['.fadeIn() / .fadeOut()', 'Fade an element in or out'],
    ['.fadeToggle()', 'Fade in if hidden, out if visible'], ['.fadeTo(speed, opacity)', 'Fade to a set opacity'], ['.slideDown() / .slideUp()', 'Slide an element open or closed'],
    ['.slideToggle()', 'Slide open or closed, whichever applies'], ['.animate({...}, speed)', 'Animate numeric CSS properties'], ['.stop()', 'Stop a running animation'],
    ['.delay(ms)', 'Wait before the next queued effect'], ['.text()', 'Get or set plain text'], ['.html()', 'Get or set inner HTML'], ['.val()', 'Get or set a form field value'],
    ['.attr(name, value)', 'Get or set an attribute'], ['.prop(name, value)', 'Get or set a property such as checked'], ['.css(prop, value)', 'Get or set a CSS style'],
    ['.addClass() / .removeClass()', 'Add or remove a class'], ['.toggleClass()', 'Switch a class on or off'], ['.hasClass()', 'Check whether a class is present'],
    ['.append() / .prepend()', 'Add content inside at the end / start'], ['.after() / .before()', 'Add content beside an element'], ['.remove()', 'Delete an element'],
    ['.empty()', 'Delete all children of an element'], ['.parent() / .children()', 'Move up or down the tree'], ['.find(selector)', 'Find descendants'],
    ['.closest(selector)', 'Nearest matching ancestor'], ['.next() / .prev() / .siblings()', 'Move sideways in the tree'], ['.first() / .last() / .eq(n)', 'Pick one element from a selection'],
    ['.filter(selector)', 'Keep only matching elements'], ['.each(fn)', 'Run a function for every element'], ['.click(fn)', 'Run code when clicked'], ['.dblclick(fn)', 'Run code on double click'],
    ['.hover(in, out)', 'Run code when the mouse enters and leaves'], ['.on(event, fn)', 'Attach any event'], ['.off(event)', 'Remove an event handler'],
    ['.submit(fn)', 'Run code when a form is submitted'], ['.keyup(fn)', 'Run code when a key is released'], ['.width() / .height()', 'Get or set size'],
    ['$.each(array, fn)', 'Loop over an array or object'], ['$.ajax() / $.getJSON()', 'Load data from a server']
  ];
  S.refs.react = [
    ['ReactDOM.createRoot(el)', 'Choose the page element that holds your app'], ['root.render(<App />)', 'Draw a component into the root'], ['function App() { return ...; }', 'A component is a function that returns JSX'],
    ['{ expression }', 'Put JavaScript inside JSX'], ['className', 'The JSX name for the HTML class attribute'], ['htmlFor', 'The JSX name for the label for attribute'],
    ['<>...</>', 'A fragment — group elements without an extra wrapper'], ['style={{ color: "red" }}', 'Inline style as an object'], ['props', 'Read-only data passed into a component'],
    ['props.children', 'Content placed between a component\'s tags'], ['useState(initial)', 'Hook: returns [value, setValue]'], ['useEffect(fn, deps)', 'Hook: run code after render'],
    ['useRef(initial)', 'Hook: a value that survives renders without causing one'], ['useMemo(fn, deps)', 'Hook: remember a calculated value'], ['useCallback(fn, deps)', 'Hook: remember a function'],
    ['useContext(Ctx)', 'Hook: read shared data from a context'], ['useReducer(fn, init)', 'Hook: state with a reducer function'], ['onClick', 'Click event'], ['onChange', 'Input value changed'],
    ['onSubmit', 'Form submitted'], ['onMouseEnter / onMouseLeave', 'Mouse moves over or off an element'], ['onKeyDown', 'A key is pressed'], ['e.preventDefault()', 'Stop the default browser action'],
    ['e.target.value', 'The current value of the input that fired the event'], ['array.map(fn)', 'Turn an array into a list of elements'], ['key={id}', 'Unique identifier for each item in a list'],
    ['cond ? a : b', 'Choose between two outputs'], ['cond && <X />', 'Show something only when a condition is true'], ['[...arr, item]', 'Copy an array and add an item'],
    ['{ ...obj, key: value }', 'Copy an object and change one field'], ['arr.filter(fn)', 'Remove items from state immutably'], ['React.Fragment', 'Named form of the fragment']
  ];
})(window.S21C);
