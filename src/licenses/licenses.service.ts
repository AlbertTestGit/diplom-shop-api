import { BadRequestException, Injectable } from '@nestjs/common';
import { IssueOrRemoveLicenseDto } from './dto/issue-or-remove-license.dto';
import { License } from './entities/license.entity';
import { DataSource, IsNull, MoreThan } from 'typeorm';

@Injectable()
export class LicensesService {
  constructor(private dataSource: DataSource) {}

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
        { swid: string; total: string; unused: string }[]
      >(
        `SELECT
          swid,
          COUNT(CASE WHEN userId=${userId} THEN swid END) as total,
          COUNT(CASE WHEN userId=${userId} AND hwid IS NULL THEN swid END) as unused
        FROM
          license
        GROUP BY
          swid`,
      )
    ).map((q) => ({ ...q, total: +q.total, unused: +q.unused }));

    return query;
  }
}
