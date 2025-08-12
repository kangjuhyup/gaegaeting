import { Body, Controller, Get, Param, Post, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { UserEntity } from '@app/user/domain/model/user';
import { CreatePetBody } from './dto/request/create-pet.request';
import { PetResponse } from './dto/response/pet-response';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetPetsQuery } from '@app/user/application/port/in/query/get-pets.port';

/**
 * 강아지 컨트롤러
 */
@Controller('pets')
export class PetController {
  constructor(
    private readonly queryBus : QueryBus,
    private readonly commandBUs : CommandBus,
  ) {}

  /**
   * 강아지 생성 API
   * @param createPetDto 강아지 생성 DTO
   * @returns 생성된 강아지 정보
   */
  @Post()
  async createPet(@Body() body: CreatePetBody): Promise<any> {
    return 
  }

  /**
   * 모든 강아지 조회 API
   * @param page 페이지 번호
   * @param limit 페이지당 항목 수
   * @returns 강아지 목록
   */
  @Get()
  async findAllPets(
    user : UserEntity
  ): Promise<PetResponse> {
    const pets = await this.queryBus.execute(new GetPetsQuery(user.id));
    return PetResponse.of(user.id, pets);
  }

  /**
   * 특정 강아지 조회 API
   * @param id 강아지 ID
   * @returns 강아지 정보
   */
  @Get(':id')
  async findPetById(@Param('id') id: string): Promise<any> {
    return 
  }

  /**
   * 강아지 정보 업데이트 API
   * @param id 강아지 ID
   * @param updatePetDto 강아지 업데이트 DTO
   * @returns 업데이트된 강아지 정보
   */
  @Put(':id')
  async updatePet(
    @Param('id') id: string,
    @Body() updatePetDto: any,
  ): Promise<any> {
    return
  }

  /**
   * 강아지 삭제 API
   * @param id 강아지 ID
   * @returns 삭제 결과
   */
  @Delete(':id')
  async deletePet(@Param('id') id: string): Promise<any> {
    return 
  }

  /**
   * 특정 사용자의 강아지 목록 조회 API
   * @param userId 사용자 ID
   * @returns 사용자가 소유한 강아지 목록
   */
  @Get('user/:userId')
  async findPetsByUserId(@Param('userId') userId: string): Promise<any> {
    return
  }

  /**
   * 강아지 이미지 추가 API
   * @param id 강아지 ID
   * @param imageDto 이미지 정보 DTO
   * @returns 업데이트된 강아지 정보
   */
  @Post(':id/images')
  async addPetImage(
    @Param('id') id: string,
    @Body() imageDto: any,
  ): Promise<any> {
    return
  }

  /**
   * 강아지 이미지 삭제 API
   * @param id 강아지 ID
   * @param imageIndex 삭제할 이미지 인덱스
   * @returns 업데이트된 강아지 정보
   */
  @Delete(':id/images/:imageIndex')
  async removePetImage(
    @Param('id') id: string,
    @Param('imageIndex') imageIndex: number,
  ): Promise<any> {
    return
  }
}
