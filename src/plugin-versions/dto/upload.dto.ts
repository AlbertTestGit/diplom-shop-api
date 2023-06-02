import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UploadDto {
  @ApiProperty()
  @IsNotEmpty()
  version: string;

  @ApiProperty()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
  })
  pluginFile: Express.Multer.File;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
  })
  helpFileEn?: Express.Multer.File;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
  })
  helpFileKz?: Express.Multer.File;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
  })
  helpFileRu?: Express.Multer.File;

  @ApiProperty()
  @IsNotEmpty()
  gitRepository: string;

  @ApiPropertyOptional({ default: true })
  beta?: boolean;

  @ApiProperty()
  @IsNotEmpty()
  pluginId: number;
}
