import { Router } from './router.js';
import * as auth from './handlers/auth.js';
import * as games from './handlers/games.js';
import * as quizzes from './handlers/quizzes.js';
import * as blog from './handlers/blog.js';
import * as materials from './handlers/materials.js';
import * as courses from './handlers/courses.js';
import * as courseLessons from './handlers/course-lessons.js';
import * as courseModules from './handlers/course-modules.js';
import * as certificates from './handlers/certificates.js';
import * as videos from './handlers/videos.js';
import * as books from './handlers/books.js';
import * as users from './handlers/users.js';
import { getDashboard } from './handlers/dashboard.js';
import * as newsletter from './handlers/newsletter.js';
import * as contact from './handlers/contact.js';
import * as search from './handlers/search.js';
import * as assistant from './handlers/assistant.js';
import * as account from './handlers/account.js';
import * as activity from './handlers/activity.js';
import * as google from './handlers/google.js';
import * as stats from './handlers/stats.js';
import * as settings from './handlers/settings.js';
import { getSessionUser } from './lib/auth.js';

// ---- Stationery OS ----
import * as stnBusiness from './handlers/stationery/business.js';
import * as stnCustomers from './handlers/stationery/customers.js';
import * as stnServices from './handlers/stationery/services.js';
import * as stnInventory from './handlers/stationery/inventory.js';
import * as stnOrders from './handlers/stationery/orders.js';
import * as stnFinance from './handlers/stationery/finance.js';
import * as stnDashboard from './handlers/stationery/dashboard.js';
import * as stnReports from './handlers/stationery/reports.js';
import * as stnPhotoStudio from './handlers/stationery/photostudio.js';
import * as stnFiles from './handlers/stationery/files.js';
import * as stnOnlineServices from './handlers/stationery/onlineservices.js';
import * as stnMachines from './handlers/stationery/machines.js';
import * as stnAcademy from './handlers/stationery/academy.js';
import * as stnChopaAI from './handlers/stationery/chopaai.js';
import * as stnSecurity from './handlers/stationery/security.js';

// ---- School System ----
import * as schCore from './handlers/school/core.js';
import * as schPeople from './handlers/school/people.js';
import * as schAcademics from './handlers/school/academics.js';
import * as schOps from './handlers/school/operations.js';
import * as schInsights from './handlers/school/insights.js';
import * as schDemo from './handlers/school/demo.js';

// ---- Smart21Shop ----
import * as shpCore from './handlers/shop/core.js';
import * as shpCustomers from './handlers/shop/customers.js';
import * as shpProducts from './handlers/shop/products.js';
import * as shpSales from './handlers/shop/sales.js';
import * as shpExpenses from './handlers/shop/expenses.js';
import * as shpInsights from './handlers/shop/insights.js';
import * as shpDemo from './handlers/shop/demo.js';
import * as shpQr from './handlers/shop/qr.js';

const router = new Router();

// ---- Auth ----
router.post('/api/auth/register', auth.register);
router.post('/api/auth/login', auth.login);
router.post('/api/auth/logout', auth.logout);
router.get('/api/auth/me', auth.me);
router.post('/api/newsletter/subscribe', newsletter.subscribe);
router.post('/api/contact', contact.sendMessage);
router.get('/api/contact', contact.listMessages);
router.get('/api/newsletter/subscribers', contact.listSubscribers);
router.get('/api/search', search.search);
router.post('/api/ai-assistant', assistant.ask);
router.get('/api/stats', stats.getPublicStats);
router.put('/api/account/profile', account.updateProfile);
router.get('/api/account/profile', account.getProfile);
router.put('/api/account/password', account.updatePassword);
router.get('/api/avatar/:id', account.getAvatar);
router.post('/api/account/avatar', account.updateAvatar);
router.post('/api/activity/game-score', activity.submitGameScore);
router.get('/api/auth/google/config', google.config);
router.post('/api/auth/google', google.signIn);

