import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Req } from '@nestjs/common';

@Controller('api/search')
@Roles('admin', 'conducteur', 'technicien', 'comptable')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  search(@Query('q') query: string, @Req() req: any) {
    return this.searchService.search(query ?? '', req.companyId);
  }
}
