// Export all email templates
export { day1Template } from './day1';
export { day2Template } from './day2';
export { day3Template } from './day3';
export { day4Template } from './day4';
export { day5Template } from './day5';
export { day6Template } from './day6';
export { day7Template } from './day7';

// Create a templates object for easy access
export const emailTemplates = {
  1: 'day1Template',
  2: 'day2Template',
  3: 'day3Template',
  4: 'day4Template',
  5: 'day5Template',
  6: 'day6Template',
  7: 'day7Template',
} as const;

// Type for template keys
export type TemplateKey = keyof typeof emailTemplates;
