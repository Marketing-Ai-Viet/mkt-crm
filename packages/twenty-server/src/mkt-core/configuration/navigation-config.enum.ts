export enum HiddenNavigationObject {
  // MKT Objects
  MKT_ATTRIBUTES = 'mktAttributes',
  MKT_VARIANTS = 'mktVariants',
  MKT_VALUES = 'mktValues',
  MKT_VARIANT_ATTRIBUTES = 'mktVariantAttributes',
  MKT_ORDER_ITEMS = 'orderItems',
  
  // Standard Objects (from the image)
  COMPANIES = 'companies',
  OPPORTUNITIES = 'opportunities',
  TASKS = 'tasks',
  NOTES = 'notes',
  SURVEY_RESULTS = 'surveyResults',
  WORKFLOWS = 'workflows',
  TEMPLATES = 'mktTemplates',
}

export enum HiddenNavigationItem {
  SEARCH = 'search',
  ASK_AI = 'askAI',
}

export enum HiddenDataModelObject {
  COMPANIES = 'companies',
  NOTES = 'notes',
  OPPORTUNITIES = 'opportunities',
  SURVEY_RESULTS = 'surveyResults',
  TASKS = 'tasks',
  WORKFLOWS = 'workflows',
  WORKFLOW_RUNS = 'workflowRuns',
  WORKFLOW_VERSIONS = 'workflowVersions',
}

export const DEFAULT_HIDDEN_NAVIGATION_OBJECTS = [
  // MKT Objects (original)
  HiddenNavigationObject.MKT_ATTRIBUTES,
  HiddenNavigationObject.MKT_VARIANTS,
  HiddenNavigationObject.MKT_VALUES,
  HiddenNavigationObject.MKT_VARIANT_ATTRIBUTES,
  HiddenNavigationObject.MKT_ORDER_ITEMS,
  
  // Standard Objects (from the image)
  HiddenNavigationObject.COMPANIES,
  HiddenNavigationObject.OPPORTUNITIES,
  HiddenNavigationObject.TASKS,
  HiddenNavigationObject.NOTES,
  HiddenNavigationObject.SURVEY_RESULTS,
  HiddenNavigationObject.WORKFLOWS,
  HiddenNavigationObject.TEMPLATES,
];

export const DEFAULT_HIDDEN_NAVIGATION_ITEMS = [
  HiddenNavigationItem.SEARCH,
  HiddenNavigationItem.ASK_AI,
];

export const DEFAULT_HIDDEN_DATA_MODEL_OBJECTS = [
  HiddenDataModelObject.COMPANIES,
  HiddenDataModelObject.NOTES,
  HiddenDataModelObject.OPPORTUNITIES,
  HiddenDataModelObject.SURVEY_RESULTS,
  HiddenDataModelObject.TASKS,
  HiddenDataModelObject.WORKFLOWS,
  HiddenDataModelObject.WORKFLOW_RUNS,
  HiddenDataModelObject.WORKFLOW_VERSIONS,
];
