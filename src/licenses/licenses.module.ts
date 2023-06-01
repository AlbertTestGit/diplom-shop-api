import { Module } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { LicensesController } from './licenses.controller';

@Module({
  imports: [],
  controllers: [LicensesController],
  providers: [LicensesService],
})
export class LicensesModule {}
