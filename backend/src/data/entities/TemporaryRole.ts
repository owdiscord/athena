import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("temporary_roles")
export class TemporaryRole {
  @PrimaryGeneratedColumn() id: number;

  @Column() guild_id: string;

  @Column() user_id: string;

  @Column() role_id: string;

  @Column() expires_at: string;
}
