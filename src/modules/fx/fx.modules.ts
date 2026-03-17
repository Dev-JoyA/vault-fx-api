import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { FxService } from './fx.service';
import { FxController } from './fx.controller';
import { FxRepository } from './fx.repository';
import { FxRate } from './entities/fx-rate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([FxRate]),
    ScheduleModule.forRoot(),
  ],
  controllers: [FxController],
  providers: [FxService, FxRepository],
  exports: [FxService, FxRepository],
})
export class FxModule implements OnModuleInit {
  constructor(private readonly fxService: FxService) {}

  async onModuleInit() {
    setInterval(() => {
      this.fxService.refreshRates().catch(console.error);
    }, 5 * 60 * 1000);

    setInterval(() => {
      this.fxService.cleanupOldRates().catch(console.error);
    }, 24 * 60 * 60 * 1000);
  }
}