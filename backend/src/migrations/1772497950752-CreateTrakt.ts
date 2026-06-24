import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateTrakt1772497950752 implements MigrationInterface {
  name = "CreateTrakt1772497950752";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "trakt_users",
        columns: [
          {
            name: "snowflake",
            type: "bigint",
            unsigned: true,
            isNullable: false,
            isPrimary: true,
          },
          {
            name: "message_score",
            type: "smallint",
            isNullable: false,
            default: 1,
          },
          {
            name: "time_score",
            type: "smallint",
            isNullable: false,
            default: 0,
          },
          {
            name: "has_regular",
            type: "boolean",
            default: false,
            isNullable: false,
          },
          {
            name: "sanction_time",
            type: "int",
            isNullable: true,
            default: null,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: "trakt_voice_sessions",
        columns: [
          {
            name: "snowflake",
            type: "bigint",
            unsigned: true,
            isNullable: false,
            isPrimary: true,
          },
          {
            name: "session_date",
            type: "date",
            isNullable: false,
          },
          {
            name: "session_duration",
            type: "int",
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: "trakt_voice_summaries",
        columns: [
          {
            name: "snowflake",
            type: "bigint",
            unsigned: true,
            isNullable: false,
            isPrimary: true,
          },
          {
            name: "week_total",
            type: "int",
            isNullable: false,
          },
          {
            name: "month_total",
            type: "int",
            isNullable: false,
          },
          {
            name: "has_regular",
            type: "bool",
            isNullable: false,
            default: false,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: "trakt_message_targets",
        columns: [
          {
            name: "owner",
            type: "bigint",
            unsigned: true,
            isNullable: false,
            isPrimary: true,
          },
          {
            name: "target",
            type: "bigint",
            unsigned: true,
            isNullable: false,
          },
          {
            name: "timeout",
            type: "int",
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      "trakt_message_targets",
      new TableIndex({
        columnNames: ["target"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.dropTable("trakt_users");
    queryRunner.dropTable("trakt_voice_session");
    queryRunner.dropTable("trakt_voice_summary");
    queryRunner.dropTable("trakt_message_targets");
  }
}
