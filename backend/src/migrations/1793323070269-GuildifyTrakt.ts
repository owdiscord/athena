import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from "typeorm";

export class GuildifyTrakt1793323070269 implements MigrationInterface {
  name = "GuildifyTrakt1793323070269";

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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.dropIndex(table, `idx_${table}_guild_snowflake`);
      await queryRunner.dropColumn(table, "guild_id");
    }
  }
}
