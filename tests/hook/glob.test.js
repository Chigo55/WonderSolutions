// tests/hook/glob.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { globToRegExp } = require('../../plugins/wonder-workflows/hooks/scripts/lib/glob.js');

test('* matches within a single segment only', () => {
  const re = globToRegExp('src/*.java');
  assert.ok(re.test('src/Foo.java'));
  assert.ok(!re.test('src/sub/Foo.java'));
});

test('**/ matches zero or more directories', () => {
  const re = globToRegExp('**/*Controller.java');
  assert.ok(re.test('UserController.java'));
  assert.ok(re.test('a/b/UserController.java'));
  assert.ok(!re.test('UserService.java'));
});

test('literal dots are escaped', () => {
  const re = globToRegExp('a.b/*.txt');
  assert.ok(re.test('a.b/x.txt'));
  assert.ok(!re.test('axb/x.txt'));
});

test('is anchored (no partial match)', () => {
  const re = globToRegExp('*.java');
  assert.ok(!re.test('Foo.java.bak'));
});