// ---- Games ----
router.get('/api/games', games.listGames);
router.post('/api/games', games.createGame);
router.get('/api/games/:id', games.getGame);
router.put('/api/games/:id', games.updateGame);
router.delete('/api/games/:id', games.deleteGame);
router.post('/api/games/:id/score', games.submitGameScore);

// ---- Quizzes ----
router.get('/api/quizzes', quizzes.listQuizzes);
router.post('/api/quizzes', quizzes.createQuiz);
router.get('/api/quizzes/:id', quizzes.getQuiz);
router.put('/api/quizzes/:id', quizzes.updateQuiz);
router.delete('/api/quizzes/:id', quizzes.deleteQuiz);
router.post('/api/quizzes/:id/attempt', quizzes.submitQuizAttempt);

// ---- Blog ----
router.get('/api/blog', blog.listPosts);
router.post('/api/blog', blog.createPost);
router.get('/api/blog/:slug', blog.getPost);
router.put('/api/blog/:slug', blog.updatePost);
router.delete('/api/blog/:slug', blog.deletePost);

// ---- Courses (core course engine: categories, courses, lessons, enrollment) ----
router.get('/api/course-categories', courses.listCategories);
router.post('/api/course-categories', courses.createCategory);
router.delete('/api/course-categories/:id', courses.deleteCategory);

router.get('/api/courses', courses.listCourses);
router.post('/api/courses', courses.createCourse);
// NOTE: '/my' must be registered before '/:id' — routes match in
// registration order and ':id' would otherwise swallow it.
router.get('/api/courses/my', courses.myCourses);
router.get('/api/courses/:id', courses.getCourse);
router.put('/api/courses/:id', courses.updateCourse);
router.delete('/api/courses/:id', courses.deleteCourse);
router.post('/api/courses/:id/enroll', courses.enrollCourse);
router.get('/api/courses/:id/lessons', courseLessons.listLessons);
router.post('/api/courses/:id/lessons', courseLessons.createLesson);
router.put('/api/courses/:id/lessons/:lessonId', courseLessons.updateLesson);
router.delete('/api/courses/:id/lessons/:lessonId', courseLessons.deleteLesson);

router.get('/api/lessons/:id', courseLessons.getLesson);
router.post('/api/lessons/:id/complete', courseLessons.completeLesson);

// ---- PHASE 8: modules (Course -> Module -> Lessons + Quiz -> ... -> Final Exam) ----
router.get('/api/courses/:id/modules', courseModules.listModules);
router.post('/api/courses/:id/modules', courseModules.createModule);
router.put('/api/course-modules/:moduleId', courseModules.updateModule);
router.delete('/api/course-modules/:moduleId', courseModules.deleteModule);

// ---- PHASE 8: certificates ----
router.get('/api/courses/:id/certificate', certificates.myCertificate);
router.get('/api/certificates/my', certificates.myCertificates);
router.get('/api/certificates/:code', certificates.verifyCertificate);

// ---- Materials (R2) ----
router.get('/api/materials', materials.listMaterials);
router.post('/api/materials', materials.uploadMaterial);
router.get('/api/materials/:id', materials.getMaterial);
router.delete('/api/materials/:id', materials.deleteMaterial);

// ---- Videos (R2 file upload or external URL; admin-only writes) ----
// NOTE: '/continue-watching' must be registered before '/:id' — routes
// match in registration order and ':id' would otherwise swallow it.
router.get('/api/videos', videos.listVideos);
router.post('/api/videos', videos.createVideo);
router.get('/api/videos/continue-watching', videos.continueWatching);
router.get('/api/videos/:id', videos.getVideo);
router.put('/api/videos/:id', videos.updateVideo);
router.delete('/api/videos/:id', videos.deleteVideo);
router.get('/api/videos/:id/stream', videos.streamVideo);
router.get('/api/videos/:id/progress', videos.getProgress);
router.put('/api/videos/:id/progress', videos.saveProgress);

