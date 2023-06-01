import { Module } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { LicensesController } from './licenses.controller';
import { WordpressModule } from 'src/wordpress/wordpress.module';

@Module({
  imports: [WordpressModule],
  controllers: [LicensesController],
  providers: [LicensesService],
})
export class LicensesModule {}
