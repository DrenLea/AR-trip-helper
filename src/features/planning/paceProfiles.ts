import type { PlanningConstraints } from '../../domain/models';

export interface PaceProfile { label: string; description: string; constraints: PlanningConstraints }

export const paceProfiles: Record<string, PaceProfile> = {
  '轻松慢游': {
    label: '轻松慢游', description: '少走一些，给用餐和休息留出余量。',
    constraints: { maxDailySteps: 4500, maxSingleWalkM: 650, restEveryMin: 55, restDurationMin: 25, maxVisitCount: 1, mealWindows: [{type:'lunch',start:'12:00',end:'13:30'}], wheelchairMode: false }
  },
  '舒适漫游': {
    label: '舒适漫游', description: '在重点景点和步行负担之间保持平衡。',
    constraints: { maxDailySteps: 7000, maxSingleWalkM: 900, restEveryMin: 75, restDurationMin: 20, maxVisitCount: 2, mealWindows: [{type:'lunch',start:'12:00',end:'13:30'}], wheelchairMode: false }
  },
  '一天多看一些': {
    label: '一天多看一些', description: '提高参观点位上限，适合体力充足的一天。',
    constraints: { maxDailySteps: 10500, maxSingleWalkM: 1500, restEveryMin: 110, restDurationMin: 15, maxVisitCount: 3, mealWindows: [{type:'lunch',start:'12:00',end:'13:30'}], wheelchairMode: false }
  }
};

export function getPaceProfile(label: string): PaceProfile { return paceProfiles[label] ?? paceProfiles['舒适漫游']; }
