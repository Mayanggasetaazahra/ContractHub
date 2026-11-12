import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import { INITIAL_STORE } from './src/data/seedData.ts';
import type { ContractHubStore, RoleCode, User } from './src/types/contracthub.ts';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'contracthub-store.json');

function ensureStore(): ContractHubStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_STORE, null, 2), 'utf-8');
    return structuredClone(INITIAL_STORE);
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as ContractHubStore;
    let dirty = false;
    for (const user of parsed.users ?? []) {
      if (user.avatarUrl && user.avatarUrl.includes('avatar_mayanggaseta')) {
        user.avatarUrl = null;
        dirty = true;
      }
    }
    if (!parsed.portLocations) {
      parsed.portLocations = INITIAL_STORE.portLocations;
      dirty = true;
    }
    if (!parsed.contracts.some((c) => c.id === 7)) {
      const seed7 = INITIAL_STORE.contracts.find((c) => c.id === 7);
      if (seed7) {
        parsed.contracts.push(seed7);
        dirty = true;
      }
    }
    if (dirty) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_STORE, null, 2), 'utf-8');
    return structuredClone(INITIAL_STORE);
  }
}

function saveStore(store: ContractHubStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function formatWibNow(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} WIB`;
}

function appendAudit(
  store: ContractHubStore,
  actor: User,
  actionType: string,
  entityName: string,
  entityId: string,
  summary: string
): void {
  const nextId = store.auditTrail.length > 0 ? Math.max(...store.auditTrail.map((a) => a.id)) + 1 : 1;
  store.auditTrail.unshift({
    id: nextId,
    userId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.roleName,
    actionType,
    entityName,
    entityId,
    summary,
    ipAddress: '10.24.108.14',
    createdAt: formatWibNow(),
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  let store = ensureStore();
  let activeUserId = 1; // Default demo preset: Mayanggaseta Azahra

  const getActiveUser = (): User => {
    return store.users.find((u) => u.id === activeUserId) ?? store.users[0];
  };

  // 1. Bootstrap & Session
  app.get('/api/bootstrap', (_req, res) => {
    store = ensureStore();
    res.json({
      activeUser: getActiveUser(),
      store,
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, roleCode } = req.body as { email?: string; password?: string; roleCode?: RoleCode };
    store = ensureStore();
    let found: User | undefined;
    if (roleCode) {
      found = store.users.find((u) => u.roleCode === roleCode);
    } else if (email) {
      found = store.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    }
    if (!found) {
      found = store.users[0];
    }
    activeUserId = found.id;
    found.lastLoginAt = formatWibNow();
    appendAudit(store, found, 'AUTH_LOGIN', 'users', String(found.id), `Masuk ke ruang kerja CONTRACTHUB sebagai ${found.roleName}.`);
    saveStore(store);
    res.json({ ok: true, activeUser: found, store });
  });

  app.post('/api/auth/register', (req, res) => {
    const { fullName, email, department, phoneWa, roleCode } = req.body as {
      fullName: string;
      email: string;
      department: string;
      phoneWa: string;
      roleCode?: RoleCode;
    };
    store = ensureStore();
    const role = store.roles.find((r) => r.code === (roleCode ?? 'VENDOR')) ?? store.roles[2];
    const nextId = Math.max(...store.users.map((u) => u.id), 0) + 1;
    const initials = fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join('');
    const newUser: User = {
      id: nextId,
      roleId: role.id,
      roleCode: role.code,
      roleName: role.name,
      fullName,
      titlePosition: role.name,
      email,
      phoneWa: phoneWa || '+6281200000000',
      department: department || 'Mitra Pelabuhan Cirebon',
      avatarUrl: null,
      initials: initials || 'US',
      status: 'Aktif',
      lastLoginAt: formatWibNow(),
    };
    store.users.push(newUser);
    activeUserId = newUser.id;
    appendAudit(store, newUser, 'AUTH_REGISTER', 'users', String(newUser.id), `Pendaftaran akun baru ruang kerja: ${fullName} (${email}).`);
    saveStore(store);
    res.status(201).json({ ok: true, activeUser: newUser, store });
  });

  app.post('/api/auth/switch-role', (req, res) => {
    const { roleCode } = req.body as { roleCode: RoleCode };
    store = ensureStore();
    const found = store.users.find((u) => u.roleCode === roleCode);
    if (!found) {
      res.status(404).json({ error: 'Peran demo tidak ditemukan.' });
      return;
    }
    activeUserId = found.id;
    appendAudit(store, found, 'DEMO_ROLE_SWITCH', 'users', String(found.id), `Beralih sesi demo RBAC ke peran ${found.roleName}.`);
    saveStore(store);
    res.json({ ok: true, activeUser: found, store });
  });

  // 2. Contract CRUD
  app.post('/api/contracts', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const payload = req.body;
    const vendor = store.vendors.find((v) => v.id === Number(payload.vendorId)) ?? store.vendors[0];
    const nextId = Math.max(...store.contracts.map((c) => c.id), 0) + 1;
    const contractNumber =
      payload.contractNumber || `PKS/CRB/2026/${String(nextId).padStart(3, '0')}`;

    const created = {
      id: nextId,
      contractNumber,
      title: String(payload.title || 'Kontrak Kerja Sama Baru'),
      servicePillar: payload.servicePillar || 'Sewa Gudang 24 Jam',
      vendorId: vendor.id,
      vendorName: vendor.companyName,
      portLocation: String(payload.portLocation || 'Dermaga 1 Pelabuhan Cirebon'),
      contractValueIdr: Number(payload.contractValueIdr || 1000000000),
      utilizedValueIdr: Number(payload.utilizedValueIdr || 0),
      quotaTotal: Number(payload.quotaTotal || 1000),
      quotaUsed: Number(payload.quotaUsed || 0),
      quotaUnit: String(payload.quotaUnit || 'Ton'),
      startDate: String(payload.startDate || '2026-11-11'),
      endDate: String(payload.endDate || '2027-11-10'),
      status: payload.status || 'Draft',
      esignStatus: payload.esignStatus || 'Belum Diajukan',
      esignHash: null,
      notes: String(payload.notes || ''),
      createdBy: actor.id,
      updatedAt: formatWibNow(),
    };

    store.contracts.unshift(created);
    appendAudit(store, actor, 'CONTRACT_CREATED', 'contracts', created.contractNumber, `Membuat kontrak baru "${created.title}" senilai Rp ${created.contractValueIdr.toLocaleString('id-ID')}.`);
    saveStore(store);
    res.status(201).json({ ok: true, contract: created, store });
  });

  app.put('/api/contracts/:id', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const id = Number(req.params.id);
    const idx = store.contracts.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Kontrak tidak ditemukan.' });
      return;
    }
    const payload = req.body;
    const existing = store.contracts[idx];
    const vendor = payload.vendorId
      ? store.vendors.find((v) => v.id === Number(payload.vendorId)) ?? store.vendors[0]
      : null;

    const updated = {
      ...existing,
      ...payload,
      id: existing.id,
      vendorId: vendor ? vendor.id : existing.vendorId,
      vendorName: vendor ? vendor.companyName : existing.vendorName,
      updatedAt: formatWibNow(),
    };
    store.contracts[idx] = updated;
    appendAudit(store, actor, 'CONTRACT_UPDATED', 'contracts', updated.contractNumber, `Memperbarui atribut kontrak ${updated.contractNumber} (Status: ${updated.status}).`);
    saveStore(store);
    res.json({ ok: true, contract: updated, store });
  });

  app.delete('/api/contracts/:id', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const id = Number(req.params.id);
    const target = store.contracts.find((c) => c.id === id);
    if (!target) {
      res.status(404).json({ error: 'Kontrak tidak ditemukan.' });
      return;
    }
    target.deletedAt = formatWibNow();
    target.updatedAt = formatWibNow();
    appendAudit(store, actor, 'CONTRACT_SOFT_DELETED', 'contracts', target.contractNumber, `Memindahkan kontrak ${target.contractNumber} (${target.title}) ke arsip terhapus (soft delete).`);
    saveStore(store);
    res.json({ ok: true, store });
  });

  app.post('/api/contracts/:id/restore', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const id = Number(req.params.id);
    const target = store.contracts.find((c) => c.id === id);
    if (!target) {
      res.status(404).json({ error: 'Kontrak tidak ditemukan.' });
      return;
    }
    target.deletedAt = null;
    target.updatedAt = formatWibNow();
    appendAudit(store, actor, 'CONTRACT_RESTORED', 'contracts', target.contractNumber, `Memulihkan kontrak ${target.contractNumber} dari arsip terhapus.`);
    saveStore(store);
    res.json({ ok: true, store });
  });

  app.post('/api/contracts/:id/reminder-settings', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const id = Number(req.params.id);
    const target = store.contracts.find((c) => c.id === id);
    if (!target) {
      res.status(404).json({ error: 'Kontrak tidak ditemukan.' });
      return;
    }
    const { h30, h14, h7, channel } = req.body;
    target.reminderConfig = {
      h30: Boolean(h30),
      h14: Boolean(h14),
      h7: Boolean(h7),
      channel: channel || 'WhatsApp & Email',
    };
    target.updatedAt = formatWibNow();
    appendAudit(store, actor, 'REMINDER_CONFIG_UPDATED', 'contracts', target.contractNumber, `Memperbarui pengaturan pengingat (${target.reminderConfig.channel}) untuk ${target.contractNumber}.`);
    saveStore(store);
    res.json({ ok: true, store });
  });

  // 3. e-Signature Workflow
  app.post('/api/contracts/:id/esign', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const id = Number(req.params.id);
    const contract = store.contracts.find((c) => c.id === id);
    if (!contract) {
      res.status(404).json({ error: 'Kontrak tidak ditemukan.' });
      return;
    }

    const nextStage = req.body.stage as string | undefined;
    if (nextStage) {
      contract.esignStatus = nextStage as typeof contract.esignStatus;
    } else {
      if (contract.esignStatus === 'Belum Diajukan') {
        contract.esignStatus = 'Paraf Logistik';
        contract.status = 'Review Legal';
      } else if (contract.esignStatus === 'Paraf Logistik') {
        contract.esignStatus = 'Verifikasi Legal';
        contract.status = 'Menunggu e-Sign';
      } else {
        contract.esignStatus = 'Tertandatangani';
        contract.status = 'Aktif';
        contract.esignHash =
          'sha256:' +
          crypto
            .createHash('sha256')
            .update(`${contract.contractNumber}|${actor.email}|${Date.now()}`)
            .digest('hex');
      }
    }

    if (contract.esignStatus === 'Tertandatangani' && !contract.esignHash) {
      contract.esignHash =
        'sha256:' +
        crypto
          .createHash('sha256')
          .update(`${contract.contractNumber}|${actor.email}|${Date.now()}`)
          .digest('hex');
      contract.status = 'Aktif';
    }

    contract.updatedAt = formatWibNow();
    appendAudit(
      store,
      actor,
      'E_SIGN_WORKFLOW',
      'contracts',
      contract.contractNumber,
      `Memproses tahap e-Sign "${contract.esignStatus}" pada kontrak ${contract.contractNumber}.`
    );
    saveStore(store);
    res.json({ ok: true, contract, store });
  });

  // 4. Lease & Contract Renewal
  app.post('/api/contracts/:id/renew', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const id = Number(req.params.id);
    const contract = store.contracts.find((c) => c.id === id);
    if (!contract) {
      res.status(404).json({ error: 'Kontrak tidak ditemukan.' });
      return;
    }
    const { proposedEndDate, proposedValueIdr, reason } = req.body as {
      proposedEndDate: string;
      proposedValueIdr: number;
      reason: string;
    };
    const nextRenewalId = Math.max(...store.renewals.map((r) => r.id), 0) + 1;
    const renewalNumber = `ADD-${String(nextRenewalId).padStart(2, '0')}/${contract.contractNumber}`;

    store.renewals.unshift({
      id: nextRenewalId,
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      renewalNumber,
      previousEndDate: contract.endDate,
      proposedEndDate,
      proposedValueIdr: Number(proposedValueIdr),
      reason,
      approvalStatus: actor.roleCode === 'ADMIN_LEGAL' ? 'Disetujui Legal' : 'Diajukan',
      approvedByName: actor.roleCode === 'ADMIN_LEGAL' ? actor.fullName : null,
      createdAt: formatWibNow(),
    });

    if (actor.roleCode === 'ADMIN_LEGAL') {
      contract.endDate = proposedEndDate;
      contract.contractValueIdr = Number(proposedValueIdr);
      contract.status = 'Diperpanjang';
      contract.updatedAt = formatWibNow();
    }

    appendAudit(
      store,
      actor,
      'CONTRACT_RENEWAL',
      'renewals',
      renewalNumber,
      `Mengajukan adendum perpanjangan ${renewalNumber} hingga ${proposedEndDate}.`
    );
    saveStore(store);
    res.status(201).json({ ok: true, store });
  });

  // 5. Document Vault (PDF / Word)
  app.post('/api/documents', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const { contractId, fileName, fileType, fileSizeKb, docCategory, version, expiryDate } = req.body;
    const contract = store.contracts.find((c) => c.id === Number(contractId)) ?? store.contracts[0];
    const nextId = Math.max(...store.documents.map((d) => d.id), 0) + 1;
    const checksumSha256 = crypto
      .createHash('sha256')
      .update(`${fileName}|${Date.now()}`)
      .digest('hex');

    const newDoc = {
      id: nextId,
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      fileName: String(fileName),
      fileType: fileType || 'PDF',
      fileSizeKb: Number(fileSizeKb || 1240),
      docCategory: docCategory || 'Perjanjian Induk',
      version: version || 'v1.0',
      checksumSha256,
      expiryDate: expiryDate ? String(expiryDate) : null,
      uploadedByName: actor.fullName,
      uploadedAt: formatWibNow(),
    };

    store.documents.unshift(newDoc);
    appendAudit(store, actor, 'DOCUMENT_UPLOADED', 'documents', newDoc.fileName, `Mengunggah dokumen ${newDoc.docCategory} (${newDoc.fileName}) untuk ${contract.contractNumber}.`);
    saveStore(store);
    res.status(201).json({ ok: true, document: newDoc, store });
  });

  app.delete('/api/documents/:id', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const id = Number(req.params.id);
    const target = store.documents.find((d) => d.id === id);
    if (!target) {
      res.status(404).json({ error: 'Dokumen tidak ditemukan.' });
      return;
    }
    store.documents = store.documents.filter((d) => d.id !== id);
    appendAudit(store, actor, 'DOCUMENT_DELETED', 'documents', target.fileName, `Menghapus file dokumen ${target.fileName}.`);
    saveStore(store);
    res.json({ ok: true, store });
  });

  // 6. Usage & Quota Tracking
  app.post('/api/usage-logs', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const { contractId, volumeDelta, valueDeltaIdr, referenceNo, remarks } = req.body;
    const contract = store.contracts.find((c) => c.id === Number(contractId));
    if (!contract) {
      res.status(404).json({ error: 'Kontrak tidak ditemukan.' });
      return;
    }

    const vDelta = Number(volumeDelta || 0);
    const valDelta = Number(valueDeltaIdr || 0);
    contract.quotaUsed = Math.min(contract.quotaTotal, Number((contract.quotaUsed + vDelta).toFixed(2)));
    contract.utilizedValueIdr = Math.min(contract.contractValueIdr, contract.utilizedValueIdr + valDelta);
    contract.updatedAt = formatWibNow();

    const nextId = Math.max(...store.usageLogs.map((u) => u.id), 0) + 1;
    store.usageLogs.unshift({
      id: nextId,
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      activityDate: new Date().toISOString().slice(0, 10),
      volumeDelta: vDelta,
      valueDeltaIdr: valDelta,
      quotaUnit: contract.quotaUnit,
      referenceNo: String(referenceNo || `LOG-${nextId}`),
      remarks: String(remarks || 'Realisasi kuota layanan kepelabuhanan'),
      recordedByName: actor.fullName,
    });

    appendAudit(
      store,
      actor,
      'USAGE_LOGGED',
      'usage_logs',
      contract.contractNumber,
      `Mencatat realisasi ${vDelta} ${contract.quotaUnit} (Rp ${valDelta.toLocaleString('id-ID')}) pada ${contract.contractNumber}.`
    );
    saveStore(store);
    res.status(201).json({ ok: true, store });
  });

  // 7. H-30 / H-14 / H-7 Reminder Dispatch
  app.post('/api/reminders/dispatch', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const { reminderId, contractId, tier, channel } = req.body as {
      reminderId?: number;
      contractId?: number;
      tier?: 'H-30' | 'H-14' | 'H-7';
      channel?: 'WhatsApp & Email' | 'WhatsApp' | 'Email';
    };

    if (reminderId) {
      const rem = store.reminders.find((r) => r.id === Number(reminderId));
      if (rem) {
        rem.dispatchStatus = 'Terkirim';
        rem.sentAt = formatWibNow();
        appendAudit(store, actor, 'REMINDER_DISPATCH', 'reminders', rem.contractNumber, `Mengirim notifikasi ${rem.tier} (${rem.channel}) ke ${rem.recipientName}.`);
      }
    } else if (contractId) {
      const contract = store.contracts.find((c) => c.id === Number(contractId)) ?? store.contracts[0];
      const vendor = store.vendors.find((v) => v.id === contract.vendorId);
      const nextId = Math.max(...store.reminders.map((r) => r.id), 0) + 1;
      const chosenTier = tier || 'H-14';
      const chosenChannel = channel || 'WhatsApp & Email';
      store.reminders.unshift({
        id: nextId,
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        contractTitle: contract.title,
        tier: chosenTier,
        channel: chosenChannel,
        recipientName: vendor ? `${vendor.picName} (${vendor.companyName})` : 'PIC Mitra',
        recipientContact: vendor ? `${vendor.picWa} / ${vendor.picEmail}` : 'mitra@pelindo.co.id',
        scheduledDate: new Date().toISOString().slice(0, 10),
        dispatchStatus: 'Terkirim',
        messagePreview: `[CONTRACTHUB Pelindo Cirebon] Pengingat ${chosenTier}: Kontrak ${contract.contractNumber} (${contract.title}) jatuh tempo pada ${contract.endDate}.`,
        sentAt: formatWibNow(),
      });
      appendAudit(store, actor, 'REMINDER_DISPATCH', 'reminders', contract.contractNumber, `Memicu pengingat manual ${chosenTier} (${chosenChannel}) untuk ${contract.contractNumber}.`);
    }

    saveStore(store);
    res.json({ ok: true, store });
  });

  // 8. Port Permits & Legalities CRUD
  app.post('/api/legalities', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const { permitNumber, permitName, issuingAuthority, vendorId, portZone, issuedDate, expiryDate, status } = req.body;
    const vendor = vendorId ? store.vendors.find((v) => v.id === Number(vendorId)) : null;
    const nextId = Math.max(...store.legalities.map((l) => l.id), 0) + 1;
    const created = {
      id: nextId,
      permitNumber: String(permitNumber),
      permitName: String(permitName),
      issuingAuthority: String(issuingAuthority),
      vendorId: vendor ? vendor.id : null,
      vendorName: vendor ? vendor.companyName : 'PT Pelindo (Persero) Regional 2 Cirebon',
      portZone: String(portZone),
      issuedDate: String(issuedDate),
      expiryDate: String(expiryDate),
      status: status || 'Berlaku',
    };
    store.legalities.unshift(created);
    appendAudit(store, actor, 'LEGALITY_CREATED', 'legalities', created.permitNumber, `Mendaftarkan izin operasional baru: ${created.permitName}.`);
    saveStore(store);
    res.status(201).json({ ok: true, store });
  });

  app.put('/api/legalities/:id', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const id = Number(req.params.id);
    const target = store.legalities.find((l) => l.id === id);
    if (!target) {
      res.status(404).json({ error: 'Data perizinan tidak ditemukan.' });
      return;
    }
    Object.assign(target, req.body);
    appendAudit(store, actor, 'LEGALITY_UPDATED', 'legalities', target.permitNumber, `Memperbarui status izin ${target.permitNumber} menjadi ${target.status}.`);
    saveStore(store);
    res.json({ ok: true, store });
  });

  // 9. User Admin CRUD
  app.post('/api/users', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const { fullName, email, roleCode, department, phoneWa, titlePosition } = req.body;
    const role = store.roles.find((r) => r.code === roleCode) ?? store.roles[3];
    const nextId = Math.max(...store.users.map((u) => u.id), 0) + 1;
    const initials = String(fullName)
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join('');
    const newUser: User = {
      id: nextId,
      roleId: role.id,
      roleCode: role.code,
      roleName: role.name,
      fullName: String(fullName),
      titlePosition: String(titlePosition || role.name),
      email: String(email),
      phoneWa: String(phoneWa || '+6281200000000'),
      department: String(department || 'Pelindo Regional 2 Cirebon'),
      avatarUrl: null,
      initials: initials || 'US',
      status: 'Aktif',
      lastLoginAt: 'Belum pernah masuk',
    };
    store.users.push(newUser);
    appendAudit(store, actor, 'USER_CREATED', 'users', String(newUser.id), `Menambahkan pengguna baru ${newUser.fullName} (${newUser.roleName}).`);
    saveStore(store);
    res.status(201).json({ ok: true, store });
  });

  app.put('/api/users/:id', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const id = Number(req.params.id);
    const target = store.users.find((u) => u.id === id);
    if (!target) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }
    const { fullName, email, roleCode, department, phoneWa, titlePosition, status } = req.body;
    if (roleCode) {
      const role = store.roles.find((r) => r.code === roleCode);
      if (role) {
        target.roleId = role.id;
        target.roleCode = role.code;
        target.roleName = role.name;
      }
    }
    if (fullName) target.fullName = fullName;
    if (email) target.email = email;
    if (department) target.department = department;
    if (phoneWa) target.phoneWa = phoneWa;
    if (titlePosition) target.titlePosition = titlePosition;
    if (status) target.status = status;
    appendAudit(store, actor, 'USER_UPDATED', 'users', String(target.id), `Memperbarui data/hak akses pengguna ${target.fullName}.`);
    saveStore(store);
    res.json({ ok: true, activeUser: getActiveUser(), store });
  });

  app.delete('/api/users/:id', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const id = Number(req.params.id);
    if (id === 1) {
      res.status(400).json({ error: 'Akun preset Chief Legal Officer utama tidak dapat dihapus.' });
      return;
    }
    const target = store.users.find((u) => u.id === id);
    if (!target) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }
    store.users = store.users.filter((u) => u.id !== id);
    appendAudit(store, actor, 'USER_DELETED', 'users', String(id), `Menghapus pengguna ${target.fullName} dari sistem.`);
    saveStore(store);
    res.json({ ok: true, store });
  });

  app.post('/api/users/:id/reset-password', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const id = Number(req.params.id);
    const target = store.users.find((u) => u.id === id);
    if (!target) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }
    appendAudit(store, actor, 'USER_PASSWORD_RESET', 'users', String(target.id), `Mereset kata sandi sementara dan mengirim tautan aktivasi ke ${target.email}.`);
    saveStore(store);
    res.json({ ok: true, store });
  });

  // 10. Profile Settings
  app.put('/api/profile', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const { fullName, phoneWa, department, titlePosition, notifyEmail, notifyWa, passwordChanged } = req.body;
    if (fullName) actor.fullName = fullName;
    if (phoneWa) actor.phoneWa = phoneWa;
    if (department) actor.department = department;
    if (titlePosition) actor.titlePosition = titlePosition;
    if (typeof notifyEmail === 'boolean') actor.notifyEmail = notifyEmail;
    if (typeof notifyWa === 'boolean') actor.notifyWa = notifyWa;
    appendAudit(
      store,
      actor,
      passwordChanged ? 'PROFILE_PASSWORD_CHANGED' : 'PROFILE_UPDATED',
      'users',
      String(actor.id),
      passwordChanged
        ? `Memperbarui profil & kata sandi akun untuk ${actor.fullName}.`
        : `Memperbarui pengaturan profil & preferensi notifikasi untuk ${actor.fullName}.`
    );
    saveStore(store);
    res.json({ ok: true, activeUser: actor, store });
  });

  // Master Data (Vendors & Port Locations)
  app.post('/api/vendors', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const { companyName, nib, npwp, picName, picEmail, picWa, category, address } = req.body;
    const nextId = Math.max(...store.vendors.map((v) => v.id), 0) + 1;
    const created = {
      id: nextId,
      vendorCode: `VND-CRB-${String(nextId).padStart(3, '0')}`,
      companyName: String(companyName),
      nib: String(nib || '9120309900112'),
      npwp: String(npwp || '05.112.334.5-426.000'),
      picName: String(picName),
      picEmail: String(picEmail),
      picWa: String(picWa),
      category: String(category || 'Logistik Pelabuhan'),
      complianceStatus: 'Terverifikasi' as const,
      address: String(address || 'Kawasan Pelabuhan Cirebon'),
    };
    store.vendors.push(created);
    appendAudit(store, actor, 'VENDOR_CREATED', 'vendors', created.vendorCode, `Menambahkan master mitra vendor ${created.companyName}.`);
    saveStore(store);
    res.status(201).json({ ok: true, store });
  });

  app.post('/api/master/locations', (req, res) => {
    store = ensureStore();
    const actor = getActiveUser();
    const name = String(req.body.locationName || '').trim();
    if (!name) {
      res.status(400).json({ error: 'Nama lokasi dermaga/gudang wajib diisi.' });
      return;
    }
    store.portLocations = store.portLocations ?? [];
    if (!store.portLocations.includes(name)) {
      store.portLocations.push(name);
      appendAudit(store, actor, 'LOCATION_CREATED', 'port_locations', name, `Menambahkan master lokasi pelabuhan: ${name}.`);
      saveStore(store);
    }
    res.status(201).json({ ok: true, store });
  });

  // 11. CSV / Excel Export
  app.get('/api/export/contracts.csv', (_req, res) => {
    store = ensureStore();
    const headers = [
      'No Kontrak',
      'Judul Kontrak',
      'Pilar Layanan',
      'Mitra Vendor',
      'Lokasi Pelabuhan',
      'Nilai Kontrak (IDR)',
      'Realisasi Nilai (IDR)',
      'Kuota Terpakai',
      'Total Kuota',
      'Satuan',
      'Tanggal Mulai',
      'Tanggal Berakhir',
      'Status',
      'Status e-Sign',
    ];
    const rows = store.contracts
      .filter((c) => !c.deletedAt)
      .map((c) => [
      c.contractNumber,
      `"${c.title.replace(/"/g, '""')}"`,
      c.servicePillar,
      `"${c.vendorName.replace(/"/g, '""')}"`,
      `"${c.portLocation.replace(/"/g, '""')}"`,
      c.contractValueIdr,
      c.utilizedValueIdr,
      c.quotaUsed,
      c.quotaTotal,
      c.quotaUnit,
      c.startDate,
      c.endDate,
      c.status,
      c.esignStatus,
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="CONTRACTHUB_Pelindo_Cirebon_Kontrak.csv"');
    res.send(csv);
  });

  // Vite middleware in development, static dist in production (with safe fallback if dist is not built yet)
  const isProduction =
    process.env.NODE_ENV === 'production' || process.argv.includes('--prod');
  const distDir = path.resolve(process.cwd(), 'dist');
  const distIndex = path.join(distDir, 'index.html');

  if (isProduction && fs.existsSync(distIndex)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(distIndex);
    });
  } else {
    if (isProduction && !fs.existsSync(distIndex)) {
      console.warn(
        '[CONTRACTHUB] Folder dist/ belum tersedia. Menjalankan mode Vite middleware otomatis. Jalankan "npm run build" untuk build produksi.'
      );
    }
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CONTRACTHUB Pelindo Cirebon server running on http://localhost:${PORT}`);
  });
}

startServer();
