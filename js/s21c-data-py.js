/* Smart21Code — lesson data: Python and SQL (both run for real in the editor). */
window.S21C = window.S21C || { langs: [], lessons: {}, refs: {} };
(function (S) {
  function add(lang, group, list) {
    S.lessons[lang] = S.lessons[lang] || [];
    list.forEach(function (l) { l.g = group; S.lessons[lang].push(l); });
  }

  /* ============================================================== PYTHON */
  add('python', 'Getting Started', [
    { i: 'py-intro', t: 'Python Introduction',
      x: `<p><strong>Python</strong> is a popular, beginner-friendly programming language used for websites, data science, automation, AI and games. Its code reads almost like English.</p>
<p>The programs in this tutorial run <em>for real</em> in your browser. The first run downloads the Python engine once (a few seconds); after that it is fast.</p>`,
      e: [['Your first Python program', `print("Hello, Smart21Code!")
print(2 + 3)`]],
      q: ['Show text on the screen with the ___() function.', '___("Hello")', 'print'] },
    { i: 'py-syntax', t: 'Syntax & Indentation',
      x: `<p>Python uses <strong>indentation</strong> (spaces at the start of a line) to group code — there are no curly braces. Use 4 spaces. Getting the indentation wrong causes an <code>IndentationError</code>. Statements end at the end of the line, no semicolon needed.</p>`,
      e: [['Indentation matters', `if 5 > 2:
    print("Five is greater than two")
    print("This line is inside the if block")
print("This line is outside")`]],
      q: ['Python groups code using ___.', 'Python uses ___ instead of braces', 'indentation'] },
    { i: 'py-comments', t: 'Comments',
      x: `<p>Comments start with <code>#</code>; Python ignores them. Use them to explain <em>why</em> your code does something. A triple-quoted string on its own line is often used for longer notes ("docstrings").</p>`,
      e: [['Comments', `# This is a comment
print("Hello")  # a comment after code
"""
This is a longer note
spanning many lines.
"""`]],
      q: ['A Python comment starts with ___.', '___ my note', '#'] }
  ]);
  add('python', 'Data & Operators', [
    { i: 'py-variables', t: 'Variables',
      x: `<p>A variable is created the moment you assign a value with <code>=</code>. No type keyword is needed. Names are case-sensitive; use <code>snake_case</code> (words joined with underscores).</p>`,
      e: [['Creating variables', `name = "Amina"
age = 12
height = 1.45
print(name, "is", age, "years old")
print(type(height))`]],
      q: ['Assign a value to a variable using the ___ sign.', 'x ___ 5', '='] },
    { i: 'py-datatypes', t: 'Data Types',
      x: `<p>Built-in types: <code>str</code> (text), <code>int</code> (whole numbers), <code>float</code> (decimals), <code>bool</code> (<code>True</code>/<code>False</code>), <code>list</code>, <code>tuple</code>, <code>dict</code>, <code>set</code> and <code>NoneType</code>. Check with <code>type()</code> and convert with <code>int()</code>, <code>float()</code>, <code>str()</code>.</p>`,
      e: [['Types and conversion', `print(type("hi"), type(5), type(2.5), type(True))
print(int("42") + 8)
print(str(100) + " points")
print(float("3.5") * 2)`]],
      q: ['Turn the text "7" into a whole number with ___("7").', '___("7")', 'int'] },
    { i: 'py-numbers', t: 'Numbers & Math',
      x: `<p>Operators: <code>+ - * /</code>, <code>//</code> (whole-number division), <code>%</code> (remainder) and <code>**</code> (power). <code>/</code> always gives a float. Import the <code>math</code> module for <code>sqrt</code>, <code>pi</code>, <code>ceil</code> and more; <code>round()</code> and <code>abs()</code> are built in.</p>`,
      e: [['Arithmetic and math', `import math
print(7 / 2)      # 3.5
print(7 // 2)     # 3
print(7 % 2)      # 1
print(2 ** 10)    # 1024
print(math.sqrt(81), round(3.14159, 2))`]],
      q: ['The remainder operator is ___.', '10 ___ 3', '%'] },
    { i: 'py-strings', t: 'Strings',
      x: `<p>Strings are text in quotes. Join them with <code>+</code>, repeat with <code>*</code>, slice with <code>text[start:end]</code>, and get the length with <code>len()</code>. <strong>f-strings</strong> insert values: <code>f"Hi {name}"</code>.</p>`,
      e: [['Slicing and f-strings', `word = "Smart21Brain"
print(word[0:5])     # Smart
print(word[-5:])     # Brain
print(len(word))
name = "Amina"
score = 91.5
print(f"{name} scored {score}")`]],
      q: ['Get the length of a string with ___(text).', '___("hello")', 'len'] },
    { i: 'py-string-methods', t: 'String Methods',
      x: `<p>Strings have many built-in methods: <code>upper()</code>, <code>lower()</code>, <code>strip()</code>, <code>replace()</code>, <code>split()</code>, <code>join()</code>, <code>startswith()</code>, <code>find()</code>, <code>count()</code>. Strings never change — methods return a new string.</p>`,
      e: [['Handy methods', `text = "  learn to code  "
print(text.strip().title())
print(text.upper())
print("a-b-c".split("-"))
print(", ".join(["red", "green", "blue"]))
print("banana".count("a"))`]],
      q: ['Make text all capitals with the ___() method.', '"hi".___()', 'upper'] },
    { i: 'py-booleans', t: 'Booleans & Comparisons',
      x: `<p>Comparisons give <code>True</code> or <code>False</code>: <code>== != &gt; &lt; &gt;= &lt;=</code>. Combine with <code>and</code>, <code>or</code>, <code>not</code>. Empty things (<code>""</code>, <code>0</code>, <code>[]</code>, <code>None</code>) count as False; almost everything else is True.</p>`,
      e: [['True and False', `age = 15
print(age > 12 and age < 20)
print(not (age == 15))
print(bool(""), bool("text"), bool(0), bool([1]))`]],
      q: ['Both conditions must be true when joined with ___.', 'a > 1 ___ b > 1', 'and'] }
  ]);
  add('python', 'Control Flow', [
    { i: 'py-if', t: 'If / Elif / Else',
      x: `<p>Decisions use <code>if</code>, <code>elif</code> (else if) and <code>else</code>, each ending with a colon and an indented block. Only the first true branch runs.</p>`,
      e: [['Grade checker', `score = 72
if score >= 80:
    print("Grade A")
elif score >= 60:
    print("Grade B")
else:
    print("Keep practising!")`]],
      q: ['Python\'s "else if" is written ___.', 'if a: pass\n___ b: pass', 'elif'] },
    { i: 'py-while', t: 'While Loops',
      x: `<p>A <code>while</code> loop repeats as long as its condition is True. Make sure something changes inside the loop or it will never stop! <code>break</code> exits early and <code>continue</code> skips to the next turn.</p>`,
      e: [['Counting down', `n = 5
while n > 0:
    print(n)
    n -= 1
print("Lift off!")`]],
      q: ['Leave a loop early with ___.', 'while True:\n    ___', 'break'] },
    { i: 'py-for', t: 'For Loops & range()',
      x: `<p><code>for</code> walks through any sequence (a list, a string, a range). <code>range(5)</code> gives 0–4, <code>range(1, 6)</code> gives 1–5, and <code>range(0, 10, 2)</code> counts in steps of 2. <code>enumerate()</code> gives the index too.</p>`,
      e: [['Loop examples', `for i in range(1, 6):
    print("Number", i)
for letter in "code":
    print(letter)
for idx, fruit in enumerate(["mango", "kiwi"]):
    print(idx, fruit)`]],
      q: ['range(3) produces the numbers 0, 1 and ___.', 'list(range(3)) = [0, 1, ___]', '2'] }
  ]);
  add('python', 'Data Structures', [
    { i: 'py-lists', t: 'Lists',
      x: `<p>A list stores an ordered, changeable collection in square brackets. Indexes start at 0 (and <code>-1</code> is the last). Methods: <code>append</code>, <code>insert</code>, <code>remove</code>, <code>pop</code>, <code>sort</code>, <code>reverse</code>, <code>len()</code>.</p>`,
      e: [['List basics', `fruits = ["mango", "banana", "kiwi"]
fruits.append("apple")
fruits.remove("banana")
print(fruits)
print(fruits[0], fruits[-1])
print(sorted(fruits))
print(len(fruits))`]],
      q: ['Add an item to the end of a list with ___().', 'items.___("x")', 'append'] },
    { i: 'py-comprehension', t: 'List Comprehensions',
      x: `<p>A comprehension builds a new list in one readable line: <code>[expression for item in sequence if condition]</code>. It replaces many short loops.</p>`,
      e: [['Squares and filtering', `squares = [n * n for n in range(1, 8)]
print(squares)
evens = [n for n in range(20) if n % 2 == 0]
print(evens)
names = ["amina", "juma"]
print([n.title() for n in names])`]],
      q: ['[n*2 ___ n in range(3)] is a list comprehension.', '[n*2 ___ n in range(3)]', 'for'] },
    { i: 'py-tuples-sets', t: 'Tuples & Sets',
      x: `<p>A <strong>tuple</strong> <code>(1, 2)</code> is like a list that cannot change. A <strong>set</strong> <code>{1, 2}</code> stores unique values with no order — great for removing duplicates and for maths like union (<code>|</code>) and intersection (<code>&amp;</code>).</p>`,
      e: [['Tuples and sets', `point = (3, 4)
x, y = point
print(x, y)
nums = {1, 2, 2, 3, 3, 3}
print(nums)
a, b = {1, 2, 3}, {3, 4}
print(a | b, a & b)`]],
      q: ['A ___ stores only unique values.', '___ = {1, 1, 2}', 'set'] },
    { i: 'py-dicts', t: 'Dictionaries',
      x: `<p>A dictionary stores <strong>key: value</strong> pairs in curly braces. Look values up by key: <code>d["name"]</code>. Use <code>get()</code> for a safe lookup, <code>keys()</code>, <code>values()</code> and <code>items()</code> to loop.</p>`,
      e: [['A student record', `student = {"name": "Amina", "grade": "A", "score": 91}
student["city"] = "Dodoma"
print(student["name"])
print(student.get("age", "unknown"))
for key, value in student.items():
    print(key, "=", value)`]],
      q: ['Dictionaries store key ___ value pairs.', '{"name": "Amina"} has key: ___ pairs', 'value'] }
  ]);
  add('python', 'Functions & Classes', [
    { i: 'py-functions', t: 'Functions',
      x: `<p>Define a function with <code>def</code>. It can take parameters (with default values) and <code>return</code> a result. Functions make code reusable and easier to test.</p>`,
      e: [['Defining functions', `def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

def area(w, h):
    return w * h

print(greet("Amina"))
print(greet("Juma", "Karibu"))
print(area(4, 5))`]],
      q: ['A function is defined with the ___ keyword.', '___ hello():', 'def'] },
    { i: 'py-lambda', t: 'Lambda & Built-in Helpers',
      x: `<p>A <strong>lambda</strong> is a tiny one-line function: <code>lambda x: x * 2</code>. It pairs well with <code>map()</code>, <code>filter()</code> and <code>sorted(key=...)</code>. Other useful built-ins: <code>sum</code>, <code>min</code>, <code>max</code>, <code>zip</code>, <code>any</code>, <code>all</code>.</p>`,
      e: [['Lambda in action', `nums = [5, 2, 9, 1]
print(list(map(lambda n: n * 2, nums)))
print(sorted(nums, key=lambda n: -n))
words = ["kiwi", "banana", "fig"]
print(sorted(words, key=len))
print(sum(nums), min(nums), max(nums))`]],
      q: ['A one-line anonymous function is created with ___.', '___ x: x + 1', 'lambda'] },
    { i: 'py-classes', t: 'Classes & Objects',
      x: `<p>A class is a blueprint for objects. <code>__init__</code> runs when an object is created; <code>self</code> refers to the object itself. Data stored on an object is an <em>attribute</em>; functions inside a class are <em>methods</em>.</p>`,
      e: [['A Student class', `class Student:
    def __init__(self, name):
        self.name = name
        self.points = 0

    def add_points(self, n):
        self.points += n

    def __str__(self):
        return f"{self.name}: {self.points} points"

s = Student("Juma")
s.add_points(15)
print(s)`]],
      q: ['The first parameter of a method is conventionally called ___.', 'def add(___, n):', 'self'] },
    { i: 'py-inheritance', t: 'Inheritance',
      x: `<p>A class can inherit everything from a parent class: <code>class Child(Parent):</code>. Use <code>super()</code> to call the parent's version of a method and override only what is different.</p>`,
      e: [['Animals that speak', `class Animal:
    def __init__(self, name):
        self.name = name
    def speak(self):
        return "..."

class Dog(Animal):
    def speak(self):
        return f"{self.name} says Woof!"

for pet in [Animal("Generic"), Dog("Rex")]:
    print(pet.speak())`]],
      q: ['Call the parent class version of a method using ___().', '___().__init__(name)', 'super'] }
  ]);
  add('python', 'Going Further', [
    { i: 'py-modules', t: 'Modules & Packages',
      x: `<p>A module is a file of ready-made code. Bring it in with <code>import</code>. The standard library includes <code>math</code>, <code>random</code>, <code>datetime</code>, <code>json</code> and much more. In this editor, popular packages such as <code>numpy</code> are downloaded automatically when you import them.</p>`,
      e: [['random and datetime', `import random
from datetime import date

print(random.randint(1, 6))
print(random.choice(["red", "green", "blue"]))
print(date(2026, 5, 20).strftime("%A, %d %B %Y"))`]],
      q: ['Bring in a module with the ___ keyword.', '___ random', 'import'] },
    { i: 'py-errors', t: 'Errors: try / except',
      x: `<p>When Python hits a problem it raises an exception and stops. Catch it with <code>try</code>/<code>except</code> so your program keeps running. <code>else</code> runs if no error happened, <code>finally</code> always runs, and <code>raise</code> creates your own error.</p>`,
      e: [['Handling bad input', `def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return "Cannot divide by zero"

print(safe_divide(10, 2))
print(safe_divide(10, 0))
try:
    int("abc")
except ValueError as err:
    print("Caught:", err)`]],
      q: ['Handle an error in the ___ block.', 'try:\n    pass\n___ ValueError:\n    pass', 'except'] },
    { i: 'py-input', t: 'User Input',
      x: `<p><code>input("prompt")</code> reads a line typed by the user and always returns a <em>string</em> — convert it with <code>int()</code> or <code>float()</code> when you need a number. In the editor, type your answers (one per line) into the <strong>Input</strong> box below the code before pressing Run.</p>`,
      e: [['Reading input (fill the Input box: Amina, then 12)', `name = input("What is your name? ")
age = int(input("How old are you? "))
print(f"Hello {name}! Next year you will be {age + 1}.")`]],
      q: ['input() always returns a ___.', 'type(input()) is <class "___">', 'str'] },
    { i: 'py-json', t: 'JSON & Files',
      x: `<p>The <code>json</code> module converts between Python data and JSON text: <code>json.dumps()</code> makes text, <code>json.loads()</code> reads it. Files are opened with <code>open()</code> inside a <code>with</code> block, which closes them for you. (In the browser, files live in temporary memory and vanish on refresh.)</p>`,
      e: [['JSON and a temporary file', `import json

data = {"name": "Amina", "scores": [91, 88]}
text = json.dumps(data, indent=2)
print(text)

with open("notes.txt", "w") as f:
    f.write("Line one\\nLine two\\n")
with open("notes.txt") as f:
    print(f.read())`]],
      q: ['Turn a Python dict into JSON text with json.___().', 'json.___(data)', 'dumps'] }
  ]);

  /* ================================================================= SQL */
  var DB_NOTE = ' The editor comes with a sample school database: <code>students</code>, <code>courses</code> and <code>enrollments</code>. Press Restore Database any time to reset it.';
  add('sql', 'Getting Started', [
    { i: 'sql-intro', t: 'SQL Introduction',
      x: `<p><strong>SQL</strong> (Structured Query Language) is how you talk to databases. A database stores data in <em>tables</em> made of rows and columns. With SQL you can read, add, change and delete data. It powers most websites, apps and businesses.</p><p>These queries run for real in your browser using SQLite.${DB_NOTE}</p>`,
      e: [['Look at every student', `SELECT * FROM students;`]],
      q: ['SQL stands for Structured ___ Language.', 'Structured ___ Language', 'Query'] },
    { i: 'sql-select', t: 'SELECT',
      x: `<p><code>SELECT</code> chooses which columns to show and <code>FROM</code> names the table. Use <code>*</code> for all columns. <code>DISTINCT</code> removes duplicates. Keywords are not case-sensitive, but capitals make queries easier to read.</p>`,
      e: [['Pick columns', `SELECT name, city FROM students;`], ['Unique values only', `SELECT DISTINCT city FROM students;`]],
      q: ['Choose columns with the ___ keyword.', '___ name FROM students;', 'SELECT'] }
  ]);
  add('sql', 'Filtering & Sorting', [
    { i: 'sql-where', t: 'WHERE',
      x: `<p><code>WHERE</code> keeps only rows that match a condition. Compare with <code>= &lt;&gt; &gt; &lt; &gt;= &lt;=</code>. Text values go in single quotes. Combine conditions with <code>AND</code>, <code>OR</code> and <code>NOT</code>.</p>`,
      e: [['Students with a high score', `SELECT name, score FROM students
WHERE score >= 85;`], ['Combine conditions', `SELECT name, city, score FROM students
WHERE city = 'Dodoma' AND score > 70;`]],
      q: ['Filter rows with the ___ clause.', 'SELECT * FROM students ___ score > 80;', 'WHERE'] },
    { i: 'sql-like-in', t: 'LIKE, IN & BETWEEN',
      x: `<p><code>LIKE</code> searches for patterns: <code>%</code> matches any number of characters and <code>_</code> matches one. <code>IN (...)</code> matches any value in a list, and <code>BETWEEN a AND b</code> matches a range (inclusive).</p>`,
      e: [['Names starting with A', `SELECT name FROM students WHERE name LIKE 'A%';`], ['IN and BETWEEN', `SELECT name, city, score FROM students
WHERE city IN ('Arusha', 'Mwanza')
   OR score BETWEEN 60 AND 70;`]],
      q: ['LIKE \'A%\' finds text that ___ with A.', 'name LIKE \'A___\'', '%'] },
    { i: 'sql-order', t: 'ORDER BY & LIMIT',
      x: `<p><code>ORDER BY</code> sorts results — ascending by default, or add <code>DESC</code> for descending. <code>LIMIT</code> caps the number of rows, perfect for "top 3" lists.</p>`,
      e: [['Top three scores', `SELECT name, score FROM students
ORDER BY score DESC
LIMIT 3;`]],
      q: ['Sort from highest to lowest with ORDER BY score ___.', 'ORDER BY score ___', 'DESC'] },
    { i: 'sql-alias', t: 'Aliases & Expressions',
      x: `<p><code>AS</code> gives a column or table a temporary, friendlier name. You can also calculate new columns straight in the query.</p>`,
      e: [['Rename and calculate', `SELECT name AS student,
       score,
       score + 5 AS boosted_score
FROM students
ORDER BY boosted_score DESC
LIMIT 5;`]],
      q: ['Give a column a temporary name using ___.', 'SELECT score ___ points FROM students;', 'AS'] }
  ]);
  add('sql', 'Changing Data', [
    { i: 'sql-insert', t: 'INSERT INTO',
      x: `<p><code>INSERT INTO</code> adds a new row. List the columns, then the matching <code>VALUES</code>. Run the query, then a <code>SELECT</code> to see your new row.</p>`,
      e: [['Add a student', `INSERT INTO students (name, grade, score, city, course_id)
VALUES ('Baraka', 'B', 74, 'Dodoma', 1);

SELECT * FROM students ORDER BY id DESC LIMIT 3;`]],
      q: ['Add a new row with INSERT ___ table.', 'INSERT ___ students (name) VALUES (\'A\');', 'INTO'] },
    { i: 'sql-update', t: 'UPDATE',
      x: `<p><code>UPDATE</code> changes existing rows with <code>SET</code>. <strong>Always add a WHERE</strong> — without it every row in the table changes!</p>`,
      e: [['Improve one score', `UPDATE students
SET score = 95, grade = 'A'
WHERE name = 'Juma';

SELECT name, grade, score FROM students WHERE name = 'Juma';`]],
      q: ['Change values with UPDATE table ___ column = value.', 'UPDATE students ___ score = 90 WHERE id = 1;', 'SET'] },
    { i: 'sql-delete', t: 'DELETE',
      x: `<p><code>DELETE FROM</code> removes rows. Like UPDATE, forgetting <code>WHERE</code> deletes everything. Test with a <code>SELECT</code> first to see exactly which rows match.</p>`,
      e: [['Remove low scores', `DELETE FROM students WHERE score < 50;
SELECT COUNT(*) AS students_left FROM students;`]],
      q: ['Remove rows with ___ FROM table WHERE ...', '___ FROM students WHERE id = 3;', 'DELETE'] }
  ]);
  add('sql', 'Summaries & Joins', [
    { i: 'sql-aggregate', t: 'COUNT, SUM, AVG, MIN, MAX',
      x: `<p>Aggregate functions turn many rows into one answer: <code>COUNT()</code>, <code>SUM()</code>, <code>AVG()</code>, <code>MIN()</code> and <code>MAX()</code>.</p>`,
      e: [['Class statistics', `SELECT COUNT(*) AS total,
       ROUND(AVG(score), 1) AS average,
       MIN(score) AS lowest,
       MAX(score) AS highest
FROM students;`]],
      q: ['Find the average with the ___() function.', 'SELECT ___(score) FROM students;', 'AVG'] },
    { i: 'sql-group', t: 'GROUP BY & HAVING',
      x: `<p><code>GROUP BY</code> splits rows into groups so aggregates run once per group. <code>HAVING</code> filters the <em>groups</em> (WHERE filters rows before grouping).</p>`,
      e: [['Average score per city', `SELECT city, COUNT(*) AS students, ROUND(AVG(score), 1) AS avg_score
FROM students
GROUP BY city
HAVING COUNT(*) >= 2
ORDER BY avg_score DESC;`]],
      q: ['Make one result row per city with GROUP ___ city.', 'GROUP ___ city', 'BY'] },
    { i: 'sql-join', t: 'JOIN',
      x: `<p>A <code>JOIN</code> combines rows from two tables that share a value — usually an id. <code>INNER JOIN</code> keeps only matches; <code>LEFT JOIN</code> keeps every row from the left table even with no match (missing values show as NULL).</p>`,
      e: [['Students with their course', `SELECT students.name, courses.title, courses.teacher
FROM students
JOIN courses ON students.course_id = courses.id
ORDER BY courses.title;`], ['Courses nobody joined (LEFT JOIN)', `SELECT courses.title, COUNT(students.id) AS students
FROM courses
LEFT JOIN students ON students.course_id = courses.id
GROUP BY courses.title;`]],
      q: ['Combine two tables with the ___ keyword.', 'FROM a ___ b ON a.id = b.a_id', 'JOIN'] },
    { i: 'sql-subquery', t: 'Subqueries',
      x: `<p>A subquery is a query inside another query, in parentheses. It lets you compare against a calculated value — such as "students who scored above the average".</p>`,
      e: [['Above the average', `SELECT name, score FROM students
WHERE score > (SELECT AVG(score) FROM students)
ORDER BY score DESC;`]],
      q: ['A query written inside brackets inside another query is a ___.', 'WHERE x > (SELECT AVG(x) FROM t) is a ___', 'subquery'] }
  ]);
  add('sql', 'Tables', [
    { i: 'sql-create', t: 'CREATE TABLE',
      x: `<p><code>CREATE TABLE</code> makes a new table. Each column has a name and a type (<code>INTEGER</code>, <code>TEXT</code>, <code>REAL</code>). Add rules: <code>PRIMARY KEY</code> (unique id), <code>NOT NULL</code> (must have a value), <code>UNIQUE</code> and <code>DEFAULT</code>.</p>`,
      e: [['Make and fill a table', `DROP TABLE IF EXISTS books;
CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  pages INTEGER DEFAULT 100
);
INSERT INTO books (title, pages) VALUES ('Learn SQL', 250), ('Story Time', 80);
SELECT * FROM books;`]],
      q: ['Make a new table with ___ TABLE name (...).', '___ TABLE books (id INTEGER);', 'CREATE'] }
  ]);
})(window.S21C);