// ---- Books (digital library; :id accepts a numeric id OR a slug) ----
router.get('/api/books', books.listBooks);
router.post('/api/books', books.createBook);
router.get('/api/books/:id', books.getBook);
router.put('/api/books/:id', books.updateBook);
router.delete('/api/books/:id', books.deleteBook);
router.get('/api/books/:id/progress', books.getProgress);
router.put('/api/books/:id/progress', books.saveProgress);

// ---- Users (admin-only: list + change role) ----
router.get('/api/users', users.listUsers);
router.put('/api/users/:id/role', users.updateUserRole);

// ---- Dashboard ----
router.get('/api/dashboard', getDashboard);

// ---- Site settings (admin console) ----
router.get('/api/settings', settings.getSettings);
router.put('/api/settings', settings.updateSettings);

// ==================== Stationery OS ====================
// ---- Business & staff ----
router.get('/api/stationery/context', stnBusiness.getContext);
router.put('/api/stationery/business', stnBusiness.updateBusiness);
router.get('/api/stationery/staff', stnBusiness.listStaff);
router.post('/api/stationery/staff', stnBusiness.addStaff);
router.put('/api/stationery/staff/:id', stnBusiness.updateStaffRole);

// ---- Customers ----
router.get('/api/stationery/customers', stnCustomers.listCustomers);
router.post('/api/stationery/customers', stnCustomers.createCustomer);
router.get('/api/stationery/customers/:id', stnCustomers.getCustomer);
router.put('/api/stationery/customers/:id', stnCustomers.updateCustomer);
router.delete('/api/stationery/customers/:id', stnCustomers.deleteCustomer);

// ---- Pricing (services) ----
router.get('/api/stationery/services', stnServices.listServices);
router.post('/api/stationery/services', stnServices.createService);
router.put('/api/stationery/services/:id', stnServices.updateService);
router.delete('/api/stationery/services/:id', stnServices.deleteService);

// ---- Inventory ----
router.get('/api/stationery/inventory', stnInventory.listInventory);
router.post('/api/stationery/inventory', stnInventory.createItem);
router.put('/api/stationery/inventory/:id', stnInventory.updateItem);
router.delete('/api/stationery/inventory/:id', stnInventory.deleteItem);
router.post('/api/stationery/inventory/:id/adjust', stnInventory.adjustStock);
router.get('/api/stationery/inventory/:id/history', stnInventory.stockHistory);

// ---- Universal Order Engine ----
router.get('/api/stationery/orders', stnOrders.listOrders);
router.post('/api/stationery/orders', stnOrders.createOrder);
router.get('/api/stationery/orders/:id', stnOrders.getOrder);
router.put('/api/stationery/orders/:id/status', stnOrders.updateOrderStatus);
router.post('/api/stationery/orders/:id/payments', stnOrders.addPayment);
router.get('/api/stationery/orders/:id/receipt', stnOrders.getReceipt);

// ---- Finance ----
router.get('/api/stationery/finance/expenses', stnFinance.listExpenses);
router.post('/api/stationery/finance/expenses', stnFinance.createExpense);
router.delete('/api/stationery/finance/expenses/:id', stnFinance.deleteExpense);
router.get('/api/stationery/finance/cashbook', stnFinance.cashbook);
router.get('/api/stationery/finance/debts', stnFinance.debts);
router.get('/api/stationery/finance/summary', stnFinance.summary);

// ---- Dashboard & reports ----
router.get('/api/stationery/dashboard', stnDashboard.getDashboard);
router.get('/api/stationery/reports', stnReports.getReport);

// ---- Photo Studio ----
router.get('/api/stationery/photo-presets', stnPhotoStudio.listPresets);
router.post('/api/stationery/photo-presets', stnPhotoStudio.createPreset);
router.delete('/api/stationery/photo-presets/:id', stnPhotoStudio.deletePreset);

// ---- Document vault (R2) — used by Photo Studio & PDF/Image tools ----
router.post('/api/stationery/files', stnFiles.uploadFile);
router.get('/api/stationery/files/:key', stnFiles.getFile);
router.delete('/api/stationery/files/:key', stnFiles.deleteFile);

