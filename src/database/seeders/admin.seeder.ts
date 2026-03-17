import { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

export async function seedAdmin(dataSource: DataSource, configService: ConfigService) {
  const userRepository = dataSource.getRepository(User);
  
  const adminEmail = 'admin@vault-fx.com';
  
  const existingAdmin = await userRepository.findOne({ where: { email: adminEmail } });
  
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(
      'Admin@123456', 
      configService.get<number>('bcrypt.rounds') || 12
    );
    
    const admin = userRepository.create({
      email: adminEmail,
      passwordHash,
      role: 'admin',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    await userRepository.save(admin);
  } else {
  }
}