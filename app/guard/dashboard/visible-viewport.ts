// Only the outer window reports the space left above a phone keyboard.
export function fitParentViewport(frame: HTMLIFrameElement, viewport = window.visualViewport) {
  if (!viewport) return () => {};
  const mobile = window.matchMedia('(max-width: 900px), (pointer: coarse) and (max-width: 1180px)');
  const reset = () => { frame.style.removeProperty('height'); frame.style.removeProperty('transform'); };
  const update = () => {
    // Leave pinch zoom to the browser instead of reflowing the page under the user.
    if (!mobile.matches || Math.abs(viewport.scale - 1) > 0.05) { reset(); return; }
    frame.style.height = `${viewport.height}px`;
    frame.style.transform = `translateY(${Math.max(0, viewport.offsetTop)}px)`;
  };
  viewport.addEventListener('resize', update);
  viewport.addEventListener('scroll', update);
  mobile.addEventListener('change', update);
  update();
  return () => { viewport.removeEventListener('resize', update); viewport.removeEventListener('scroll', update); mobile.removeEventListener('change', update); reset(); };
}
