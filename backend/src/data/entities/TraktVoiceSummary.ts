import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("trakt_voice_summaries")
@Index(["guild_id", "snowflake"])
export class TraktVoiceSummary {
  @Column()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  snowflake: string;

  @Column() week_total: number;

  @Column() month_total: number;

  @Column() has_regular: boolean;
}
