import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PluginDto } from './dto/plugin.dto';
import { JwtService } from '@nestjs/jwt';
import { UserDto } from './dto/user.dto';
import * as hasher from 'wordpress-hash-node';

@Injectable()
export class WordpressService {
  constructor(
    @InjectDataSource('wordpressDb')
    private wordpressDataSource: DataSource,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, passwordHash: string) {
    const queryRunner = this.wordpressDataSource;

    const findUserSql: { ID: number; user_login: string }[] =
      await queryRunner.manager.query(
        `SELECT ID, user_login FROM wp_users WHERE user_login='${username}' AND user_pass='${passwordHash}'`,
      );

    if (findUserSql.length == 0) return null;

    const findUserRoleSql: { meta_value: string }[] =
      await queryRunner.manager.query(
        `SELECT meta_value FROM wp_usermeta WHERE meta_key='wp_capabilities' AND user_id='${findUserSql[0].ID}'`,
      );

    const role = findUserRoleSql[0].meta_value.split('"')[1];

    const result = new UserDto();
    result.id = findUserSql[0].ID;
    result.username = findUserSql[0].user_login;
    result.role = role;

    return result;
  }

  async validateUsernameAndPassword(username: string, password: string) {
    const queryRunner = this.wordpressDataSource;

    const findUserSql: { ID: number; user_login: string; user_pass: string }[] =
      await queryRunner.manager.query(
        `SELECT ID, user_login, user_pass FROM wp_users WHERE user_login='${username}'`,
      );

    if (findUserSql.length == 0) return null;

    if (!hasher.CheckPassword(password, findUserSql[0].user_pass)) return null;

    const findUserRoleSql: { meta_value: string }[] =
      await queryRunner.manager.query(
        `SELECT meta_value FROM wp_usermeta WHERE meta_key='wp_capabilities' AND user_id='${findUserSql[0].ID}'`,
      );

    const role = findUserRoleSql[0].meta_value.split('"')[1];

    const result = new UserDto();
    result.id = findUserSql[0].ID;
    result.username = findUserSql[0].user_login;
    result.role = role;

    return result;
  }

  generateJwt(user: UserDto) {
    return {
      access_token: this.jwtService.sign({ ...user }),
    };
  }

  async findPlugins() {
    try {
      const response = await axios.get<PluginDto[]>(
        `${this.configService.get(
          'WOOCOMMERCE_API_URL',
        )}/wp-json/wp/v3/plugins`,
        {
          headers: {
            Authorization: `Bearer ${this.configService.get(
              'WOOCOMMERCE_JWT',
            )}`,
          },
        },
      );

      return response.data;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException();
    }
  }
}
