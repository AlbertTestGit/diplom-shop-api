import { Module } from '@nestjs/common';
import { WordpressService } from './wordpress.service';
import { WordpressController } from './wordpress.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [WordpressController],
  providers: [WordpressService],
  exports: [WordpressService],
})
export class WordpressModule {}
