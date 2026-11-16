import { BadRequestException, Body, CanActivate, Controller, Delete, ExecutionContext, Get, HttpException, HttpStatus, Injectable, Module, NotFoundException, OnModuleDestroy, Param, Patch, Post, Req, Res, ServiceUnavailableException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { IsDateString, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Request, Response } from 'express';
import { decrypt, draw, encrypt, equal, hash, token } from './security';

@Injectable()
class Database extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
const cookieName = 'amigo_session';
const sessionAge = 1000 * 60 * 60 * 24 * 7;
@Injectable()
class AdminGuard implements CanActivate {
  constructor(private db: Database) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const value = request.cookies?.[cookieName];
    if (typeof value !== 'string') throw new UnauthorizedException();
    const session = await this.db.session.findUnique({ where: { id: hash(value) } });
    if (!session || session.expiresAt <= new Date()) throw new UnauthorizedException();
    return true;
  }
}
class LoginDto {
  @IsString() @IsNotEmpty() @MaxLength(200) username!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) password!: string;
}
class EventDto {
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(200) title!: string;
  @IsOptional() @IsDateString() dateTime?: string | null;
  @IsOptional() @IsString() @MaxLength(500) location?: string | null;
  @IsOptional() @IsString() @MaxLength(5000) message?: string | null;
}
class UpdateEventDto {
  @IsOptional() @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(200) title?: string;
  @IsOptional() @IsDateString() dateTime?: string | null;
  @IsOptional() @IsString() @MaxLength(500) location?: string | null;
  @IsOptional() @IsString() @MaxLength(5000) message?: string | null;
}
class ParticipantDto { @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(200) name!: string; }
const eventInclude = { participants: { orderBy: { name: 'asc' as const } } };
type EventWithParticipants = Prisma.EventGetPayload<{ include: typeof eventInclude }>;
function present(event: EventWithParticipants) {
  return { id: event.id, title: event.title, dateTime: event.dateTime, location: event.location, message: event.message, drawnAt: event.drawnAt, participants: event.participants.map(p => ({ id: p.id, name: p.name, linkToken: p.tokenEncrypted ? decrypt(p.tokenEncrypted) : null, revealedAt: p.revealedAt })) };
}
async function lockEvent(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.$queryRaw<{ id: string; drawnAt: Date | null }[]>`SELECT id, "drawnAt" FROM "Event" WHERE id = ${id} FOR UPDATE`;
  if (!rows.length) throw new NotFoundException('Event not found');
  return rows[0];
}
@Controller()
class AppController {
  constructor(private db: Database) {}
  @Get('health')
  async health() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
  @Post('auth/login') async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const [limit] = await this.db.$queryRaw<{ attempts: number }[]>`INSERT INTO "LoginRateLimit" (id, attempts, "windowStart") VALUES ('global', 1, NOW()) ON CONFLICT (id) DO UPDATE SET attempts = CASE WHEN "LoginRateLimit"."windowStart" <= NOW() - INTERVAL '1 minute' THEN 1 ELSE "LoginRateLimit".attempts + 1 END, "windowStart" = CASE WHEN "LoginRateLimit"."windowStart" <= NOW() - INTERVAL '1 minute' THEN NOW() ELSE "LoginRateLimit"."windowStart" END RETURNING attempts`;
    if (limit.attempts > 20) { res.setHeader('Retry-After', '60'); throw new HttpException('Too many login attempts', HttpStatus.TOO_MANY_REQUESTS); }
    if (!equal(body.username, process.env.ADMIN_USERNAME || '') || !equal(body.password, process.env.ADMIN_PASSWORD || '')) throw new UnauthorizedException();
    const value = token(); await this.db.session.create({ data: { id: hash(value), expiresAt: new Date(Date.now() + sessionAge) } });
    res.cookie(cookieName, value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: sessionAge });
    return { username: process.env.ADMIN_USERNAME };
  }
  @Post('auth/logout') async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const value = req.cookies?.[cookieName]; if (typeof value === 'string') await this.db.session.deleteMany({ where: { id: hash(value) } });
    res.clearCookie(cookieName, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' }); return { ok: true };
  }
  @UseGuards(AdminGuard) @Get('auth/me') me() { return { username: process.env.ADMIN_USERNAME }; }
  @UseGuards(AdminGuard) @Get('events') async list() { return (await this.db.event.findMany({ include: eventInclude, orderBy: { createdAt: 'desc' } })).map(present); }
  @UseGuards(AdminGuard) @Post('events') async create(@Body() body: EventDto) { return present(await this.db.event.create({ data: { ...body, dateTime: body.dateTime ? new Date(body.dateTime) : null }, include: eventInclude })); }
  @UseGuards(AdminGuard) @Get('events/:id') async get(@Param('id') id: string) { const event = await this.db.event.findUnique({ where: { id }, include: eventInclude }); if (!event) throw new NotFoundException(); return present(event); }
  @UseGuards(AdminGuard) @Patch('events/:id') async update(@Param('id') id: string, @Body() body: UpdateEventDto) {
    if (body.title === null) throw new BadRequestException('Title cannot be null');
    return this.db.$transaction(async tx => { await lockEvent(tx, id); return present(await tx.event.update({ where: { id }, data: { ...body, dateTime: body.dateTime === undefined ? undefined : body.dateTime === null ? null : new Date(body.dateTime) }, include: eventInclude })); });
  }
  @UseGuards(AdminGuard) @Delete('events/:id') async remove(@Param('id') id: string) { await this.db.$transaction(async tx => { await lockEvent(tx, id); await tx.event.delete({ where: { id } }); }); return { ok: true }; }
  @UseGuards(AdminGuard) @Post('events/:id/participants') async add(@Param('id') id: string, @Body() body: ParticipantDto) {
    return this.db.$transaction(async tx => { const event = await lockEvent(tx, id); if (event.drawnAt) throw new BadRequestException('Participants cannot be changed after drawing'); await tx.participant.create({ data: { eventId: id, name: body.name.trim() } }); return present(await tx.event.findUniqueOrThrow({ where: { id }, include: eventInclude })); });
  }
  @UseGuards(AdminGuard) @Patch('events/:id/participants/:participantId') async rename(@Param('id') id: string, @Param('participantId') participantId: string, @Body() body: ParticipantDto) {
    return this.db.$transaction(async tx => { const event = await lockEvent(tx, id); if (event.drawnAt) throw new BadRequestException('Participants cannot be changed after drawing'); const result = await tx.participant.updateMany({ where: { id: participantId, eventId: id }, data: { name: body.name.trim() } }); if (!result.count) throw new NotFoundException(); return present(await tx.event.findUniqueOrThrow({ where: { id }, include: eventInclude })); });
  }
  @UseGuards(AdminGuard) @Delete('events/:id/participants/:participantId') async deleteParticipant(@Param('id') id: string, @Param('participantId') participantId: string) {
    return this.db.$transaction(async tx => { const event = await lockEvent(tx, id); if (event.drawnAt) throw new BadRequestException('Participants cannot be changed after drawing'); const result = await tx.participant.deleteMany({ where: { id: participantId, eventId: id } }); if (!result.count) throw new NotFoundException(); return present(await tx.event.findUniqueOrThrow({ where: { id }, include: eventInclude })); });
  }
  @UseGuards(AdminGuard) @Post('events/:id/draw') async makeDraw(@Param('id') id: string) {
    return this.db.$transaction(async tx => { const event = await lockEvent(tx, id); if (event.drawnAt) throw new BadRequestException('Event has already been drawn'); const participants = await tx.participant.findMany({ where: { eventId: id }, orderBy: { id: 'asc' } }); if (participants.length < 2) throw new BadRequestException('At least two participants are required'); const matches = draw(participants.map(p => p.id)); for (const [i, p] of participants.entries()) { const value = token(); await tx.participant.update({ where: { id: p.id }, data: { matchId: matches[i], tokenHash: hash(value), tokenEncrypted: encrypt(value) } }); } await tx.event.update({ where: { id }, data: { drawnAt: new Date() } }); return present(await tx.event.findUniqueOrThrow({ where: { id }, include: eventInclude })); });
  }
  @UseGuards(AdminGuard) @Post('events/:id/participants/:participantId/regenerate-link') async regenerate(@Param('id') id: string, @Param('participantId') participantId: string) {
    return this.db.$transaction(async tx => { const event = await lockEvent(tx, id); if (!event.drawnAt) throw new BadRequestException('Event has not been drawn'); const value = token(); const result = await tx.participant.updateMany({ where: { id: participantId, eventId: id }, data: { tokenHash: hash(value), tokenEncrypted: encrypt(value) } }); if (!result.count) throw new NotFoundException(); return present(await tx.event.findUniqueOrThrow({ where: { id }, include: eventInclude })); });
  }
  private async reveal(value: string, mark: boolean) {
    return this.db.$transaction(async tx => { const p = await tx.participant.findUnique({ where: { tokenHash: hash(value) }, include: { event: true, match: true } }); if (!p || !p.match) throw new NotFoundException(); if (mark && !p.revealedAt) { const updated = await tx.participant.updateMany({ where: { id: p.id, tokenHash: hash(value), revealedAt: null }, data: { revealedAt: new Date() } }); if (!updated.count) { const current = await tx.participant.findUnique({ where: { id: p.id } }); if (current?.tokenHash !== hash(value)) throw new NotFoundException(); } } const revealed = mark || !!p.revealedAt; return { event: { title: p.event.title, dateTime: p.event.dateTime, location: p.event.location, message: p.event.message }, participant: { name: p.name }, revealed, ...(revealed ? { match: { name: p.match.name } } : {}) }; });
  }
  @Get('reveal/:token') getReveal(@Param('token') value: string) { return this.reveal(value, false); }
  @Post('reveal/:token') postReveal(@Param('token') value: string) { return this.reveal(value, true); }
}
@Module({ controllers: [AppController], providers: [Database, AdminGuard] })
export class AppModule {}
