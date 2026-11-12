export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRupiahCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(2).replace('.', ',')} M`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1).replace('.', ',')} Jt`;
  }
  return formatRupiah(amount);
}

export function formatNumberId(val: number): string {
  return new Intl.NumberFormat('id-ID').format(val);
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date('2026-11-11T00:00:00');
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function formatDateId(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getContractStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Aktif':
    case 'Diperpanjang':
      return 'bg-[#E0F2F1] text-[#004C6D] border border-[#004C6D]/20';
    case 'Hampir Habis':
      return 'bg-amber-50 text-amber-800 border border-amber-300';
    case 'Menunggu e-Sign':
    case 'Review Legal':
      return 'bg-sky-50 text-[#004C6D] border border-sky-200';
    case 'Kedaluwarsa':
      return 'bg-rose-50 text-rose-800 border border-rose-300';
    case 'Dihentikan':
      return 'bg-slate-800 text-white border border-slate-900';
    case 'Selesai':
      return 'bg-slate-100 text-slate-700 border border-slate-200';
    default:
      return 'bg-[#F4F8F9] text-[#002B36] border border-[#002B36]/15';
  }
}
