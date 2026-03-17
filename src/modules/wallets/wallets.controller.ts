import { Controller, Get, Post, Body, UseGuards, Request, Headers, Query } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';
import { TransferDto } from './dto/transfer.dto';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  async getUserWallets(@Request() req: RequestWithUser) {
    return await this.walletsService.getUserWallets(req.user.id);
  }

  @Get('balance')
  async getWalletBalance(
    @Request() req: RequestWithUser,
    @Query('currency') currency: string,
  ) {
    return await this.walletsService.getWalletBalance(req.user.id, currency);
  }

  @Post('fund')
  async fundWallet(
    @Request() req: RequestWithUser,
    @Body() fundWalletDto: FundWalletDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return await this.walletsService.fundWallet(
      req.user.id,
      fundWalletDto.currency,
      fundWalletDto.amount,
      idempotencyKey,
    );
  }

  @Post('convert')
  async convertCurrency(
    @Request() req: RequestWithUser,
    @Body() convertDto: ConvertCurrencyDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return await this.walletsService.transferFunds(
      req.user.id,
      convertDto.fromCurrency,
      convertDto.toCurrency,
      convertDto.amount,
      convertDto.fxRate,
      idempotencyKey,
    );
  }

  @Post('transfer')
@UseGuards(JwtAuthGuard)
async transfer(
  @Request() req: RequestWithUser,
  @Body() transferDto: TransferDto,
  @Headers('idempotency-key') idempotencyKey?: string,
) {
  return await this.walletsService.transferToUser(
    req.user.id,
    transferDto.recipientId,
    transferDto.currency,
    transferDto.amount,
    idempotencyKey,
  );
}
}