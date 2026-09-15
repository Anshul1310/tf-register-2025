export interface YearOfStudyInfo {
  batchYear: number | null;
  yearName: string;
  yearNumber: number | null;
}

/**
 * Calculates the Year of Study from an NITT Roll Number.
 * Roll number format example: 112125005
 * 5th and 6th digits represent the admission batch (e.g., '25' -> Batch of 2025).
 *
 * Mapping for 2025-2026 Academic Calendar:
 * - 26 -> 1st Year (Batch '26)
 * - 25 -> 2nd Year (Batch '25)
 * - 24 -> 3rd Year (Batch '24)
 * - 23 -> 4th Year (Batch '23)
 * - 22 -> 5th Year (Dual Degree / Arch)
 */
export function getYearOfStudy(rollNumber?: string | null): YearOfStudyInfo {
  if (!rollNumber || rollNumber.trim().length < 6) {
    return { batchYear: null, yearName: "", yearNumber: null };
  }

  const clean = rollNumber.trim();
  // 5th and 6th character (indices 4 and 5)
  const batchStr = clean.substring(4, 6);
  const batch = parseInt(batchStr, 10);

  if (isNaN(batch)) {
    return { batchYear: null, yearName: "", yearNumber: null };
  }

  // Formula: 27 - batchYear
  // E.g., 27 - 26 = 1 (1st Year), 27 - 25 = 2 (2nd Year), etc.
  const yearNumber = 27 - batch;

  let yearName = "";
  if (yearNumber === 1) {
    yearName = "1st Year";
  } else if (yearNumber === 2) {
    yearName = "2nd Year";
  } else if (yearNumber === 3) {
    yearName = "3rd Year";
  } else if (yearNumber === 4) {
    yearName = "4th Year";
  } else if (yearNumber === 5) {
    yearName = "5th Year";
  } else if (yearNumber > 5) {
    yearName = "Postgrad / Alumni";
  } else if (yearNumber <= 0) {
    yearName = "Incoming Student";
  }

  return {
    batchYear: batch,
    yearName,
    yearNumber,
  };
}
