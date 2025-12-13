import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UserParam, UserPrincipal, GraphqlAuthGuard } from '@core/auth';
import { RegisterPetCommand } from '@app/pet/application/port/command/register-pet.port';
import { UpdatePetCommand } from '@app/pet/application/port/command/update-pet.port';
import { CertifyPetCommand } from '@app/pet/application/port/command/certify-pet.port';
import { GetPetsQuery } from '@app/pet/application/port/query/get-pets.port';
import { GetPetQuery } from '@app/pet/application/port/query/get-pet.port';
import { GeneratePetPresignedCommand } from '@app/pet/application/port/command/generate-pet-presigned.port';
import { PetEntity } from '@app/pet/domain/model/pet';
import { Pet as GraphQLPet, CreatePetInput, UpdatePetInput, CertifyPetInput, PresignedUrl } from './graphql';
import { PetGraphQLDto } from './dto/pet.graphql.dto';

@Resolver('Pet')
export class PetResolver {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Query()
  @UseGuards(GraphqlAuthGuard)
  async pets(@UserParam() user: UserPrincipal): Promise<GraphQLPet[]> {
    const pets = await this.queryBus.execute(new GetPetsQuery(user.userId));
    return pets.map(pet => PetGraphQLDto.fromDomain(pet));
  }

  @Query()
  async pet(@Args('id') id: number): Promise<GraphQLPet | null> {
    const pet = await this.queryBus.execute(new GetPetQuery(id));
    return pet ? PetGraphQLDto.fromDomain(pet) : null;
  }

  @Query()
  @UseGuards(GraphqlAuthGuard)
  async petsByUserId(@Args('userId') userId: string): Promise<GraphQLPet[]> {
    const pets = await this.queryBus.execute(new GetPetsQuery(userId));
    return pets.map(pet => PetGraphQLDto.fromDomain(pet));
  }

  @Mutation()
  @UseGuards(GraphqlAuthGuard)
  async createPet(
    @UserParam() user: UserPrincipal,
    @Args('input') input: CreatePetInput,
  ): Promise<GraphQLPet> {
    const petData = PetGraphQLDto.toDomainEntity(input, user.userId);
    const pet = PetEntity.of(petData);
    const createdPet = await this.commandBus.execute(new RegisterPetCommand(user, pet));
    return PetGraphQLDto.fromDomain(createdPet);
  }

  @Mutation()
  @UseGuards(GraphqlAuthGuard)
  async updatePet(
    @UserParam() user: UserPrincipal,
    @Args('id') id: number,
    @Args('input') input: UpdatePetInput,
  ): Promise<GraphQLPet> {
    const updateData = PetGraphQLDto.toUpdateData(input);
    const pet = await this.commandBus.execute(new UpdatePetCommand(id, user, updateData));
    return PetGraphQLDto.fromDomain(pet);
  }

  @Mutation()
  @UseGuards(GraphqlAuthGuard)
  async certifyPet(
    @Args('id') id: number,
    @Args('input') input: CertifyPetInput,
  ): Promise<GraphQLPet> {
    const pet = await this.commandBus.execute(
      new CertifyPetCommand(id, input.userName, input.certificationCode),
    );
    return PetGraphQLDto.fromDomain(pet);
  }

  @Mutation()
  @UseGuards(GraphqlAuthGuard)
  async deletePet(
    @UserParam() user: UserPrincipal,
    @Args('id') id: number,
  ): Promise<boolean> {
    // TODO: DeletePetCommand 구현 필요
    return true;
  }

  @Mutation()
  @UseGuards(GraphqlAuthGuard)
  async generatePetPresignedUrl(
    @Args('petId') petId: number,
    @Args('imageNo') imageNo: number,
  ): Promise<PresignedUrl> {
    const presignedUrl = await this.commandBus.execute(
      new GeneratePetPresignedCommand(petId, imageNo),
    );
    return PetGraphQLDto.fromPresignedUrl(presignedUrl);
  }

  @Mutation()
  @UseGuards(GraphqlAuthGuard)
  async deletePetImage(
    @UserParam() user: UserPrincipal,
    @Args('petId') petId: number,
    @Args('imageNo') imageNo: number,
  ): Promise<boolean> {
    // TODO: DeletePetImageCommand 구현 필요
    return true;
  }
}

