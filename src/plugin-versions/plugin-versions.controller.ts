import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ForbiddenException,
  BadRequestException,
  Query,
  ParseIntPipe,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { PluginVersionsService } from './plugin-versions.service';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UploadDto } from './dto/upload.dto';
import { AuthGuard } from 'src/wordpress/guards/auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UserDto } from 'src/wordpress/dto/user.dto';
import { Role } from 'src/wordpress/enums/role.enum';
import { join } from 'path';
import { createReadStream } from 'fs';
import { ConfigService } from '@nestjs/config';
import * as semver from 'semver';

@ApiTags('plugin vesions')
@Controller('plugin-versions')
export class PluginVersionsController {
  constructor(
    private readonly pluginVersionsService: PluginVersionsService,
    private configService: ConfigService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Загрузка новой версии плагина на сервер' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard)
  @Post('upload')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'pluginFile', maxCount: 1 },
      { name: 'helpFileEn', maxCount: 1 },
      { name: 'helpFileRu', maxCount: 1 },
      { name: 'helpFileKz', maxCount: 1 },
    ]),
  )
  async upload(
    @Request() req,
    @UploadedFiles()
    files: {
      pluginFile?: Express.Multer.File[];
      helpFileEn?: Express.Multer.File[];
      helpFileRu?: Express.Multer.File[];
      helpFileKz?: Express.Multer.File[];
    },
    @Body() uploadDto: UploadDto,
  ) {
    const reqUser: UserDto = req.user;

    if (reqUser.role != Role.Admin && reqUser.role != Role.Developer)
      throw new ForbiddenException();

    if (!semver.valid(uploadDto.version))
      throw new BadRequestException(
        'Incorrect version entry format (major.minor.patch)',
      );

    if (!files || !files.pluginFile)
      throw new BadRequestException('pluginFile cannot be empty');

    uploadDto.pluginFile = files.pluginFile[0];
    uploadDto.helpFileEn = files.helpFileEn?.[0];
    uploadDto.helpFileRu = files.helpFileRu?.[0];
    uploadDto.helpFileKz = files.helpFileKz?.[0];

    const pluginVersion = await this.pluginVersionsService.findByVersion(
      uploadDto.pluginId,
      uploadDto.version,
    );

    if (pluginVersion)
      throw new BadRequestException('This version already exists');

    return await this.pluginVersionsService.uploadVersion(uploadDto, reqUser);
  }

  @ApiOperation({ summary: 'Скачать версию плагина' })
  @Get('download')
  async download(@Query('id', ParseIntPipe) id: number) {
    const pluginVersion = await this.pluginVersionsService.findById(id);

    if (!pluginVersion) throw new NotFoundException('Plugin Version not found');

    const pluginFile = createReadStream(
      join(this.configService.get('UPLOAD_DIR'), pluginVersion.fileName),
    );

    return new StreamableFile(pluginFile, {
      disposition: `attachment; filename="${pluginVersion.description}"`,
    });
  }

  @ApiOperation({
    summary: 'Получение одной или списка версий плагина',
  })
  @ApiQuery({ name: 'version', required: false })
  @Get('list/:pluginId')
  async getOneOrListPluginVersions(
    @Param('pluginId', ParseIntPipe) pluginId: number,
    @Query('version') version?: string,
  ) {
    if (version) {
      const pluginVersion = await this.pluginVersionsService.findByVersion(
        pluginId,
        version,
      );

      if (!pluginVersion)
        throw new NotFoundException('Plugin Version not found');

      return pluginVersion;
    }

    return await this.pluginVersionsService.findPluginVersions(pluginId);
  }

  @ApiOperation({ summary: 'Получение версий плагина по id' })
  @Get(':pluginVersionId')
  async getOne(
    @Param('pluginVersionId', ParseIntPipe) pluginVersionId: number,
  ) {
    const pluginVersion = await this.pluginVersionsService.findById(
      pluginVersionId,
    );

    if (!pluginVersion) throw new NotFoundException('Plugin Version not found');

    return pluginVersion;
  }

  @ApiOperation({ summary: 'Получение текущей версии плагина' })
  @Get('current/:pluginId')
  async getCurrentPluginVersion(
    @Param('pluginId', ParseIntPipe) pluginId: number,
  ) {
    const pluginVersion = await this.pluginVersionsService.getCurrentVersion(
      pluginId,
    );

    if (!pluginVersion) {
      throw new NotFoundException('Current version not found');
    }

    return pluginVersion;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'переключение флагов beta или deprecated' })
  @ApiQuery({ name: 'beta', required: false, type: 'boolean' })
  @ApiQuery({ name: 'deprecated', required: false, type: 'boolean' })
  @UseGuards(AuthGuard)
  @Post('switch/:pluginVersionId')
  async switchBetaOrDeprecated(
    @Request() req,
    @Param('pluginVersionId') pluginVersionId: number,
    @Query('beta') beta?: boolean,
    @Query('deprecated') deprecated?: boolean,
  ) {
    const reqUser: UserDto = req.user;

    try {
      beta = JSON.parse(String(beta || null));
      deprecated = JSON.parse(String(deprecated || null));
    } catch {
      throw new BadRequestException('Invalid value in query parameters');
    }

    if (beta === null && deprecated === null)
      throw new BadRequestException('beta or deprecated cannot be empty');

    const pluginVersion = await this.pluginVersionsService.findById(
      pluginVersionId,
    );

    if (!pluginVersion) throw new NotFoundException('Plugin Version not found');

    if (reqUser.role != Role.Admin && reqUser.id != pluginVersion.author)
      throw new ForbiddenException();

    return await this.pluginVersionsService.switchBetaOrDeprecated(
      pluginVersion,
      beta,
      deprecated,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удаление версий плагина по id' })
  @UseGuards(AuthGuard)
  @Delete(':pluginVersionId')
  async remove(
    @Request() req,
    @Param('pluginVersionId', ParseIntPipe) pluginVersionId: number,
  ) {
    const reqUser: UserDto = req.user;

    const pluginVersion = await this.pluginVersionsService.findById(
      pluginVersionId,
    );

    if (!pluginVersion) throw new NotFoundException('Plugin Version not found');

    if (reqUser.role != Role.Admin && reqUser.id != pluginVersion.author)
      throw new ForbiddenException();

    this.pluginVersionsService.remove(pluginVersion);
  }
}
