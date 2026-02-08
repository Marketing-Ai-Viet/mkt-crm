import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { MKT_DASHBOARD_WIDGET_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';
import { ViewOpenRecordInType } from 'src/modules/view/standard-objects/view.workspace-entity';

export const mktDashboardWidgetsAllView = (
  objectMetadataItems: ObjectMetadataEntity[],
) => {
  const widgetObjectMetadata = objectMetadataItems.find(
    (object) => object.standardId === MKT_OBJECT_IDS.mktDashboardWidget,
  );

  if (!widgetObjectMetadata) {
    throw new Error('Dashboard widget object metadata not found');
  }

  return {
    name: 'All Dashboard Widgets',
    objectMetadataId: widgetObjectMetadata.id ?? '',
    type: 'table',
    key: 'INDEX',
    position: 1,
    icon: 'IconLayoutDashboard',
    kanbanFieldMetadataId: '',
    openRecordIn: ViewOpenRecordInType.SIDE_PANEL,
    filters: [],
    fields: [
      {
        fieldMetadataId:
          widgetObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_DASHBOARD_WIDGET_FIELD_IDS.widgetName,
          )?.id ?? '',
        position: 0,
        isVisible: true,
        size: 200,
      },
      {
        fieldMetadataId:
          widgetObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_DASHBOARD_WIDGET_FIELD_IDS.widgetCode,
          )?.id ?? '',
        position: 1,
        isVisible: true,
        size: 160,
      },
      {
        fieldMetadataId:
          widgetObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_DASHBOARD_WIDGET_FIELD_IDS.widgetType,
          )?.id ?? '',
        position: 2,
        isVisible: true,
        size: 140,
      },
      {
        fieldMetadataId:
          widgetObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_DASHBOARD_WIDGET_FIELD_IDS.dataSource,
          )?.id ?? '',
        position: 3,
        isVisible: true,
        size: 140,
      },
      {
        fieldMetadataId:
          widgetObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_DASHBOARD_WIDGET_FIELD_IDS.visibility,
          )?.id ?? '',
        position: 4,
        isVisible: true,
        size: 130,
      },
      {
        fieldMetadataId:
          widgetObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_DASHBOARD_WIDGET_FIELD_IDS.isActive,
          )?.id ?? '',
        position: 5,
        isVisible: true,
        size: 100,
      },
      {
        fieldMetadataId:
          widgetObjectMetadata.fields.find(
            (field) =>
              field.standardId === MKT_DASHBOARD_WIDGET_FIELD_IDS.displayOrder,
          )?.id ?? '',
        position: 6,
        isVisible: true,
        size: 100,
      },
    ],
  };
};
