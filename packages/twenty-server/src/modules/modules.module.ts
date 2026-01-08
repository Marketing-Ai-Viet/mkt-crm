import { Module } from '@nestjs/common';

import { MktTwoFacetorAuthenticationModule } from 'src/mkt-core/mkt-two-facetor-authentication/mkt-two-facetor-authentication.module';
import { CalendarModule } from 'src/modules/calendar/calendar.module';
import { ConnectedAccountModule } from 'src/modules/connected-account/connected-account.module';
import { FavoriteFolderModule } from 'src/modules/favorite-folder/favorite-folder.module';
import { FavoriteModule } from 'src/modules/favorite/favorite.module';
import { MessagingModule } from 'src/modules/messaging/messaging.module';
import { ViewModule } from 'src/modules/view/view.module';
import { WorkflowModule } from 'src/modules/workflow/workflow.module';

@Module({
  imports: [
    MessagingModule,
    CalendarModule,
    ConnectedAccountModule,
    ViewModule,
    WorkflowModule,
    FavoriteFolderModule,
    FavoriteModule,
    MktTwoFacetorAuthenticationModule,
  ],
  providers: [],
  exports: [],
})
export class ModulesModule {}
