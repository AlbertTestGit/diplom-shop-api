import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicensesModule } from './licenses/licenses.module';
import { License } from './licenses/entities/license.entity';
import { WordpressModule } from './wordpress/wordpress.module';
import { PluginVersionsModule } from './plugin-versions/plugin-versions.module';
import { PluginVersion } from './plugin-versions/entities/plugin-version.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASS'),
        database: configService.get('DB_NAME'),
        entities: [License, PluginVersion],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      name: 'wordpressDb',
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('WP_DB_HOST'),
        port: +configService.get('WP_DB_PORT'),
        username: configService.get('WP_DB_USER'),
        password: configService.get('WP_DB_PASS'),
        database: configService.get('WP_DB_NAME'),
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
    LicensesModule,
    WordpressModule,
    PluginVersionsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
