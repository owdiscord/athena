import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("trakt_voice_sessions")
export class TraktVoiceSession {
  @Column()
  @PrimaryColumn()
  snowflake: number;

  @Column() session_date: Date;

  @Column() session_duration: number;
}
