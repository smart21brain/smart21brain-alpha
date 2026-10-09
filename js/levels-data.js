/* Smart21Brain — levels-data.js
   One definition of every education level the platform serves, from nursery
   to university and adult learning. Used by levels.html, the courses filter,
   the search index and the home page. Add or rename a level here and every
   page that reads window.S21Levels follows.

   Course objects may carry  edu_levels: ['primary', 'secondary']  . Courses
   that don't (for example ones coming from the database) are matched to a
   level from their age_range by S21Levels.forCourse(). */
(function () {
  const LEVELS = [
    {
      id: 'pre-primary', name: 'Pre-Primary', short: 'Pre-Primary', sw: 'Awali',
      stage: 'Nursery & Kindergarten', ages: [3, 6], ageText: '3–6 years', icon: 'fa-child-reaching', color: '#FFB703',
      blurb: 'Play-based first steps: letters, numbers, colours, shapes, songs and stories.',
      subjects: ['Letters & phonics', 'Counting & early numbers', 'Kiswahili alphabet', 'Colours & shapes', 'Songs & stories'],
    },
    {
      id: 'primary', name: 'Primary School', short: 'Primary', sw: 'Msingi',
      stage: 'Standard 1–7 (Grades 1–8)', ages: [6, 13], ageText: '6–13 years', icon: 'fa-school', color: '#3A86FF',
      blurb: 'The foundations: reading, mathematics, science, languages, social studies and first computer skills.',
      subjects: ['Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies', 'Computer basics'],
    },
    {
      id: 'secondary', name: 'Secondary — O-Level', short: 'Secondary', sw: 'Sekondari',
      stage: 'Ordinary Level (Form 1–4)', ages: [13, 17], ageText: '13–17 years', icon: 'fa-book-open-reader', color: '#06D6A0',
      blurb: 'Subject-by-subject study for national exams: Physics, Chemistry, Biology, Mathematics, languages and more.',
      subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History', 'English & Kiswahili', 'Computer Studies'],
    },
    {
      id: 'advanced', name: 'Advanced — A-Level', short: 'A-Level', sw: 'Kidato cha 5–6',
      stage: 'Advanced Level (Form 5–6)', ages: [16, 19], ageText: '16–19 years', icon: 'fa-flask', color: '#8338EC',
      blurb: 'Deeper specialist study that prepares you for college and university entry.',
      subjects: ['Advanced Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'General Studies', 'ICT'],
    },
    {
      id: 'college', name: 'College & Vocational', short: 'College', sw: 'Chuo',
      stage: 'Certificate & Diploma', ages: [17, 40], ageText: '17 years and above', icon: 'fa-screwdriver-wrench', color: '#EF476F',
      blurb: 'Job-ready skills for technical, business and professional careers.',
      subjects: ['Business & Entrepreneurship', 'Office & digital skills', 'Accounting', 'Electronics', 'ICT', 'Health & hospitality'],
    },
    {
      id: 'university', name: 'University', short: 'University', sw: 'Chuo Kikuu',
      stage: "Bachelor's, Master's & PhD", ages: [18, 99], ageText: '18 years and above', icon: 'fa-building-columns', color: '#0B6E4F',
      blurb: 'Degree-level study: academic writing, research methods, statistics, economics and more.',
      subjects: ['Research methods', 'Academic writing', 'Statistics', 'Economics', 'Calculus', 'Programming'],
    },
    {
      id: 'professional', name: 'Adult & Professional', short: 'Adult', sw: 'Watu Wazima',
      stage: 'Lifelong learning', ages: [18, 99], ageText: 'Any age', icon: 'fa-briefcase', color: '#FB8500',
      blurb: 'Learn new skills at any age: digital skills, business, money and career growth.',
      subjects: ['Digital skills', 'Entrepreneurship', 'Personal finance', 'Communication', 'Career skills'],
    },
  ];

  const byId = Object.fromEntries(LEVELS.map((l) => [l.id, l]));

  /* Levels a course belongs to. Uses course.edu_levels when present, otherwise
     works it out from age_range ("7–10", "12–18", "10+"). A level matches when
     the course's age span overlaps it by at least two years. */
  function forCourse(c) {
    if (Array.isArray(c && c.edu_levels) && c.edu_levels.length) return c.edu_levels.slice();
    const m = String((c && c.age_range) || '').match(/(\d+)\s*[–-]\s*(\d+)|(\d+)\s*\+/);
    if (!m) return [];
    const lo = Number(m[1] || m[3]);
    const hi = m[2] ? Number(m[2]) : lo + 6;
    return LEVELS.filter((l) => l.id !== 'professional' && Math.min(hi, l.ages[1]) - Math.max(lo, l.ages[0]) >= 2).map((l) => l.id);
  }

  function matches(course, levelId) {
    return !levelId || levelId === 'all' || forCourse(course).includes(levelId);
  }

  window.S21Levels = { all: LEVELS, byId, forCourse, matches };
})();
