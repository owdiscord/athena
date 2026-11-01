import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from "typeorm";

export class ImproveTrakt1793323070269 implements MigrationInterface {
  name = "ImproveTrakt1793323070269";

  private tables = [
    "trakt_users",
    "trakt_voice_sessions",
    "trakt_voice_summaries",
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.addColumn(
        table,
        new TableColumn({
          name: "guild_id",
          type: "varchar(22)",
          isNullable: false,
        }),
      );
      await queryRunner.createIndex(
        table,
        new TableIndex({
          name: `idx_${table}_guild_snowflake`,
          columnNames: ["guild_id", "snowflake"],
        }),
      );
    }

    // add last_decay field to trakt users so we can decay their score when necessary.
    await queryRunner.addColumn(
      "trakt_users",
      new TableColumn({
        name: "last_counted_at",
        type: "datetime",
        isNullable: true,
      }),
    );

    // create the tick-state table
    await queryRunner.createTable(
      new Table({
        name: "trakt_tick_state",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
          },
          {
            name: "last_tick",
            type: "datetime",
            isNullable: false,
            default: "now()",
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("trakt_users", "last_counted_at");
    await queryRunner.dropTable("trakt_tick_state");
    for (const table of this.tables) {
      await queryRunner.dropIndex(table, `idx_${table}_guild_snowflake`);
      await queryRunner.dropColumn(table, "guild_id");
    }
  }
}
