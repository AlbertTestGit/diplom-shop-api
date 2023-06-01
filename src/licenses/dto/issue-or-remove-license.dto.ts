import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class IssueOrRemoveLicenseDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  swid: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsPositive()
  amount: number;
}
