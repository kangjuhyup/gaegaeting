import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Match','Location')
@Controller('location')
export class LocationController {

}