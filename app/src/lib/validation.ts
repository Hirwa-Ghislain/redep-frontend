/** Mirrors the backend's Rwanda phone pattern in auth.schemas.ts. */
export const RWANDA_PHONE = /^(?:\+?250|0)7[2389]\d{7}$/;

/** Mirrors the backend's password policy in auth.schemas.ts (min 10, mixed case, digit, special char). */
export function passwordIssue(password: string): string | undefined {
  if (password.length < 10) return "At least 10 characters";
  if (!/[a-z]/.test(password)) return "Include a lowercase letter";
  if (!/[A-Z]/.test(password)) return "Include an uppercase letter";
  if (!/\d/.test(password)) return "Include a number";
  if (!/[^a-zA-Z0-9]/.test(password)) return "Include a special character";
  return undefined;
}

/** Mirrors the backend's 18+ check in auth.schemas.ts. */
export function isAdult(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const eighteenthBirthday = new Date(Date.UTC(dob.getUTCFullYear() + 18, dob.getUTCMonth(), dob.getUTCDate()));
  return eighteenthBirthday <= new Date();
}
