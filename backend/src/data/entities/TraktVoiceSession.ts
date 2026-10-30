import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("trakt_voice_sessions")
@Index(["guild_id", "snowflake"])
export class TraktVoiceSession {
  @Column()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  snowflake: string;

  @Column() session_date: Date;

  @Column() session_duration: number;
}
