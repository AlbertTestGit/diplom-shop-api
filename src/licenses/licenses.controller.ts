import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IssueOrRemoveLicenseDto } from './dto/issue-or-remove-license.dto';
import { AuthGuard } from 'src/wordpress/guards/auth.guard';
import { UserDto } from 'src/wordpress/dto/user.dto';
import { Role } from 'src/wordpress/enums/role.enum';
import { WordpressService } from 'src/wordpress/wordpress.service';

@ApiTags('licenses')
@Controller('licenses')
export class LicensesController {
  constructor(
    private readonly licensesService: LicensesService,
    private readonly wordpressService: WordpressService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ручная активация' })
  @UseGuards(AuthGuard)
  @Get('manual-activation')
  async manualActivation(@Request() req, @Query('token') token: string) {
    if (!token) {
      throw new BadRequestException({
        success: false,
        message: 'token cannot be empty',
      });
    }

    const reqUser: UserDto = req.user;

    if (reqUser.role == Role.Developer || reqUser.role == Role.Admin) {
      const dates = new Date().toISOString().substr(0, 10).split('-');
      const expire = `${+dates[0] + 1}-${dates[1]}-${dates[2]}`;

      return await this.licensesService.getLicenseCode(token, expire);
    }

    const unpackedToken = await this.licensesService.unpackToken(token);

    const license = await this.licensesService.findOrActivateLicense(
      unpackedToken.swid,
      reqUser.id,
      unpackedToken.hwid,
    );

    if (!license) {
      throw new NotFoundException({
        success: false,
        message: 'You do not have active licenses',
      });
    }

    const expire = license.expireDate.toISOString().substr(0, 10);

    return await this.licensesService.getLicenseCode(token, expire);
  }

  @ApiOperation({ summary: 'Автоматическая активация' })
  @Get('automatic-activation')
  async automaticActivation(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException({
        success: false,
        message: 'token cannot be empty',
      });
    }

    const unpackedToken = await this.licensesService.unpackToken(token);
    console.log('aa', unpackedToken);

    const user = await this.wordpressService.validateUsernameAndPassword(
      unpackedToken.user,
      unpackedToken.pass,
    );

    if (!user) {
      throw new BadRequestException({
        success: false,
        message: 'Incorrect username or password',
      });
    }

    if (user.role == Role.Developer || user.role == Role.Admin) {
      const dates = new Date().toISOString().substr(0, 10).split('-');
      const expire = `${+dates[0] + 1}-${dates[1]}-${dates[2]}`;

      return {
        success: true,
        data: await this.licensesService.getLicenseCode(token, expire),
      };
    }

    const license = await this.licensesService.findOrActivateLicense(
      unpackedToken.swid,
      user.id,
      unpackedToken.hwid,
    );

    if (!license) {
      throw new NotFoundException({
        success: false,
        message: 'You do not have active licenses',
      });
    }

    const expire = license.expireDate.toISOString().substr(0, 10);

    return {
      success: true,
      data: await this.licensesService.getLicenseCode(token, expire),
    };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выдача лицензий' })
  @UseGuards(AuthGuard)
  @Post()
  async issueLicense(
    @Request() req,
    @Body() issueLicenseDto: IssueOrRemoveLicenseDto,
  ) {
    const reqUser: UserDto = req.user;

    if (reqUser.role != Role.Admin && reqUser.role != Role.Manager)
      throw new ForbiddenException();

    return this.licensesService.issueLicense(issueLicenseDto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удаление лицензий' })
  @UseGuards(AuthGuard)
  @Delete()
  async removeLicense(
    @Request() req,
    @Body() removeLicenseDto: IssueOrRemoveLicenseDto,
  ) {
    const reqUser: UserDto = req.user;

    if (reqUser.role != Role.Admin && reqUser.role != Role.Manager)
      throw new ForbiddenException();

    return this.licensesService.removeLicense(removeLicenseDto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Количество лицензий пользователя' })
  @UseGuards(AuthGuard)
  @Get(':userId')
  async getUserLicenses(
    @Request() req,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const reqUser: UserDto = req.user;

    if (reqUser.role != Role.Admin && reqUser.id != userId)
      throw new ForbiddenException();

    return this.licensesService.getUserLicenses(userId);
  }
}
