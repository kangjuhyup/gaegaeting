import { Body, Controller, Get, Param, Post, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { CreatePetBody } from './dto/request/create-pet.request';
import { PetResponse } from './dto/response/pet-response';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetPetsQuery } from '@app/user/application/port/in/query/get-pets.port';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessGuard, UserGuard, UserParam, UserPrincipal } from '@core/auth';

@ApiTags('Account','Pet')
@Controller('pets')
export class PetController {
  constructor(
    private readonly queryBus : QueryBus,
    private readonly commandBUs : CommandBus,
  ) {}

  @Post()
  @UseGuards(AccessGuard,UserGuard)
  @ApiOperation({ summary : '반려동물 추가' })
  @ApiBearerAuth('access-token')
  async createPet(
    @UserParam() user : UserPrincipal,
    @Body() body: CreatePetBody
  ): Promise<any> {
    return 
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
    return 
  }

  @Put(':id')
  @UseGuards(AccessGuard,UserGuard)
  @ApiOperation({ summary : '반려동물 정보 갱신'})
  @ApiBearerAuth('access-token')
  async updatePet(
    @UserParam() user : UserPrincipal,
    @Param('id') id: string,
    @Body() updatePetDto: any,
  ): Promise<any> {
    return
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
    return
  }

  @Post(':id/images')
  @UseGuards(AccessGuard,UserGuard)
  @ApiOperation({ summary : '반려동물 이미지 추가'})
  @ApiBearerAuth('access-token')
  async addPetImage(
    @Param('id') id: string,
    @Body() imageDto: any,
  ): Promise<any> {
    return
  }

  @Delete(':id/images/:imageIndex')
  @UseGuards(AccessGuard,UserGuard)
  @ApiOperation({ summary : '반려동물 이미지 삭제'})
  @ApiBearerAuth('access-token')
  async removePetImage(
    @UserParam() user : UserPrincipal,
    @Param('id') id: string,
    @Param('imageIndex') imageIndex: number,
  ): Promise<any> {
    return
  }
}
