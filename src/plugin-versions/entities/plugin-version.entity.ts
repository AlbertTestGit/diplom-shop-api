import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class PluginVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  version: string;

  @Column()
  description: string;

  @Column()
  fileName: string;

  @Column({ nullable: true })
  helpFileEn?: string;

  @Column({ nullable: true })
  helpFileKz?: string;

  @Column({ nullable: true })
  helpFileRu?: string;

  @CreateDateColumn()
  publicationDate: Date;

  @Column()
  author: number;

  @Column()
  gitRepository: string;

  @Column({ default: true })
  beta: boolean;

  @Column({ nullable: true })
  deprecated?: Date;

  @Column()
  pluginId: number;
}
