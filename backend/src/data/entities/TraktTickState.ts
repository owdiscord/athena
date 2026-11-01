import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("trakt_tick_state")
export class TraktTickState {
  @PrimaryColumn()
  id: number;

  @Column()
  last_tick: Date;
}
