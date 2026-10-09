/* Smart21Code — quick references (original one-line descriptions). */
window.S21C = window.S21C || { langs: [], lessons: {}, refs: {} };
(function (S) {
  S.refs.html = [
    ['<a>', 'Link to another page or a spot on this page (href)'], ['<abbr>', 'An abbreviation; title gives the full text'],
    ['<article>', 'Self-contained content such as a blog post'], ['<aside>', 'Side content related to the main content'],
    ['<audio>', 'Sound player'], ['<b>', 'Bold text with no extra meaning'], ['<blockquote>', 'A long quotation from another source'],
    ['<body>', 'All the visible content of the page'], ['<br>', 'A line break'], ['<button>', 'A clickable button'],
    ['<canvas>', 'A drawing area controlled by JavaScript'], ['<code>', 'A piece of computer code'], ['<div>', 'A block-level container'],
    ['<em>', 'Emphasised (italic) text'], ['<footer>', 'Footer of a page or section'], ['<form>', 'A form that collects user input'],
    ['<h1>-<h6>', 'Headings from most to least important'], ['<head>', 'Page information not shown on the page'],
    ['<header>', 'Introductory content or navigation area'], ['<hr>', 'A horizontal dividing line'], ['<html>', 'The root of the whole document'],
    ['<i>', 'Italic text (voice, terms)'], ['<iframe>', 'A page embedded inside a page'], ['<img>', 'An image (src, alt)'],
    ['<input>', 'A form control; type sets what kind'], ['<label>', 'A caption for a form control (for)'], ['<li>', 'An item in a list'],
    ['<link>', 'Connects an external file such as a stylesheet'], ['<main>', 'The main content of the page'], ['<mark>', 'Highlighted text'],
    ['<meta>', 'Information about the page (charset, viewport, description)'], ['<nav>', 'A block of navigation links'],
    ['<ol>', 'An ordered (numbered) list'], ['<option>', 'An item inside a select dropdown'], ['<p>', 'A paragraph'],
    ['<pre>', 'Text that keeps its spaces and line breaks'], ['<script>', 'JavaScript code or a link to a script file'],
    ['<section>', 'A themed group of content'], ['<select>', 'A dropdown list'], ['<small>', 'Smaller print such as legal text'],
    ['<span>', 'An inline container'], ['<strong>', 'Important (bold) text'], ['<style>', 'CSS written inside the page'],
    ['<table>', 'A table of rows and columns'], ['<td>', 'A table data cell'], ['<textarea>', 'A multi-line text box'],
    ['<th>', 'A table header cell'], ['<title>', 'The page title shown in the browser tab'], ['<tr>', 'A table row'],
    ['<ul>', 'An unordered (bulleted) list'], ['<video>', 'A video player']
  ];
  S.refs.css = [
    ['background', 'Shorthand for all background properties'], ['background-color', 'Background colour of an element'],
    ['background-image', 'Sets an image or gradient as background'], ['border', 'Shorthand: width, style and colour of the border'],
    ['border-radius', 'Rounds the corners'], ['box-shadow', 'Adds a shadow around a box'], ['box-sizing', 'Whether width includes padding and border'],
    ['color', 'Text colour'], ['cursor', 'Mouse pointer shown over an element'], ['display', 'How an element is laid out (block, inline, flex, grid, none)'],
    ['flex', 'Shorthand for how a flex item grows and shrinks'], ['flex-direction', 'Row or column for flex items'],
    ['flex-wrap', 'Whether flex items wrap onto new lines'], ['font-family', 'Typeface list'], ['font-size', 'Size of text'],
    ['font-weight', 'Boldness of text'], ['gap', 'Space between flex or grid items'], ['grid-template-columns', 'Defines the columns of a grid'],
    ['height', 'Height of an element'], ['justify-content', 'Aligns items along the main axis'], ['align-items', 'Aligns items on the cross axis'],
    ['left / right / top / bottom', 'Offsets for positioned elements'], ['letter-spacing', 'Space between letters'],
    ['line-height', 'Height of each line of text'], ['list-style', 'Bullet or number style for lists'], ['margin', 'Space outside the border'],
    ['max-width', 'Largest width allowed'], ['min-height', 'Smallest height allowed'], ['opacity', 'Transparency from 0 to 1'],
    ['overflow', 'What happens to content that does not fit'], ['padding', 'Space inside the border'], ['position', 'static, relative, absolute, fixed or sticky'],
    ['text-align', 'Horizontal alignment of text'], ['text-decoration', 'Underline, overline or line-through'],
    ['text-transform', 'uppercase, lowercase or capitalize'], ['transform', 'Move, rotate, scale or skew'], ['transition', 'Animates changes between states'],
    ['width', 'Width of an element'], ['z-index', 'Stacking order of overlapping elements']
  ];
  S.refs.javascript = [
    ['console.log()', 'Prints a value to the console'], ['alert()', 'Shows a pop-up message'], ['typeof', 'Returns the type of a value'],
    ['parseInt()', 'Converts text to a whole number'], ['Number()', 'Converts a value to a number'], ['String()', 'Converts a value to text'],
    ['isNaN()', 'Checks whether a value is not a number'], ['setTimeout()', 'Runs a function once after a delay'],
    ['setInterval()', 'Runs a function repeatedly'], ['Math.round()', 'Rounds to the nearest integer'], ['Math.floor()', 'Rounds down'],
    ['Math.ceil()', 'Rounds up'], ['Math.random()', 'Random number from 0 up to (not including) 1'], ['Math.max()', 'Largest of the given numbers'],
    ['str.length', 'Number of characters in a string'], ['str.slice()', 'Extracts part of a string'], ['str.split()', 'Splits a string into an array'],
    ['str.includes()', 'True if the string contains the text'], ['str.replace()', 'Replaces text'], ['str.toUpperCase()', 'Converts to capitals'],
    ['arr.push()', 'Adds an item to the end'], ['arr.pop()', 'Removes the last item'], ['arr.map()', 'New array from transforming every item'],
    ['arr.filter()', 'New array of items that pass a test'], ['arr.reduce()', 'Combines all items into one value'],
    ['arr.find()', 'First item that passes a test'], ['arr.sort()', 'Sorts the array'], ['arr.join()', 'Joins items into a string'],
    ['Object.keys()', 'Array of an object\'s keys'], ['Object.entries()', 'Array of [key, value] pairs'],
    ['JSON.stringify()', 'Object to JSON text'], ['JSON.parse()', 'JSON text to object'], ['document.getElementById()', 'Finds an element by id'],
    ['document.querySelector()', 'Finds the first element matching a CSS selector'], ['el.addEventListener()', 'Attaches an event handler'],
    ['el.classList', 'Add, remove or toggle CSS classes'], ['el.textContent', 'Reads or sets an element\'s text'],
    ['fetch()', 'Requests data over the network (returns a promise)'], ['new Date()', 'Creates a date object']
  ];
  S.refs.python = [
    ['print()', 'Shows values on the screen'], ['input()', 'Reads a line typed by the user'], ['len()', 'Number of items or characters'],
    ['type()', 'The type of a value'], ['int() / float() / str()', 'Convert between types'], ['range()', 'Sequence of numbers'],
    ['list() / dict() / set()', 'Create collections'], ['sum() / min() / max()', 'Total, smallest and largest'], ['sorted()', 'New sorted list'],
    ['abs()', 'Absolute value'], ['round()', 'Rounds a number'], ['enumerate()', 'Index and value pairs'], ['zip()', 'Pairs items from several sequences'],
    ['map() / filter()', 'Apply or test each item'], ['any() / all()', 'True if any / all items are true'], ['isinstance()', 'Checks the type of an object'],
    ['str.upper() / lower()', 'Change case'], ['str.strip()', 'Removes surrounding spaces'], ['str.split()', 'Splits text into a list'],
    ['str.join()', 'Joins a list into text'], ['str.replace()', 'Replaces text'], ['str.format() / f""', 'Insert values into text'],
    ['list.append()', 'Adds an item to the end'], ['list.remove()', 'Removes the first matching item'], ['list.pop()', 'Removes and returns an item'],
    ['list.sort()', 'Sorts the list in place'], ['dict.get()', 'Safe value lookup'], ['dict.items()', 'Key and value pairs'],
    ['open()', 'Opens a file'], ['import', 'Brings in a module'], ['math.sqrt()', 'Square root'], ['random.randint()', 'Random whole number'],
    ['json.dumps() / loads()', 'Python data to and from JSON']
  ];
  S.refs.sql = [
    ['SELECT', 'Chooses columns to return'], ['FROM', 'Names the table'], ['WHERE', 'Filters rows'], ['AND / OR / NOT', 'Combine conditions'],
    ['ORDER BY', 'Sorts results (ASC or DESC)'], ['LIMIT', 'Caps the number of rows'], ['DISTINCT', 'Removes duplicate rows'],
    ['AS', 'Gives a temporary name'], ['LIKE', 'Pattern match with % and _'], ['IN', 'Matches any value in a list'], ['BETWEEN', 'Matches a range'],
    ['IS NULL', 'Finds missing values'], ['INSERT INTO', 'Adds new rows'], ['UPDATE ... SET', 'Changes existing rows'], ['DELETE FROM', 'Removes rows'],
    ['COUNT()', 'Counts rows'], ['SUM()', 'Adds values'], ['AVG()', 'Average of values'], ['MIN() / MAX()', 'Smallest / largest value'],
    ['GROUP BY', 'Makes one result row per group'], ['HAVING', 'Filters groups'], ['JOIN', 'Combines rows from two tables'],
    ['LEFT JOIN', 'Keeps all rows from the left table'], ['UNION', 'Stacks results of two queries'], ['CREATE TABLE', 'Makes a new table'],
    ['DROP TABLE', 'Deletes a table'], ['ALTER TABLE', 'Changes a table\'s structure'], ['PRIMARY KEY', 'Unique id for each row'],
    ['FOREIGN KEY', 'Links to a row in another table'], ['CASE', 'If/else logic inside a query']
  ];
})(window.S21C);
