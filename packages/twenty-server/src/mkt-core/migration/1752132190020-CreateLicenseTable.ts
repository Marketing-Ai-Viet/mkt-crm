import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLicenseTable1752132190020 implements MigrationInterface {
    name = 'CreateLicenseTable1752132190020'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "core"."license_status_histories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" character varying NOT NULL, "changedAt" TIMESTAMP NOT NULL, "changedBy" character varying NOT NULL, "note" text, "license_id" uuid, CONSTRAINT "PK_428463e0105404bb0139a418f55" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "core"."licenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "licenseCode" character varying NOT NULL, "orderCode" character varying NOT NULL, "productName" character varying NOT NULL, "customerEmail" character varying NOT NULL, "customerName" character varying NOT NULL, "customerContact" character varying, "status" character varying NOT NULL DEFAULT 'active', "activatedAt" TIMESTAMP NOT NULL, "expiredAt" TIMESTAMP NOT NULL, "saleInCharge" character varying NOT NULL, "supportInCharge" character varying NOT NULL, "assignedAt" TIMESTAMP NOT NULL, "lastLoginAt" TIMESTAMP, "currentVersion" character varying, "deviceInfo" text, "internalNote" text, CONSTRAINT "UQ_d93e404c22afac2be9aec7fd090" UNIQUE ("licenseCode"), CONSTRAINT "PK_da5021501ce80efa03de6f40086" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "core"."license_status_histories" ADD CONSTRAINT "FK_e4aab99b40c9a85adb91d3fd609" FOREIGN KEY ("license_id") REFERENCES "core"."licenses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "core"."license_status_histories" DROP CONSTRAINT "FK_e4aab99b40c9a85adb91d3fd609"`);
        await queryRunner.query(`DROP TABLE "core"."licenses"`);
        await queryRunner.query(`DROP TABLE "core"."license_status_histories"`);
    }

}
