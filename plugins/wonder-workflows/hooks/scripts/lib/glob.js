// plugins/wonder-workflows/hooks/scripts/lib/glob.js
'use strict';

// Minimal glob → RegExp. Supports: **/ , ** , * (no slash). No external dependencies.
function globToRegExp(pattern) {
  const PLACEHOLDER_GLOBSTAR_SLASH = '\x01';
  const PLACEHOLDER_GLOBSTAR = '\x02';
  const PLACEHOLDER_STAR = '\x03';

  let p = pattern
    .replace(/\*\*\//g, PLACEHOLDER_GLOBSTAR_SLASH)
    .replace(/\*\*/g, PLACEHOLDER_GLOBSTAR)
    .replace(/\*/g, PLACEHOLDER_STAR);

  // Escape regex special characters (excluding placeholders)
  p = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  p = p
    .split(PLACEHOLDER_GLOBSTAR_SLASH).join('(?:.*/)?')
    .split(PLACEHOLDER_GLOBSTAR).join('.*')
    .split(PLACEHOLDER_STAR).join('[^/]*');

  return new RegExp('^' + p + '$');
}

module.exports = { globToRegExp };
