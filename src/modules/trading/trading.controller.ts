import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
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

@ApiTags('trading')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  @Post('trade/ngn-to-foreign')
  @ApiOperation({ summary: 'Trade NGN to a foreign currency' })
  @ApiHeader({
    name: 'idempotency-key',
    description: 'Unique key to prevent duplicate trades',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Trade executed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid currency or insufficient balance',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Duplicate request (idempotency conflict)',
  })
  @ApiResponse({ status: 503, description: 'FX rate unavailable' })
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
  @ApiOperation({ summary: 'Trade a foreign currency to NGN' })
  @ApiHeader({
    name: 'idempotency-key',
    description: 'Unique key to prevent duplicate trades',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Trade executed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid currency or insufficient balance',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Duplicate request (idempotency conflict)',
  })
  @ApiResponse({ status: 503, description: 'FX rate unavailable' })
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
