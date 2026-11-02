import { Repository } from "typeorm";
import { isAPI } from "../globals.js";
import { HOURS, SECONDS } from "../utils.js";
import { BaseRepository } from "./BaseRepository.js";
import { cleanupConfigs } from "./cleanup/configs.js";
import { dataSource } from "./dataSource.js";
import { Config } from "./entities/Config.js";

const CLEANUP_INTERVAL = 1 * HOURS;

async function cleanup() {
  await cleanupConfigs();
  setTimeout(cleanup, CLEANUP_INTERVAL);
}

if (isAPI()) {
  // Start first cleanup 30 seconds after startup
  // TODO: Move to bot startup code
  setTimeout(cleanup, 30 * SECONDS);
}

export class Configs extends BaseRepository {
  private configs: Repository<Config>;

  constructor() {
    super();
    this.configs = dataSource.getRepository(Config);
  }

  getActive() {
    return this.configs.find({
      where: { is_active: true },
    });
  }

  getActiveByKey(key: string) {
    return this.configs.findOne({
      where: {
        key,
        is_active: true,
      },
    });
  }

  async swapRawValueInPlace(key: string, oldValue: RegExp, newValue: string) {
    const active = await this.getActiveByKey(key);
    if (!active) throw "latest active key could not be found";

    const updatedConfig = active.config.replace(oldValue, newValue);
    active.config = updatedConfig;
    this.configs.save(active);
  }

  async getHighestId(): Promise<number> {
    const rows = await dataSource.query(
      "SELECT MAX(id) AS highest_id FROM configs",
    );
    return (rows.length && rows[0].highest_id) || 0;
  }

  getActiveLargerThanId(id: number) {
    return this.configs
      .createQueryBuilder()
      .where("id > :id", { id })
      .andWhere("is_active = 1")
      .getMany();
  }

  async hasConfig(key: string) {
    return (await this.getActiveByKey(key)) != null;
  }

  getRevisions(key: string, num = 10) {
    return this.configs.find({
      relations: this.getRelations(),
      where: { key },
      select: ["id", "key", "is_active", "edited_by", "edited_at"],
      order: {
        edited_at: "DESC",
      },
      take: num,
    });
  }

  async saveNewRevision(
    key: string,
    config: string,
    editedBy: number | string,
  ) {
    return dataSource.transaction(async (entityManager) => {
      const repo = entityManager.getRepository(Config);
      // Mark all old revisions inactive
      await repo.update({ key }, { is_active: false });
      // Add new, active revision
      await repo.insert({
        key,
        config,
        is_active: true,
        edited_by: `${editedBy}`,
      });
    });
  }
}
