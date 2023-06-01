import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPositive } from 'class-validator';

export class IssueOrRemoveLicenseDto {
  @ApiProperty()
  @IsNotEmpty()
  userId: number;

  @ApiProperty()
  @IsNotEmpty()
  swid: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsPositive()
  amount: number;
}
