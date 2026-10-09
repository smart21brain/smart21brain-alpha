/* Smart21Code — lesson data: C++ (programs are compiled with a real g++ compiler when you press Run).
   All lesson text and examples are original Smart21Brain content.
   Lesson shape: { i:id, g:group, t:title, x:explanation(html), e:[[caption, code, optionalInput], ...], q:[prompt, template-with-___, answer] }
   Code is written with String.raw so that \n inside C++ strings stays as \n. */
window.S21C = window.S21C || { langs: [], lessons: {}, refs: {} };
(function (S) {
  var c = String.raw;

  (function () {
    var cpp = { id: 'cpp', name: 'C++', color: '#00599C', icon: 'fa-code', tag: 'Fast, powerful programs', mode: 'text/x-c++src', run: 'cpp' };
    var at = -1;
    S.langs.forEach(function (l, i) { if (l.id === 'python') at = i; });
    S.langs.splice(at + 1, 0, cpp);   // show C++ right after Python
  })();

  function add(lang, group, list) {
    S.lessons[lang] = S.lessons[lang] || [];
    list.forEach(function (l) { l.g = group; S.lessons[lang].push(l); });
  }

  /* ============================================================ Getting Started */
  add('cpp', 'Getting Started', [
    { i: 'cpp-intro', t: 'C++ Introduction',
      x: `<p><strong>C++</strong> is a fast, powerful programming language used to build games, operating systems, browsers, banking software, robots and much more. It grew out of the C language and adds features such as classes and a big standard library.</p>
<ul><li>C++ is a <strong>compiled</strong> language: a compiler turns your code into a program the computer can run</li><li>It is very fast and gives you control over memory</li><li>It is a great way to learn how computers really work</li></ul>
<p>When you press <strong>Run</strong> in this tutorial, your code is sent to a real C++ compiler (g++) and the output comes back into the Result panel. You need an internet connection for this.</p>`,
      e: [['Your first C++ program', c`#include <iostream>
using namespace std;

int main() {
  cout << "Hello, Smart21Code!" << endl;
  return 0;
}`]],
      q: ['C++ code must be ___ before it can run.', 'C++ is a ___ language', 'compiled'] },
    { i: 'cpp-syntax', t: 'Syntax: Anatomy of a Program', 
      x: `<p>Every C++ program has the same skeleton. Look at each line:</p>
<ul><li><code>#include &lt;iostream&gt;</code> brings in the input/output library</li><li><code>using namespace std;</code> lets you write <code>cout</code> instead of <code>std::cout</code></li><li><code>int main()</code> is where every program <strong>starts</strong></li><li><code>{ }</code> curly braces hold a block of code</li><li>Each statement ends with a semicolon <code>;</code></li></ul>
<p>Forgetting a semicolon is the most common beginner error. The compiler will tell you which line to look at.</p>`,
      e: [['Statements end with semicolons', c`#include <iostream>
using namespace std;

int main() {
  cout << "One" << endl;
  cout << "Two" << endl;
  return 0;
}`]],
      q: ['Every C++ statement ends with a ___.', 'cout << "Hi"___', ';'] },
    { i: 'cpp-output', t: 'Output with cout',
      x: `<p>Use <code>cout</code> (say "see-out") with the <strong>insertion operator</strong> <code>&lt;&lt;</code> to print. You can chain many pieces together.</p>
<ul><li><code>endl</code> or <code>"\\n"</code> starts a new line</li><li>Text goes in double quotes</li><li>Numbers need no quotes and can be calculated</li></ul>`,
      e: [['Printing text and numbers', c`#include <iostream>
using namespace std;

int main() {
  cout << "I am " << 12 << " years old." << endl;
  cout << "2 + 3 = " << 2 + 3 << "\n";
  cout << "Line one\nLine two\n";
  return 0;
}`]],
      q: ['The ___ object prints to the screen.', '___ << "Hello";', 'cout'] },
    { i: 'cpp-comments', t: 'Comments',
      x: `<p>Comments are notes for people; the compiler ignores them.</p>
<ul><li><code>// ...</code> a single-line comment</li><li><code>/* ... */</code> a comment that can span many lines</li></ul>
<p>Good comments explain <em>why</em> the code does something, not just what it does.</p>`,
      e: [['Two kinds of comments', c`#include <iostream>
using namespace std;

int main() {
  // This line is ignored
  cout << "Hello" << endl;  // a comment after code
  /* This comment
     covers two lines */
  return 0;
}`]],
      q: ['A single-line comment starts with ___.', '___ my note', '//'] }
  ]);

  /* ============================================================ Basics */
  add('cpp', 'Variables & Data', [
    { i: 'cpp-variables', t: 'Variables',
      x: `<p>A variable is a named box that stores a value. In C++ you must state the <strong>type</strong> when you create it.</p>
<ul><li><code>int age = 12;</code> whole numbers</li><li><code>double price = 4.5;</code> decimal numbers</li><li><code>char grade = 'A';</code> one character (single quotes)</li><li><code>string name = "Amina";</code> text (needs <code>#include &lt;string&gt;</code>)</li><li><code>bool passed = true;</code> true or false</li></ul>
<p>You can change a variable's value later, but not its type.</p>`,
      e: [['Creating and changing variables', c`#include <iostream>
#include <string>
using namespace std;

int main() {
  string name = "Amina";
  int age = 12;
  double height = 1.45;
  bool student = true;

  cout << name << " is " << age << " and " << height << "m tall." << endl;
  age = 13;
  cout << "Next year: " << age << endl;
  cout << "Student? " << student << endl;
  return 0;
}`]],
      q: ['Whole numbers are stored in the ___ type.', '___ age = 12;', 'int'] },
    { i: 'cpp-types', t: 'Data Types & Constants',
      x: `<p>Different types use different amounts of memory. <code>sizeof</code> tells you how many bytes a type uses.</p>
<ul><li><code>int</code> usually 4 bytes, <code>double</code> 8 bytes, <code>char</code> 1 byte, <code>bool</code> 1 byte</li><li><code>long long</code> holds very big whole numbers</li></ul>
<p>Add <code>const</code> to make a value that can never change. Dividing two <code>int</code>s throws away the decimal part, so <code>7 / 2</code> is <code>3</code>.</p>`,
      e: [['Sizes, const and integer division', c`#include <iostream>
using namespace std;

int main() {
  const double PI = 3.14159;
  cout << "int: " << sizeof(int) << " bytes" << endl;
  cout << "double: " << sizeof(double) << " bytes" << endl;
  cout << "char: " << sizeof(char) << " byte" << endl;

  cout << "7 / 2 = " << 7 / 2 << endl;
  cout << "7 / 2.0 = " << 7 / 2.0 << endl;
  cout << "PI = " << PI << endl;
  return 0;
}`]],
      q: ['A value that can never change is declared with ___.', '___ int DAYS = 7;', 'const'] },
    { i: 'cpp-operators', t: 'Operators',
      x: `<p>Operators do work on values.</p>
<ul><li>Arithmetic: <code>+ - * / %</code> (<code>%</code> is the remainder)</li><li>Shortcuts: <code>x += 5</code>, <code>x++</code> (add 1), <code>x--</code></li><li>Comparison: <code>== != &lt; &gt; &lt;= &gt;=</code> give <code>true</code> or <code>false</code></li><li>Logical: <code>&amp;&amp;</code> (and), <code>||</code> (or), <code>!</code> (not)</li></ul>
<p>Careful: <code>=</code> assigns a value, <code>==</code> compares two values.</p>`,
      e: [['Arithmetic, comparison and logic', c`#include <iostream>
using namespace std;

int main() {
  int a = 17, b = 5;
  cout << a + b << " " << a - b << " " << a * b << endl;
  cout << a / b << " remainder " << a % b << endl;

  int x = 10;
  x += 5;
  x++;
  cout << "x = " << x << endl;

  cout << (a > b) << endl;
  cout << (a > 10 && b > 10) << endl;
  cout << (a > 10 || b > 10) << endl;
  return 0;
}`]],
      q: ['The ___ operator gives the remainder of a division.', '17 ___ 5', '%'] },
    { i: 'cpp-input', t: 'User Input with cin',
      x: `<p><code>cin</code> reads what the user types. It uses the <strong>extraction operator</strong> <code>&gt;&gt;</code> (the arrows point <em>into</em> the variable).</p>
<p>In this tutorial there is no keyboard prompt while the program runs. Instead, type everything the user would enter into the <strong>Input</strong> box under the code (one value per line, or separated by spaces) <em>before</em> pressing Run. The examples already have input filled in for you.</p>
<p><code>cin &gt;&gt; name</code> stops at the first space. To read a whole line, use <code>getline(cin, name)</code>.</p>`,
      e: [['Reading a name and a number', c`#include <iostream>
#include <string>
using namespace std;

int main() {
  string name;
  int age;
  cout << "Name? ";
  cin >> name;
  cout << "Age? ";
  cin >> age;
  cout << "Hi " << name << "! Next year you will be " << age + 1 << "." << endl;
  return 0;
}`, 'Amina\n12'],
        ['Reading a full line', c`#include <iostream>
#include <string>
using namespace std;

int main() {
  string fullName;
  cout << "Full name? ";
  getline(cin, fullName);
  cout << "Welcome, " << fullName << "!" << endl;
  return 0;
}`, 'Amina Juma']],
      q: ['Read a value from the keyboard with ___.', '___ >> age;', 'cin'] },
    { i: 'cpp-strings', t: 'Strings',
      x: `<p>A <code>string</code> holds text and comes with many helpful functions. Add strings together with <code>+</code>.</p>
<ul><li><code>s.length()</code> or <code>s.size()</code>: number of characters</li><li><code>s[0]</code>: the first character (counting starts at 0)</li><li><code>s.substr(start, count)</code>: a piece of the string</li><li><code>s.find("x")</code>: position of the text, or <code>string::npos</code> if missing</li></ul>`,
      e: [['Working with strings', c`#include <iostream>
#include <string>
using namespace std;

int main() {
  string first = "Smart";
  string second = "21Code";
  string all = first + second;

  cout << all << endl;
  cout << "Length: " << all.length() << endl;
  cout << "First letter: " << all[0] << endl;
  cout << "Piece: " << all.substr(5, 2) << endl;
  cout << "Found at: " << all.find("Code") << endl;

  all[0] = 's';
  cout << all << endl;
  return 0;
}`]],
      q: ['Get the number of characters with s.___().', 's.___()', 'length'] },
    { i: 'cpp-math', t: 'Math Functions',
      x: `<p>Add <code>#include &lt;cmath&gt;</code> for maths tools, and <code>#include &lt;algorithm&gt;</code> for <code>min</code> and <code>max</code>.</p>
<ul><li><code>sqrt(x)</code> square root, <code>pow(x, y)</code> power</li><li><code>abs(x)</code> absolute value, <code>round(x)</code>, <code>ceil(x)</code>, <code>floor(x)</code></li><li><code>max(a, b)</code> and <code>min(a, b)</code></li></ul>
<p>Random numbers use <code>rand()</code> from <code>&lt;cstdlib&gt;</code>; <code>rand() % 6 + 1</code> mimics a dice roll.</p>`,
      e: [['Common maths functions', c`#include <iostream>
#include <cmath>
#include <algorithm>
using namespace std;

int main() {
  cout << sqrt(64) << endl;
  cout << pow(2, 10) << endl;
  cout << round(3.6) << " " << ceil(3.2) << " " << floor(3.9) << endl;
  cout << max(8, 21) << " " << min(8, 21) << endl;
  cout << abs(-7) << endl;
  return 0;
}`]],
      q: ['The ___ function finds a square root.', '___(81)', 'sqrt'] }
  ]);

  /* ============================================================ Control flow */
  add('cpp', 'Decisions & Loops', [
    { i: 'cpp-if', t: 'If ... Else',
      x: `<p>Use <code>if</code> to run code only when a condition is true. Add <code>else if</code> for more choices and <code>else</code> for "everything else".</p>
<p>The condition goes in parentheses and the code to run goes in braces.</p>`,
      e: [['Grading a score', c`#include <iostream>
using namespace std;

int main() {
  int score = 74;

  if (score >= 80) {
    cout << "Grade A" << endl;
  } else if (score >= 60) {
    cout << "Grade B" << endl;
  } else if (score >= 40) {
    cout << "Grade C" << endl;
  } else {
    cout << "Try again" << endl;
  }

  string result = (score >= 40) ? "Pass" : "Fail";
  cout << result << endl;
  return 0;
}`]],
      q: ['Code that runs when the if condition is false goes in ___.', 'if (x > 5) { } ___ { }', 'else'] },
    { i: 'cpp-switch', t: 'Switch',
      x: `<p><code>switch</code> picks one of many branches by comparing a value with each <code>case</code>. End each case with <code>break</code>, otherwise C++ keeps running into the next case. <code>default</code> runs when nothing matches.</p>`,
      e: [['Day of the week', c`#include <iostream>
using namespace std;

int main() {
  int day = 3;
  switch (day) {
    case 1: cout << "Monday" << endl; break;
    case 2: cout << "Tuesday" << endl; break;
    case 3: cout << "Wednesday" << endl; break;
    default: cout << "Some other day" << endl;
  }
  return 0;
}`]],
      q: ['Use ___ to leave a switch case.', 'case 1: cout << "One"; ___;', 'break'] },
    { i: 'cpp-while', t: 'While Loops',
      x: `<p>A <code>while</code> loop repeats as long as its condition is true. Make sure something inside the loop changes the condition, or it will run forever.</p>
<p>A <code>do ... while</code> loop always runs at least once, because it checks the condition at the end.</p>`,
      e: [['Counting and summing', c`#include <iostream>
using namespace std;

int main() {
  int i = 1;
  while (i <= 5) {
    cout << "Count: " << i << endl;
    i++;
  }

  int total = 0, n = 1;
  do {
    total += n;
    n++;
  } while (n <= 10);
  cout << "Sum of 1 to 10 = " << total << endl;
  return 0;
}`]],
      q: ['A ___ loop runs at least once.', 'do { } ___ (x < 5);', 'while'] },
    { i: 'cpp-for', t: 'For Loops',
      x: `<p>A <code>for</code> loop puts the start, the condition and the step on one line: <code>for (start; condition; step)</code>. Use it when you know how many times to repeat.</p>
<p>Loops can sit inside loops. That is how you make tables and patterns.</p>`,
      e: [['Times table', c`#include <iostream>
using namespace std;

int main() {
  for (int i = 1; i <= 5; i++) {
    cout << "7 x " << i << " = " << 7 * i << endl;
  }
  return 0;
}`],
        ['A star triangle (loop inside loop)', c`#include <iostream>
using namespace std;

int main() {
  for (int row = 1; row <= 5; row++) {
    for (int col = 1; col <= row; col++) {
      cout << "* ";
    }
    cout << endl;
  }
  return 0;
}`]],
      q: ['A ___ loop has start, condition and step on one line.', '___ (int i = 0; i < 3; i++)', 'for'] },
    { i: 'cpp-break', t: 'Break & Continue',
      x: `<ul><li><code>break</code> stops the loop completely</li><li><code>continue</code> skips the rest of this round and jumps to the next one</li></ul>`,
      e: [['Skipping and stopping', c`#include <iostream>
using namespace std;

int main() {
  for (int i = 1; i <= 10; i++) {
    if (i == 3) continue;   // skip 3
    if (i == 7) break;      // stop at 7
    cout << i << " ";
  }
  cout << endl;
  return 0;
}`]],
      q: ['___ skips to the next round of a loop.', 'if (i == 3) ___;', 'continue'] }
  ]);

  /* ============================================================ Functions & data */
  add('cpp', 'Functions & Collections', [
    { i: 'cpp-functions', t: 'Functions',
      x: `<p>A function is a named block of code you can use again and again. It has a <strong>return type</strong>, a name and optional <strong>parameters</strong>.</p>
<ul><li><code>void</code> means "returns nothing"</li><li><code>return</code> sends a value back to the caller</li><li>A function must be declared <em>before</em> it is used, or you can write a prototype at the top</li></ul>
<p><strong>Overloading:</strong> you can have several functions with the same name if their parameters differ. Default values, like <code>int b = 10</code>, let callers leave arguments out.</p>`,
      e: [['Writing and calling functions', c`#include <iostream>
using namespace std;

int add(int a, int b) {
  return a + b;
}

double add(double a, double b) {   // overloaded
  return a + b;
}

void greet(string name, string greeting = "Hello") {
  cout << greeting << ", " << name << "!" << endl;
}

int main() {
  cout << add(3, 4) << endl;
  cout << add(2.5, 1.5) << endl;
  greet("Amina");
  greet("Juma", "Karibu");
  return 0;
}`]],
      q: ['A function that returns nothing has the return type ___.', '___ sayHi() { }', 'void'] },
    { i: 'cpp-references', t: 'Pass by Value & Reference',
      x: `<p>By default C++ passes a <strong>copy</strong> of each argument, so the function cannot change the original. Add <code>&amp;</code> to the parameter to pass a <strong>reference</strong> — a second name for the same variable.</p>
<p>References are also useful for big objects (like strings) because they avoid making a copy. Add <code>const</code> if the function should only read it.</p>`,
      e: [['Copy versus reference', c`#include <iostream>
using namespace std;

void addOneCopy(int n) {
  n = n + 1;
}

void addOneRef(int &n) {
  n = n + 1;
}

int main() {
  int x = 5;
  addOneCopy(x);
  cout << "After copy: " << x << endl;
  addOneRef(x);
  cout << "After reference: " << x << endl;
  return 0;
}`]],
      q: ['A reference parameter uses the ___ symbol.', 'void change(int ___n)', '&'] },
    { i: 'cpp-arrays', t: 'Arrays',
      x: `<p>An array stores several values of the same type. The size is fixed when you create it, and positions (<strong>indexes</strong>) start at 0.</p>
<p>C++ does not stop you from reading past the end of an array, so keep your loops inside the size. A <em>range-based for loop</em> visits every item safely.</p>`,
      e: [['Creating and looping over an array', c`#include <iostream>
using namespace std;

int main() {
  int scores[5] = {70, 85, 60, 92, 78};
  int total = 0;

  cout << "First: " << scores[0] << endl;
  scores[2] = 65;

  for (int i = 0; i < 5; i++) {
    total += scores[i];
  }
  cout << "Total: " << total << endl;
  cout << "Average: " << total / 5.0 << endl;

  for (int s : scores) {
    cout << s << " ";
  }
  cout << endl;
  return 0;
}`]],
      q: ['The first item of an array has index ___.', 'int a[3] = {5, 6, 7}; cout << a[___];', '0'] },
    { i: 'cpp-vectors', t: 'Vectors',
      x: `<p>A <code>vector</code> is an array that can grow and shrink. Add <code>#include &lt;vector&gt;</code>.</p>
<ul><li><code>push_back(x)</code> adds to the end, <code>pop_back()</code> removes the last item</li><li><code>size()</code> counts the items, <code>empty()</code> checks if it is empty</li><li><code>v[i]</code> or <code>v.at(i)</code> reads an item</li></ul>
<p>In most programs a vector is a better choice than a plain array.</p>`,
      e: [['A growing list', c`#include <iostream>
#include <vector>
using namespace std;

int main() {
  vector<string> fruits = {"mango", "banana"};
  fruits.push_back("orange");
  fruits.push_back("pawpaw");
  fruits.pop_back();

  cout << "Count: " << fruits.size() << endl;
  for (string f : fruits) {
    cout << "- " << f << endl;
  }
  return 0;
}`]],
      q: ['Add an item to the end of a vector with ___().', 'v.___(10);', 'push_back'] }
  ]);

  /* ============================================================ Memory */
  add('cpp', 'Pointers & Memory', [
    { i: 'cpp-pointers', t: 'Pointers',
      x: `<p>Every variable lives at an <strong>address</strong> in memory. A <strong>pointer</strong> is a variable that stores an address.</p>
<ul><li><code>&amp;x</code> is "the address of x"</li><li><code>int* p</code> declares a pointer to an int</li><li><code>*p</code> follows the pointer to the value (this is called <em>dereferencing</em>)</li><li><code>nullptr</code> means "points to nothing"</li></ul>
<p>Addresses change every time you run a program, so do not rely on the numbers you see.</p>`,
      e: [['Reading and changing through a pointer', c`#include <iostream>
using namespace std;

int main() {
  int score = 50;
  int* p = &score;

  cout << "Value: " << score << endl;
  cout << "Through pointer: " << *p << endl;

  *p = 99;
  cout << "Score is now: " << score << endl;

  int* nothing = nullptr;
  cout << (nothing == nullptr) << endl;
  return 0;
}`]],
      q: ['The ___ operator gives the address of a variable.', 'int* p = ___x;', '&'] },
    { i: 'cpp-dynamic', t: 'Dynamic Memory',
      x: `<p>Normal variables disappear when their block ends. With <code>new</code> you ask for memory that stays until you give it back with <code>delete</code>. Use <code>new[]</code> and <code>delete[]</code> for arrays.</p>
<p>If you forget <code>delete</code>, memory is wasted (a <strong>memory leak</strong>). Modern C++ prefers <code>vector</code> and smart pointers such as <code>unique_ptr</code> from <code>&lt;memory&gt;</code>, which clean up for you.</p>`,
      e: [['new and delete', c`#include <iostream>
using namespace std;

int main() {
  int* number = new int(42);
  cout << *number << endl;
  delete number;

  int size = 4;
  int* list = new int[size];
  for (int i = 0; i < size; i++) list[i] = (i + 1) * 10;
  for (int i = 0; i < size; i++) cout << list[i] << " ";
  cout << endl;
  delete[] list;
  return 0;
}`],
        ['Smart pointer: no delete needed', c`#include <iostream>
#include <memory>
using namespace std;

int main() {
  unique_ptr<int> p = make_unique<int>(7);
  cout << *p << endl;
  return 0;   // memory is freed automatically
}`]],
      q: ['Free memory created with new by using ___.', 'int* p = new int; ___ p;', 'delete'] }
  ]);

  /* ============================================================ OOP */
  add('cpp', 'Object-Oriented C++', [
    { i: 'cpp-classes', t: 'Classes & Objects',
      x: `<p>A <strong>class</strong> is a blueprint. An <strong>object</strong> is one thing built from it. A class bundles <em>data</em> (attributes) and <em>functions</em> (methods) together.</p>
<ul><li>Create an object: <code>Student amina;</code></li><li>Use the dot to reach members: <code>amina.name</code></li><li>Do not forget the semicolon after the closing brace of a class</li></ul>`,
      e: [['A simple class', c`#include <iostream>
#include <string>
using namespace std;

class Student {
public:
  string name;
  int age;

  void introduce() {
    cout << "Hi, I am " << name << ", age " << age << "." << endl;
  }
};

int main() {
  Student a;
  a.name = "Amina";
  a.age = 12;

  Student b;
  b.name = "Juma";
  b.age = 13;

  a.introduce();
  b.introduce();
  return 0;
}`]],
      q: ['An object is built from a ___.', '___ Car { };', 'class'] },
    { i: 'cpp-constructors', t: 'Constructors',
      x: `<p>A <strong>constructor</strong> is a special function that runs automatically when an object is created. It has the same name as the class and no return type. Use it to set up starting values.</p>
<p>A <strong>destructor</strong> (<code>~ClassName</code>) runs when the object is destroyed.</p>`,
      e: [['Constructor with parameters', c`#include <iostream>
#include <string>
using namespace std;

class Book {
public:
  string title;
  int pages;

  Book(string t, int p) {
    title = t;
    pages = p;
    cout << "Created: " << title << endl;
  }

  ~Book() {
    cout << "Destroyed: " << title << endl;
  }
};

int main() {
  Book b("Sungura na Fisi", 32);
  cout << b.title << " has " << b.pages << " pages." << endl;
  return 0;
}`]],
      q: ['A constructor has the same name as its ___.', 'class Car { public: ___() { } };', 'Car'] },
    { i: 'cpp-encapsulation', t: 'Encapsulation (private & public)',
      x: `<p><strong>Encapsulation</strong> means protecting data inside a class so it can only be changed in safe ways.</p>
<ul><li><code>private</code> members can only be used inside the class (this is the default)</li><li><code>public</code> members can be used from anywhere</li></ul>
<p>The usual pattern: keep data <code>private</code> and give <strong>getter</strong> and <strong>setter</strong> functions that can check the values.</p>`,
      e: [['A safe bank account', c`#include <iostream>
using namespace std;

class Account {
private:
  double balance = 0;

public:
  void deposit(double amount) {
    if (amount > 0) balance += amount;
  }
  bool withdraw(double amount) {
    if (amount <= 0 || amount > balance) return false;
    balance -= amount;
    return true;
  }
  double getBalance() {
    return balance;
  }
};

int main() {
  Account acc;
  acc.deposit(5000);
  acc.withdraw(1200);
  cout << "Balance: " << acc.getBalance() << endl;

  if (!acc.withdraw(99999)) cout << "Not enough money" << endl;
  // acc.balance = 1000000;   // error: balance is private
  return 0;
}`]],
      q: ['Members that only the class itself can use are ___.', '___: int secret;', 'private'] },
    { i: 'cpp-inheritance', t: 'Inheritance',
      x: `<p><strong>Inheritance</strong> lets a new class (the <em>child</em> or derived class) reuse everything from an existing class (the <em>parent</em> or base class). Write <code>class Child : public Parent</code>.</p>
<p>This avoids repeating code: put shared things in the parent and only the differences in the child.</p>`,
      e: [['Animals share behaviour', c`#include <iostream>
#include <string>
using namespace std;

class Animal {
public:
  string name;
  void eat() {
    cout << name << " is eating." << endl;
  }
};

class Dog : public Animal {
public:
  void bark() {
    cout << name << " says Woof!" << endl;
  }
};

int main() {
  Dog d;
  d.name = "Simba";
  d.eat();    // inherited from Animal
  d.bark();   // defined in Dog
  return 0;
}`]],
      q: ['A class inherits from another using the ___ sign.', 'class Dog ___ public Animal', ':'] },
    { i: 'cpp-polymorphism', t: 'Polymorphism & Virtual Functions',
      x: `<p><strong>Polymorphism</strong> means "many forms": the same call behaves differently depending on the real type of the object. Mark the parent function <code>virtual</code> and replace it in the child (use <code>override</code> so the compiler checks you).</p>
<p>It shines when you hold different objects through the same parent pointer.</p>`,
      e: [['Different shapes, same call', c`#include <iostream>
using namespace std;

class Shape {
public:
  virtual double area() { return 0; }
  virtual ~Shape() {}
};

class Rectangle : public Shape {
  double w, h;
public:
  Rectangle(double w, double h) : w(w), h(h) {}
  double area() override { return w * h; }
};

class Circle : public Shape {
  double r;
public:
  Circle(double r) : r(r) {}
  double area() override { return 3.14159 * r * r; }
};

int main() {
  Shape* shapes[2] = { new Rectangle(4, 5), new Circle(3) };
  for (int i = 0; i < 2; i++) {
    cout << "Area: " << shapes[i]->area() << endl;
    delete shapes[i];
  }
  return 0;
}`]],
      q: ['A function that children can replace is marked ___.', '___ void speak();', 'virtual'] }
  ]);

  /* ============================================================ STL & more */
  add('cpp', 'Standard Library & More', [
    { i: 'cpp-map', t: 'Maps & Sets',
      x: `<p>The Standard Template Library (STL) gives you ready-made containers.</p>
<ul><li><code>map&lt;key, value&gt;</code> stores pairs and keeps keys sorted, e.g. name → score (<code>#include &lt;map&gt;</code>)</li><li><code>set&lt;T&gt;</code> stores unique values in order (<code>#include &lt;set&gt;</code>)</li></ul>
<p><code>m.count(k)</code> tells you whether a key exists (0 or 1).</p>`,
      e: [['A map of scores and a set of unique numbers', c`#include <iostream>
#include <map>
#include <set>
using namespace std;

int main() {
  map<string, int> scores;
  scores["Amina"] = 88;
  scores["Juma"] = 74;
  scores["Neema"] = 95;

  for (auto p : scores) {
    cout << p.first << ": " << p.second << endl;
  }
  cout << "Has Juma? " << scores.count("Juma") << endl;

  set<int> unique = {5, 3, 5, 1, 3, 9};
  for (int n : unique) cout << n << " ";
  cout << endl;
  return 0;
}`]],
      q: ['A ___ stores key and value pairs.', '___<string, int> ages;', 'map'] },
    { i: 'cpp-algorithms', t: 'Algorithms: sort, find, count',
      x: `<p>Add <code>#include &lt;algorithm&gt;</code> for functions that work on containers.</p>
<ul><li><code>sort(v.begin(), v.end())</code> puts items in order</li><li><code>reverse(v.begin(), v.end())</code> flips them</li><li><code>count(v.begin(), v.end(), x)</code> counts a value</li><li><code>*max_element(v.begin(), v.end())</code> finds the biggest</li></ul>
<p><code>begin()</code> and <code>end()</code> mark the start and the end of the range.</p>`,
      e: [['Sorting and searching a vector', c`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
  vector<int> v = {42, 7, 19, 3, 25, 7};

  sort(v.begin(), v.end());
  for (int n : v) cout << n << " ";
  cout << endl;

  reverse(v.begin(), v.end());
  for (int n : v) cout << n << " ";
  cout << endl;

  cout << "Sevens: " << count(v.begin(), v.end(), 7) << endl;
  cout << "Biggest: " << *max_element(v.begin(), v.end()) << endl;
  return 0;
}`]],
      q: ['Put items in order with the ___ function.', '___(v.begin(), v.end());', 'sort'] },
    { i: 'cpp-lambda', t: 'Lambdas & auto',
      x: `<p><code>auto</code> lets the compiler work out a variable's type for you. A <strong>lambda</strong> is a small unnamed function you can write right where you need it, in the form <code>[](parameters) { body }</code>.</p>
<p>Lambdas are handy for telling <code>sort</code> how to compare things.</p>`,
      e: [['A lambda in action', c`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
  auto square = [](int x) { return x * x; };
  cout << square(9) << endl;

  vector<int> v = {5, 2, 8, 1};
  sort(v.begin(), v.end(), [](int a, int b) { return a > b; });  // biggest first
  for (auto n : v) cout << n << " ";
  cout << endl;
  return 0;
}`]],
      q: ['Let the compiler choose the type with ___.', '___ x = 5;', 'auto'] },
    { i: 'cpp-exceptions', t: 'Exceptions',
      x: `<p>Exceptions handle errors without crashing the program.</p>
<ul><li><code>try</code> holds code that might fail</li><li><code>throw</code> signals the problem</li><li><code>catch</code> handles it</li></ul>`,
      e: [['Catching a divide-by-zero', c`#include <iostream>
#include <stdexcept>
using namespace std;

double divide(double a, double b) {
  if (b == 0) throw runtime_error("Cannot divide by zero");
  return a / b;
}

int main() {
  try {
    cout << divide(10, 2) << endl;
    cout << divide(5, 0) << endl;
    cout << "Not reached" << endl;
  } catch (const exception &e) {
    cout << "Error: " << e.what() << endl;
  }
  cout << "Program continues" << endl;
  return 0;
}`]],
      q: ['Code that might fail is placed in a ___ block.', '___ { risky(); } catch (...) { }', 'try'] },
    { i: 'cpp-project', t: 'Mini Project: Number Guessing Game',
      x: `<p>Time to combine loops, decisions and input. This game checks a list of guesses against a secret number and gives hints. The guesses are read from the <strong>Input</strong> box, so change them and run again.</p>
<p><strong>Challenge:</strong> count how many guesses were used and print it at the end.</p>`,
      e: [['Guess the number', c`#include <iostream>
using namespace std;

int main() {
  const int secret = 42;
  int guess;

  cout << "Guess my number (1-100)" << endl;
  while (cin >> guess) {
    if (guess < secret) {
      cout << guess << " is too low" << endl;
    } else if (guess > secret) {
      cout << guess << " is too high" << endl;
    } else {
      cout << guess << " is correct! You win!" << endl;
      break;
    }
  }
  return 0;
}`, '50\n25\n40\n42']],
      q: ['A loop can be stopped early with ___.', 'if (won) { ___; }', 'break'] }
  ]);

  /* ================================================================ Reference */
  S.refs.cpp = [
    ['#include', 'Bring in a library or header file'], ['using namespace std;', 'Use standard names like cout without writing std::'],
    ['int main()', 'Where every C++ program starts'], ['cout', 'Print to the screen (with <<)'], ['cin', 'Read from the keyboard (with >>)'],
    ['endl', 'End the line and flush the output'], ['getline(cin, s)', 'Read a whole line into a string'],
    ['int', 'Whole number type'], ['double', 'Decimal number type'], ['float', 'Smaller decimal number type'], ['char', 'A single character'],
    ['bool', 'true or false'], ['string', 'Text (needs <string>)'], ['long long', 'Very large whole numbers'], ['auto', 'Let the compiler pick the type'],
    ['const', 'A value that cannot change'], ['sizeof(x)', 'Size of a type or variable in bytes'],
    ['if / else if / else', 'Choose what code runs'], ['switch / case / default', 'Pick one of many branches'],
    ['for', 'Loop with start, condition and step'], ['while', 'Loop while a condition is true'], ['do ... while', 'Loop that runs at least once'],
    ['break', 'Leave a loop or switch'], ['continue', 'Skip to the next loop round'], ['return', 'Send a value back from a function'],
    ['void', 'A function that returns nothing'], ['&', 'Address-of, or a reference parameter'], ['*', 'Multiply, pointer type or dereference'],
    ['nullptr', 'A pointer that points to nothing'], ['new / delete', 'Create and free memory at run time'],
    ['new[] / delete[]', 'Create and free arrays at run time'], ['class', 'A blueprint for objects'], ['struct', 'Like a class but public by default'],
    ['public / private / protected', 'Who may use a class member'], ['virtual', 'Lets child classes replace a function'],
    ['override', 'Ask the compiler to check a virtual replacement'], ['this', 'Pointer to the current object'],
    ['try / throw / catch', 'Handle errors with exceptions'], ['template<typename T>', 'Write code that works with any type'],
    ['s.length()', 'Number of characters in a string'], ['s.substr(a, n)', 'A piece of a string'], ['s.find(x)', 'Position of text in a string'],
    ['vector<T>', 'A resizable array'], ['v.push_back(x)', 'Add to the end of a vector'], ['v.size()', 'Number of items in a container'],
    ['map<K, V>', 'Sorted key and value pairs'], ['set<T>', 'Sorted unique values'],
    ['sort(b, e)', 'Sort a range (needs <algorithm>)'], ['reverse(b, e)', 'Reverse a range'], ['max(a, b) / min(a, b)', 'Bigger or smaller of two values'],
    ['sqrt(x)', 'Square root (needs <cmath>)'], ['pow(x, y)', 'x to the power y'], ['abs(x)', 'Absolute value'],
    ['round / ceil / floor', 'Round to nearest, up or down'], ['rand()', 'A pseudo-random number (needs <cstdlib>)'],
    ['unique_ptr<T>', 'A smart pointer that frees memory for you (needs <memory>)']
  ];
})(window.S21C);
