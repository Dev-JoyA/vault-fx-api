import { Module } from '@nestjs/common';
import { TradingService } from './trading.service';
import { TradingController } from './trading.controller';
import { WalletsModule } from '../wallets/wallets.module';
import { FxModule } from '../fx/fx.modules';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    WalletsModule,
    FxModule,
    TransactionsModule,
  ],
  controllers: [TradingController],
  providers: [TradingService],
  exports: [TradingService],
})
export class TradingModule {}