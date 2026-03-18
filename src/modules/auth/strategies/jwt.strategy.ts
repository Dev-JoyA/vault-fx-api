import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from '../../users/users.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersRepository: UsersRepository,
  ) {
    const secret = configService.get<string>('jwt.secret');

    if (!secret) {
      throw new Error('JWT secret is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    const jwtExpiresIn = this.configService.get<string>('jwt.expiresIn');

    const user = await this.usersRepository.findById(payload.sub);

    if (!user || !user.isVerified) {
      throw new UnauthorizedException('User not found or not verified');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenExpiresIn: jwtExpiresIn,
    };
  }
}
