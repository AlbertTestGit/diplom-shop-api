import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class License {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  swid: string;

  @Column()
  expireDate: Date;

  @Column({ nullable: true })
  hwid?: string;
}
