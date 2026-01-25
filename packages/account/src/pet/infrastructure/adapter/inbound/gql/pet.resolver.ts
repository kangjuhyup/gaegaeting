import { Int, Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UserParam, UserPrincipal, GraphqlAccessGuard } from '@core/auth';
import { RegisterPetCommand } from '@app/pet/application/port/command/register-pet.port';
import { UpdatePetCommand } from '@app/pet/application/port/command/update-pet.port';
import { CertifyPetCommand } from '@app/pet/application/port/command/certify-pet.port';
import { GetPetsQuery } from '@app/pet/application/port/query/get-pets.port';
import { GetPetQuery } from '@app/pet/application/port/query/get-pet.port';
import { GeneratePetPresignedCommand } from '@app/pet/application/port/command/generate-pet-presigned.port';
import { PetProfileEntity } from '@app/pet/domain/model/pet-profile';
import { PresignedUrl } from '@app/common/graphql/dto/presigned-url.type';
import { PetGraphQLDto } from './dto/pet.graphql.dto';
import { Pet } from './dto/pet.type';
import { CertifyPetInput, CreatePetInput, UpdatePetInput } from './dto/pet.input';

@Resolver(() => Pet)
export class PetResolver {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Query(() => [Pet])
  @UseGuards(GraphqlAccessGuard)
  async pets(@UserParam() user: UserPrincipal): Promise<Pet[]> {
    const pets = await this.queryBus.execute(new GetPetsQuery(user.userId));
    return pets.map(pet => PetGraphQLDto.fromDomain(pet.pet, pet.profile.map(profile => profile.path)));
  }

  @Query(() => Pet, { nullable: true })
  async pet(@Args('id', { type: () => Int }) id: number): Promise<Pet | null> {
    const pet = await this.queryBus.execute(new GetPetQuery(id));
    return pet ? PetGraphQLDto.fromDomain(pet) : null;
  }

  @Query(() => [Pet])
  @UseGuards(GraphqlAccessGuard)
  async petsByUserId(@Args('userId', { type: () => String }) userId: string): Promise<Pet[]> {
    const pets = await this.queryBus.execute(new GetPetsQuery(userId));
    return pets.map(pet => PetGraphQLDto.fromDomain(pet.pet, pet.profile.map(profile => profile.path)));
  }

  @Mutation(() => Pet)
  @UseGuards(GraphqlAccessGuard)
  async createPet(
    @UserParam() user: UserPrincipal,
    @Args('input') input: CreatePetInput,
  ): Promise<Pet> {
    const petData = PetGraphQLDto.toDomainEntity(input, user.userId);
    const pet = PetProfileEntity.of(petData);
    const createdPet = await this.commandBus.execute(new RegisterPetCommand(user, pet));
    return PetGraphQLDto.fromDomain(createdPet);
  }

  @Mutation(() => Pet)
  @UseGuards(GraphqlAccessGuard)
  async updatePet(
    @UserParam() user: UserPrincipal,
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdatePetInput,
  ): Promise<Pet> {
    const updateData = PetGraphQLDto.toUpdateData(input);
    const pet = await this.commandBus.execute(new UpdatePetCommand(id, user, updateData));
    return PetGraphQLDto.fromDomain(pet);
  }

  @Mutation(() => Pet)
  @UseGuards(GraphqlAccessGuard)
  async certifyPet(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: CertifyPetInput,
  ): Promise<Pet> {
    const pet = await this.commandBus.execute(
      new CertifyPetCommand(id, input.userName, input.certificationCode),
    );
    return PetGraphQLDto.fromDomain(pet);
  }

  @Mutation(() => Boolean)
  @UseGuards(GraphqlAccessGuard)
  async deletePet(
    @UserParam() user: UserPrincipal,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<boolean> {
    // TODO: DeletePetCommand 구현 필요
    return true;
  }

  @Mutation(() => PresignedUrl)
  @UseGuards(GraphqlAccessGuard)
  async generatePetPresignedUrl(
    @Args('petId', { type: () => Int }) petId: number,
    @Args('imageNo', { type: () => Int }) imageNo: number,
  ): Promise<PresignedUrl> {
    const presignedUrl = await this.commandBus.execute(
      new GeneratePetPresignedCommand(petId, imageNo),
    );
    return PetGraphQLDto.fromPresignedUrl(presignedUrl);
  }

  @Mutation(() => Boolean)
  @UseGuards(GraphqlAccessGuard)
  async deletePetImage(
    @UserParam() user: UserPrincipal,
    @Args('petId', { type: () => Int }) petId: number,
    @Args('imageNo', { type: () => Int }) imageNo: number,
  ): Promise<boolean> {
    // TODO: DeletePetImageCommand 구현 필요
    return true;
  }
}

