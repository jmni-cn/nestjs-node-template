import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import mongodbConfig from '@/config/mongodb.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [mongodbConfig.KEY],
      name: 'mongodb', // 指定 MongoDB 连接名称
      useFactory: (mongoConfig: ConfigType<typeof mongodbConfig>) => {
        return {
          type: 'mongodb',
          url: `mongodb://${mongoConfig.user}:${mongoConfig.password}@${mongoConfig.host}:${mongoConfig.port}/${mongoConfig.db}?authSource=admin`,
          authSource: 'admin',
          database: mongoConfig.db,
          autoLoadEntities: true,
          // entities: [__dirname + '/../**/*.mongo.entity{.ts,.js}'],
          synchronize: true, // 生产环境建议关闭
          logging: false,
          maxPoolSize: 10,
          retryAttempts: 3,
          retryDelay: 3000,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class MongoDBModule {}
