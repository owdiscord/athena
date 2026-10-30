import { MoreThanOrEqual, Repository } from "typeorm";
import { BaseRepository } from "./BaseRepository.js";
import { dataSource } from "./dataSource.js";
import { TraktUser } from "./entities/TraktUser.js";

export class Trakt extends BaseRepository {
  private users: Repository<TraktUser>;

  constructor() {
    super();
    this.users = dataSource.getRepository(TraktUser);
  }

  async getQualifiedUsers(
    messageScoreThreshold: number,
    timeScoreThreshold: number,
  ): Promise<TraktUser[]> {
    return await this.users.find({
      where: {
        message_score: MoreThanOrEqual(messageScoreThreshold),
        time_score: MoreThanOrEqual(timeScoreThreshold),
      },
    });
    // const thresholdDateStr = moment.utc().add(threshold, "ms").format(DBDateFormat);
    // return this.reminders.createQueryBuilder().andWhere("remind_at <= :date", { date: thresholdDateStr }).getMany();
  }
}
