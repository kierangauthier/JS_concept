import { Body, Controller, ForbiddenException, Get, Patch, Req } from '@nestjs/common';
import { LegalService } from './legal.service';
import { UpdateLegalDto } from './dto/update-legal.dto';
import { Roles } from '../common/decorators/roles.decorator';

/**
 * /api/admin/legal — read & write the legal information stored on the
 * Company row (SIRET, VAT, IBAN, payment terms, Factur-X profile).
 *
 * GROUP scope returns 403 because the legal info is per-entity; the admin
 * must pick a specific company (JS / ASP) before editing.
 */
@Controller('api/admin/legal')
@Roles('admin')
export class LegalController {
  constructor(private legalService: LegalService) {}

  @Get()
  get(@Req() req: any) {
    if (!req.companyId) {
      throw new ForbiddenException(
        'Sélectionnez une entité spécifique (JS ou ASP) pour consulter ses informations légales.',
      );
    }
    return this.legalService.getForCompany(req.companyId);
  }

  @Patch()
  update(@Body() dto: UpdateLegalDto, @Req() req: any) {
    if (!req.companyId) {
      throw new ForbiddenException(
        'Sélectionnez une entité spécifique (JS ou ASP) pour modifier ses informations légales.',
      );
    }
    return this.legalService.update(req.companyId, dto);
  }
}
