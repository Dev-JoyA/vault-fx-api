import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Headers,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
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

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all wallets for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns list of user wallets' })
  async getUserWallets(@Request() req: RequestWithUser) {
    return await this.walletsService.getUserWallets(req.user.id);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get balance for a specific currency wallet' })
  @ApiQuery({
    name: 'currency',
    example: 'NGN',
    description: 'Currency code e.g. NGN, USD',
  })
  @ApiResponse({ status: 200, description: 'Returns wallet balance' })
  @ApiResponse({ status: 400, description: 'Currency parameter is required' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getWalletBalance(
    @Request() req: RequestWithUser,
    @Query('currency') currency: string,
  ) {
    if (!currency) {
      throw new BadRequestException('currency query parameter is required');
    }
    return await this.walletsService.getWalletBalance(
      req.user.id,
      currency.toUpperCase(),
    );
  }

  @Post('fund')
  @ApiOperation({
    summary: 'Fund a wallet with a specified currency and amount',
  })
  @ApiHeader({
    name: 'idempotency-key',
    description: 'Unique key to prevent duplicate funding requests',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Wallet funded successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({
    status: 409,
    description: 'Duplicate request (idempotency conflict)',
  })
  async fundWallet(
    @Request() req: RequestWithUser,
    @Body() fundWalletDto: FundWalletDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return await this.walletsService.fundWallet(
      req.user.id,
      fundWalletDto.currency.toUpperCase(),
      fundWalletDto.amount,
      idempotencyKey,
    );
  }

  @Post('convert')
  @ApiOperation({
    summary: 'Convert between currencies using a provided FX rate',
  })
  @ApiHeader({
    name: 'idempotency-key',
    description: 'Unique key to prevent duplicate conversion requests',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Currency converted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance or invalid currencies',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate request (idempotency conflict)',
  })
  async convertCurrency(
    @Request() req: RequestWithUser,
    @Body() convertDto: ConvertCurrencyDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return await this.walletsService.transferFunds(
      req.user.id,
      convertDto.fromCurrency.toUpperCase(),
      convertDto.toCurrency.toUpperCase(),
      convertDto.amount,
      convertDto.fxRate,
      idempotencyKey,
    );
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer funds to another user' })
  @ApiHeader({
    name: 'idempotency-key',
    description: 'Unique key to prevent duplicate transfer requests',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Transfer successful' })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance or invalid recipient',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate request (idempotency conflict)',
  })
  async transfer(
    @Request() req: RequestWithUser,
    @Body() transferDto: TransferDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return await this.walletsService.transferToUser(
      req.user.id,
      transferDto.recipientId,
      transferDto.currency.toUpperCase(),
      transferDto.amount,
      idempotencyKey,
    );
  }
}
