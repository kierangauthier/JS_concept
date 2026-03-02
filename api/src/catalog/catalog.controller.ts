import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, ForbiddenException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto, CreateProductDto, UpdateProductDto } from './dto/create-catalog.dto';

@Controller('api/catalog')
@Roles('admin', 'conducteur')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  // ─── Categories ────────────────────────────────────────

  @Get('categories')
  findAllCategories(@Req() req: any) {
    return this.catalogService.findAllCategories(req.companyId);
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto, @Req() req: any) {
    if (!req.companyId) throw new ForbiddenException('Cannot create under GROUP scope');
    return this.catalogService.createCategory(dto, req.companyId);
  }

  // ─── Products ──────────────────────────────────────────

  @Get()
  findAllProducts(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.catalogService.findAllProducts(req.companyId, search, categoryId);
  }

  @Get(':id')
  findOneProduct(@Param('id') id: string, @Req() req: any) {
    return this.catalogService.findOneProduct(id, req.companyId);
  }

  @Post()
  createProduct(@Body() dto: CreateProductDto, @Req() req: any) {
    if (!req.companyId) throw new ForbiddenException('Cannot create under GROUP scope');
    return this.catalogService.createProduct(dto, req.companyId);
  }

  @Patch(':id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() req: any) {
    return this.catalogService.updateProduct(id, dto, req.companyId);
  }

  @Delete(':id')
  deleteProduct(@Param('id') id: string, @Req() req: any) {
    return this.catalogService.softDeleteProduct(id, req.companyId);
  }

  // ─── CSV Import ────────────────────────────────────────

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!req.companyId) throw new ForbiddenException('Cannot import under GROUP scope');
    if (!file) throw new ForbiddenException('No file provided');
    const content = file.buffer.toString('utf-8');
    return this.catalogService.importCsv(content, req.companyId);
  }
}
