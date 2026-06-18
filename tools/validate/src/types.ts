export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
  hint?: string;
}

export function issue(input: ValidationIssue): ValidationIssue {
  return input;
}
