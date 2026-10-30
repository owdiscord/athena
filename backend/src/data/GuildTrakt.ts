import { MoreThanOrEqual, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository.js";
import { TraktUser } from "./entities/TraktUser.js";
import { dataSource } from "./dataSource.js";

export class GuildTrakt extends BaseGuildRepository {
  private users: Repository<TraktUser>;

  constructor(guildId: string) {
    super(guildId);
    this.users = dataSource.getRepository(TraktUser);
  }

  async countTrackedUsers(): Promise<number> {
    return (
      this.users.count({
        where: {
          guild_id: this.guildId,
        },
      }) || 0
    );
  }

  async find(snowflake: string): Promise<TraktUser | null> {
    return this.users.findOneBy({
      snowflake: snowflake,
      guild_id: this.guildId,
    });
  }

  async delete(snowflake: string) {
    this.users.delete({ snowflake: snowflake, guild_id: this.guildId });
  }

  async overrideTime(snowflake: string, timeScore: number): Promise<boolean> {
    const user = await this.users.findOneBy({
      snowflake: snowflake,
      guild_id: this.guildId,
    });
    if (!user) return false;
    user.time_score = timeScore;
    await this.users.save(user);
    return true;
  }

  async overrideMessage(
    snowflake: string,
    messageScore: number,
  ): Promise<boolean> {
    const user = await this.users.findOneBy({
      snowflake: snowflake,
      guild_id: this.guildId,
    });
    if (!user) return false;
    user.message_score = messageScore;
    await this.users.save(user);
    return true;
  }

  async mutateIfExists(snowflake: string, action: (user: TraktUser) => void) {
    const user = await this.users.findOneBy({
      snowflake: snowflake,
      guild_id: this.guildId,
    });
    if (user != null) {
      action(user);
      await this.users.save(user);
    }
  }

  async mutateWithCreate(snowflake: string, action: (user: TraktUser) => void) {
    var user = await this.users.findOneBy({
      snowflake: snowflake,
      guild_id: this.guildId,
    });
    if (user != null) {
      action(user);
    } else {
      user = new TraktUser();
      user.guild_id = this.guildId;
      user.snowflake = snowflake;
      action(user);
    }
    await this.users.save(user);
  }

  async timeScoreTick(
    snowflake: string,
    timeTrackingThreshold: number,
    timeScoreThreshold: number,
  ) {
    var users = await this.users.find({
      where: {
        snowflake,
        guild_id: this.guildId,
        message_score: MoreThanOrEqual(timeTrackingThreshold),
      },
    });
    users.forEach((user) => {
      if (user.time_score < timeScoreThreshold) {
        user.time_score++;
      }
    });
    await this.users.save(users);
  }

  async messageScoreTick(snowflake: string, messageScoreCap: number) {
    var user = await this.users.findOneBy({
      snowflake: snowflake,
      guild_id: this.guildId,
    });
    if (user != null) {
      if (user.message_score < messageScoreCap) {
        user.message_score++;
      }
    } else {
      user = new TraktUser();
      user.guild_id = this.guildId;
      user.snowflake = snowflake;
    }
    await this.users.save(user);
  }

  async decayTick(magnitude: number): Promise<TraktUser[]> {
    const users = await this.users.find();
    const toUpdate: TraktUser[] = [];
    const toDelete: TraktUser[] = [];
    users.forEach((user) => {
      user.time_score -= magnitude;
      (user.time_score <= 0 ? toDelete : toUpdate).push(user);
    });
    if (toUpdate.length > 0) {
      this.users.save(toUpdate);
    }
    if (toDelete.length > 0) {
      this.users.delete(toDelete);
    }
    return toDelete;
  }

  async regularSweep(
    messageScoreThreshold: number,
    timeScoreThreshold: number,
  ): Promise<TraktUser[]> {
    // Find all users who are qualified to be given regular
    const qualified = (
      await this.users.find({
        where: {
          guild_id: this.guildId,
          has_regular: false,
          time_score: MoreThanOrEqual(timeScoreThreshold),
          message_score: MoreThanOrEqual(messageScoreThreshold),
        },
      })
    )
      // Bump their regular status to true in the database and mass-save
      .map((user) => ({ ...user, has_regular: true }));
    await this.users.save(qualified);

    // Return the qualified list so we can apply the role
    return qualified;
  }

  async warn(snowflake: string, timeDecrement: number) {
    const user = await this.users.findOneBy({
      snowflake: snowflake,
      guild_id: this.guildId,
    });
    if (user != null) {
      user.time_score -= timeDecrement;
      await this.users.save(user);
    }
  }

  async sanction(snowflake: string, newTimeValue: number) {
    const user = await this.users.findOneBy({
      snowflake: snowflake,
      guild_id: this.guildId,
    });
    if (user != null) {
      user.has_regular = false;
      user.time_score = -newTimeValue;
      user.message_score = 0;
      await this.users.save(user);
    }
  }
}
