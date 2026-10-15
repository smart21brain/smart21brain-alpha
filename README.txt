SMART21BRAIN: ALL FIXES (changed and new files only)

HOW TO USE
1. Unzip this over your project folder. Keep the same folders; overwrite when asked.
2. Deploy:  wrangler deploy
3. Add the anatomy pictures to the course lessons (safe to run twice):
     wrangler d1 execute smart21brain-db --file=./d1-more/m-051-anatomy-photos.sql --remote

WHAT EACH FIX TOUCHES
1. Course module header was white on white
     js/course-detail.js, css/style.css  (+ the copies inside images/)
2. Electronics for Beginners course pictures (motherboard photo)
     images/courses/electronics-for-beginners.jpg
     images/courses/electronics-for-beginners-full.jpg
3. Pink circle with arrow in the Electron21 and System21 search bars
     electron21.html, system21.html, css/electron21.css, css/system21.css, js/e21-search.js
4. Earth21 redesigned like System21 / Electron21 (NEW stylesheet)
     earth21.html, css/earth21.css
5. Anatomy and Physiology: labelled pictures, tap to see body parts
     images/anatomy/*.jpg (20 pictures), js/anatomy-photos.js, js/anatomy-viewer.js,
     js/lesson-rich.js, css/anatomy-viewer.css, lesson.html,
     d1-more/m-051-anatomy-photos.sql
