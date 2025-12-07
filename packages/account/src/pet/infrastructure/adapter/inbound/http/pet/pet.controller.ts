import { Body, Controller, Get, Param, Post, Put, Delete, UseGuards, Query, NotFoundException } from '@nestjs/common';
import { CreatePetBody } from './dto/request/create-pet.request';
import { PetResponse } from './dto/response/pet-response';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessGuard, UserGuard, UserParam, UserPrincipal } from '@core/auth';
import { GetPetsQuery } from '@app/pet/application/port/query/get-pets.port';
import { RegisterPetCommand } from '@app/pet/application/port/command/register-pet.port';
import { GetPetQuery } from '@app/pet/application/port/query/get-pet.port';
import { GetPresignedUrlResponse } from './dto/response/get-presgined.response';
import { GeneratePetPresignedCommand } from '@app/pet/application/port/command/generate-pet-presigned.port';
import { UpdatePetBody } from './dto/request/update-pet.request';
import { UpdatePetCommand } from '@app/pet/application/port/command/update-pet.port';

@ApiTags('Account','Pet')
@Controller('pets')
export class PetController {
  constructor(
    private readonly queryBus : QueryBus,
    private readonly commandBus : CommandBus,
  ) {}

  @Post()
  @UseGuards(AccessGuard,UserGuard)
  @ApiOperation({ summary : '반려동물 추가' })
  @ApiBearerAuth('access-token')
  async createPet(
    @UserParam() user : UserPrincipal,
    @Body() body: CreatePetBody
  ): Promise<any> {
    const pet = await this.commandBus.execute(new RegisterPetCommand(user,body.toDomain(user.userId)));

    // TODO: auth 서비스로 토큰 발급 로직 이동 필요
    return PetResponse.of(user.userId, [pet]);
  }

  @Get()
  @UseGuards(AccessGuard,UserGuard)
  @ApiOperation({ summary : '내 반려동물 목록 조회' })
  @ApiBearerAuth('access-token')
  async findAllPets(
    @UserParam() user : UserPrincipal
  ): Promise<PetResponse> {
    const pets = await this.queryBus.execute(new GetPetsQuery(user.userId));
    return PetResponse.of(user.userId, pets);
  }

  @Get(':id')
  @UseGuards(AccessGuard,UserGuard)
  @ApiOperation({ summary : '특정 반려동물 조회' })
  @ApiBearerAuth('access-token')
  async findPetById(@UserParam() user : UserPrincipal, @Param('id') id: string): Promise<any> {
    const pet = await this.queryBus.execute(new GetPetQuery(Number(id)));
    return PetResponse.of(user.userId, [pet]);
  }

  @Put(':id')
  @UseGuards(AccessGuard,UserGuard)
  @ApiOperation({ summary : '반려동물 정보 갱신'})
  @ApiBearerAuth('access-token')
  async updatePet(
    @UserParam() user : UserPrincipal,
    @Param('id') id: string,
    @Body() updatePetDto: UpdatePetBody,
  ): Promise<PetResponse> {
    const pet = await this.commandBus.execute(new UpdatePetCommand(Number(id), user, updatePetDto));
    return PetResponse.of(user.userId, [pet]);
  }

  @Delete(':id')
  @UseGuards(AccessGuard,UserGuard)
  @ApiOperation({ summary : '반려동물 삭제'})
  @ApiBearerAuth('access-token')
  async deletePet(
    @UserParam() user : UserPrincipal,
    @Param('id') id: string,
  ): Promise<any> {
    return
  }

  @ApiOperation({ summary : '특정 사용자의 반려동물 목록 조회' })
  @ApiBearerAuth('access-token')
  @UseGuards(AccessGuard,UserGuard)
  @Get('user/:userId')
  async findPetsByUserId(@UserParam() user : UserPrincipal, @Param('userId') userId: string): Promise<any> {
    const pets = await this.queryBus.execute(new GetPetsQuery(userId));
    return PetResponse.of(userId, pets);
  }

  @ApiOperation({ summary : '특정 사용자의 반려동물 목록 조회' })
  @ApiBearerAuth('access-token')
  @Get('/internal/user/:userId')
  async findInternalPetsByUserId(@Param('userId') userId: string): Promise<any> {
    const pets = await this.queryBus.execute(new GetPetsQuery(userId));
    return PetResponse.of(userId, pets);
  }

  @Post(':id/images/:no')
  @UseGuards(AccessGuard,UserGuard)
  @ApiOperation({ summary : '반려동물 이미지 추가/수정을 위한 Presigned Url 조회'})
  @ApiBearerAuth('access-token')
  async addPetImage(
    @Param('id') id: string,
    @Param('no') no: string,
  ): Promise<GetPresignedUrlResponse> {
    const presigned = await this.commandBus.execute(new GeneratePetPresignedCommand(Number(id),Number(no)));
    return GetPresignedUrlResponse.from(presigned);
  }

  @Delete(':id/images/:imageIndex')
  @UseGuards(AccessGuard,UserGuard)
  @ApiOperation({ summary : '반려동물 이미지 삭제'})
  @ApiBearerAuth('access-token')
  async removePetImage(
    @UserParam() user : UserPrincipal,
    @Param('id') id: string,
    @Param('imageIndex') imageIndex: string,
  ): Promise<any> {
    return
  }
}
