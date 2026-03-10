import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class TimedRoles1773110740288 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.createTable(
      new Table({
        name: "temporary_roles",
        columns: [
          {
            name: "id",
            type: "int",
            unsigned: true,
            isGenerated: true,
            generationStrategy: "increment",
            isPrimary: true,
          },
          {
            name: "guild_id",
            type: "text",
            isNullable: false,
          },
          {
            name: "user_id",
            type: "text",
            isNullable: false,
          },
          {
            name: "role_id",
            type: "text",
            isNullable: false,
          },
          {
            name: "expires_at",
            type: "datetime",
            isNullable: false,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.dropTable("temporary_roles");
  }
}
