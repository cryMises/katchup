/* inline hand-drawn doodle -> <svg><use href="#d-name"></svg> */
function doodle(name, cls) {
  return '<svg class="' + (cls || 'w-4 h-4') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#d-' + name + '"></use></svg>';
}

