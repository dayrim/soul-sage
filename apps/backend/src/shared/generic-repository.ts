import { Logger, Provider } from '@nestjs/common';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';

import { Repository, FindOptionsWhere, DeepPartial, DataSource } from 'typeorm';

interface IBaseEntity {
  id: number | string; // Adjust the type of `id` based on your application's needs
}
export interface ExtendedRepository<T extends IBaseEntity> extends Repository<T> {
  findOrCreate: (findCondition: FindOptionsWhere<T>, createData: DeepPartial<T>) => Promise<T>;
}
export function buildCustomRepositoryMethods<T extends IBaseEntity>(): Pick<ExtendedRepository<T>, 'findOrCreate'> {
  return {
    async findOrCreate(this: Repository<T>, findCondition: FindOptionsWhere<T>, createData: DeepPartial<T>): Promise<T> {
      // Access the metadata for the entity to get the name
      const entityName = this.metadata.name;
      const logger = new Logger(`${entityName}Repository`);

      let entity = await this.findOne({ where: findCondition });
      if (!entity) {
        logger.debug(`Creating a new ${entityName} as one was not found with the provided condition: ${JSON.stringify(findCondition)}`);
        entity = await this.create(createData);
        await this.save(entity);
        logger.log(`New ${entityName} created with ID: ${entity.id}`);
      } else {
        logger.debug(`${entityName} found with the provided condition: ${JSON.stringify(findCondition)} with ID: ${entity.id}`);
      }
      return entity;
    },
  };
}

export function buildCustomRepositoryProvider<T extends IBaseEntity>(entity: EntityClassOrSchema): Provider {
  return {
    provide: getRepositoryToken(entity),
    inject: [getDataSourceToken()],
    useFactory: (dataSource: DataSource): ExtendedRepository<T> => {
      const repository = dataSource.getRepository<T>(entity); // Ensure T is used here
      const customMethods = buildCustomRepositoryMethods<T>();
      return Object.assign(repository, customMethods);
    },
  };
}
