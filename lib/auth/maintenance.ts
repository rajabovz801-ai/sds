export const PLATFORM_MAINTENANCE_MODE = false;

const MAINTENANCE_ALLOWED_STUDENT_IDS = new Set([
  '0ca910d9-0f9d-489f-b95c-5e58dd3609f5',
]);

export function isStudentAllowedDuringMaintenance(studentId?: string | null) {
  if (!PLATFORM_MAINTENANCE_MODE) return true;
  return Boolean(studentId && MAINTENANCE_ALLOWED_STUDENT_IDS.has(studentId));
}
