import { SetLocationCommand } from '@app/location/application/port/command/set-location.port';
import { SetMainAreaCommand } from '@app/location/application/port/command/set-main-area.port';
import { GetMainAreaQuery } from '@app/location/application/port/query/get-main-area.port';
import { LocationEntity } from '@app/location/domain/model/location';
import { GraphqlAccessGuard, UserParam, UserPrincipal } from '@core/auth';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { MainArea } from './dto/main-area.type';
import { SetLocationInput, SetMainAreaInput } from './dto/location.input';

@Resolver()
@UseGuards(GraphqlAccessGuard)
export class LocationResolver {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Mutation(() => Boolean)
  async setMainArea(
    @UserParam() user: UserPrincipal,
    @Args('input') input: SetMainAreaInput,
  ): Promise<boolean> {
    await this.commandBus.execute(
      new SetMainAreaCommand(user, input.code),
    );
    return true;
  }

  @Mutation(() => Boolean)
  async setCurrentLocation(
    @UserParam() user: UserPrincipal,
    @Args('input') input: SetLocationInput,
  ): Promise<boolean> {
    await this.commandBus.execute(
      new SetLocationCommand(user, LocationEntity.of({ latitude: input.latitude, longitude: input.longitude })),
    );
    return true;
  }

  @Query(() => MainArea)
  async mainArea(@UserParam() user: UserPrincipal): Promise<MainArea> {
    const area = await this.queryBus.execute(new GetMainAreaQuery(user));
    return MainArea.from(area);
  }
}


