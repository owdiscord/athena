import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("trakt_users")
export class TraktUser {
  @Column()
  @PrimaryColumn()
  snowflake: number;

  @Column() message_score: number;

  @Column() time_score: number;

  @Column() has_regular: boolean;

  @Column() sanction_time: number;
}