// ---- Online Services (guided checklist center) ----
router.get('/api/stationery/online-services/templates', stnOnlineServices.getTemplates);
router.get('/api/stationery/online-services', stnOnlineServices.listRequests);
router.post('/api/stationery/online-services', stnOnlineServices.createRequest);
router.put('/api/stationery/online-services/:id', stnOnlineServices.updateRequest);

// ---- Machine Center ----
router.get('/api/stationery/machines', stnMachines.listMachines);
router.post('/api/stationery/machines', stnMachines.createMachine);
router.delete('/api/stationery/machines/:id', stnMachines.deleteMachine);

// ---- Academy LMS ----
router.get('/api/stationery/courses', stnAcademy.listCourses);
router.get('/api/stationery/courses/:id', stnAcademy.getCourse);
router.post('/api/stationery/courses/:id/progress', stnAcademy.updateProgress);

// ---- ChopaAI ----
router.post('/api/stationery/chopaai', stnChopaAI.ask);

// ---- Notifications, audit, backup ----
router.get('/api/stationery/notifications', stnSecurity.listNotifications);
router.put('/api/stationery/notifications/:id/read', stnSecurity.markRead);
router.put('/api/stationery/notifications/read-all', stnSecurity.markAllRead);
router.get('/api/stationery/audit-log', stnSecurity.listAuditLog);
router.get('/api/stationery/backup/export', stnSecurity.exportBackup);
router.post('/api/stationery/backup/restore', stnSecurity.restoreBackup);

// ==================== School System ====================
// Accounts / tenant
router.post('/api/school/register-school', schCore.registerSchool);
router.post('/api/school/login', schCore.login);
router.post('/api/school/logout', schCore.logout);
router.get('/api/school/context', schCore.context);
router.post('/api/school/schools', schCore.createSchool);
router.get('/api/school/lookups', schCore.lookups);
router.get('/api/school/public/logo/:id', schCore.publicLogo);
router.get('/api/school/verify/:token', schPeople.verifyStudent);

// Settings
router.get('/api/school/school-info', schCore.getSchoolInfo);
router.put('/api/school/school-info', schCore.updateSchoolInfo);
router.post('/api/school/school-info/logo', schCore.uploadLogo);
router.put('/api/school/settings', schCore.saveSettings);
router.get('/api/school/academic-years', schCore.listYears);
router.post('/api/school/academic-years', schCore.saveYear);
router.put('/api/school/academic-years/:id', schCore.saveYear);
router.delete('/api/school/academic-years/:id', schCore.deleteYear);
router.post('/api/school/terms', schCore.saveTerm);
router.put('/api/school/terms/:id', schCore.saveTerm);
router.delete('/api/school/terms/:id', schCore.deleteTerm);
router.get('/api/school/permissions', schCore.getPermissions);
router.put('/api/school/permissions', schCore.savePermissions);
router.get('/api/school/users', schCore.listUsers);
router.post('/api/school/users', schCore.addUser);
router.put('/api/school/users/:id', schCore.updateUser);
router.post('/api/school/demo-data', schDemo.loadDemoData);
router.post('/api/school/reset-data', schDemo.resetSchoolData);

// Students
router.get('/api/school/students', schPeople.listStudents);
router.post('/api/school/students', schPeople.createStudent);
router.get('/api/school/students/:id', schPeople.getStudent);
router.put('/api/school/students/:id', schPeople.updateStudent);
router.delete('/api/school/students/:id', schPeople.deleteStudent);
router.put('/api/school/students/:id/status', schPeople.setStudentStatus);
router.post('/api/school/students/:id/photo', schPeople.uploadStudentPhoto);
router.get('/api/school/students/:id/photo', schPeople.getStudentPhoto);
router.get('/api/school/students/:id/notes', schPeople.listNotes);
router.post('/api/school/students/:id/notes', schPeople.addNote);
router.delete('/api/school/notes/:id', schPeople.deleteNote);
router.get('/api/school/students/:id/id-card', schPeople.idCard);
router.get('/api/school/students/:id/attendance', schOps.studentAttendance);
router.get('/api/school/students/:id/fees', schOps.studentFees);
router.get('/api/school/students/:id/results', schAcademics.studentResults);

