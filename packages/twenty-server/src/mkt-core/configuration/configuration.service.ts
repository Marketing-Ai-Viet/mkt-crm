import { Injectable } from '@nestjs/common';

import { DEFAULT_HIDDEN_DATA_MODEL_OBJECTS,DEFAULT_HIDDEN_NAVIGATION_ITEMS,DEFAULT_HIDDEN_NAVIGATION_OBJECTS } from './navigation-config.enum';

export interface NavigationConfiguration {
  hiddenObjects: string[];
  hiddenItems: string[];
  hiddenDataModelObjects: string[];
}

@Injectable()
export class ConfigurationService {
  /**
   * Get navigation configuration including hidden objects and items
   */
  getNavigationConfiguration(): NavigationConfiguration {
    return {
      hiddenObjects: DEFAULT_HIDDEN_NAVIGATION_OBJECTS,
      hiddenItems: DEFAULT_HIDDEN_NAVIGATION_ITEMS,
      hiddenDataModelObjects: DEFAULT_HIDDEN_DATA_MODEL_OBJECTS,
    };
  }
}
