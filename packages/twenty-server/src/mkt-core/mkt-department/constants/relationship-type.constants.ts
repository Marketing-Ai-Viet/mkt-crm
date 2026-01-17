import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

// Department Hierarchy Constants
export const MAX_DEPTH = 7;

// Department Hierarchy Relationship Type Options
export const DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES = {
  PARENT_CHILD: 'PARENT_CHILD',
  MATRIX: 'MATRIX',
  FUNCTIONAL: 'FUNCTIONAL',
  TEMPORARY: 'TEMPORARY',
  SUPERVISORY: 'SUPERVISORY',
  ADVISORY: 'ADVISORY',
  DOTTED_LINE: 'DOTTED_LINE',
  PEER: 'PEER',
  CROSS_FUNCTIONAL: 'CROSS_FUNCTIONAL',
  VIRTUAL: 'VIRTUAL',
} as const;

export const DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPE_OPTIONS = [
  {
    value: DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES.PARENT_CHILD,
    label: 'Parent-Child',
    color: 'green' as TagColor,
    position: 0,
  },
  {
    value: DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES.SUPERVISORY,
    label: 'Supervisory',
    color: 'blue' as TagColor,
    position: 1,
  },
  {
    value: DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES.MATRIX,
    label: 'Matrix',
    color: 'purple' as TagColor,
    position: 2,
  },
  {
    value: DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES.FUNCTIONAL,
    label: 'Functional',
    color: 'orange' as TagColor,
    position: 3,
  },
  {
    value: DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES.ADVISORY,
    label: 'Advisory',
    color: 'sky' as TagColor,
    position: 4,
  },
  {
    value: DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES.DOTTED_LINE,
    label: 'Dotted Line',
    color: 'gray' as TagColor,
    position: 5,
  },
  {
    value: DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES.PEER,
    label: 'Peer',
    color: 'turquoise' as TagColor,
    position: 6,
  },
  {
    value: DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES.CROSS_FUNCTIONAL,
    label: 'Cross-Functional',
    color: 'pink' as TagColor,
    position: 7,
  },
  {
    value: DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES.VIRTUAL,
    label: 'Virtual Team',
    color: 'red' as TagColor,
    position: 8,
  },
  {
    value: DEPARTMENT_HIERARCHY_RELATIONSHIP_TYPES.TEMPORARY,
    label: 'Temporary',
    color: 'yellow' as TagColor,
    position: 9,
  },
];
