import { Controller, Post, Body, UseGuards, Request, Headers } from '@nestjs/common';
import { TradingService } from './trading.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TradeNgnToForeignDto, TradeForeignToNgnDto } from './dto/trade.dto';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  @Post('trade/ngn-to-foreign')
  async tradeNgnToForeign(
    @Request() req: RequestWithUser,
    @Body() tradeDto: TradeNgnToForeignDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return await this.tradingService.tradeNgnToForeign(
      req.user.id,
      tradeDto.targetCurrency,
      tradeDto.amount,
      idempotencyKey,
    );
  }

  @Post('trade/foreign-to-ngn')
  async tradeForeignToNgn(
    @Request() req: RequestWithUser,
    @Body() tradeDto: TradeForeignToNgnDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return await this.tradingService.tradeForeignToNgn(
      req.user.id,
      tradeDto.sourceCurrency,
      tradeDto.amount,
      idempotencyKey,
    );
  }
}