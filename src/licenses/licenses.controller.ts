import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { ApiTags } from '@nestjs/swagger';
import { IssueOrRemoveLicenseDto } from './dto/issue-or-remove-license.dto';

@ApiTags('licenses')
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get('manual-activation')
  async manualActivation(@Query('token') token: string) {
    return `Manual Activation ${token}`;
  }

  @Get('automatic-activation')
  async automaticActivation(@Query('token') token: string) {
    return `Automatic Activation ${token}`;
  }

  @Post()
  async issueLicense(@Body() issueLicenseDto: IssueOrRemoveLicenseDto) {
    return this.licensesService.issueLicense(issueLicenseDto);
  }

  @Delete()
  async removeLicense(@Body() removeLicenseDto: IssueOrRemoveLicenseDto) {
    return this.licensesService.removeLicense(removeLicenseDto);
  }

  @Get(':userId')
  async getUserLicenses(@Param('userId', ParseIntPipe) userId: number) {
    return this.licensesService.getUserLicenses(userId);
  }
}
