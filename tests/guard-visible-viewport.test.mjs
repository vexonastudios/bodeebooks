import test from 'node:test';
import assert from 'node:assert/strict';
import { fitParentViewport } from '../app/guard/dashboard/visible-viewport.ts';

test('phone keyboard size and pan update the frame; zoom, desktop and cleanup restore browser sizing', () => {
  const mobile = Object.assign(new EventTarget(), {matches:true});
  const viewport = Object.assign(new EventTarget(), {height:844,offsetTop:0,scale:1});
  const styles = new Map();
  const style = {set height(v){styles.set('height',v)},set transform(v){styles.set('transform',v)},removeProperty(k){styles.delete(k)}};
  const before = globalThis.window; globalThis.window = {matchMedia:()=>mobile};
  try {
    const dispose = fitParentViewport({style},viewport);
    assert.equal(styles.get('height'),'844px');
    viewport.height=420;viewport.offsetTop=48;viewport.dispatchEvent(new Event('resize'));
    assert.equal(styles.get('height'),'420px');assert.equal(styles.get('transform'),'translateY(48px)');
    viewport.offsetTop=0;viewport.dispatchEvent(new Event('scroll'));assert.equal(styles.get('transform'),'translateY(0px)');
    viewport.scale=2;viewport.dispatchEvent(new Event('resize'));assert.equal(styles.size,0);
    viewport.scale=1;viewport.height=844;viewport.dispatchEvent(new Event('resize'));assert.equal(styles.get('height'),'844px');
    mobile.matches=false;mobile.dispatchEvent(new Event('change'));assert.equal(styles.size,0);
    mobile.matches=true;mobile.dispatchEvent(new Event('change'));dispose();
    viewport.height=300;viewport.dispatchEvent(new Event('resize'));assert.equal(styles.size,0);
    assert.doesNotThrow(()=>fitParentViewport({style},null)());
  } finally {if(before===undefined)delete globalThis.window;else globalThis.window=before;}
});
