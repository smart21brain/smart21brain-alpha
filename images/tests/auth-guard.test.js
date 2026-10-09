const assert = require('node:assert/strict');
const guard = require('../js/auth-guard.js');

// Guest browsing is intentionally supported — this guard no longer blocks it.
assert.equal(guard.shouldAllowGuestFlow(), true);

// The login page's fake role shortcuts ("Continue as Teacher" etc.) must
// still be detected so they can't bypass real authentication.
assert.equal(typeof guard.isLoginRoleShortcut, 'function');

console.log('auth guard regression checks passed');
