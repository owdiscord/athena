import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("trakt_message_targets")
export class TraktMessageTarget {
  @Column()
  @PrimaryColumn()
  owner: number;

  @Column()
  @Index()
  target: number;

  @Column() timeout: number;
}
