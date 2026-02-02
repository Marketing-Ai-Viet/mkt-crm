/**
 * Domain Strategies
 *
 * Matching strategies for payment processing.
 * Implements Strategy Pattern.
 */

export { VAMatchingStrategy } from './va-matching.strategy';
export { CodeMatchingStrategy } from './code-matching.strategy';
export {
  FuzzyMatchingStrategy,
  FUZZY_CONFIG_TOKEN,
  DEFAULT_FUZZY_CONFIG,
} from './fuzzy-matching.strategy';
export type { FuzzyMatchConfig } from './fuzzy-matching.strategy';
export {
  CompositeMatchingStrategy,
  TRANSFER_MODE_CONFIG_TOKEN,
} from './composite-matching.strategy';
