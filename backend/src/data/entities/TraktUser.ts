import { Column, Entity, PrimaryColumn, Index } from "typeorm";

@Entity("trakt_users")
@Index(["guild_id", "snowflake"])
export class TraktUser {
  @Column()
  guild_id: string;

  @Column()
  @PrimaryColumn()
  snowflake: string;

  @Column({ default: 1 }) message_score: number;

  @Column({ default: 0 }) time_score: number;

  @Column({ default: false }) has_regular: boolean;

  @Column({ nullable: true, type: "datetime" }) last_counted_at: Date | null;

  @Column({ default: 0 }) sanction_time: number;
}
