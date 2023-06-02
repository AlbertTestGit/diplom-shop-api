import { Module } from '@nestjs/common';
import { PluginVersionsService } from './plugin-versions.service';
import { PluginVersionsController } from './plugin-versions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PluginVersion } from './entities/plugin-version.entity';
import { WordpressModule } from 'src/wordpress/wordpress.module';

@Module({
  imports: [TypeOrmModule.forFeature([PluginVersion]), WordpressModule],
  controllers: [PluginVersionsController],
  providers: [PluginVersionsService],
})
export class PluginVersionsModule {}
