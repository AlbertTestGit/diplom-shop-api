import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PluginVersion } from './entities/plugin-version.entity';
import { UploadDto } from './dto/upload.dto';
import { UserDto } from 'src/wordpress/dto/user.dto';
import { unlink, writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

@Injectable()
export class PluginVersionsService {
  constructor(
    @InjectRepository(PluginVersion)
    private pluginVersionsRepository: Repository<PluginVersion>,
    private configService: ConfigService,
  ) {}

  async findPluginVersions(pluginId: number) {
    const query = await this.pluginVersionsRepository.manager.query<
      PluginVersion[]
    >(`
      SELECT *
      FROM plugin_version
      WHERE
        pluginId=${pluginId}
      ORDER BY
        CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(version, '.', 1), '.', -1) AS UNSIGNED) DESC,
        CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(version, '.', 2), '.', -1) AS UNSIGNED) DESC,
        CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(version, '.', 3), '.', -1) AS UNSIGNED) DESC;
    `);
    return query;
  }

  async findByVersion(pluginId: number, version: string) {
    return await this.pluginVersionsRepository.findOne({
      where: {
        pluginId,
        version,
      },
    });
  }

  async findById(pluginVersionId: number) {
    return await this.pluginVersionsRepository.findOne({
      where: {
        id: pluginVersionId,
      },
    });
  }

  async uploadVersion(uploadDto: UploadDto, user: UserDto) {
    try {
      const uploadDir = this.configService.get('UPLOAD_DIR');

      const pluginFileName = uuidv4();
      const helpFileEn = uploadDto.helpFileEn ? uuidv4() : null;
      const helpFileKz = uploadDto.helpFileKz ? uuidv4() : null;
      const helpFileRu = uploadDto.helpFileRu ? uuidv4() : null;

      await writeFile(
        join(uploadDir, pluginFileName),
        uploadDto.pluginFile.buffer,
      );

      if (helpFileEn)
        await writeFile(
          join(uploadDir, helpFileEn),
          uploadDto.pluginFile.buffer,
        );
      if (helpFileKz)
        await writeFile(
          join(uploadDir, helpFileKz),
          uploadDto.pluginFile.buffer,
        );
      if (helpFileRu)
        await writeFile(
          join(uploadDir, helpFileRu),
          uploadDto.pluginFile.buffer,
        );

      const pluginVersion = new PluginVersion();
      pluginVersion.version = uploadDto.version;
      pluginVersion.description = uploadDto.description;
      pluginVersion.fileName = pluginFileName;
      pluginVersion.helpFileEn = helpFileEn;
      pluginVersion.helpFileKz = helpFileKz;
      pluginVersion.helpFileRu = helpFileRu;
      pluginVersion.author = user.id;
      pluginVersion.gitRepository = uploadDto.gitRepository;
      pluginVersion.beta = JSON.parse(String(uploadDto.beta || true));
      pluginVersion.pluginId = uploadDto.pluginId;

      return await this.pluginVersionsRepository.save(pluginVersion);
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException();
    }
  }

  async getCurrentVersion(pluginId: number) {
    const query = await this.pluginVersionsRepository.manager.query<
      PluginVersion[]
    >(`
      SELECT *
      FROM plugin_version
      WHERE
        pluginId=${pluginId}
        AND deprecated IS NULL
        AND beta=false
      ORDER BY
        CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(version, '.', 1), '.', -1) AS UNSIGNED) DESC,
        CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(version, '.', 2), '.', -1) AS UNSIGNED) DESC,
        CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(version, '.', 3), '.', -1) AS UNSIGNED) DESC
      LIMIT 1;
    `);
    return query[0];
  }

  async switchBetaOrDeprecated(
    pluginVersion: PluginVersion,
    beta?: boolean,
    deprecated?: boolean,
  ) {
    if (
      pluginVersion.beta === beta &&
      !!pluginVersion.deprecated === deprecated
    ) {
      return pluginVersion;
    }

    pluginVersion.beta = beta;
    pluginVersion.deprecated = deprecated
      ? !!pluginVersion.deprecated
        ? pluginVersion.deprecated
        : new Date()
      : null;

    return await this.pluginVersionsRepository.save(pluginVersion);
  }

  async remove(pluginVersion: PluginVersion) {
    const uploadDir = this.configService.get('UPLOAD_DIR');

    try {
      await unlink(join(uploadDir, pluginVersion.fileName));

      if (pluginVersion.helpFileEn)
        await unlink(join(uploadDir, pluginVersion.helpFileEn));

      if (pluginVersion.helpFileKz)
        await unlink(join(uploadDir, pluginVersion.helpFileKz));

      if (pluginVersion.helpFileRu)
        await unlink(join(uploadDir, pluginVersion.helpFileRu));
    } catch (err) {
      console.log(err);
    }
    await this.pluginVersionsRepository.remove(pluginVersion);
  }
}