// Parents & teachers
router.get('/api/school/parents', schPeople.listParents);
router.post('/api/school/parents', schPeople.createParent);
router.get('/api/school/parents/:id', schPeople.getParent);
router.put('/api/school/parents/:id', schPeople.updateParent);
router.delete('/api/school/parents/:id', schPeople.deleteParent);
router.post('/api/school/parents/:id/portal', schPeople.givePortalAccess);
router.get('/api/school/teachers', schPeople.listTeachers);
router.post('/api/school/teachers', schPeople.createTeacher);
router.get('/api/school/teachers/:id', schPeople.getTeacher);
router.put('/api/school/teachers/:id', schPeople.updateTeacher);
router.delete('/api/school/teachers/:id', schPeople.deleteTeacher);
router.post('/api/school/teachers/:id/login', schPeople.giveTeacherLogin);
router.post('/api/school/teachers/:id/photo', schPeople.uploadTeacherPhoto);
router.get('/api/school/teachers/:id/photo', schPeople.getTeacherPhoto);

// Classes, subjects, timetable
router.get('/api/school/classes', schAcademics.listClasses);
router.post('/api/school/classes', schAcademics.createClass);
router.get('/api/school/classes/:id', schAcademics.getClass);
router.put('/api/school/classes/:id', schAcademics.updateClass);
router.delete('/api/school/classes/:id', schAcademics.deleteClass);
router.get('/api/school/subjects', schAcademics.listSubjects);
router.post('/api/school/subjects', schAcademics.createSubject);
router.put('/api/school/subjects/:id', schAcademics.updateSubject);
router.delete('/api/school/subjects/:id', schAcademics.deleteSubject);
router.get('/api/school/timetable', schAcademics.listTimetable);
router.post('/api/school/timetable', schAcademics.createTimetable);
router.put('/api/school/timetable/:id', schAcademics.updateTimetable);
router.delete('/api/school/timetable/:id', schAcademics.deleteTimetable);

// Attendance
router.get('/api/school/attendance/sheet', schOps.attendanceSheet);
router.get('/api/school/attendance/summary', schOps.attendanceSummary);
router.get('/api/school/attendance/alerts', schOps.attendanceAlerts);
router.post('/api/school/attendance', schOps.saveAttendance);

// Fees & payments
router.get('/api/school/fees/structures', schOps.listFeeStructures);
router.post('/api/school/fees/structures', schOps.createFeeStructure);
router.put('/api/school/fees/structures/:id', schOps.updateFeeStructure);
router.delete('/api/school/fees/structures/:id', schOps.deleteFeeStructure);
router.get('/api/school/fees/overview', schOps.feesOverview);
router.post('/api/school/fees/reminders', schOps.sendFeeReminders);
router.get('/api/school/payments', schOps.listPayments);
router.post('/api/school/payments', schOps.recordPayment);
router.get('/api/school/payments/:id/receipt', schOps.getReceipt);
router.put('/api/school/payments/:id', schOps.updatePayment);

// Examinations & results
router.get('/api/school/exams', schAcademics.listExams);
router.post('/api/school/exams', schAcademics.createExam);
router.get('/api/school/exams/:id', schAcademics.getExam);
router.put('/api/school/exams/:id', schAcademics.updateExam);
router.delete('/api/school/exams/:id', schAcademics.deleteExam);
router.get('/api/school/exams/:id/sheet', schAcademics.examSheet);
router.get('/api/school/results/entry', schAcademics.resultEntrySheet);
router.post('/api/school/results', schAcademics.saveResults);
router.get('/api/school/report-card', schAcademics.reportCard);
router.put('/api/school/report-card/comment', schAcademics.saveReportComment);

