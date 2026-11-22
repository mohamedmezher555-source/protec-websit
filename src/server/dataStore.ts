import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_OFFERS,
  DEFAULT_PROJECTS,
  DEFAULT_SERVICES,
  DEFAULT_SITE_CONTENT,
} from '../data/protecDefaults';
import {
  OfferItem,
  ProjectItem,
  QuoteAttachment,
  QuoteRequest,
  QuoteStatus,
  ServiceItem,
  SiteContent,
} from '../types';
import {
  generateReferenceCode,
  isSafeHttpOrLocalUrl,
  validateOfferInput,
  validateProjectInput,
  validateQuoteInput,
  validateServiceInput,
} from '../utils/validation';

interface QuotesFileData {
  quotes: QuoteRequest[];
}

interface CatalogFileData {
  siteContent?: SiteContent;
  services?: ServiceItem[];
  projects?: ProjectItem[];
  offers?: OfferItem[];
}

const VALID_QUOTE_STATUSES = new Set<QuoteStatus>([
  'new',
  'reviewing',
  'scheduled',
  'quoted',
  'completed',
]);

function writeJsonAtomic(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`
  );
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function readJsonSafe<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function sanitizeId(rawId: string | undefined, prefix: string): string {
  const cleaned = (rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 128);
  if (cleaned.length >= 2) {
    return cleaned;
  }
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

function sanitizeAttachments(raw: unknown): QuoteAttachment[] {
  if (!Array.isArray(raw)) return [];
  const result: QuoteAttachment[] = [];
  for (const item of raw.slice(0, 10)) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Partial<QuoteAttachment>;
    const filename = typeof obj.filename === 'string' ? path.basename(obj.filename).slice(0, 160) : '';
    const originalName = typeof obj.originalName === 'string' ? obj.originalName.slice(0, 140) : filename;
    const mimeType = typeof obj.mimeType === 'string' ? obj.mimeType.slice(0, 80) : 'application/octet-stream';
    const size = typeof obj.size === 'number' && Number.isFinite(obj.size) && obj.size >= 0 ? obj.size : 0;
    const kind: 'image' | 'video' = obj.kind === 'video' ? 'video' : 'image';
    const url = typeof obj.url === 'string' && isSafeHttpOrLocalUrl(obj.url) ? obj.url.trim() : '';
    const id = typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim().slice(0, 64) : crypto.randomUUID();
    if (!url || !filename) continue;
    result.push({ id, filename, originalName, mimeType, size, kind, url });
  }
  return result;
}

export class ServerDataStore {
  private readonly quotesFilePath: string;
  private readonly catalogFilePath: string;

  constructor(dataDir: string) {
    this.quotesFilePath = path.join(dataDir, 'quotes.json');
    this.catalogFilePath = path.join(dataDir, 'catalog.json');
  }

  public listQuotes(): QuoteRequest[] {
    const fileData = readJsonSafe<QuotesFileData>(this.quotesFilePath, { quotes: [] });
    const list = Array.isArray(fileData.quotes) ? fileData.quotes : [];
    return [...list].sort((a, b) => {
      const timeA = typeof a.createdAt === 'string' ? Date.parse(a.createdAt) || 0 : 0;
      const timeB = typeof b.createdAt === 'string' ? Date.parse(b.createdAt) || 0 : 0;
      return timeB - timeA;
    });
  }

  public createQuote(input: {
    id?: string;
    referenceCode?: string;
    fullName: string;
    phone: string;
    email?: string;
    governorate: string;
    area: string;
    address: string;
    serviceType: string;
    projectAreaSqm?: number | string;
    description: string;
    offerId?: string;
    attachments?: unknown;
  }): { ok: true; quote: QuoteRequest } | { ok: false; status: number; error: string } {
    const attachments = sanitizeAttachments(input.attachments);
    const validation = validateQuoteInput({
      fullName: String(input.fullName || ''),
      phone: String(input.phone || ''),
      email: input.email ? String(input.email) : undefined,
      governorate: String(input.governorate || ''),
      area: String(input.area || ''),
      address: String(input.address || ''),
      serviceType: String(input.serviceType || ''),
      projectAreaSqm: input.projectAreaSqm,
      description: String(input.description || ''),
      offerId: input.offerId ? String(input.offerId) : undefined,
      attachments,
    });

    if (!validation.valid) {
      return {
        ok: false,
        status: 400,
        error: `Validation failed: ${Object.keys(validation.errors).join(', ')}`,
      };
    }

    const nowIso = new Date().toISOString();
    const rawRef = typeof input.referenceCode === 'string' ? input.referenceCode.trim() : '';
    const referenceCode = /^[A-Z0-9-]{4,32}$/.test(rawRef) ? rawRef : generateReferenceCode();
    const id = sanitizeId(input.id, 'q');

    const quote: QuoteRequest = {
      id,
      referenceCode,
      fullName: String(input.fullName).trim().slice(0, 120),
      phone: String(input.phone).trim().slice(0, 30),
      governorate: String(input.governorate).trim().slice(0, 80),
      area: String(input.area).trim().slice(0, 120),
      address: String(input.address).trim().slice(0, 240),
      serviceType: String(input.serviceType).trim().slice(0, 100),
      description: String(input.description).trim().slice(0, 3000),
      attachments,
      status: 'new',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (input.email && String(input.email).trim().length > 0) {
      quote.email = String(input.email).trim().slice(0, 150);
    }
    if (
      input.projectAreaSqm !== undefined &&
      input.projectAreaSqm !== '' &&
      input.projectAreaSqm !== null &&
      Number.isFinite(Number(input.projectAreaSqm))
    ) {
      quote.projectAreaSqm = Number(input.projectAreaSqm);
    }
    if (input.offerId && String(input.offerId).trim().length > 0) {
      quote.offerId = String(input.offerId).trim().slice(0, 128);
    }

    const current = this.listQuotes();
    const filtered = current.filter((q) => q.id !== quote.id);
    writeJsonAtomic(this.quotesFilePath, { quotes: [quote, ...filtered] });

    return { ok: true, quote };
  }

  public updateQuote(
    id: string,
    status: string,
    adminNotes?: string
  ): { ok: true; quote: QuoteRequest } | { ok: false; status: number; error: string } {
    if (!VALID_QUOTE_STATUSES.has(status as QuoteStatus)) {
      return { ok: false, status: 400, error: 'Invalid quote status.' };
    }
    const current = this.listQuotes();
    const idx = current.findIndex((q) => q.id === id);
    if (idx === -1) {
      return { ok: false, status: 404, error: 'Quote request not found.' };
    }

    const updated: QuoteRequest = {
      ...current[idx],
      status: status as QuoteStatus,
      adminNotes: typeof adminNotes === 'string' ? adminNotes.trim().slice(0, 1500) : '',
      updatedAt: new Date().toISOString(),
    };
    current[idx] = updated;
    writeJsonAtomic(this.quotesFilePath, { quotes: current });
    return { ok: true, quote: updated };
  }

  public deleteQuote(id: string): boolean {
    const current = this.listQuotes();
    const next = current.filter((q) => q.id !== id);
    if (next.length === current.length) {
      return false;
    }
    writeJsonAtomic(this.quotesFilePath, { quotes: next });
    return true;
  }

  private readCatalogRaw(): CatalogFileData {
    return readJsonSafe<CatalogFileData>(this.catalogFilePath, {});
  }

  public getPublicCatalog(): CatalogFileData {
    const raw = this.readCatalogRaw();
    return {
      siteContent: raw.siteContent,
      services: Array.isArray(raw.services) ? [...raw.services].sort((a, b) => a.order - b.order) : undefined,
      projects: Array.isArray(raw.projects) ? raw.projects : undefined,
      offers: Array.isArray(raw.offers) ? raw.offers : undefined,
    };
  }

  public saveSiteContent(content: SiteContent): { ok: true; siteContent: SiteContent } | { ok: false; status: number; error: string } {
    if (!content || typeof content !== 'object') {
      return { ok: false, status: 400, error: 'Invalid site content payload.' };
    }
    const heroImageUrl = String(content.heroImageUrl || '').trim();
    if (!isSafeHttpOrLocalUrl(heroImageUrl)) {
      return { ok: false, status: 400, error: 'Invalid hero image URL.' };
    }

    const sanitized: SiteContent = {
      ...DEFAULT_SITE_CONTENT,
      heroTitleAr: String(content.heroTitleAr || '').trim().slice(0, 180),
      heroTitleEn: String(content.heroTitleEn || '').trim().slice(0, 180),
      heroSubtitleAr: String(content.heroSubtitleAr || '').trim().slice(0, 500),
      heroSubtitleEn: String(content.heroSubtitleEn || '').trim().slice(0, 500),
      heroImageUrl: heroImageUrl.slice(0, 500),
      aboutSummaryAr: String(content.aboutSummaryAr || '').trim().slice(0, 1500),
      aboutSummaryEn: String(content.aboutSummaryEn || '').trim().slice(0, 1500),
      visionAr: String(content.visionAr || '').trim().slice(0, 600),
      visionEn: String(content.visionEn || '').trim().slice(0, 600),
      missionAr: String(content.missionAr || '').trim().slice(0, 600),
      missionEn: String(content.missionEn || '').trim().slice(0, 600),
      goalsAr: Array.isArray(content.goalsAr) ? content.goalsAr.slice(0, 8) : DEFAULT_SITE_CONTENT.goalsAr,
      goalsEn: Array.isArray(content.goalsEn) ? content.goalsEn.slice(0, 8) : DEFAULT_SITE_CONTENT.goalsEn,
      valuesAr: Array.isArray(content.valuesAr) ? content.valuesAr.slice(0, 8) : DEFAULT_SITE_CONTENT.valuesAr,
      valuesEn: Array.isArray(content.valuesEn) ? content.valuesEn.slice(0, 8) : DEFAULT_SITE_CONTENT.valuesEn,
      differentiatorsAr: Array.isArray(content.differentiatorsAr)
        ? content.differentiatorsAr.slice(0, 8)
        : DEFAULT_SITE_CONTENT.differentiatorsAr,
      differentiatorsEn: Array.isArray(content.differentiatorsEn)
        ? content.differentiatorsEn.slice(0, 8)
        : DEFAULT_SITE_CONTENT.differentiatorsEn,
      phones: Array.isArray(content.phones)
        ? content.phones.map((p) => String(p).trim()).filter(Boolean).slice(0, 5)
        : DEFAULT_SITE_CONTENT.phones,
      whatsappNumber: String(content.whatsappNumber || '').trim().slice(0, 30),
      email: String(content.email || '').trim().slice(0, 120),
      addressAr: String(content.addressAr || '').trim().slice(0, 250),
      addressEn: String(content.addressEn || '').trim().slice(0, 250),
      facebookUrl: String(content.facebookUrl || '').trim().slice(0, 300),
      instagramUrl: String(content.instagramUrl || '').trim().slice(0, 300),
      linkedinUrl: String(content.linkedinUrl || '').trim().slice(0, 300),
      youtubeUrl: String(content.youtubeUrl || '').trim().slice(0, 300),
      updatedAt: new Date().toISOString(),
    };

    const raw = this.readCatalogRaw();
    raw.siteContent = sanitized;
    writeJsonAtomic(this.catalogFilePath, raw);
    return { ok: true, siteContent: sanitized };
  }

  public upsertService(service: ServiceItem): { ok: true; service: ServiceItem } | { ok: false; status: number; error: string } {
    const val = validateServiceInput({
      slug: String(service.slug || ''),
      titleAr: String(service.titleAr || ''),
      titleEn: String(service.titleEn || ''),
      shortDescAr: String(service.shortDescAr || ''),
      shortDescEn: String(service.shortDescEn || ''),
      fullDescAr: String(service.fullDescAr || ''),
      fullDescEn: String(service.fullDescEn || ''),
      imageUrl: String(service.imageUrl || ''),
      order: Number(service.order),
    });
    if (!val.valid) {
      return { ok: false, status: 400, error: `Invalid service fields: ${Object.keys(val.errors).join(', ')}` };
    }

    const raw = this.readCatalogRaw();
    const list = Array.isArray(raw.services) ? [...raw.services] : [...DEFAULT_SERVICES];
    const id = sanitizeId(service.id, 'srv');
    const nowIso = new Date().toISOString();
    const existingIdx = list.findIndex((s) => s.id === id);

    const record: ServiceItem = {
      id,
      order: Number(service.order) || 1,
      slug: service.slug.trim().toLowerCase().slice(0, 80),
      titleAr: service.titleAr.trim().slice(0, 140),
      titleEn: service.titleEn.trim().slice(0, 140),
      shortDescAr: service.shortDescAr.trim().slice(0, 320),
      shortDescEn: service.shortDescEn.trim().slice(0, 320),
      fullDescAr: service.fullDescAr.trim().slice(0, 2000),
      fullDescEn: service.fullDescEn.trim().slice(0, 2000),
      featuresAr: Array.isArray(service.featuresAr) ? service.featuresAr.slice(0, 8) : [],
      featuresEn: Array.isArray(service.featuresEn) ? service.featuresEn.slice(0, 8) : [],
      imageUrl: service.imageUrl.trim().slice(0, 500),
      active: Boolean(service.active),
      createdAt: existingIdx >= 0 ? list[existingIdx].createdAt || nowIso : nowIso,
      updatedAt: nowIso,
    };

    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.push(record);
    }
    raw.services = list.sort((a, b) => a.order - b.order);
    writeJsonAtomic(this.catalogFilePath, raw);
    return { ok: true, service: record };
  }

  public deleteService(id: string): void {
    const raw = this.readCatalogRaw();
    const list = Array.isArray(raw.services) ? [...raw.services] : [...DEFAULT_SERVICES];
    raw.services = list.filter((s) => s.id !== id);
    writeJsonAtomic(this.catalogFilePath, raw);
  }

  public upsertProject(project: ProjectItem): { ok: true; project: ProjectItem } | { ok: false; status: number; error: string } {
    const val = validateProjectInput({
      titleAr: String(project.titleAr || ''),
      titleEn: String(project.titleEn || ''),
      category: project.category,
      locationAr: String(project.locationAr || ''),
      locationEn: String(project.locationEn || ''),
      summaryAr: String(project.summaryAr || ''),
      summaryEn: String(project.summaryEn || ''),
      beforeImageUrl: String(project.beforeImageUrl || ''),
      afterImageUrl: String(project.afterImageUrl || ''),
      areaSqm: project.areaSqm !== undefined ? Number(project.areaSqm) : undefined,
    });
    if (!val.valid) {
      return { ok: false, status: 400, error: `Invalid project fields: ${Object.keys(val.errors).join(', ')}` };
    }

    const raw = this.readCatalogRaw();
    const list = Array.isArray(raw.projects) ? [...raw.projects] : [...DEFAULT_PROJECTS];
    const id = sanitizeId(project.id, 'prj');
    const nowIso = new Date().toISOString();
    const existingIdx = list.findIndex((p) => p.id === id);

    const record: ProjectItem = {
      id,
      titleAr: project.titleAr.trim().slice(0, 160),
      titleEn: project.titleEn.trim().slice(0, 160),
      category: project.category,
      locationAr: project.locationAr.trim().slice(0, 120),
      locationEn: project.locationEn.trim().slice(0, 120),
      summaryAr: project.summaryAr.trim().slice(0, 800),
      summaryEn: project.summaryEn.trim().slice(0, 800),
      beforeImageUrl: project.beforeImageUrl.trim().slice(0, 500),
      afterImageUrl: project.afterImageUrl.trim().slice(0, 500),
      featured: Boolean(project.featured),
      createdAt: existingIdx >= 0 ? list[existingIdx].createdAt || nowIso : nowIso,
      updatedAt: nowIso,
    };
    if (project.areaSqm !== undefined && Number.isFinite(Number(project.areaSqm))) {
      record.areaSqm = Number(project.areaSqm);
    }

    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.unshift(record);
    }
    raw.projects = list;
    writeJsonAtomic(this.catalogFilePath, raw);
    return { ok: true, project: record };
  }

  public deleteProject(id: string): void {
    const raw = this.readCatalogRaw();
    const list = Array.isArray(raw.projects) ? [...raw.projects] : [...DEFAULT_PROJECTS];
    raw.projects = list.filter((p) => p.id !== id);
    writeJsonAtomic(this.catalogFilePath, raw);
  }

  public upsertOffer(offer: OfferItem): { ok: true; offer: OfferItem } | { ok: false; status: number; error: string } {
    const val = validateOfferInput({
      titleAr: String(offer.titleAr || ''),
      titleEn: String(offer.titleEn || ''),
      descriptionAr: String(offer.descriptionAr || ''),
      descriptionEn: String(offer.descriptionEn || ''),
      discountLabelAr: String(offer.discountLabelAr || ''),
      discountLabelEn: String(offer.discountLabelEn || ''),
      expiresAt: String(offer.expiresAt || ''),
      serviceType: String(offer.serviceType || ''),
      imageUrl: String(offer.imageUrl || ''),
    });
    if (!val.valid) {
      return { ok: false, status: 400, error: `Invalid offer fields: ${Object.keys(val.errors).join(', ')}` };
    }

    const raw = this.readCatalogRaw();
    const list = Array.isArray(raw.offers) ? [...raw.offers] : [...DEFAULT_OFFERS];
    const id = sanitizeId(offer.id, 'off');
    const nowIso = new Date().toISOString();
    const existingIdx = list.findIndex((o) => o.id === id);

    const record: OfferItem = {
      id,
      titleAr: offer.titleAr.trim().slice(0, 160),
      titleEn: offer.titleEn.trim().slice(0, 160),
      descriptionAr: offer.descriptionAr.trim().slice(0, 1000),
      descriptionEn: offer.descriptionEn.trim().slice(0, 1000),
      discountLabelAr: offer.discountLabelAr.trim().slice(0, 60),
      discountLabelEn: offer.discountLabelEn.trim().slice(0, 60),
      originalPrice: (offer.originalPrice || '').trim().slice(0, 40),
      offerPrice: (offer.offerPrice || '').trim().slice(0, 40),
      expiresAt: offer.expiresAt.trim().slice(0, 30),
      serviceType: offer.serviceType.trim().slice(0, 80),
      imageUrl: offer.imageUrl.trim().slice(0, 500),
      active: Boolean(offer.active),
      createdAt: existingIdx >= 0 ? list[existingIdx].createdAt || nowIso : nowIso,
      updatedAt: nowIso,
    };

    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.unshift(record);
    }
    raw.offers = list;
    writeJsonAtomic(this.catalogFilePath, raw);
    return { ok: true, offer: record };
  }

  public deleteOffer(id: string): void {
    const raw = this.readCatalogRaw();
    const list = Array.isArray(raw.offers) ? [...raw.offers] : [...DEFAULT_OFFERS];
    raw.offers = list.filter((o) => o.id !== id);
    writeJsonAtomic(this.catalogFilePath, raw);
  }
}
