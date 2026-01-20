/**
 * Type declarations for standalone lodash packages
 * These packages don't have their own @types packages, so we declare them here
 */

declare module 'lodash.isnil' {
  function isNil(value: unknown): value is null | undefined;
  export = isNil;
}

declare module 'lodash.isobject' {
  function isObject(value: unknown): value is object;
  export = isObject;
}

declare module 'lodash.sortby' {
  function sortBy<T>(
    collection: T[] | null | undefined,
    iteratees?: ((value: T) => unknown) | string | string[],
  ): T[];
  export = sortBy;
}

declare module 'lodash.keyby' {
  function keyBy<T>(
    collection: T[] | null | undefined,
    iteratee?: ((value: T) => string) | string,
  ): Record<string, T>;
  export = keyBy;
}

declare module 'lodash.chunk' {
  function chunk<T>(array: T[] | null | undefined, size?: number): T[][];
  export = chunk;
}

declare module 'lodash.isempty' {
  function isEmpty(value: unknown): boolean;
  export = isEmpty;
}

declare module 'lodash.omitby' {
  function omitBy<T extends object>(
    object: T | null | undefined,
    predicate: (value: T[keyof T], key: string) => boolean,
  ): Partial<T>;
  export = omitBy;
}

declare module 'lodash.pickby' {
  function pickBy<T extends object>(
    object: T | null | undefined,
    predicate?: (value: T[keyof T], key: string) => boolean,
  ): Partial<T>;
  export = pickBy;
}
