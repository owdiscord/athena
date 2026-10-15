import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("trakt_users")
export class TraktUser {
  @Column()
  @PrimaryColumn()
  snowflake: number;

  @Column({ default: 1 }) message_score: number;

  @Column({ default: 0 }) time_score: number;

  @Column({ default: false }) has_regular: boolean;

  @Column({ default: 0 }) sanction_time: number;
}
