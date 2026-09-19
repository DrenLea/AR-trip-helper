import type { Explanation, Place } from '../models';
export function explainUnknownAccess(place: Place): Explanation { return {code:'unknown-access',severity:'warning',placeId:place.id,message:'无障碍状态未知，请现场确认后再进入',sourceRefs:place.sourceRefs}; }
