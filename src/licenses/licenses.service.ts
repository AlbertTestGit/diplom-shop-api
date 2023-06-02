import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { IssueOrRemoveLicenseDto } from './dto/issue-or-remove-license.dto';
import { License } from './entities/license.entity';
import { DataSource, IsNull, MoreThan } from 'typeorm';
import { WordpressService } from 'src/wordpress/wordpress.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UnpackedTokenDto } from './dto/unpacked-token.dto';

@Injectable()
export class LicensesService {
  constructor(
    private dataSource: DataSource,
    private readonly wordpressService: WordpressService,
    private configService: ConfigService,
  ) {}

  async issueLicense(issueLicenseDto: IssueOrRemoveLicenseDto) {
    const dateNow = new Date();
    // TODO: Day.js
    const expireDate = new Date(dateNow.setFullYear(dateNow.getFullYear() + 1));

    const licenses: License[] = [];

    for (let i = 0; i < issueLicenseDto.amount; i++) {
      const license = new License();
      license.userId = issueLicenseDto.userId;
      license.swid = issueLicenseDto.swid;
      license.expireDate = expireDate;

      licenses.push(license);
    }

    const licensesRepository = this.dataSource.getRepository(License);
    return await licensesRepository.save(licenses);
  }

  async removeLicense(removeLicenseDto: IssueOrRemoveLicenseDto) {
    const licensesRepository = this.dataSource.getRepository(License);

    const unusedLicenses = await licensesRepository.find({
      where: {
        swid: removeLicenseDto.swid,
        userId: removeLicenseDto.userId,
        expireDate: MoreThan(new Date()),
        hwid: IsNull(),
      },
    });

    if (unusedLicenses.length < removeLicenseDto.amount)
      throw new BadRequestException();

    await licensesRepository.remove(
      unusedLicenses.slice(0, removeLicenseDto.amount),
    );
  }

  async getUserLicenses(userId: number) {
    const query = (
      await this.dataSource.manager.query<
        { productKey: string; total: string; unused: string }[]
      >(
        `SELECT
          swid as productKey,
          COUNT(CASE WHEN userId=${userId} THEN swid END) as total,
          COUNT(CASE WHEN userId=${userId} AND hwid IS NULL THEN swid END) as unused
        FROM
          license
        GROUP BY
          swid`,
      )
    ).map((q) => ({ ...q, total: +q.total, unused: +q.unused }));

    const plugins = await this.wordpressService.findPlugins();

    return query
      .map((q) => ({
        ...q,
        name: plugins.find((p) => p.SWID === q.productKey)?.pluginName,
      }))
      .filter((q) => q.name && q.total > 0);
  }

  async unpackToken(token: string) {
    try {
      const response = await axios.get<{
        success: boolean;
        data: UnpackedTokenDto;
      }>(`${this.configService.get('LICENSE_URL')}/unpack?token=${token}`);

      return response.data.data;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException({
        status: false,
        message: 'Problems with the licensing service',
      });
    }
  }

  async getLicenseCode(token: string, expire: string) {
    try {
      const response = await axios.get<{ success: boolean; data: string }>(
        `${this.configService.get(
          'LICENSE_URL',
        )}/license?token=${token}&expires=${expire}`,
      );

      return response.data;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException({
        status: false,
        message: 'Problems with the licensing service',
      });
    }
  }

  async findOrActivateLicense(swid: string, userId: number, hwid: string) {
    const licensesRepository = this.dataSource.getRepository(License);

    const license = await licensesRepository.findOne({
      where: {
        swid,
        userId,
        expireDate: MoreThan(new Date()),
        hwid,
      },
    });

    if (license) return license;

    const unusedLicense = await licensesRepository.findOne({
      where: {
        swid,
        userId,
        expireDate: MoreThan(new Date()),
        hwid: IsNull(),
      },
    });

    if (!unusedLicense) return null;

    unusedLicense.hwid = hwid;

    return await licensesRepository.save(unusedLicense);
  }
}
