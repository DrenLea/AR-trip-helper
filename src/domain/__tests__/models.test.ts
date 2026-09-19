import { describe, expect, it } from 'vitest';
import { assertPlace } from '../models';
describe('domain guards', () => {
  it('preserves unknown accessibility', () => expect(assertPlace({id:'x',cityId:'rome',name:'X',category:'sight',lat:1,lon:2,interestTags:[],access:{stepFree:'unknown'},sourceRefs:[]}).access?.stepFree).toBe('unknown'));
  it('requires sourceRefs', () => expect(() => assertPlace({id:'x',cityId:'rome',name:'X',category:'sight',lat:1,lon:2,interestTags:[]})).toThrow('sourceRefs'));
});