// Dashboard, portal, notifications, reports, audit, search
router.get('/api/school/dashboard', schInsights.dashboard);
router.get('/api/school/portal', schInsights.portal);
router.get('/api/school/notifications', schInsights.listNotifications);
router.post('/api/school/notifications', schInsights.createNotification);
router.put('/api/school/notifications/read-all', schInsights.markAllRead);
router.put('/api/school/notifications/:id/read', schInsights.markRead);
router.delete('/api/school/notifications/:id', schInsights.deleteNotification);
router.get('/api/school/reports', schInsights.reportCatalogue);
router.get('/api/school/reports/:key', schInsights.runReport);
router.get('/api/school/audit', schInsights.listAudit);
router.get('/api/school/search', schInsights.search);

// ==================== Smart21Shop ====================
// Accounts / tenant
router.post('/api/shop/register-shop', shpCore.registerShop);
router.post('/api/shop/login', shpCore.login);
router.post('/api/shop/logout', shpCore.logout);
router.get('/api/shop/context', shpCore.context);
router.post('/api/shop/shops', shpCore.createShop);
router.get('/api/shop/lookups', shpCore.lookups);
router.get('/api/shop/public/logo/:id', shpCore.publicLogo);
// Public QR check: anyone who scans an item's label can see if it is still available (basic facts only).
router.get('/api/shop/public/qr/:code', shpQr.publicQr);

// Settings, roles, staff
router.get('/api/shop/shop-info', shpCore.getShopInfo);
router.put('/api/shop/shop-info', shpCore.updateShopInfo);
router.post('/api/shop/shop-info/logo', shpCore.uploadLogo);
router.put('/api/shop/settings', shpCore.saveSettings);
router.get('/api/shop/permissions', shpCore.getPermissions);
router.put('/api/shop/permissions', shpCore.savePermissions);
router.get('/api/shop/users', shpCore.listUsers);
router.post('/api/shop/users', shpCore.addUser);
router.put('/api/shop/users/:id', shpCore.updateUser);
router.post('/api/shop/demo-data', shpDemo.loadDemoData);
router.post('/api/shop/reset-data', shpDemo.resetShopData);

// Customers
router.get('/api/shop/customers', shpCustomers.listCustomers);
router.post('/api/shop/customers', shpCustomers.createCustomer);
router.get('/api/shop/customers/:id', shpCustomers.getCustomer);
router.put('/api/shop/customers/:id', shpCustomers.updateCustomer);
router.delete('/api/shop/customers/:id', shpCustomers.deleteCustomer);
router.put('/api/shop/customers/:id/status', shpCustomers.setCustomerStatus);
router.post('/api/shop/customers/:id/notes', shpCustomers.addNote);
router.delete('/api/shop/customer-notes/:id', shpCustomers.deleteNote);
router.get('/api/shop/customers/:id/statement', shpCustomers.statement);
router.post('/api/shop/customers/:id/payments', shpCustomers.receivePayment);

// Products, categories, stock
router.get('/api/shop/categories', shpProducts.listCategories);
router.post('/api/shop/categories', shpProducts.saveCategory);
router.put('/api/shop/categories/:id', shpProducts.saveCategory);
router.delete('/api/shop/categories/:id', shpProducts.deleteCategory);
router.get('/api/shop/products', shpProducts.listProducts);
router.post('/api/shop/products', shpProducts.createProduct);
router.get('/api/shop/products/:id', shpProducts.getProduct);
router.put('/api/shop/products/:id', shpProducts.updateProduct);
router.delete('/api/shop/products/:id', shpProducts.deleteProduct);
router.post('/api/shop/products/:id/image', shpProducts.uploadProductImage);
router.get('/api/shop/products/:id/image', shpProducts.getProductImage);
router.post('/api/shop/products/:id/stock', shpProducts.adjustStock);
router.get('/api/shop/products/:id/history', shpProducts.stockHistory);

// QR tags (one code per physical item; scan to see if it is sold)
router.get('/api/shop/products/:id/qr', shpQr.listProductQr);
router.post('/api/shop/products/:id/qr', shpQr.generateProductQr);
router.get('/api/shop/qr/lookup', shpQr.lookupQr);
router.post('/api/shop/qr/:id/status', shpQr.setQrStatus);

