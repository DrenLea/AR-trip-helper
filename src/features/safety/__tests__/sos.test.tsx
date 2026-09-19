import { describe, expect, it } from 'vitest'; import { HOLD_MS } from '../SosController'; describe('SOS',()=>{it('uses a two second hold threshold',()=>expect(HOLD_MS).toBe(2000));});
