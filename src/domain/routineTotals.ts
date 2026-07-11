import type { EmergencyBehavior } from '@/types/models';

interface MinimumDurationTask {
  emergencyBehavior: EmergencyBehavior;
  minDurationSec: number;
}

export function calculateMinimumTotalSec(tasks: readonly MinimumDurationTask[]) {
  return tasks.reduce((sum, task) => {
    if (task.emergencyBehavior === 'OPTIONAL') {
      return sum;
    }

    return sum + Math.max(0, task.minDurationSec);
  }, 0);
}

