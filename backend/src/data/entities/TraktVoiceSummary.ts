import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("trakt_voice_summaries")
export class TraktVoiceSummary {
  @Column()
  @PrimaryColumn()
  snowflake: number;

  @Column() week_total: number;

  @Column() month_total: number;

  @Column() has_regular: boolean;
}
