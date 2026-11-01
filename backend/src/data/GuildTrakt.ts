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

  async tickUserScore(snowflake: string, messageScoreCap: number) {
    await this.users.query(
      `INSERT INTO trakt_users (snowflake, guild_id, message_score, time_score, last_counted_at) 
       VALUES (?, ?, 1, 0, UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE
          message_score   = IF(last_counted_at IS NULL OR last_counted_at <= UTC_TIMESTAMP() - INTERVAL 15 MINUTE,
            LEAST(${messageScoreCap}, message_score + 1), message_score),
          last_counted_at = IF(last_counted_at IS NULL OR last_counted_at <= UTC_TIMESTAMP() - INTERVAL 15 MINUTE,
            UTC_TIMESTAMP(), last_counted_at)`,
      [snowflake, this.guildId],
    );
  }

  async tryCreateFirstTickState() {
    await dataSource
      .query(
        "INSERT IGNORE INTO trakt_tick_state (id, last_tick) VALUES (1, UTC_TIMESTAMP() - INTERVAL 1 DAY)",
      )
      .catch(() => {});
  }

  async tryDecay(
    timeCreditMessageThreshold: number,
    timeScoreCap: number,
    decayMagnitude: number,
  ): Promise<string[]> {
    return dataSource.transaction(async (tx) => {
      const [state] = await tx.query(
        `SELECT (last_tick + INTERVAL 1 DAY <= UTC_TIMESTAMP()) AS due
       FROM trakt_tick_state WHERE id = 1 FOR UPDATE`,
      );
      if (!state || !Number(state.due)) return [];

      await tx.query(
        `UPDATE trakt_users SET
         message_score = GREATEST(0, message_score - ${decayMagnitude}),
         time_score = IF(message_score >= ?, LEAST(?, time_score + 1), time_score)`,
        [timeCreditMessageThreshold, timeScoreCap],
      );

      const revoked: string[] = (
        await tx.query(
          `SELECT snowflake FROM trakt_users WHERE message_score = 0 AND has_regular`,
        )
      ).map((r: { snowflake: string }) => r.snowflake);

      await tx.query(
        `UPDATE trakt_users SET has_regular = 0 WHERE message_score = 0`,
      );
      await tx.query(
        `DELETE FROM trakt_users WHERE message_score = 0 AND time_score >= 0`,
      );
      await tx.query(
        `UPDATE trakt_tick_state SET last_tick = last_tick + INTERVAL 1 DAY WHERE id = 1`,
      );
      return revoked;
    });
  }

  // async timeScoreTick(
  //   snowflake: string,
  //   timeTrackingThreshold: number,
  //   timeScoreThreshold: number,
  // ) {
  //   var users = await this.users.find({
  //     where: {
  //       snowflake,
  //       guild_id: this.guildId,
  //       message_score: MoreThanOrEqual(timeTrackingThreshold),
  //     },
  //   });
  //   users.forEach((user) => {
  //     if (user.time_score < timeScoreThreshold) {
  //       user.time_score++;
  //     }
  //   });
  //   await this.users.save(users);
  // }

  // async scoreTickUser(
  //   snowflake: string,
  //   messageScoreCap: number,
  //   timeScoreCap: number,
  // ) {
  //   const user = await this.users.findOneBy({
  //     snowflake: snowflake,
  //     guild_id: this.guildId,
  //   });
  //
  //   // If the user doesn't exist, create them with a default score.
  //   if (!user) {
  //     const user = new TraktUser();
  //     user.guild_id = this.guildId;
  //     user.snowflake = snowflake;
  //     user.message_score = 1;
  //     user.time_score = 0;
  //     await this.users.save(user);
  //
  //     return;
  //   }
  //
  //   // If the message score is above or equal to the cap, reset message score and bump time score
  //   if (user.message_score >= messageScoreCap) {
  //     user.time_score = true;
  //   }
  //
  //   // Save the user, either as a newly created user, or bumping the
  //   await this.users.save(user);
  // }
  //
  // async messageScoreTick(snowflake: string, messageScoreCap: number) {
  //   var user = await this.users.findOneBy({
  //     snowflake: snowflake,
  //     guild_id: this.guildId,
  //   });
  //   if (user != null) {
  //     if (user.message_score < messageScoreCap) {
  //       user.message_score++;
  //     }
  //   } else {
  //     user = new TraktUser();
  //     user.guild_id = this.guildId;
  //     user.snowflake = snowflake;
  //   }
  //   await this.users.save(user);
  // }
  //
  // async decayTick(magnitude: number): Promise<TraktUser[]> {
  //   const users = await this.users.find();
  //   const toUpdate: TraktUser[] = [];
  //   const toDelete: TraktUser[] = [];
  //   users.forEach((user) => {
  //     user.time_score -= magnitude;
  //     (user.time_score <= 0 ? toDelete : toUpdate).push(user);
  //   });
  //   if (toUpdate.length > 0) {
  //     this.users.save(toUpdate);
  //   }
  //   if (toDelete.length > 0) {
  //     this.users.delete(toDelete);
  //   }
  //   return toDelete;
  // }

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
