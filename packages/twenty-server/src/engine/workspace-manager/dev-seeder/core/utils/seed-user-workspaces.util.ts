import { DataSource } from 'typeorm';

import { UserWorkspace } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { USER_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/core/utils/seed-users.util';
import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/utils/seed-workspaces.util';

const tableName = 'userWorkspace';

export const USER_WORKSPACE_DATA_SEED_IDS = {
  JANE: '20202020-1e7c-43d9-a5db-685b5069d816',
  TIM: '20202020-9e3b-46d4-a556-88b9ddc2b035',
  JONY: '20202020-3957-4908-9c36-2929a23f8353',
  PHIL: '20202020-7169-42cf-bc47-1cfef15264b1',
  JANE_ACME: '20202020-ae8d-41ea-9469-f74f5d4b002e',
  TIM_ACME: '20202020-e10a-4c27-a90b-b08c57b02d44',
  JONY_ACME: '20202020-e10a-4c27-a90b-b08c57b02d45',
  PHIL_ACME: '20202020-e10a-4c27-a90b-b08c57b02d46',
  // Level 4-6 test users
  SARAH: '44192940-7bc1-4e74-9634-c83f94cde9eb',
  MICHAEL: '78677122-5dab-4115-ab61-4313d2b936c6',
  EMILY: '7a2083e8-5022-4198-82bd-c9c4410d06c9',
  // Extended test users covering all org levels and departments
  CRAIG: 'e337071a-8e01-49e1-b083-47686f323095',
  ANGELA: '17406c16-abf0-4e7c-840a-9c5212c00274',
  DAN: '602fe257-ca63-4261-9b2a-00a22b839d59',
  EDDY: '488db71d-45da-4525-9be2-bf07acadf4b6',
  DEIRDRE: '141f5fa6-1c68-431f-9706-8003b6731b3b',
  LISA: '06948a84-f86c-4887-b253-ee40d515a091',
  JOHN_T: '7fe2de1c-f07c-4ae5-b9c6-aa30ee54b452',
  GREG: '180aad03-186a-4bdd-af3e-7d8fed5e09a2',
  LUCA: '350c5980-689d-4381-af66-f484c673d4e5',
  JEFF: '40895a00-2148-418f-ac8c-cc91e4c1f22b',
};

export const seedUserWorkspaces = async (
  dataSource: DataSource,
  schemaName: string,
  workspaceId: string,
) => {
  let userWorkspaces: Pick<UserWorkspace, 'id' | 'userId' | 'workspaceId'>[] =
    [];

  if (workspaceId === SEED_APPLE_WORKSPACE_ID) {
    userWorkspaces = [
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.TIM,
        userId: USER_DATA_SEED_IDS.TIM,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.JANE,
        userId: USER_DATA_SEED_IDS.JANE,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.JONY,
        userId: USER_DATA_SEED_IDS.JONY,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.PHIL,
        userId: USER_DATA_SEED_IDS.PHIL,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.SARAH,
        userId: USER_DATA_SEED_IDS.SARAH,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.MICHAEL,
        userId: USER_DATA_SEED_IDS.MICHAEL,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.EMILY,
        userId: USER_DATA_SEED_IDS.EMILY,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.CRAIG,
        userId: USER_DATA_SEED_IDS.CRAIG,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.ANGELA,
        userId: USER_DATA_SEED_IDS.ANGELA,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.DAN,
        userId: USER_DATA_SEED_IDS.DAN,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.EDDY,
        userId: USER_DATA_SEED_IDS.EDDY,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.DEIRDRE,
        userId: USER_DATA_SEED_IDS.DEIRDRE,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.LISA,
        userId: USER_DATA_SEED_IDS.LISA,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.JOHN_T,
        userId: USER_DATA_SEED_IDS.JOHN_T,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.GREG,
        userId: USER_DATA_SEED_IDS.GREG,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.LUCA,
        userId: USER_DATA_SEED_IDS.LUCA,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.JEFF,
        userId: USER_DATA_SEED_IDS.JEFF,
        workspaceId,
      },
    ];
  }

  if (workspaceId === SEED_YCOMBINATOR_WORKSPACE_ID) {
    userWorkspaces = [
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.TIM_ACME,
        userId: USER_DATA_SEED_IDS.TIM,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.JONY_ACME,
        userId: USER_DATA_SEED_IDS.JONY,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.PHIL_ACME,
        userId: USER_DATA_SEED_IDS.PHIL,
        workspaceId,
      },
      {
        id: USER_WORKSPACE_DATA_SEED_IDS.JANE_ACME,
        userId: USER_DATA_SEED_IDS.JANE,
        workspaceId,
      },
    ];
  }
  await dataSource
    .createQueryBuilder()
    .insert()
    .into(`${schemaName}.${tableName}`, ['id', 'userId', 'workspaceId'])
    .orIgnore()
    .values(userWorkspaces)
    .execute();
};

export const deleteUserWorkspaces = async (
  dataSource: DataSource,
  schemaName: string,
  workspaceId: string,
) => {
  await dataSource
    .createQueryBuilder()
    .delete()
    .from(`${schemaName}.${tableName}`)
    .where(`"${tableName}"."workspaceId" = :workspaceId`, {
      workspaceId,
    })
    .execute();
};