// Sales (Point of Sale)
router.get('/api/shop/sales', shpSales.listSales);
router.post('/api/shop/sales', shpSales.createSale);
router.get('/api/shop/sales/:id', shpSales.getSale);
router.post('/api/shop/sales/:id/payments', shpSales.addPayment);
router.post('/api/shop/sales/:id/void', shpSales.voidSale);

// Expenses
router.get('/api/shop/expenses', shpExpenses.listExpenses);
router.post('/api/shop/expenses', shpExpenses.createExpense);
router.delete('/api/shop/expenses/:id', shpExpenses.deleteExpense);

// Dashboard, alerts, search, reports, activity log
router.get('/api/shop/dashboard', shpInsights.dashboard);
router.get('/api/shop/alerts', shpInsights.alerts);
router.get('/api/shop/search', shpInsights.search);
router.get('/api/shop/reports', shpInsights.reportCatalogue);
router.get('/api/shop/reports/:key', shpInsights.runReport);
router.get('/api/shop/audit', shpInsights.listAudit);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const normalizedPath = url.pathname.replace(/\/+$/, '') || '/';

    // Each non-admin role has exactly one home dashboard. Admins can see
    // every dashboard (useful for support/oversight); everyone else is
    // confined to their own.
    const protectedPages = {
      '/dashboard.html': ['user', 'admin'],
      '/dashboard': ['user', 'admin'],
      '/admin.html': ['admin'],
      '/admin': ['admin'],
      '/teachers.html': ['teacher', 'admin'],
      '/teachers': ['teacher', 'admin'],
      '/parents.html': ['parent', 'admin'],
      '/parents': ['parent', 'admin'],
      '/profile.html': ['user', 'admin', 'teacher', 'parent'],
      '/profile': ['user', 'admin', 'teacher', 'parent'],
      // Stationery OS is a separate, role-scoped app (Owner/Manager/
      // Operator/Designer/Accountant) layered on top of *any* signed-in
      // smart21brain account — see src/lib/stationery-auth.js.
      '/stationery-app.html': ['user', 'admin', 'teacher', 'parent'],
      '/stationery-app': ['user', 'admin', 'teacher', 'parent'],
      // School System: any signed-in account may open the app; what they see
      // inside is decided per school (role + permissions) by /api/school/*.
      '/school-app.html': ['user', 'admin', 'teacher', 'parent'],
      '/school-app': ['user', 'admin', 'teacher', 'parent'],
      // Smart21Shop: same idea — any signed-in account may open the app; what
      // they can do inside is decided per shop (role + permissions) by /api/shop/*.
      '/shop-app.html': ['user', 'admin', 'teacher', 'parent'],
      '/shop-app': ['user', 'admin', 'teacher', 'parent'],
    };

    const allowedRoles = protectedPages[normalizedPath];
    if (allowedRoles) {
      const user = await getSessionUser(request, env.DB);
      if (!user) {
        const loginPage = normalizedPath.startsWith('/school-') ? '/school-login.html'
          : normalizedPath.startsWith('/shop-') ? '/shop-login.html' : '/login.html';
        return Response.redirect(new URL(loginPage, request.url), 302);
      }
      if (!allowedRoles.includes(user.role)) {
        // Send them to *their own* dashboard, not always /dashboard.html —
        // otherwise a teacher/parent bounced off another role's page would
        // land back on a page they also can't access, looping forever.
        const roleHome = {
          admin: '/admin.html', teacher: '/teachers.html', parent: '/parents.html', user: '/dashboard.html',
        };
        return Response.redirect(new URL(roleHome[user.role] || '/dashboard.html', request.url), 302);
      }
    }

    if (url.pathname.startsWith('/api/')) {
      try {
        const response = await router.handle(request, env, ctx);
        if (response) return response;
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Server error', detail: String(err) }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Everything else: serve the static site from the assets binding.
    return env.ASSETS.fetch(request);
  },
};
