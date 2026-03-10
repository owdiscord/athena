import moment from "moment-timezone";
import { Repository } from "typeorm";
import { DAYS, DBDateFormat } from "../utils.js";
import { BaseRepository } from "./BaseRepository.js";
import { dataSource } from "./dataSource.js";
import { TemporaryRole } from "./entities/TemporaryRole.js";

const OLD_EXPIRED_THRESHOLD = 7 * DAYS;

// When a timeout is under this duration but the TemporaryRole expires later, the timeout will be reset to max duration
export const TIMEOUT_RENEWAL_THRESHOLD = 21 * DAYS;

export class TemporaryRoles extends BaseRepository {
  private temporary_roles: Repository<TemporaryRole>;

  constructor() {
    super();
    this.temporary_roles = dataSource.getRepository(TemporaryRole);
  }

  findTemporaryRole(
    guildId: string,
    userId: string,
  ): Promise<TemporaryRole | null> {
    return this.temporary_roles.findOne({
      where: {
        guild_id: guildId,
        user_id: userId,
      },
    });
  }

  getSoonExpiringTemporaryRoles(threshold: number): Promise<TemporaryRole[]> {
    const thresholdDateStr = moment
      .utc()
      .add(threshold, "ms")
      .format(DBDateFormat);
    return this.temporary_roles
      .createQueryBuilder("temporary_roles")
      .andWhere("expires_at IS NOT NULL")
      .andWhere("expires_at <= :date", { date: thresholdDateStr })
      .getMany();
  }

  async clearOldExpiredTemporaryRoles(): Promise<void> {
    const thresholdDateStr = moment
      .utc()
      .subtract(OLD_EXPIRED_THRESHOLD, "ms")
      .format(DBDateFormat);
    await this.temporary_roles
      .createQueryBuilder("temporary_roles")
      .andWhere("expires_at IS NOT NULL")
      .andWhere("expires_at <= :date", { date: thresholdDateStr })
      .delete()
      .execute();
  }
}
