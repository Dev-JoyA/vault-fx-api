import { Controller, Get, Query, UseGuards, Request, Param } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionQueryDto } from './dto/transaction.dto';

interface RequestWithUser extends Request {
  user: { id: string };
}

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async getUserTransactions(
    @Request() req: RequestWithUser,
    @Query() query: TransactionQueryDto,
  ) {
    return await this.transactionsService.getUserTransactions(
      req.user.id,
      query,
    );
  }

  @Get(':reference')
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