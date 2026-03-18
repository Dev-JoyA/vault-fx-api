import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionQueryDto } from './dto/transaction.dto';

interface RequestWithUser extends Request {
  user: { id: string };
}

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated transaction history' })
  @ApiResponse({ status: 200, description: 'Returns paginated transactions' })
  async getUserTransactions(
    @Request() req: RequestWithUser,
    @Query() query: TransactionQueryDto,
  ) {
    return await this.transactionsService.getUserTransactions(
      req.user.id,
      query,
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get transaction summary for a period' })
  @ApiQuery({
    name: 'days',
    example: 30,
    description: 'Number of days to summarize',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Returns transaction summary' })
  async getTransactionSummary(
    @Request() req: RequestWithUser,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return await this.transactionsService.getTransactionSummary(
      req.user.id,
      days,
    );
  }

  @Get(':reference')
  @ApiOperation({ summary: 'Get a transaction by reference' })
  @ApiParam({
    name: 'reference',
    description: 'Transaction reference e.g. FUND_xxx',
  })
  @ApiResponse({ status: 200, description: 'Returns the transaction' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionByReference(
    @Request() req: RequestWithUser,
    @Param('reference') reference: string,
  ) {
    return await this.transactionsService.getTransactionByReference(
      req.user.id,
      reference,
    );
  }
}
