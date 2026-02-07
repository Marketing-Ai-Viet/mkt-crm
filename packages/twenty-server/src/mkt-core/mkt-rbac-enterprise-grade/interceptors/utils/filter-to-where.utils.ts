/**
 * Filter to Where Clause Converter
 *
 * Utility functions to convert RBAC RbacFilterCondition to TypeORM where clauses
 * and raw SQL conditions for use in repository queries.
 */

import {
  In,
  Not,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Like,
} from 'typeorm';

import {
  RbacFilterCondition,
  RbacFilterConditionItem,
  RbacFilterOperator,
  TypeOrmWhereClause,
  FilterToWhereResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/types';

// ============================================
// OPERATOR MAPPING
// ============================================

/**
 * Map filter operators to TypeORM operators
 */
const operatorToTypeOrm = (
  operator: RbacFilterOperator,
  value: unknown,
): unknown => {
  switch (operator) {
    case '=':
      return value;

    case '!=':
      return Not(value);

    case '>':
      return MoreThan(value);

    case '>=':
      return MoreThanOrEqual(value);

    case '<':
      return LessThan(value);

    case '<=':
      return LessThanOrEqual(value);

    case 'IN':
      return In(value as unknown[]);

    case 'NOT_IN':
      return Not(In(value as unknown[]));

    case 'LIKE':
      return Like(`%${value}%`);

    case 'IS_NULL':
      return IsNull();

    case 'IS_NOT_NULL':
      return Not(IsNull());

    case 'ALL':
      // Special case: no filtering needed
      return undefined;

    default:
      return value;
  }
};

/**
 * Map filter operators to SQL operators
 */
const operatorToSql = (operator: RbacFilterOperator): string => {
  switch (operator) {
    case '=':
      return '=';

    case '!=':
      return '!=';

    case '>':
      return '>';

    case '>=':
      return '>=';

    case '<':
      return '<';

    case '<=':
      return '<=';

    case 'IN':
      return 'IN';

    case 'NOT_IN':
      return 'NOT IN';

    case 'LIKE':
      return 'LIKE';

    case 'IS_NULL':
      return 'IS NULL';

    case 'IS_NOT_NULL':
      return 'IS NOT NULL';

    case 'ALL':
      return 'TRUE'; // No filtering

    default:
      return '=';
  }
};

// ============================================
// CONVERSION FUNCTIONS
// ============================================

/**
 * Convert a single condition item to TypeORM where clause
 */
export const conditionItemToWhere = (
  condition: RbacFilterConditionItem,
): TypeOrmWhereClause => {
  const { field, operator, value } = condition;

  // Handle ALL operator (no filter)
  if (operator === 'ALL') {
    return {};
  }

  const typeormValue = operatorToTypeOrm(operator, value);

  // Skip undefined values (from ALL operator)
  if (typeormValue === undefined) {
    return {};
  }

  return {
    [field]: typeormValue,
  };
};

/**
 * Convert RbacFilterCondition to TypeORM where clause array
 *
 * For AND conditions: Returns single where object
 * For OR conditions: Returns array of where objects (TypeORM OR syntax)
 *
 * @example
 * ```typescript
 * const filter: RbacFilterCondition = {
 *   type: 'OR',
 *   conditions: [
 *     { field: 'departmentId', operator: 'IN', value: ['dept1', 'dept2'] },
 *     { field: 'createdById', operator: '=', value: 'member1' }
 *   ]
 * };
 *
 * const where = filterToWhere(filter);
 * // Result: [{ departmentId: In(['dept1', 'dept2']) }, { createdById: 'member1' }]
 *
 * // Use in TypeORM query:
 * repository.find({ where });
 * ```
 */
export const filterToWhere = (
  filter: RbacFilterCondition | null,
): TypeOrmWhereClause | TypeOrmWhereClause[] | undefined => {
  if (!filter || !filter.conditions || filter.conditions.length === 0) {
    return undefined;
  }

  // Convert each condition to TypeORM format
  const whereConditions = filter.conditions
    .map(conditionItemToWhere)
    .filter((w) => Object.keys(w).length > 0);

  if (whereConditions.length === 0) {
    return undefined;
  }

  // AND: Merge all conditions into single object
  if (filter.type === 'AND') {
    return whereConditions.reduce(
      (acc, curr) => ({ ...acc, ...curr }),
      {} as TypeOrmWhereClause,
    );
  }

  // OR: Return array of conditions
  return whereConditions;
};

/**
 * Convert RbacFilterCondition to SQL WHERE clause with parameters
 *
 * Useful for raw queries and complex JOIN conditions.
 *
 * @example
 * ```typescript
 * const filter: RbacFilterCondition = {
 *   type: 'OR',
 *   conditions: [
 *     { field: 'departmentId', operator: 'IN', value: ['dept1', 'dept2'] },
 *     { field: 'status', operator: '=', value: 'ACTIVE' }
 *   ]
 * };
 *
 * const { sql, parameters } = filterToSql(filter, 'entity');
 * // sql: "(entity.departmentId IN (:param0) OR entity.status = :param1)"
 * // parameters: { param0: ['dept1', 'dept2'], param1: 'ACTIVE' }
 * ```
 */
export const filterToSql = (
  filter: RbacFilterCondition | null,
  tableAlias = 'entity',
): FilterToWhereResult => {
  if (!filter || !filter.conditions || filter.conditions.length === 0) {
    return {
      where: {},
      sql: '',
      parameters: {},
    };
  }

  const sqlParts: string[] = [];
  const parameters: Record<string, unknown> = {};

  let paramIndex = 0;

  for (const condition of filter.conditions) {
    const { field, operator, value } = condition;

    // Handle special operators
    if (operator === 'ALL') {
      continue;
    }

    if (operator === 'IS_NULL') {
      sqlParts.push(`${tableAlias}.${field} IS NULL`);
      continue;
    }

    if (operator === 'IS_NOT_NULL') {
      sqlParts.push(`${tableAlias}.${field} IS NOT NULL`);
      continue;
    }

    // Handle parameterized operators
    const paramName = `param${paramIndex}`;

    paramIndex++;

    if (operator === 'IN' || operator === 'NOT_IN') {
      const sqlOperator = operatorToSql(operator);

      sqlParts.push(`${tableAlias}.${field} ${sqlOperator} (:...${paramName})`);
      parameters[paramName] = value;
    } else if (operator === 'LIKE') {
      sqlParts.push(`${tableAlias}.${field} LIKE :${paramName}`);
      parameters[paramName] = `%${value}%`;
    } else {
      const sqlOperator = operatorToSql(operator);

      sqlParts.push(`${tableAlias}.${field} ${sqlOperator} :${paramName}`);
      parameters[paramName] = value;
    }
  }

  if (sqlParts.length === 0) {
    return {
      where: {},
      sql: '',
      parameters: {},
    };
  }

  const joiner = filter.type === 'AND' ? ' AND ' : ' OR ';
  const sql = `(${sqlParts.join(joiner)})`;

  return {
    where: filterToWhere(filter) as TypeOrmWhereClause,
    sql,
    parameters,
  };
};

/**
 * Apply filter condition to a TypeORM QueryBuilder
 *
 * @example
 * ```typescript
 * const qb = repository.createQueryBuilder('order');
 * applyFilterToQueryBuilder(qb, filter, 'order');
 * const orders = await qb.getMany();
 * ```
 */
export const applyFilterToQueryBuilder = <T>(
  queryBuilder: {
    andWhere: (condition: string, parameters?: Record<string, unknown>) => T;
    orWhere: (condition: string, parameters?: Record<string, unknown>) => T;
  },
  filter: RbacFilterCondition | null,
  tableAlias = 'entity',
): void => {
  if (!filter || !filter.conditions || filter.conditions.length === 0) {
    return;
  }

  const { sql, parameters } = filterToSql(filter, tableAlias);

  if (sql) {
    queryBuilder.andWhere(sql, parameters);
  }
};

/**
 * Merge multiple filters into a single filter
 *
 * @example
 * ```typescript
 * const filter1: RbacFilterCondition = { type: 'AND', conditions: [...] };
 * const filter2: RbacFilterCondition = { type: 'OR', conditions: [...] };
 * const merged = mergeFilters([filter1, filter2], 'AND');
 * ```
 */
export const mergeFilters = (
  filters: (RbacFilterCondition | null | undefined)[],
  joinType: 'AND' | 'OR' = 'AND',
): RbacFilterCondition | null => {
  const validFilters = filters.filter(
    (f): f is RbacFilterCondition =>
      f !== null && f !== undefined && f.conditions.length > 0,
  );

  if (validFilters.length === 0) {
    return null;
  }

  if (validFilters.length === 1) {
    return validFilters[0];
  }

  // Flatten conditions from all filters
  const allConditions: RbacFilterConditionItem[] = [];

  for (const filter of validFilters) {
    allConditions.push(...filter.conditions);
  }

  return {
    type: joinType,
    conditions: allConditions,
  };
};

/**
 * Check if filter has any effective conditions
 */
export const hasEffectiveConditions = (
  filter: RbacFilterCondition | null | undefined,
): boolean => {
  if (!filter || !filter.conditions) {
    return false;
  }

  return filter.conditions.some((c) => c.operator !== 'ALL');
};

/**
 * Get human-readable description of filter
 */
export const describeFilter = (
  filter: RbacFilterCondition | null | undefined,
): string => {
  if (!filter || !filter.conditions || filter.conditions.length === 0) {
    return 'No filter applied';
  }

  const descriptions = filter.conditions
    .filter((c) => c.operator !== 'ALL')
    .map((c) => {
      const desc =
        c.description ?? `${c.field} ${c.operator} ${String(c.value)}`;

      return desc;
    });

  if (descriptions.length === 0) {
    return 'No effective conditions';
  }

  const joiner = filter.type === 'AND' ? ' AND ' : ' OR ';

  return descriptions.join(joiner);
};
