import { msg } from '@lingui/core/macro';
import { APP_LOCALES } from 'twenty-shared/translations';
import { FieldMetadataType } from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceIsSearchable } from 'src/engine/twenty-orm/decorators/workspace-is-searchable.decorator';
import { MKT_SENDMAIL_TEMPLATE_FIELD_IDS } from 'src/mkt-core/constants/mkt-field-ids';
import { MKT_OBJECT_IDS } from 'src/mkt-core/constants/mkt-object-ids';

@WorkspaceEntity({
  standardId: MKT_OBJECT_IDS.mktSendmailTemplate,
  namePlural: 'mktSendmailTemplates',
  labelSingular: msg`Sendmail Template`,
  labelPlural: msg`Sendmail Templates`,
  description: msg`Template for sending emails in the marketing system.`,
  icon: 'IconMail',
  shortcut: 'T',
  labelIdentifierStandardId: MKT_SENDMAIL_TEMPLATE_FIELD_IDS.name,
})
@WorkspaceIsSearchable()
export class MktSendmailTemplateWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: MKT_SENDMAIL_TEMPLATE_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Template Name`,
    description: msg`Email template name`,
    icon: 'IconFileText',
  })
  name: string;

  @WorkspaceField({
    standardId: MKT_SENDMAIL_TEMPLATE_FIELD_IDS.language,
    type: FieldMetadataType.TEXT,
    label: msg`Language`,
    description: msg`Language of the email template`,
    icon: 'IconHash',
  })
  language: keyof typeof APP_LOCALES;

  @WorkspaceField({
    standardId: MKT_SENDMAIL_TEMPLATE_FIELD_IDS.type,
    type: FieldMetadataType.TEXT,
    label: msg`Template Type`,
    description: msg`Type of email template (SEND_PASSWORD, WELCOME_EMAIL,...)`,
    icon: 'IconTag',
  })
  type: string;

  @WorkspaceField({
    standardId: MKT_SENDMAIL_TEMPLATE_FIELD_IDS.subject,
    type: FieldMetadataType.TEXT,
    label: msg`Subject`,
    description: msg`Subject of the email to be sent`,
    icon: 'IconMail',
  })
  subject: string;

  @WorkspaceField({
    standardId: MKT_SENDMAIL_TEMPLATE_FIELD_IDS.text,
    type: FieldMetadataType.TEXT,
    label: msg`Text Content`,
    description: msg`Plain text content of the email (no HTML)`,
    icon: 'IconFileText',
  })
  text: string;

  @WorkspaceField({
    standardId: MKT_SENDMAIL_TEMPLATE_FIELD_IDS.body,
    type: FieldMetadataType.TEXT,
    label: msg`HTML Body`,
    description: msg`HTML content of the email`,
    icon: 'IconFileText',
  })
  body: string;
}
