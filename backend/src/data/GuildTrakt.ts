import { MoreThanOrEqual, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository.js";
import { TraktUser } from "./entities/TraktUser.js";
import { dataSource } from "./dataSource.js";

export class GuildTrakt extends BaseGuildRepository {
  private trakt: Repository<TraktUser>;

  constructor(guildId) {
    super(guildId);
    this.trakt = dataSource.getRepository(TraktUser);
  }

  async mutateIfExists(snowflake: number, action: (user: TraktUser) => void) {
    const user = await this.trakt.findOneBy({snowflake: snowflake})
    if (user != null) {
      action(user)
      await this.trakt.save(user)
    }
  }

  async mutateWithCreate(snowflake: number, action: (user: TraktUser) => void) {
    var user = await this.trakt.findOneBy({snowflake: snowflake})
    if (user != null) {
      action(user)
    } else {
      user = new TraktUser()
      user.snowflake = snowflake
      action(user)
    }
    await this.trakt.save(user)
  }

  async timeScoreTick(snowflake: number, timeTrackingThreshold: number, timeScoreThreshold: number) {
    var users = await this.trakt.find({
      where: {
        message_score: MoreThanOrEqual(timeTrackingThreshold)
      }
    })
    users.forEach(user => {
      if (user.time_score < timeScoreThreshold) {
        user.time_score++;
      }
    });
    await this.trakt.save(users);
  }

  async messageScoreTick(snowflake: number, messageScoreCap: number) {
    var user = await this.trakt.findOneBy({snowflake: snowflake})
    if (user != null) {
      if (user.message_score < messageScoreCap) {
        user.message_score++;
      }
    } else {
      user = new TraktUser();
      user.snowflake = snowflake;
    }
    await this.trakt.save(user);
  }

  async decayTick(magnitude: number): Promise<TraktUser[]> {
    const users = await this.trakt.find();
    const toUpdate: TraktUser[] = [];
    const toDelete: TraktUser[] = [];
    users.forEach(user => {
      user.time_score -= magnitude;
      (user.time_score <= 0 ? toDelete : toUpdate).push(user);
    });
    if (toUpdate.length > 0) {
      this.trakt.save(toUpdate)
    }
    if (toDelete.length > 0) {
      this.trakt.delete(toDelete)
    }
    return toDelete
  }

  async regularSweep(messageScoreThreshold: number, timeScoreThreshold: number): Promise<TraktUser[]> {
    const users = await this.trakt.find();
    const qualified: TraktUser[] = [];
    users.forEach(user => {
      if (!user.has_regular && user.time_score >= timeScoreThreshold && user.message_score >= messageScoreThreshold) {
        user.has_regular = true
        qualified.push(user)
      }
    });
    await this.trakt.save(qualified)
    return qualified
  }

  async warn(snowflake: number, timeDecrement: number) {
    const user = await this.trakt.findOneBy({snowflake: snowflake})
    if (user != null) {
      user.time_score -= timeDecrement
      await this.trakt.save(user)
    }
  }

  async sanction(snowflake: number, newTimeValue: number) {
    const user = await this.trakt.findOneBy({snowflake: snowflake})
    if (user != null) {
      user.has_regular = false
      user.time_score = -newTimeValue
      user.message_score = 0
      await this.trakt.save(user)
    }
  }
}