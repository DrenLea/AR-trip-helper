import { describe, expect, it } from 'vitest';
import { resolveArMode } from '../ArResolver';
describe('AR resolver',()=>{it('falls back to model-viewer when WebXR is unavailable and a glb exists',()=>{const r=resolveArMode({capabilities:{webXr:false,camera:true,deviceOrientation:true},asset:{id:'a',placeId:'p',type:'glb',url:'https://example.org/a.glb',license:'CC BY',attribution:'sample',sourceUrl:'https://example.org',redistributable:false,checkedAt:'2026-09-19'}});expect(r.mode).toBe('model-viewer');expect(r.reason).toContain('WebXR unavailable');});});
